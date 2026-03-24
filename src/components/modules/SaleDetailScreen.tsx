import { MaterialIcons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
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
import type { Sale } from "../../types/sales.type";
import { resolveEntityImage } from "../../utils/image";
import { canViewSensitivePricing } from "../../utils/rbac";
import { AdminTheme } from "../admin/theme";
import StitchHeader from "../common/StitchHeader";
import { Colors } from "@/src/theme";

const BOTTOM_NAV_HEIGHT = 80;

// ==================== CONSTANTS & TYPES ====================

interface SaleDetailScreenProps {
  id?: string;
  title?: string;
  routeGroup?: "staff" | "admin" | "customer";
}

const PAYMENT_METHODS = {
  CASH: { label: "Cash", icon: "payments", color: "#059669", bg: "#ECFDF5", tone: "success" },
  UPI: { label: "UPI", icon: "qr-code", color: "#2563EB", bg: "#EFF6FF", tone: "primary" },
  ONLINE: { label: "Online", icon: "language", color: "#7C3AED", bg: "#F5F3FF", tone: "purple" },
  CARD: { label: "Card", icon: "credit-card", color: "#7C3AED", bg: "#F5F3FF", tone: "purple" },
} as const;

const SALE_STATUS = {
  COMPLETED: { label: "Completed", icon: "check-circle", color: "#059669", bg: "#ECFDF5", tone: "success" },
  PENDING: { label: "Pending", icon: "pending", color: "#D97706", bg: "#FFFBEB", tone: "warning" },
  CANCELLED: { label: "Cancelled", icon: "cancel", color: "#DC2626", bg: "#FEF2F2", tone: "danger" },
} as const;

const PAYMENT_STATUS = {
  PAID: { label: "Paid", icon: "check-circle", color: "#059669", bg: "#ECFDF5" },
  PARTIALLY_PAID: {
    label: "Partially Paid",
    icon: "hourglass-bottom",
    color: "#D97706",
    bg: "#FFFBEB",
  },
  UNPAID: { label: "Unpaid", icon: "warning", color: "#DC2626", bg: "#FEF2F2" },
  PENDING_VERIFICATION: {
    label: "Pending Verification",
    icon: "pending-actions",
    color: "#2563EB",
    bg: "#EFF6FF",
  },
  OVERDUE: { label: "Overdue", icon: "error-outline", color: "#DC2626", bg: "#FEF2F2" },
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

const formatNumber = (num: number): string => {
  return num.toLocaleString("en-IN");
};

const getPaymentInfo = (mode?: string) => {
  const key = mode?.toUpperCase() as keyof typeof PAYMENT_METHODS;
  return (
    PAYMENT_METHODS[key] || {
      label: mode || "Unknown",
      icon: "receipt",
      color: "#6B7280",
      bg: "#F3F4F6",
      tone: "neutral",
    }
  );
};

const getStatusInfo = (status?: string) => {
  const key = status?.toUpperCase() as keyof typeof SALE_STATUS;
  return SALE_STATUS[key] || SALE_STATUS.COMPLETED;
};

const getPaymentStatusInfo = (status?: string) => {
  const key = String(status || "").trim().toUpperCase() as keyof typeof PAYMENT_STATUS;
  return PAYMENT_STATUS[key] || PAYMENT_STATUS.UNPAID;
};

const toNumber = (value: unknown): number => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeStatusLabel = (value?: string) => {
  const raw = String(value || "").trim();
  if (!raw) return "—";
  return raw
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const inferGrossAmount = (sale: Sale | any): number => {
  const direct = toNumber(
    sale?.grossAmount ??
      sale?.grandTotal ??
      sale?.finalAmount ??
      sale?.billAmount ??
      sale?.totalAmount,
  );
  if (direct > 0) return direct;

  const items = Array.isArray(sale?.items) ? sale.items : [];
  return items.reduce((sum: number, item: any) => {
    const unit = toNumber(item?.priceAtSale ?? item?.unitPrice ?? item?.price);
    const qty = toNumber(item?.quantity);
    return sum + unit * qty;
  }, 0);
};

const inferNetAmount = (sale: Sale | any): number => {
  const direct = toNumber(sale?.netAmount);
  if (direct > 0) return direct;
  const gross = inferGrossAmount(sale);
  const discount = Math.max(0, toNumber(sale?.discountAmount));
  return Math.max(0, gross - discount);
};

const isVerifiedPaymentStatus = (status?: string) => {
  const value = String(status || "").trim().toUpperCase();
  return (
    value === "VERIFIED" ||
    value === "APPROVED" ||
    value === "ACCEPTED" ||
    value === "PAID" ||
    value === "SUCCESS"
  );
};

const inferPaidAmount = (sale: Sale | any): number => {
  const netAmount = inferNetAmount(sale);
  const direct = sale?.paidAmount ?? sale?.amountPaid;
  if (direct !== null && direct !== undefined && Number.isFinite(Number(direct))) {
    return Math.max(0, Math.min(toNumber(direct), netAmount));
  }

  const payments = Array.isArray(sale?.payments) ? sale.payments : [];
  const verifiedSum = payments.reduce((sum: number, payment: any) => {
    const amount = Math.max(0, toNumber(payment?.amount));
    if (!payment?.status) return sum + amount;
    return isVerifiedPaymentStatus(payment?.status) ? sum + amount : sum;
  }, 0);
  return Math.max(0, Math.min(verifiedSum, netAmount));
};

const getDerivedPaymentStatus = (sale: Sale | any, dueAmount: number, paidAmount: number) => {
  const explicit = String(sale?.paymentStatus || "").trim().toUpperCase();
  if (
    explicit === "PAID" ||
    explicit === "PARTIALLY_PAID" ||
    explicit === "UNPAID" ||
    explicit === "PENDING_VERIFICATION" ||
    explicit === "OVERDUE"
  ) {
    return explicit;
  }
  if (dueAmount <= 0) return "PAID";
  if (paidAmount > 0) return "PARTIALLY_PAID";
  return "UNPAID";
};

const getCustomerDetails = (sale: Sale | any) => {
  const customer = sale?.customer || sale?.customerDetails || {};
  return {
    name:
      customer?.name ||
      sale?.customerName ||
      sale?.buyerName ||
      (customer ? "Walk-in Customer" : "Walk-in Customer"),
    phone:
      customer?.phone ||
      customer?.phoneNumber ||
      customer?.mobileNumber ||
      sale?.customerPhone ||
      sale?.phoneNumber ||
      sale?.mobileNumber ||
      "",
    address:
      customer?.address ||
      customer?.location ||
      sale?.customerAddress ||
      sale?.address ||
      "",
  };
};

const getVerificationState = (sale: Sale | any): string => {
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

const getPaymentTimeline = (sale: Sale | any) => {
  const payments = Array.isArray(sale?.payments) ? sale.payments : [];
  return payments.map((payment: any, index: number) => ({
    id: String(payment?._id || payment?.id || `${sale?._id || "sale"}-${index}`),
    amount: toNumber(payment?.amount),
    mode: String(payment?.mode || payment?.paymentMode || sale?.paymentMode || "—"),
    status: String(payment?.status || getVerificationState({ payments: [payment] }) || "—"),
    utrNumber: String(payment?.utrNumber || payment?.utr || payment?.upiUtr || "").trim(),
    transactionRef: String(payment?.transactionRef || payment?.reference || "").trim(),
    createdAt: payment?.createdAt,
    verifiedAt: payment?.verifiedAt,
  }));
};

const getRoleLabel = (value?: string) => {
  const normalized = String(value || "").trim().toUpperCase();
  if (normalized === "NURSERY_ADMIN" || normalized === "ADMIN") return "Admin";
  if (normalized === "SUPER_ADMIN") return "Super Admin";
  if (normalized === "STAFF") return "Staff";
  if (normalized === "CUSTOMER") return "Customer";
  return normalized ? normalizeStatusLabel(normalized) : "Unknown Role";
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
  const plantName =
    item?.plantTypeName ||
    item?.inventoryLabel ||
    plantType?.name ||
    "Plant";
  const category =
    item?.plantCategory ||
    plantType?.category ||
    "Uncategorized";
  const quantity = Number(item?.quantity ?? 0) || 0;
  const unitPrice =
    Number(item?.priceAtSale ?? item?.unitPrice ?? item?.price ?? 0) || 0;
  const lineTotal = unitPrice * quantity;
  const thumbnail =
    resolveEntityImage(item?.plantImage ? { imageUrl: item.plantImage } : null) ??
    resolveEntityImage(
      item?.plantTypeName
        ? { name: item.plantTypeName, imageUrl: item.plantImage }
        : null,
    ) ??
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

// ==================== STAT CARD ====================

interface StatCardProps {
  label: string;
  value: string;
  sublabel?: string;
  icon: string;
  color: string;
  trend?: "up" | "down" | "neutral";
}

const StatCard = ({ label, value, sublabel, icon, color, trend }: StatCardProps) => (
  <View style={[styles.statCard, { borderColor: "#E5E7EB" }]}>
    <View style={styles.statHeader}>
      <View style={[styles.statIconContainer, { backgroundColor: `${color}10` }]}>
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
    <Text style={styles.statLabel}>{label}</Text>
    <Text style={[styles.statValue, { color }]}>{value}</Text>
    {sublabel && <Text style={styles.statSublabel}>{sublabel}</Text>}
  </View>
);

// ==================== ACTION BUTTON ====================

interface ActionButtonProps {
  icon: string;
  label: string;
  onPress: () => void;
  color: string;
}

const ActionButton = ({ icon, label, onPress, color }: ActionButtonProps) => (
  <TouchableOpacity
    onPress={onPress}
    style={[styles.actionButton, { backgroundColor: color }]}
    activeOpacity={0.8}
  >
    <MaterialIcons name={icon as any} size={16} color={AdminTheme.colors.surface} />
    <Text style={styles.actionButtonText}>{label}</Text>
  </TouchableOpacity>
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

// ==================== RETURN ENTRY CARD ====================

interface ReturnEntryCardProps {
  entry: any;
}

const ReturnEntryCard = ({ entry }: ReturnEntryCardProps) => (
  <View style={styles.returnCard}>
    <View style={styles.returnHeader}>
      <View style={[styles.returnIcon, { backgroundColor: `${AdminTheme.colors.warning}10` }]}>
        <MaterialIcons name="assignment-return" size={16} color={AdminTheme.colors.warning} />
      </View>
      <Text style={styles.returnTitle}>Return Entry</Text>
    </View>
    
    <View style={styles.returnContent}>
      <View style={styles.returnRow}>
        <Text style={styles.returnLabel}>Quantity</Text>
        <Text style={styles.returnValue}>{formatNumber(Number(entry?.quantity || 0))}</Text>
      </View>
      <View style={styles.returnRow}>
        <Text style={styles.returnLabel}>Refund Amount</Text>
        <Text style={styles.returnValue}>{formatCurrency(Number(entry?.refundAmount || 0))}</Text>
      </View>
      {entry?.reason && (
        <View style={styles.returnReason}>
          <Text style={styles.returnReasonText}>{entry.reason}</Text>
        </View>
      )}
    </View>
  </View>
);

// ==================== LOADING STATE ====================

const LoadingState = () => (
  <View style={styles.centerContainer}>
    <ActivityIndicator size="large" color={AdminTheme.colors.primary} />
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
    <StitchHeader
      title={title}
      subtitle="Sale summary and payments"
      variant="gradient"
      showBackButton
      onBackPress={onBack}
    />
    <View style={styles.errorContainer}>
      <View style={styles.errorIconWrapper}>
        <MaterialIcons name="error-outline" size={48} color={AdminTheme.colors.danger} />
      </View>
      <Text style={styles.errorTitle}>Failed to Load Sale</Text>
      <Text style={styles.errorMessage}>
        {error?.message || "We couldn't load the sale details."}
      </Text>
      <TouchableOpacity onPress={onRetry} style={styles.retryButton} activeOpacity={0.7}>
        <LinearGradient
          colors={[AdminTheme.colors.primary, AdminTheme.colors.primary]}
          style={styles.retryGradient}
        >
          <MaterialIcons name="refresh" size={18} color={AdminTheme.colors.surface} />
          <Text style={styles.retryButtonText}>Try Again</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  </View>
);

// ==================== PAYMENT MODAL ====================

interface PaymentModalProps {
  visible: boolean;
  onClose: () => void;
  dueAmount: number;
  onSubmit: (amount: number, mode: ApiPaymentMode, utr: string, reference: string) => void;
  isPending: boolean;
}

const PaymentModal = ({ visible, onClose, dueAmount, onSubmit, isPending }: PaymentModalProps) => {
  const [amount, setAmount] = useState(String(Math.max(0, Math.round(dueAmount))));
  const [mode, setMode] = useState<ApiPaymentMode>("CASH");
  const [utr, setUtr] = useState("");
  const [reference, setReference] = useState("");

  useEffect(() => {
    if (!visible) return;
    setAmount(String(Math.max(0, Math.round(dueAmount))));
    setMode("CASH");
    setUtr("");
    setReference("");
  }, [dueAmount, visible]);

  const handleSubmit = () => {
    const numAmount = Number(amount);
    if (!Number.isFinite(numAmount) || numAmount <= 0) {
      Alert.alert("Invalid Amount", "Enter a valid amount greater than 0.");
      return;
    }
    if (numAmount > dueAmount) {
      Alert.alert("Invalid Amount", "Amount cannot exceed pending due.");
      return;
    }
    if (mode !== "CASH" && !utr.trim()) {
      Alert.alert("Missing UTR", "UTR/transaction ID is required for non-cash payments.");
      return;
    }
    onSubmit(numAmount, mode, utr, reference);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Update Payment</Text>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
              <MaterialIcons name="close" size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <View style={styles.modalDueBadge}>
            <Text style={styles.modalDueLabel}>Pending Due</Text>
            <Text style={styles.modalDueValue}>{formatCurrency(dueAmount)}</Text>
          </View>

          <View style={styles.modalSection}>
            <Text style={styles.modalLabel}>Amount</Text>
            <View style={styles.modalInputContainer}>
              <Text style={styles.modalInputCurrency}>₹</Text>
              <TextInput
                value={amount}
                onChangeText={(text) => setAmount(text.replace(/[^0-9.]/g, ""))}
                placeholder="Enter amount"
                keyboardType="decimal-pad"
                placeholderTextColor="#9CA3AF"
                style={styles.modalInput}
              />
            </View>
          </View>

          <View style={styles.modalSection}>
            <Text style={styles.modalLabel}>Payment Mode</Text>
            <View style={styles.modeGrid}>
              {(["CASH", "UPI", "ONLINE"] as ApiPaymentMode[]).map((paymentMode) => (
                <TouchableOpacity
                  key={paymentMode}
                  onPress={() => setMode(paymentMode)}
                  style={[
                    styles.modeOption,
                    mode === paymentMode && styles.modeOptionActive,
                  ]}
                >
                  <MaterialIcons
                    name={paymentMode === "CASH" ? "payments" : paymentMode === "UPI" ? "qr-code" : "language"}
                    size={18}
                    color={mode === paymentMode ? AdminTheme.colors.primary : "#6B7280"}
                  />
                  <Text
                    style={[
                      styles.modeOptionText,
                      mode === paymentMode && styles.modeOptionTextActive,
                    ]}
                  >
                    {paymentMode}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {mode !== "CASH" && (
            <View style={styles.modalSection}>
              <Text style={styles.modalLabel}>UTR / Transaction ID</Text>
              <TextInput
                value={utr}
                onChangeText={setUtr}
                placeholder="Enter UTR number"
                placeholderTextColor="#9CA3AF"
                style={styles.modalInput}
                autoCapitalize="characters"
              />
            </View>
          )}

          <View style={styles.modalSection}>
            <Text style={styles.modalLabel}>Reference (Optional)</Text>
            <TextInput
              value={reference}
              onChangeText={setReference}
              placeholder="Add a note"
              placeholderTextColor="#9CA3AF"
              style={styles.modalInput}
            />
          </View>

          <View style={styles.modalActions}>
            <TouchableOpacity onPress={onClose} style={styles.modalCancelButton}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={isPending}
              style={[styles.modalSaveButton, isPending && styles.modalSaveButtonDisabled]}
            >
              {isPending ? (
                <ActivityIndicator size="small" color={AdminTheme.colors.surface} />
              ) : (
                <Text style={styles.modalSaveText}>Save Payment</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

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
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const { data, isLoading, error, refetch } = useQuery<Sale>({
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
      setShowPaymentModal(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["sales"] }),
        queryClient.invalidateQueries({ queryKey: ["sale", id] }),
      ]);
      Alert.alert("✅ Success", "Walk-in payment has been recorded successfully.");
    },
    onError: (err: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("❌ Error", err?.message || "Failed to record payment.");
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

  const handlePaymentSubmit = (
    amount: number,
    mode: ApiPaymentMode,
    utr: string,
    reference: string
  ) => {
    if (!id) return;
    addWalkInPaymentMutation.mutate({
      saleId: id,
      amount,
      mode,
      utrNumber: mode === "CASH" ? undefined : utr,
      transactionRef: reference || utr || undefined,
    });
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
  const grossAmount = inferGrossAmount(data);
  const discountAmount = toNumber(data.discountAmount);
  const netAmount = inferNetAmount(data);
  const paidAmount = inferPaidAmount(data);
  const dueAmount = data.dueAmount != null ? Math.max(0, toNumber(data.dueAmount)) : Math.max(0, netAmount - paidAmount);
  const paymentStatus = getDerivedPaymentStatus(data, dueAmount, paidAmount);
  const verificationState = getVerificationState(data);
  const totalProfit = toNumber(data.totalProfit);
  const profitMargin = netAmount > 0 ? (totalProfit / netAmount) * 100 : 0;
  const customerDetails = getCustomerDetails(data);
  const isWalkInSale = !data.customer?._id && !customerDetails.phone;
  const canStaffUpdateWalkInPayment = role === "STAFF" && isWalkInSale && dueAmount > 0;

  const paymentInfo = getPaymentInfo(data.paymentMode);
  const paymentStatusInfo = getPaymentStatusInfo(paymentStatus);
  const statusInfo = getStatusInfo(data.status || "COMPLETED");
  const saleDateTime = data.saleDate || data.createdAt;
  const saleDate = formatDate(saleDateTime);
  const saleTime = formatTime(saleDateTime);

  const items = Array.isArray(data.items) ? data.items : [];
  const totalItems = items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  const uniqueItems = items.length;
  const payments = getPaymentTimeline(data);

  const sellerName = typeof data.performedBy === "string"
    ? data.performedBy
    : data.performedBy?.name || "Unknown Staff";
  const performerRole = getRoleLabel(
    (typeof data.performedBy === "object" ? data.performedBy?.role : undefined) || data.roleAtTime,
  );

  const returns = Array.isArray(data.returns) ? data.returns : [];

  return (
    <View style={styles.container}>
      <StitchHeader
        title={title}
        subtitle="Sale summary and payments"
        variant="gradient"
        showBackButton
        onBackPress={handleBack}
      />

      {/* Status Bar */}
      <View style={styles.statusBar}>
        <View style={styles.statusBarLeft}>
          <View style={[styles.statusBadge, { backgroundColor: paymentInfo.bg }]}>
            <MaterialIcons name={paymentInfo.icon as any} size={12} color={paymentInfo.color} />
            <Text style={[styles.statusBadgeText, { color: paymentInfo.color }]}>
              {paymentInfo.label}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: paymentStatusInfo.bg }]}>
            <MaterialIcons
              name={paymentStatusInfo.icon as any}
              size={12}
              color={paymentStatusInfo.color}
            />
            <Text style={[styles.statusBadgeText, { color: paymentStatusInfo.color }]}>
              {paymentStatusInfo.label}
            </Text>
          </View>
        </View>
        <View style={styles.dateTime}>
          <MaterialIcons name="calendar-today" size={12} color="#9CA3AF" />
          <Text style={styles.dateTimeText}>
            {saleDate} at {saleTime}
          </Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Action Buttons */}
        {canManageSale && (
          <View style={styles.actionGrid}>
            <ActionButton
              icon="receipt-long"
              label="Generate Bill"
              onPress={handleGenerateBill}
              color={AdminTheme.colors.primary}
            />
            <ActionButton
              icon="assignment-return"
              label="Create Return"
              onPress={handleReturn}
              color={AdminTheme.colors.warning}
            />
            {canStaffUpdateWalkInPayment && (
              <ActionButton
                icon="payments"
                label="Update Payment"
                onPress={() => setShowPaymentModal(true)}
                color={AdminTheme.colors.success}
              />
            )}
          </View>
        )}

        {/* Key Metrics */}
        <View style={styles.metricsGrid}>
          <StatCard
            label="Net Amount"
            value={formatCurrency(netAmount)}
            icon="receipt"
            color={AdminTheme.colors.primary}
          />
          <StatCard
            label={dueAmount > 0 ? "Pending Due" : "Payment Complete"}
            value={formatCurrency(dueAmount > 0 ? dueAmount : paidAmount)}
            sublabel={normalizeStatusLabel(paymentStatus)}
            icon={dueAmount > 0 ? "pending-actions" : "check-circle"}
            color={dueAmount > 0 ? AdminTheme.colors.warning : AdminTheme.colors.success}
          />
          {showFinancialInsights && (
            <StatCard
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
          <View style={styles.summaryHeader}>
            <View style={styles.summaryHeaderLeft}>
              <View style={[styles.summaryIcon, { backgroundColor: `${AdminTheme.colors.primary}10` }]}>
                <MaterialIcons name="receipt" size={16} color={AdminTheme.colors.primary} />
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
              <Text style={styles.summaryLabel}>Sale Number</Text>
              <Text style={styles.summaryValue}>
                {String(data.saleNumber || data._id || "—").toUpperCase()}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>{formatCurrency(grossAmount)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Discount</Text>
              <Text style={styles.summaryValue}>{formatCurrency(discountAmount)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Net Amount</Text>
              <Text style={styles.summaryValue}>{formatCurrency(netAmount)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Paid</Text>
              <Text style={[styles.summaryValue, { color: "#059669" }]}>{formatCurrency(paidAmount)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Due</Text>
              <Text style={[styles.summaryValue, { color: "#DC2626" }]}>{formatCurrency(dueAmount)}</Text>
            </View>

            <View style={styles.summaryDividerLight} />

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Payment Status</Text>
              <View style={[styles.statusPill, { backgroundColor: dueAmount > 0 ? "#FEF2F2" : "#ECFDF5" }]}>
                <Text style={[styles.statusPillText, { color: dueAmount > 0 ? "#DC2626" : "#059669" }]}>
                  {normalizeStatusLabel(paymentStatus)}
                </Text>
              </View>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Sale Status</Text>
              <View style={[styles.statusPill, { backgroundColor: statusInfo.bg }]}>
                <Text style={[styles.statusPillText, { color: statusInfo.color }]}>
                  {statusInfo.label}
                </Text>
              </View>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Verification</Text>
              <View style={[styles.statusPill, { backgroundColor: "#F3F4F6" }]}>
                <Text style={[styles.statusPillText, { color: "#374151" }]}>
                  {normalizeStatusLabel(verificationState)}
                </Text>
              </View>
            </View>

            {showFinancialInsights && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Profit</Text>
                <Text style={[styles.summaryValue, { color: totalProfit >= 0 ? "#059669" : "#DC2626" }]}>
                  {totalProfit >= 0 ? "+" : ""}{formatCurrency(totalProfit)}
                </Text>
              </View>
            )}
          </View>

          {/* Staff Info */}
          <View style={styles.staffContainer}>
            <View style={[styles.staffAvatar, { backgroundColor: `${AdminTheme.colors.primary}10` }]}>
              <Text style={[styles.staffInitial, { color: AdminTheme.colors.primary }]}>
                {sellerName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.staffInfo}>
              <Text style={styles.staffMetaLabel}>Performed By</Text>
              <Text style={styles.staffName}>{sellerName}</Text>
              <Text style={styles.staffRole}>{performerRole}</Text>
            </View>
          </View>

          {/* Customer Info */}
          {(customerDetails.name || customerDetails.phone || customerDetails.address) && (
            <View style={styles.customerContainer}>
              <View style={styles.customerHeader}>
                <MaterialIcons name="person" size={14} color="#9CA3AF" />
                <Text style={styles.customerHeaderText}>Customer</Text>
              </View>
              <View style={styles.customerContent}>
                <Text style={styles.customerName}>{customerDetails.name || "Walk-in Customer"}</Text>
                {customerDetails.phone && (
                  <Text style={styles.customerPhone}>{customerDetails.phone}</Text>
                )}
                {customerDetails.address && (
                  <Text style={styles.customerAddress}>{customerDetails.address}</Text>
                )}
              </View>
            </View>
          )}
        </View>

        {payments.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderLeft}>
                <View style={[styles.sectionIcon, { backgroundColor: `${AdminTheme.colors.info}10` }]}>
                  <MaterialIcons name="payments" size={16} color={AdminTheme.colors.info} />
                </View>
                <Text style={styles.sectionTitle}>Payments</Text>
              </View>
              <Text style={styles.sectionCount}>
                {payments.length} {payments.length === 1 ? "entry" : "entries"}
              </Text>
            </View>

            {payments.map((payment) => (
              <View key={payment.id} style={styles.paymentCard}>
                <View style={styles.paymentCardHeader}>
                  <Text style={styles.paymentCardAmount}>{formatCurrency(payment.amount)}</Text>
                  <View style={styles.paymentStatusPill}>
                    <Text style={styles.paymentStatusText}>
                      {normalizeStatusLabel(payment.status)}
                    </Text>
                  </View>
                </View>
                <View style={styles.paymentMetaRow}>
                  <Text style={styles.paymentMetaLabel}>Mode</Text>
                  <Text style={styles.paymentMetaValue}>{normalizeStatusLabel(payment.mode)}</Text>
                </View>
                {payment.utrNumber ? (
                  <View style={styles.paymentMetaRow}>
                    <Text style={styles.paymentMetaLabel}>UTR</Text>
                    <Text style={styles.paymentMetaValue}>{payment.utrNumber}</Text>
                  </View>
                ) : null}
                {payment.transactionRef ? (
                  <View style={styles.paymentMetaRow}>
                    <Text style={styles.paymentMetaLabel}>Reference</Text>
                    <Text style={styles.paymentMetaValue}>{payment.transactionRef}</Text>
                  </View>
                ) : null}
                {payment.createdAt ? (
                  <View style={styles.paymentMetaRow}>
                    <Text style={styles.paymentMetaLabel}>Recorded</Text>
                    <Text style={styles.paymentMetaValue}>
                      {formatDate(payment.createdAt)} {formatTime(payment.createdAt)}
                    </Text>
                  </View>
                ) : null}
              </View>
            ))}
          </View>
        )}

        {/* Items Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderLeft}>
              <View style={[styles.sectionIcon, { backgroundColor: `${AdminTheme.colors.primary}10` }]}>
                <MaterialIcons name="shopping-bag" size={16} color={AdminTheme.colors.primary} />
              </View>
              <Text style={styles.sectionTitle}>Items Sold</Text>
            </View>
            <Text style={styles.sectionCount}>{uniqueItems} items</Text>
          </View>

          {items.map((item: any, index: number) => (
            <ItemCard key={getItemKey(item, index)} item={item} />
          ))}
        </View>

        {/* Returns Section */}
        {returns.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderLeft}>
                <View style={[styles.sectionIcon, { backgroundColor: `${AdminTheme.colors.warning}10` }]}>
                  <MaterialIcons name="assignment-return" size={16} color={AdminTheme.colors.warning} />
                </View>
                <Text style={styles.sectionTitle}>Returns</Text>
              </View>
              <Text style={styles.sectionCount}>{returns.length} {returns.length === 1 ? "entry" : "entries"}</Text>
            </View>

            {returns.map((entry: any, idx: number) => (
              <ReturnEntryCard key={entry?._id || idx} entry={entry} />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Payment Modal */}
      <PaymentModal
        visible={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        dueAmount={dueAmount}
        onSubmit={handlePaymentSubmit}
        isPending={addWalkInPaymentMutation.isPending}
      />
    </View>
  );
}

// ==================== STYLES ====================

const styles = {
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },

  // Status Bar
  statusBar: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  statusBarLeft: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
  },
  statusBadge: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
    gap: 4,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "600" as const,
  },
  dateTime: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
  },
  dateTimeText: {
    fontSize: 11,
    color: "#9CA3AF",
  },

  // Scroll Content
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: BOTTOM_NAV_HEIGHT + 20,
    gap: 16,
  },

  // Action Grid
  actionGrid: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: 8,
    marginBottom: 4,
    width:"100%",
    justifyContent:"space-between",
    // backgroundColor:"red"
  },
  actionButton: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    minWidth: 120,
    width:"48%"
  },
  actionButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600" as const,
  },

  // Metrics Grid
  metricsGrid: {
    flexDirection: "row" as const,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  statHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    marginBottom: 12,
  },
  statIconContainer: {
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
  statLabel: {
    fontSize: 11,
    color: "#6B7280",
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700" as const,
    marginBottom: 2,
  },
  statSublabel: {
    fontSize: 10,
    color: "#9CA3AF",
  },

  // Summary Card
  summaryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
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
  summaryDividerLight: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginVertical: 8,
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
    fontWeight: "600" as const,
    color: "#111827",
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: "600" as const,
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
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  staffInitial: {
    fontSize: 16,
    fontWeight: "600" as const,
  },
  staffInfo: {
    flex: 1,
  },
  staffMetaLabel: {
    fontSize: 11,
    color: "#9CA3AF",
    textTransform: "uppercase" as const,
    letterSpacing: 0.6,
    marginBottom: 4,
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
    marginBottom: 2,
  },
  customerAddress: {
    fontSize: 12,
    color: "#9CA3AF",
  },

  // Sections
  section: {
    marginBottom: 8,
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
    backgroundColor: "#FFFFFF",
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

  // Return Card
  returnCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  returnHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    marginBottom: 10,
  },
  returnIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  returnTitle: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: "#111827",
  },
  returnContent: {
    gap: 6,
  },
  returnRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
  },
  returnLabel: {
    fontSize: 12,
    color: "#6B7280",
  },
  returnValue: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: "#111827",
  },
  returnReason: {
    marginTop: 6,
    padding: 8,
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
  },
  returnReasonText: {
    fontSize: 12,
    color: "#374151",
    fontStyle: "italic" as const,
  },

  // Payment Cards
  paymentCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 8,
  },
  paymentCardHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
  },
  paymentCardAmount: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: "#111827",
  },
  paymentStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: "#F3F4F6",
  },
  paymentStatusText: {
    fontSize: 11,
    fontWeight: "600" as const,
    color: "#374151",
  },
  paymentMetaRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    gap: 12,
  },
  paymentMetaLabel: {
    fontSize: 12,
    color: "#6B7280",
  },
  paymentMetaValue: {
    flex: 1,
    fontSize: 12,
    fontWeight: "500" as const,
    color: "#111827",
    textAlign: "right" as const,
  },

  // Payment Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center" as const,
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
  },
  modalHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: "#111827",
  },
  modalCloseButton: {
    padding: 4,
  },
  modalDueBadge: {
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    alignItems: "center" as const,
  },
  modalDueLabel: {
    fontSize: 11,
    color: "#6B7280",
    marginBottom: 2,
  },
  modalDueValue: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: "#111827",
  },
  modalSection: {
    marginBottom: 16,
  },
  modalLabel: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: "#374151",
    marginBottom: 6,
  },
  modalInputContainer: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    height: 48,
    paddingHorizontal: 12,
  },
  modalInputCurrency: {
    fontSize: 16,
    color: "#6B7280",
    marginRight: 4,
  },
  modalInput: {
    flex: 1,
    fontSize: 14,
    color: "#111827",
  },
  modeGrid: {
    flexDirection: "row" as const,
    gap: 8,
  },
  modeOption: {
    flex: 1,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  modeOptionActive: {
    borderColor: AdminTheme.colors.primary,
    backgroundColor: `${AdminTheme.colors.primary}05`,
  },
  modeOptionText: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: "#6B7280",
  },
  modeOptionTextActive: {
    color: AdminTheme.colors.primary,
  },
  modalActions: {
    flexDirection: "row" as const,
    gap: 12,
    marginTop: 8,
  },
  modalCancelButton: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: "#6B7280",
  },
  modalSaveButton: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: AdminTheme.colors.primary,
  },
  modalSaveButtonDisabled: {
    opacity: 0.5,
  },
  modalSaveText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600" as const,
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
    fontSize: 14,
    color: "#6B7280",
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
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600" as const,
  },
} as const;
