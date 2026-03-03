import { MaterialIcons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import EntityThumbnail from "../ui/EntityThumbnail";
import { type ApiPaymentMode } from "../../constants/api-enums";
import { PaymentService } from "../../services/payment.service";
import { SalesService } from "../../services/sales.service";
import { useAuthStore } from "../../stores/auth.store";
import { Colors, Spacing } from "../../theme";
import { resolveEntityImage } from "../../utils/image";
import { canViewSensitivePricing } from "../../utils/rbac";

const BOTTOM_NAV_HEIGHT = 80;

interface SaleDetailScreenProps {
  id?: string;
  title?: string;
  routeGroup?: "staff" | "admin" | "customer";
}

// ==================== CONSTANTS & TYPES ====================

const PAYMENT_METHODS = {
  CASH: { label: "Cash", icon: "payments", color: "#ffffff", bg: "#ECFDF5" },
  UPI: { label: "UPI", icon: "qr-code", color: "#ffffff", bg: "#EFF6FF" },
  ONLINE: {
    label: "Online",
    icon: "language",
    color: "#ffffffa8",
    bg: "#F5F3FF",
  },
  CARD: { label: "Card", icon: "credit-card", color: "#ffffff", bg: "#F5F3FF" },
} as const;

const SALE_STATUS = {
  COMPLETED: {
    label: "Completed",
    icon: "check-circle",
    color: "#8eebcd",
    bg: "#ECFDF5",
  },
  PENDING: {
    label: "Pending",
    icon: "pending",
    color: "#d8ac7a",
    bg: "#FFFBEB",
  },
  CANCELLED: {
    label: "Cancelled",
    icon: "cancel",
    color: "#ec9898",
    bg: "#FEF2F2",
  },
} as const;

// ==================== UTILITY FUNCTIONS ====================

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatDate = (dateString?: string): string => {
  if (!dateString) return "—";
  const date = new Date(dateString);

  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return "Today";
  } else if (date.toDateString() === yesterday.toDateString()) {
    return "Yesterday";
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatTime = (dateString?: string): string => {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const getPaymentInfo = (mode?: string) => {
  const key = mode?.toUpperCase() as keyof typeof PAYMENT_METHODS;
  return (
    PAYMENT_METHODS[key] || {
      label: mode || "Unknown",
      icon: "receipt",
      color: "#6B7280",
      bg: "#F3F4F6",
    }
  );
};

const getStatusInfo = (status?: string) => {
  const key = status?.toUpperCase() as keyof typeof SALE_STATUS;
  return SALE_STATUS[key] || SALE_STATUS.COMPLETED;
};

const normalizeStatusLabel = (value?: string) => {
  const raw = String(value || "").trim();
  if (!raw) return "—";
  return raw.replace(/_/g, " ");
};

const getVerificationState = (sale: any): string => {
  const verificationRaw = String(
    sale?.verificationState || sale?.paymentVerificationStatus || "",
  )
    .trim()
    .toUpperCase();
  if (verificationRaw) return verificationRaw;

  const payments = Array.isArray(sale?.payments) ? sale.payments : [];
  if (payments.length) {
    let hasRejected = false;
    let hasPending = false;
    let hasVerified = false;

    for (const tx of payments) {
      const status = String(tx?.status || "")
        .trim()
        .toUpperCase();
      if (status === "REJECTED" || status === "CANCELLED") {
        hasRejected = true;
        continue;
      }
      if (
        status === "PENDING" ||
        status === "PENDING_VERIFICATION" ||
        status === "SYNC_QUEUED"
      ) {
        hasPending = true;
        continue;
      }
      if (
        status === "VERIFIED" ||
        status === "APPROVED" ||
        status === "ACCEPTED" ||
        tx?.verifiedAt ||
        tx?.verifiedBy
      ) {
        hasVerified = true;
      }
    }

    if (hasPending) return "PENDING_VERIFICATION";
    if (hasRejected && !hasVerified) return "REJECTED";
    if (hasVerified) return "VERIFIED";
  }

  const paidAmount = Number(sale?.paidAmount ?? 0) || 0;
  if (paidAmount <= 0) return "NOT_REQUIRED";
  return "VERIFIED";
};

const getItemDisplayData = (item: any) => {
  const inventoryObj =
    typeof item?.inventory === "object" ? item.inventory : null;
  const inventoryIdObj =
    typeof item?.inventoryId === "object" ? item.inventoryId : null;
  const plantType =
    inventoryObj?.plantType ??
    inventoryIdObj?.plantType ??
    item?.plantType ??
    {};
  const plantName = plantType?.name || "Plant";
  const category = plantType?.category || "Uncategorized";
  const quantity = Number(item?.quantity ?? 0) || 0;
  const unitPrice =
    Number(item?.priceAtSale ?? item?.unitPrice ?? item?.price ?? 0) || 0;
  const lineTotal = unitPrice * quantity;
  const thumbnail =
    resolveEntityImage(plantType) ??
    resolveEntityImage(inventoryObj?.plantType) ??
    resolveEntityImage(inventoryIdObj?.plantType) ??
    resolveEntityImage(item?.inventory) ??
    resolveEntityImage(item?.inventoryId) ??
    resolveEntityImage(item);

  return { plantName, category, quantity, unitPrice, lineTotal, thumbnail };
};

const getItemKey = (item: any, index: number): string => {
  const inventoryId =
    (typeof item?.inventoryId === "string" && item.inventoryId) ||
    (typeof item?.inventory?._id === "string" && item.inventory._id) ||
    "";
  return `${inventoryId || "line"}-${index}`;
};

// ==================== METRIC CARD ====================

interface MetricCardProps {
  label: string;
  value: string;
  sublabel?: string;
  icon: string;
  color: string;
  trend?: "up" | "down" | "neutral";
}

const MetricCard = ({
  label,
  value,
  sublabel,
  icon,
  color,
  trend,
}: MetricCardProps) => (
  <View style={styles.metricCard}>
    <View style={styles.metricHeader}>
      <View style={[styles.metricIcon, { backgroundColor: `${color}10` }]}>
        <MaterialIcons name={icon as any} size={20} color={color} />
      </View>
      {trend && (
        <View
          style={[
            styles.trendBadge,
            { backgroundColor: trend === "up" ? "#ECFDF5" : "#FEF2F2" },
          ]}
        >
          <MaterialIcons
            name={trend === "up" ? "arrow-upward" : "arrow-downward"}
            size={12}
            color={trend === "up" ? "#059669" : "#DC2626"}
          />
        </View>
      )}
    </View>
    <Text style={styles.metricLabel}>{label}</Text>
    <Text style={[styles.metricValue, { color }]}>{value}</Text>
    {sublabel && <Text style={styles.metricSublabel}>{sublabel}</Text>}
  </View>
);

// ==================== ITEM CARD ====================

interface ItemCardProps {
  item: any;
}

const ItemCard = ({ item }: ItemCardProps) => {
  const { plantName, category, quantity, unitPrice, lineTotal, thumbnail } =
    getItemDisplayData(item);

  return (
    <View style={styles.itemCard}>
      {/* Item Header */}
      <View style={styles.itemHeader}>
        <View style={styles.itemHeaderLeft}>
          <EntityThumbnail
            uri={thumbnail}
            label={plantName}
            size={44}
            style={styles.itemThumbnail}
          />
          <View style={styles.itemInfo}>
            <Text style={styles.itemName} numberOfLines={1}>
              {plantName}
            </Text>
            <Text style={styles.itemCategory} numberOfLines={1}>
              {category}
            </Text>
          </View>
        </View>
        <View style={styles.itemQuantity}>
          <Text style={styles.itemQuantityValue}>x{quantity}</Text>
        </View>
      </View>

      {/* Item Details */}
      <View style={styles.itemDetails}>
        <View style={styles.itemPriceDetail}>
          <Text style={styles.itemDetailLabel}>Unit Price</Text>
          <Text style={styles.itemDetailPrice}>
            {formatCurrency(unitPrice)}
          </Text>
        </View>
        <View style={styles.itemDetailDivider} />
        <View style={styles.itemTotalDetail}>
          <Text style={styles.itemDetailLabel}>Line Total</Text>
          <Text style={styles.itemDetailTotal}>
            {formatCurrency(lineTotal)}
          </Text>
        </View>
      </View>
    </View>
  );
};

// ==================== LOADING STATE ====================

const LoadingState = () => (
  <View style={styles.centerContainer}>
    <ActivityIndicator size="large" color={Colors.primary} />
    <Text style={styles.loadingText}>Loading sale details...</Text>
  </View>
);

// ==================== ERROR STATE ====================

interface ErrorStateProps {
  error: any;
  onRetry: () => void;
  onBack: () => void;
  title: string;
}

const ErrorState = ({ error, onRetry, onBack, title }: ErrorStateProps) => (
  <View style={styles.container}>
    <LinearGradient
      colors={[Colors.primary, Colors.primaryLight || Colors.primary]}
      style={styles.errorHeaderGradient}
    >
      <SafeAreaView edges={["left", "right"]} style={styles.errorHeaderContent}>
        <TouchableOpacity
          onPress={onBack}
          style={styles.errorBackButton}
          activeOpacity={0.7}
        >
          <MaterialIcons name="arrow-back" size={20} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.errorHeaderTitle}>{title}</Text>
        <View style={styles.errorHeaderSpacer} />
      </SafeAreaView>
    </LinearGradient>

    <View style={styles.errorContainer}>
      <View style={styles.errorIconWrapper}>
        <MaterialIcons name="receipt-long" size={48} color={Colors.error} />
      </View>
      <Text style={styles.errorTitle}>Failed to Load Sale</Text>
      <Text style={styles.errorMessage}>
        {error?.message || "We couldn't load the sale details."}
      </Text>
      <TouchableOpacity
        onPress={onRetry}
        style={styles.retryButton}
        activeOpacity={0.7}
      >
        <LinearGradient
          colors={[Colors.primary, Colors.primaryLight || Colors.primary]}
          style={styles.retryGradient}
        >
          <MaterialIcons name="refresh" size={18} color={Colors.white} />
          <Text style={styles.retryButtonText}>Try Again</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  </View>
);

// ==================== MAIN COMPONENT ====================

export function SaleDetailScreen({
  id,
  title = "Sale Details",
  routeGroup = "staff",
}: SaleDetailScreenProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const role = useAuthStore((state) => state.user?.role);
  const showFinancialInsights = canViewSensitivePricing(role);
  const canManageSale = routeGroup !== "customer";
  const [showWalkInPaymentModal, setShowWalkInPaymentModal] = useState(false);
  const [walkInAmount, setWalkInAmount] = useState("");
  const [walkInMode, setWalkInMode] = useState<ApiPaymentMode>("CASH");
  const [walkInUtr, setWalkInUtr] = useState("");
  const [walkInReference, setWalkInReference] = useState("");

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["sale", id],
    queryFn: () => SalesService.getById(id),
    enabled: !!id,
  });
  const addWalkInPaymentMutation = useMutation({
    mutationFn: async (payload: {
      saleId: string;
      amount: number;
      mode: ApiPaymentMode;
      utrNumber?: string;
      transactionRef?: string;
    }) => PaymentService.recordWalkInPayment(payload),
    onSuccess: async () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowWalkInPaymentModal(false);
      setWalkInAmount("");
      setWalkInMode("CASH");
      setWalkInUtr("");
      setWalkInReference("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["sales"] }),
        queryClient.invalidateQueries({ queryKey: ["sale", id] }),
      ]);
      Alert.alert("Payment Updated", "Walk-in payment has been recorded successfully.");
    },
    onError: (err: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Unable to Update Payment", err?.message || "Failed to record payment.");
    },
  });

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const handleRefresh = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    refetch();
  };

  const handleGenerateBill = () => {
    if (!id) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/(${routeGroup})/sales/bill/${id}` as any);
  };

  const handleReturn = () => {
    if (!id) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/(${routeGroup})/sales/returns/${id}` as any);
  };

  const handleOpenWalkInPaymentModal = (currentDue: number) => {
    setWalkInAmount(String(Math.max(0, Math.round(currentDue))));
    setWalkInMode("CASH");
    setWalkInUtr("");
    setWalkInReference("");
    setShowWalkInPaymentModal(true);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={["left", "right"]}>
        <LoadingState />
      </SafeAreaView>
    );
  }

  if (error || !data) {
    return (
      <View style={styles.container}>
        <ErrorState
          error={error}
          onRetry={handleRefresh}
          onBack={handleBack}
          title={title}
        />
      </View>
    );
  }

  // Calculate metrics
  const totalAmount = Number(data.totalAmount ?? 0);
  const discountAmount = Number(data.discountAmount ?? 0);
  const netAmount = Number(data.netAmount ?? totalAmount - discountAmount);
  const paidAmount = Number(data.paidAmount ?? 0);
  const dueAmount = Number(data.dueAmount ?? Math.max(0, netAmount - paidAmount));
  const paymentStatus = String(
    data.paymentStatus || (dueAmount > 0 ? "PARTIALLY_PAID" : "PAID"),
  )
    .trim()
    .toUpperCase();
  const verificationState = getVerificationState(data);
  const totalProfit = Number(data.totalProfit ?? 0);
  const profitMargin = totalAmount > 0 ? (totalProfit / totalAmount) * 100 : 0;
  const isWalkInSale = !data.customer;
  const canStaffUpdateWalkInPayment =
    role === "STAFF" && isWalkInSale && dueAmount > 0;

  const paymentInfo = getPaymentInfo(data.paymentMode);
  const statusInfo = getStatusInfo(data.status);
  const saleDate = formatDate(data.createdAt);
  const saleTime = formatTime(data.createdAt);

  const items = Array.isArray(data.items) ? data.items : [];
  const totalItems = items.reduce(
    (sum, item) => sum + (Number(item.quantity) || 0),
    0,
  );
  const uniqueItems = items.length;

  const sellerName =
    typeof data.performedBy === "string"
      ? data.performedBy
      : data.performedBy?.name || "Unknown Staff";

  const handleSubmitWalkInPayment = () => {
    if (!id) return;
    const amount = Number(walkInAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      Alert.alert("Invalid Amount", "Enter a valid amount greater than 0.");
      return;
    }
    if (amount > dueAmount) {
      Alert.alert("Invalid Amount", "Amount cannot exceed pending due.");
      return;
    }
    if (walkInMode !== "CASH" && !walkInUtr.trim()) {
      Alert.alert("Missing UTR", "UTR/transaction ID is required for non-cash payments.");
      return;
    }

    addWalkInPaymentMutation.mutate({
      saleId: id,
      amount,
      mode: walkInMode,
      utrNumber: walkInMode === "CASH" ? undefined : walkInUtr.trim(),
      transactionRef: walkInReference.trim() || walkInUtr.trim() || undefined,
    });
  };

  return (
    <View style={styles.container}>
      {/* Fixed Header */}
      <LinearGradient
        colors={[Colors.primary, Colors.primaryLight || Colors.primary]}
        style={styles.headerGradient}
      >
        <SafeAreaView edges={["left", "right"]} style={styles.headerContent}>
          <View style={styles.headerRow}>
            <TouchableOpacity
              onPress={handleBack}
              style={styles.backButton}
              activeOpacity={0.7}
            >
              <MaterialIcons name="arrow-back" size={24} color={Colors.white} />
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle}>{title}</Text>
              <View style={styles.headerMetaRow}>
                <View
                  style={[
                    styles.headerBadge,
                    { backgroundColor: `${paymentInfo.color}20` },
                  ]}
                >
                  <MaterialIcons
                    name={paymentInfo.icon as any}
                    size={12}
                    color={paymentInfo.color}
                  />
                  <Text
                    style={[
                      styles.headerBadgeText,
                      { color: paymentInfo.color },
                    ]}
                  >
                    {paymentInfo.label}
                  </Text>
                </View>
                <View
                  style={[
                    styles.headerBadge,
                    { backgroundColor: `${statusInfo.color}20` },
                  ]}
                >
                  <MaterialIcons
                    name={statusInfo.icon as any}
                    size={12}
                    color={statusInfo.color}
                  />
                  <Text
                    style={[
                      styles.headerBadgeText,
                      { color: statusInfo.color },
                    ]}
                  >
                    {statusInfo.label}
                  </Text>
                </View>
              </View>
            </View>
            <View style={styles.headerRight} />
          </View>
          <View style={styles.headerDateTime}>
            <MaterialIcons
              name="calendar-today"
              size={12}
              color="rgba(255,255,255,0.8)"
            />
            <Text style={styles.headerDateTimeText}>
              {saleDate} at {saleTime}
            </Text>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Key Metrics */}
        <View style={styles.metricsGrid}>
          <MetricCard
            label="Total Amount"
            value={formatCurrency(totalAmount)}
            icon="receipt"
            color={Colors.primary}
          />
          {showFinancialInsights && (
            <MetricCard
              label="Total Profit"
              value={formatCurrency(totalProfit)}
              sublabel={`${profitMargin.toFixed(1)}% margin`}
              icon="trending-up"
              color={totalProfit >= 0 ? "#059669" : "#DC2626"}
              trend={totalProfit >= 0 ? "up" : "down"}
            />
          )}
        </View>

        {/* Sale Summary */}
        <View style={styles.summaryCard}>
          {canManageSale && (
            <>
              <TouchableOpacity
                onPress={handleGenerateBill}
                style={styles.generateBillButton}
                activeOpacity={0.85}
              >
                <MaterialIcons name="receipt-long" size={16} color={Colors.white} />
                <Text style={styles.generateBillText}>Generate Bill</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleReturn}
                style={[styles.generateBillButton, { backgroundColor: Colors.warning, marginTop: 8 }]}
                activeOpacity={0.85}
              >
                <MaterialIcons name="assignment-return" size={16} color={Colors.white} />
                <Text style={styles.generateBillText}>Create Return</Text>
              </TouchableOpacity>
              {canStaffUpdateWalkInPayment && (
                <TouchableOpacity
                  onPress={() => handleOpenWalkInPaymentModal(dueAmount)}
                  style={[
                    styles.generateBillButton,
                    { backgroundColor: Colors.success, marginTop: 8 },
                  ]}
                  activeOpacity={0.85}
                >
                  <MaterialIcons name="payments" size={16} color={Colors.white} />
                  <Text style={styles.generateBillText}>Update Walk-in Payment</Text>
                </TouchableOpacity>
              )}
            </>
          )}

          <View style={styles.summaryHeader}>
            <View style={styles.summaryHeaderLeft}>
              <View
                style={[
                  styles.summaryIcon,
                  { backgroundColor: `${Colors.primary}10` },
                ]}
              >
                <MaterialIcons
                  name="receipt"
                  size={16}
                  color={Colors.primary}
                />
              </View>
              <Text style={styles.summaryTitle}>Sale Summary</Text>
            </View>
            <View style={styles.summaryStats}>
              <Text style={styles.summaryStat}>{uniqueItems} items</Text>
              <View style={styles.summaryStatDivider} />
              <Text style={styles.summaryStat}>{totalItems} units</Text>
            </View>
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.summaryContent}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>
                {formatCurrency(totalAmount)}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Discount</Text>
              <Text style={styles.summaryValue}>
                {formatCurrency(discountAmount)}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Net Amount</Text>
              <Text style={styles.summaryValue}>
                {formatCurrency(netAmount)}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Paid</Text>
              <Text style={styles.summaryValue}>
                {formatCurrency(paidAmount)}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: Colors.error }]}>Due</Text>
              <Text style={[styles.summaryValue, { color: Colors.error }]}>
                {formatCurrency(dueAmount)}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Payment Status</Text>
              <Text style={styles.summaryValue}>
                {normalizeStatusLabel(paymentStatus)}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Verification</Text>
              <Text style={styles.summaryValue}>
                {normalizeStatusLabel(verificationState)}
              </Text>
            </View>

            {showFinancialInsights && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Profit</Text>
                <Text
                  style={[
                    styles.summaryValue,
                    {
                      color: totalProfit >= 0 ? "#059669" : "#DC2626",
                      fontWeight: "600",
                    },
                  ]}
                >
                  {totalProfit >= 0 ? "+" : ""}
                  {formatCurrency(totalProfit)}
                </Text>
              </View>
            )}
          </View>

          {/* Staff Info */}
          <View style={styles.staffContainer}>
            <View style={styles.staffAvatar}>
              <Text style={styles.staffInitial}>
                {sellerName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.staffInfo}>
              <Text style={styles.staffName}>{sellerName}</Text>
            </View>
          </View>

          {/* Customer Info (if available) */}
          {data.customer && (
            <View style={styles.customerContainer}>
              <View style={styles.customerHeader}>
                <MaterialIcons
                  name="person"
                  size={14}
                  color={Colors.textSecondary}
                />
                <Text style={styles.customerHeaderText}>Customer</Text>
              </View>
              <View style={styles.customerContent}>
                <Text style={styles.customerName}>{data.customer.name}</Text>
                {data.customer.phone && (
                  <Text style={styles.customerPhone}>
                    {data.customer.phone}
                  </Text>
                )}
              </View>
            </View>
          )}
        </View>

        {/* Items Section */}
        <View style={styles.itemsSection}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderLeft}>
              <View
                style={[
                  styles.sectionIcon,
                  { backgroundColor: `${Colors.primary}10` },
                ]}
              >
                <MaterialIcons
                  name="shopping-bag"
                  size={16}
                  color={Colors.primary}
                />
              </View>
              <Text style={styles.sectionTitle}>Items Sold</Text>
            </View>
            <Text style={styles.sectionCount}>{uniqueItems} items</Text>
          </View>

          {items.map((item: any, index: number) => (
            <ItemCard key={getItemKey(item, index)} item={item} />
          ))}
        </View>

        <View style={styles.itemsSection}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderLeft}>
              <View
                style={[
                  styles.sectionIcon,
                  { backgroundColor: `${Colors.warning}10` },
                ]}
              >
                <MaterialIcons
                  name="assignment-return"
                  size={16}
                  color={Colors.warning}
                />
              </View>
              <Text style={styles.sectionTitle}>Returns Timeline</Text>
            </View>
            <Text style={styles.sectionCount}>
              {(Array.isArray(data.returns) ? data.returns.length : 0)} entries
            </Text>
          </View>
          {(Array.isArray(data.returns) ? data.returns : []).length === 0 ? (
            <Text style={{ color: Colors.textSecondary, marginTop: 8 }}>
              No returns recorded.
            </Text>
          ) : (
            (data.returns || []).map((entry: any, idx: number) => (
              <View
                key={entry?._id || idx}
                style={[
                  styles.summaryCard,
                  { marginTop: 8, marginBottom: 0, padding: 12 },
                ]}
              >
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Quantity</Text>
                  <Text style={styles.summaryValue}>{Number(entry?.quantity || 0)}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Refund</Text>
                  <Text style={styles.summaryValue}>
                    {formatCurrency(Number(entry?.refundAmount || 0))}
                  </Text>
                </View>
                <Text style={[styles.summaryLabel, { marginTop: 6 }]}>
                  {entry?.reason || "No reason provided"}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <Modal
        visible={showWalkInPaymentModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowWalkInPaymentModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Update Walk-in Payment</Text>
            <Text style={styles.modalSubTitle}>
              Pending due: {formatCurrency(dueAmount)}
            </Text>

            <Text style={styles.modalLabel}>Amount</Text>
            <TextInput
              value={walkInAmount}
              onChangeText={(text) => setWalkInAmount(text.replace(/[^0-9.]/g, ""))}
              placeholder="Enter amount"
              keyboardType="decimal-pad"
              placeholderTextColor={Colors.textTertiary}
              style={styles.modalInput}
            />

            <Text style={styles.modalLabel}>Mode</Text>
            <View style={styles.modeRow}>
              {(["CASH", "UPI", "ONLINE"] as ApiPaymentMode[]).map((mode) => (
                <TouchableOpacity
                  key={mode}
                  onPress={() => setWalkInMode(mode)}
                  activeOpacity={0.8}
                  style={[
                    styles.modeChip,
                    walkInMode === mode && styles.modeChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.modeChipText,
                      walkInMode === mode && styles.modeChipTextActive,
                    ]}
                  >
                    {mode.replace("_", " ")}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {walkInMode !== "CASH" && (
              <>
                <Text style={styles.modalLabel}>UTR / Transaction ID</Text>
                <TextInput
                  value={walkInUtr}
                  onChangeText={setWalkInUtr}
                  placeholder="Enter UTR"
                  placeholderTextColor={Colors.textTertiary}
                  style={styles.modalInput}
                  autoCapitalize="characters"
                />
              </>
            )}

            <Text style={styles.modalLabel}>Reference (Optional)</Text>
            <TextInput
              value={walkInReference}
              onChangeText={setWalkInReference}
              placeholder="Reference note"
              placeholderTextColor={Colors.textTertiary}
              style={styles.modalInput}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => setShowWalkInPaymentModal(false)}
                style={styles.modalCancelButton}
                activeOpacity={0.8}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSubmitWalkInPayment}
                style={styles.modalSaveButton}
                disabled={addWalkInPaymentMutation.isPending}
                activeOpacity={0.8}
              >
                {addWalkInPaymentMutation.isPending ? (
                  <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                  <Text style={styles.modalSaveText}>Save Payment</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ==================== STYLES ====================

const styles = {
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },

  // Header Styles
  headerGradient: {
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  headerContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    marginBottom: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  headerCenter: {
    flex: 1,
    alignItems: "center" as const,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: Colors.white,
    marginBottom: 6,
  },
  headerMetaRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
  },
  headerBadge: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    gap: 4,
  },
  headerBadgeText: {
    fontSize: 11,
    fontWeight: "600" as const,
  },
  headerRight: {
    width: 40,
  },
  headerDateTime: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 6,
  },
  headerDateTimeText: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.8)",
  },

  // Scroll Content
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: BOTTOM_NAV_HEIGHT + 20,
  },

  // Metrics Grid
  metricsGrid: {
    flexDirection: "row" as const,
    gap: 12,
    marginBottom: 20,
  },
  metricCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  metricHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    marginBottom: 12,
  },
  metricIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  trendBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  metricLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: "700" as const,
    marginBottom: 2,
  },
  metricSublabel: {
    fontSize: 11,
    color: "#9CA3AF",
  },

  // Summary Card
  summaryCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  generateBillButton: {
    alignSelf: "flex-start" as const,
    marginBottom: Spacing.md,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
  },
  generateBillText: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: "700" as const,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center" as const,
    padding: 20,
  },
  modalCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: "#111827",
  },
  modalSubTitle: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 4,
  },
  modalLabel: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: "#374151",
  },
  modalInput: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#111827",
    backgroundColor: Colors.white,
  },
  modeRow: {
    flexDirection: "row" as const,
    gap: 8,
  },
  modeChip: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: "center" as const,
    backgroundColor: "#F9FAFB",
  },
  modeChipActive: {
    borderColor: Colors.primary,
    backgroundColor: `${Colors.primary}12`,
  },
  modeChipText: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: "#6B7280",
  },
  modeChipTextActive: {
    color: Colors.primary,
  },
  modalActions: {
    flexDirection: "row" as const,
    justifyContent: "flex-end" as const,
    gap: 10,
    marginTop: 8,
  },
  modalCancelButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#F9FAFB",
  },
  modalCancelText: {
    color: "#374151",
    fontSize: 13,
    fontWeight: "600" as const,
  },
  modalSaveButton: {
    minWidth: 120,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: Colors.primary,
  },
  modalSaveText: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: "700" as const,
  },
  summaryHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
  },
  summaryHeaderLeft: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
  },
  summaryIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: "#111827",
  },
  summaryStats: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
  },
  summaryStat: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500" as const,
  },
  summaryStatDivider: {
    width: 1,
    height: 12,
    backgroundColor: "#E5E7EB",
    marginHorizontal: 8,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginVertical: 16,
  },
  summaryContent: {
    gap: 8,
  },
  summaryRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
  },
  summaryLabel: {
    fontSize: 13,
    color: "#6B7280",
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: "500" as const,
    color: "#111827",
  },

  // Staff Container
  staffContainer: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 12,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  staffAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${Colors.primary}10`,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  staffInitial: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: Colors.primary,
  },
  staffInfo: {
    flex: 1,
  },
  staffName: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: "#111827",
    marginBottom: 2,
  },
  staffRole: {
    fontSize: 12,
    color: "#6B7280",
  },

  // Customer Container
  customerContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  customerHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    marginBottom: 8,
  },
  customerHeaderText: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500" as const,
  },
  customerContent: {
    paddingLeft: 20,
  },
  customerName: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: "#111827",
    marginBottom: 2,
  },
  customerPhone: {
    fontSize: 12,
    color: "#6B7280",
  },

  // Items Section
  itemsSection: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    marginBottom: 12,
  },
  sectionHeaderLeft: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
  },
  sectionIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: "#111827",
  },
  sectionCount: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500" as const,
  },

  // Item Card
  itemCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  itemHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    marginBottom: 10,
  },
  itemHeaderLeft: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 10,
    flex: 1,
  },
  itemThumbnail: {
    borderRadius: 6,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: "#111827",
    marginBottom: 2,
  },
  itemCategory: {
    fontSize: 11,
    color: "#6B7280",
  },
  itemQuantity: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  itemQuantityValue: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: "#374151",
  },
  itemDetails: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: "#F9FAFB",
    borderRadius: 10,
    padding: 10,
  },
  itemPriceDetail: {
    flex: 1,
  },
  itemTotalDetail: {
    flex: 1,
    alignItems: "flex-end" as const,
  },
  itemDetailLabel: {
    fontSize: 10,
    color: "#9CA3AF",
    marginBottom: 2,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
  },
  itemDetailPrice: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: "#059669",
  },
  itemDetailTotal: {
    fontSize: 13,
    fontWeight: "700" as const,
    color: "#111827",
  },
  itemDetailDivider: {
    width: 1,
    height: 24,
    backgroundColor: "#E5E7EB",
    marginHorizontal: 12,
  },

  // Center Container
  centerContainer: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: "#6B7280",
    fontWeight: "500" as const,
  },

  // Error Header
  errorHeaderGradient: {
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  errorHeaderContent: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  errorBackButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  errorHeaderTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "600" as const,
    color: Colors.white,
    textAlign: "center" as const,
  },
  errorHeaderSpacer: {
    width: 40,
  },

  // Error State
  errorContainer: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    padding: 24,
  },
  errorIconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#FEF2F2",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "600" as const,
    color: "#DC2626",
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center" as const,
    marginBottom: 24,
    lineHeight: 20,
    paddingHorizontal: 24,
  },
  retryButton: {
    borderRadius: 12,
    overflow: "hidden" as const,
  },
  retryGradient: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingHorizontal: 24,
    paddingVertical: 12,
    gap: 8,
  },
  retryButtonText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: "600" as const,
  },
} as const;
