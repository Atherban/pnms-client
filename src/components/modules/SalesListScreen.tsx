import { MaterialIcons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeIn, Layout } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { SalesService } from "../../services/sales.service";
import { useAuthStore } from "../../stores/auth.store";
import { toImageUrl } from "../../utils/image";
import { canViewSensitivePricing } from "../../utils/rbac";
import { AdminTheme } from "../admin/theme";
import StitchHeader from "../common/StitchHeader";
import { moduleBadge } from "../common/moduleStyles";
import StitchCard from "../common/StitchCard";
import StitchInput from "../common/StitchInput";
import StitchSectionHeader from "../common/StitchSectionHeader";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const BOTTOM_NAV_HEIGHT = 80;

type RoleGroup = "staff" | "admin" | "customer";

interface SalesListScreenProps {
  title?: string;
  routeGroup: RoleGroup;
  canCreate?: boolean;
}

// ==================== CONSTANTS & TYPES ====================

const PAYMENT_METHODS = {
  CASH: {
    label: "Cash",
    icon: "payments",
    color: "#10B981",
    bg: "#ECFDF5",
  },
  UPI: {
    label: "UPI",
    icon: "qr-code",
    color: "#3B82F6",
    bg: "#EFF6FF",
  },
  CARD: {
    label: "Card",
    icon: "credit-card",
    color: "#8B5CF6",
    bg: "#F5F3FF",
  },
  ONLINE: {
    label: "Online",
    icon: "language",
    color: "#F59E0B",
    bg: "#FFFBEB",
  },
  OTHER: {
    label: "Other",
    icon: "receipt",
    color: "#6B7280",
    bg: "#F3F4F6",
  },
} as const;

const SALE_STATUS = {
  COMPLETED: {
    label: "Completed",
    icon: "check-circle",
    color: "#10B981",
    bg: "#ECFDF5",
  },
  PENDING: {
    label: "Pending",
    icon: "pending",
    color: "#F59E0B",
    bg: "#FFFBEB",
  },
  CANCELLED: {
    label: "Cancelled",
    icon: "cancel",
    color: "#EF4444",
    bg: "#FEF2F2",
  },
} as const;

const PAYMENT_STATUS_TAGS = {
  PAID: {
    label: "Paid",
    icon: "check-circle",
    color: "#10B981",
    bg: "#ECFDF5",
  },
  PARTIALLY_PAID: {
    label: "Partially Paid",
    icon: "hourglass-bottom",
    color: "#F59E0B",
    bg: "#FFFBEB",
  },
  UNPAID: {
    label: "Unpaid",
    icon: "warning",
    color: "#EF4444",
    bg: "#FEF2F2",
  },
} as const;

const DATE_RANGES = [
  { id: "TODAY", label: "Today", icon: "today" },
  { id: "WEEK", label: "This Week", icon: "calendar-view-week" },
  { id: "MONTH", label: "This Month", icon: "calendar-month" },
] as const;

const SORT_OPTIONS = [
  { id: "date_desc", label: "Newest First", icon: "schedule" },
  { id: "date_asc", label: "Oldest First", icon: "history" },
  { id: "amount_desc", label: "Highest Amount", icon: "arrow-downward" },
  { id: "amount_asc", label: "Lowest Amount", icon: "arrow-upward" },
  { id: "profit_desc", label: "Highest Profit", icon: "trending-up" },
  { id: "profit_asc", label: "Lowest Profit", icon: "trending-down" },
] as const;

type PaymentMethod = keyof typeof PAYMENT_METHODS;
type SaleStatus = keyof typeof SALE_STATUS;
type DateRangeId = (typeof DATE_RANGES)[number]["id"];
type SortOptionId = (typeof SORT_OPTIONS)[number]["id"];

interface FilterState {
  paymentMethods: PaymentMethod[];
  status: SaleStatus[];
  dateRange: DateRangeId | null;
  minAmount: number | null;
  maxAmount: number | null;
  search: string;
  sort: SortOptionId;
}

// ==================== UTILITY FUNCTIONS ====================

const getSaleAmount = (sale: any): number => {
  if (sale?.totalAmount) return Number(sale.totalAmount);
  if (Array.isArray(sale?.items)) {
    return sale.items.reduce((sum: number, item: any) => {
      const price = Number(
        item.priceAtSale ?? item.unitPrice ?? item.price ?? 0,
      );
      const qty = Number(item.quantity ?? 0);
      return sum + price * qty;
    }, 0);
  }
  return 0;
};

const getSaleQty = (sale: any): number => {
  const saleKind = String(sale?.saleKind || "").toUpperCase();
  if (saleKind === "SERVICE_SALE") {
    const batch =
      sale?.customerSeedBatch && typeof sale.customerSeedBatch === "object"
        ? sale.customerSeedBatch
        : null;
    const units = Number(
      batch?.germinatedQuantity ??
        batch?.seedsGerminated ??
        batch?.seedsSown ??
        0,
    );
    return Number.isFinite(units) && units > 0 ? units : 1;
  }
  if (Array.isArray(sale?.items)) {
    return sale.items.reduce(
      (sum: number, item: any) => sum + (Number(item.quantity) || 0),
      0,
    );
  }
  return 0;
};

const getSaleDateValue = (sale: any): string | undefined =>
  sale?.saleDate ?? sale?.createdAt;

const getSellerName = (sale: any): string => {
  if (typeof sale?.performedBy === "object" && sale?.performedBy?.name) {
    return sale.performedBy.name;
  }
  if (typeof sale?.performedBy === "string" && sale.performedBy.trim()) {
    return sale.performedBy;
  }
  return "Unknown Staff";
};

const getItemPlantNames = (sale: any): string[] => {
  const saleKind = String(sale?.saleKind || "").toUpperCase();
  if (saleKind === "SERVICE_SALE") {
    const batch =
      sale?.customerSeedBatch && typeof sale.customerSeedBatch === "object"
        ? sale.customerSeedBatch
        : null;
    const serviceName =
      batch?.plantTypeId?.name ||
      sale?.serviceInvoice?.plantTypeName ||
      "Seedling Service";
    return [serviceName];
  }
  if (!Array.isArray(sale?.items)) return [];
  const names: string[] = sale.items
    .map((item: any) => {
      const inventoryPlantName =
        item?.plantTypeName ??
        item?.inventoryLabel ??
        item?.inventory?.plantType?.name ??
        item?.inventoryId?.plantType?.name ??
        item?.plantType?.name;
      return typeof inventoryPlantName === "string" ? inventoryPlantName : "";
    })
    .filter((name: string): name is string => Boolean(name));
  return Array.from(new Set<string>(names));
};

const resolveEntityImage = (entity: any): string | undefined => {
  if (!entity || typeof entity !== "object") return undefined;

  const direct = toImageUrl(
    entity.imageUrl ??
      entity.image ??
      entity.fileUrl ??
      entity.url ??
      entity.path ??
      entity.fileName,
  );
  if (direct) return direct;

  const images = Array.isArray(entity.images) ? entity.images : [];
  for (const img of images) {
    const uri = toImageUrl(
      img?.imageUrl ?? img?.fileUrl ?? img?.url ?? img?.path ?? img?.fileName,
    );
    if (uri) return uri;
  }

  return undefined;
};

const getSaleThumbnail = (sale: any): string | undefined => {
  if (Array.isArray(sale?.items)) {
    for (const item of sale.items) {
      const candidates = [
        item?.plantImage ? { imageUrl: item.plantImage } : null,
        item?.plantTypeName
          ? {
              name: item.plantTypeName,
              imageUrl: item.plantImage,
            }
          : null,
        item?.inventory?.plantType,
        item?.inventoryId?.plantType,
        item?.plantType,
        item?.inventory,
        item?.inventoryId,
        item,
      ];

      for (const candidate of candidates) {
        const uri = resolveEntityImage(candidate);
        if (uri) return uri;
      }
    }
  }

  return resolveEntityImage(sale?.plantType) ?? resolveEntityImage(sale);
};

const getPaymentInfo = (mode?: string) => {
  const key = mode?.toUpperCase() as PaymentMethod;
  return PAYMENT_METHODS[key] || PAYMENT_METHODS.OTHER;
};

const getPaymentTagInfo = (sale: any) => {
  const paymentStatus = String(sale?.paymentStatus || "").toUpperCase();
  if (paymentStatus === "PAID") return PAYMENT_STATUS_TAGS.PAID;
  if (paymentStatus === "PARTIALLY_PAID")
    return PAYMENT_STATUS_TAGS.PARTIALLY_PAID;
  if (paymentStatus === "UNPAID" || paymentStatus === "OVERDUE") {
    return PAYMENT_STATUS_TAGS.UNPAID;
  }
  const due = Number(sale?.dueAmount ?? 0) || 0;
  const paid = Number(sale?.paidAmount ?? 0) || 0;
  if (due <= 0) return PAYMENT_STATUS_TAGS.PAID;
  if (paid > 0) return PAYMENT_STATUS_TAGS.PARTIALLY_PAID;
  return PAYMENT_STATUS_TAGS.UNPAID;
};

const getStatusKey = (sale: any): SaleStatus => {
  const raw = sale?.status;
  if (typeof raw === "string") {
    const key = raw.toUpperCase() as SaleStatus;
    if (SALE_STATUS[key]) return key;
  }
  return "COMPLETED";
};

const isWithinDateRange = (
  dateString: string | undefined,
  rangeId: DateRangeId,
): boolean => {
  if (!dateString) return false;

  const date = new Date(dateString);
  date.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  switch (rangeId) {
    case "TODAY":
      return date.getTime() === today.getTime();
    case "WEEK": {
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      return date >= weekAgo;
    }
    case "MONTH": {
      const monthAgo = new Date(today);
      monthAgo.setDate(monthAgo.getDate() - 30);
      return date >= monthAgo;
    }
    default:
      return true;
  }
};

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatCompactCurrency = (amount: number): string => {
  if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(1)}L`;
  }
  if (amount >= 1000) {
    return `₹${(amount / 1000).toFixed(1)}K`;
  }
  return `₹${amount}`;
};

const formatDate = (dateString?: string): string => {
  if (!dateString) return "—";
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return `Today, ${date.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })}`;
  } else if (date.toDateString() === yesterday.toDateString()) {
    return `Yesterday, ${date.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })}`;
  } else {
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }
};

// ==================== FILTER MODAL COMPONENT ====================

interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  filters: FilterState;
  onApplyFilters: (filters: Partial<FilterState>) => void;
  onClearFilters: () => void;
  filterCounts: {
    paymentMethods: Record<PaymentMethod, number>;
    status: Record<SaleStatus, number>;
  };
}

const FilterModal = ({
  visible,
  onClose,
  filters,
  onApplyFilters,
  onClearFilters,
  filterCounts,
}: FilterModalProps) => {
  const [localFilters, setLocalFilters] = useState(filters);

  const handleApply = () => {
    onApplyFilters(localFilters);
    onClose();
  };

  const handleClear = () => {
    setLocalFilters({
      paymentMethods: [],
      status: [],
      dateRange: null,
      minAmount: null,
      maxAmount: null,
      search: localFilters.search,
      sort: localFilters.sort,
    });
  };

  const togglePaymentMethod = (method: PaymentMethod) => {
    setLocalFilters((prev) => ({
      ...prev,
      paymentMethods: prev.paymentMethods.includes(method)
        ? prev.paymentMethods.filter((m) => m !== method)
        : [...prev.paymentMethods, method],
    }));
  };

  const toggleStatus = (status: SaleStatus) => {
    setLocalFilters((prev) => ({
      ...prev,
      status: prev.status.includes(status)
        ? prev.status.filter((s) => s !== status)
        : [...prev.status, status],
    }));
  };

  const selectDateRange = (rangeId: DateRangeId) => {
    setLocalFilters((prev) => ({
      ...prev,
      dateRange: prev.dateRange === rangeId ? null : rangeId,
    }));
  };

  const activeFilterCount =
    localFilters.paymentMethods.length +
    localFilters.status.length +
    (localFilters.dateRange ? 1 : 0) +
    (localFilters.minAmount !== null ? 1 : 0) +
    (localFilters.maxAmount !== null ? 1 : 0);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <BlurView intensity={20} tint="dark" style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderContent}>
              <View style={styles.modalHeaderLeft}>
                <MaterialIcons
                  name="tune"
                  size={24}
                  color={AdminTheme.colors.primary}
                />
                <Text style={styles.modalHeaderTitle}>Filter Sales</Text>
              </View>
              <TouchableOpacity
                onPress={onClose}
                style={styles.modalCloseButton}
              >
                <MaterialIcons
                  name="close"
                  size={24}
                  color={AdminTheme.colors.textMuted}
                />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView
            style={styles.modalBody}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.modalBodyContent}
          >
            {/* Payment Method Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Payment Method</Text>
              <View style={styles.filterOptionsGrid}>
                {Object.entries(PAYMENT_METHODS).map(([key, method]) => {
                  const isSelected = localFilters.paymentMethods.includes(
                    key as PaymentMethod,
                  );
                  return (
                    <TouchableOpacity
                      key={key}
                      style={[
                        styles.filterOption,
                        isSelected && {
                          backgroundColor: method.bg,
                          borderColor: method.color,
                        },
                      ]}
                      onPress={() => togglePaymentMethod(key as PaymentMethod)}
                      activeOpacity={0.7}
                    >
                      <MaterialIcons
                        name={method.icon as any}
                        size={20}
                        color={
                          isSelected
                            ? method.color
                            : AdminTheme.colors.textMuted
                        }
                      />
                      <Text
                        style={[
                          styles.filterOptionLabel,
                          isSelected && {
                            color: method.color,
                            fontWeight: "600",
                          },
                        ]}
                      >
                        {method.label}
                      </Text>
                      {filterCounts.paymentMethods[key as PaymentMethod] >
                        0 && (
                        <View
                          style={[
                            styles.filterOptionBadge,
                            { backgroundColor: method.bg },
                          ]}
                        >
                          <Text
                            style={[
                              styles.filterOptionBadgeText,
                              { color: method.color },
                            ]}
                          >
                            {filterCounts.paymentMethods[key as PaymentMethod]}
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Status Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Status</Text>
              <View style={styles.filterOptionsGrid}>
                {Object.entries(SALE_STATUS).map(([key, status]) => {
                  const isSelected = localFilters.status.includes(
                    key as SaleStatus,
                  );
                  return (
                    <TouchableOpacity
                      key={key}
                      style={[
                        styles.filterOption,
                        isSelected && {
                          backgroundColor: status.bg,
                          borderColor: status.color,
                        },
                      ]}
                      onPress={() => toggleStatus(key as SaleStatus)}
                      activeOpacity={0.7}
                    >
                      <MaterialIcons
                        name={status.icon as any}
                        size={20}
                        color={
                          isSelected
                            ? status.color
                            : AdminTheme.colors.textMuted
                        }
                      />
                      <Text
                        style={[
                          styles.filterOptionLabel,
                          isSelected && {
                            color: status.color,
                            fontWeight: "600",
                          },
                        ]}
                      >
                        {status.label}
                      </Text>
                      {filterCounts.status[key as SaleStatus] > 0 && (
                        <View
                          style={[
                            styles.filterOptionBadge,
                            { backgroundColor: status.bg },
                          ]}
                        >
                          <Text
                            style={[
                              styles.filterOptionBadgeText,
                              { color: status.color },
                            ]}
                          >
                            {filterCounts.status[key as SaleStatus]}
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Date Range Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Date Range</Text>
              <View style={styles.dateRangeGrid}>
                {DATE_RANGES.map((range) => (
                  <TouchableOpacity
                    key={range.id}
                    style={[
                      styles.dateRangeOption,
                      localFilters.dateRange === range.id &&
                        styles.dateRangeOptionSelected,
                    ]}
                    onPress={() => selectDateRange(range.id)}
                    activeOpacity={0.7}
                  >
                    <MaterialIcons
                      name={range.icon as any}
                      size={20}
                      color={
                        localFilters.dateRange === range.id
                          ? AdminTheme.colors.primary
                          : AdminTheme.colors.textMuted
                      }
                    />
                    <Text
                      style={[
                        styles.dateRangeOptionText,
                        localFilters.dateRange === range.id &&
                          styles.dateRangeOptionTextSelected,
                      ]}
                    >
                      {range.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Amount Range Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Amount Range</Text>
              <View style={styles.amountRangeContainer}>
                <View style={styles.amountInputRow}>
                  <View style={styles.amountInputGroup}>
                    <Text style={styles.amountInputLabel}>Min</Text>
                    <View style={styles.amountInputWrapper}>
                      <Text style={styles.amountInputCurrency}>₹</Text>
                      <TextInput
                        style={styles.amountInput}
                        placeholder="0"
                        placeholderTextColor={AdminTheme.colors.textSoft}
                        keyboardType="number-pad"
                        value={localFilters.minAmount?.toString() || ""}
                        onChangeText={(text) => {
                          const value = text ? parseInt(text, 10) : null;
                          setLocalFilters((prev) => ({
                            ...prev,
                            minAmount: value,
                          }));
                        }}
                      />
                    </View>
                  </View>

                  <View style={styles.amountSeparator}>
                    <Text style={styles.amountSeparatorText}>to</Text>
                  </View>

                  <View style={styles.amountInputGroup}>
                    <Text style={styles.amountInputLabel}>Max</Text>
                    <View style={styles.amountInputWrapper}>
                      <Text style={styles.amountInputCurrency}>₹</Text>
                      <TextInput
                        style={styles.amountInput}
                        placeholder="Any"
                        placeholderTextColor={AdminTheme.colors.textSoft}
                        keyboardType="number-pad"
                        value={localFilters.maxAmount?.toString() || ""}
                        onChangeText={(text) => {
                          const value = text ? parseInt(text, 10) : null;
                          setLocalFilters((prev) => ({
                            ...prev,
                            maxAmount: value,
                          }));
                        }}
                      />
                    </View>
                  </View>
                </View>
              </View>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              onPress={handleClear}
              style={styles.modalClearButton}
              activeOpacity={0.7}
            >
              <Text style={styles.modalClearButtonText}>Clear All</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleApply}
              style={styles.modalApplyButton}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.modalApplyGradient,
                  { backgroundColor: AdminTheme.colors.primary },
                ]}
              >
                <Text style={styles.modalApplyButtonText}>Apply Filters</Text>
                {activeFilterCount > 0 && (
                  <View style={styles.modalApplyBadge}>
                    <Text style={styles.modalApplyBadgeText}>
                      {activeFilterCount}
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </BlurView>
    </Modal>
  );
};

// ==================== STATS CARD COMPONENT ====================

interface StatsCardProps {
  icon: string;
  value: string | number;
  label: string;
  sublabel?: string;
  gradient: readonly [string, string];
}

const StatsCard = ({
  icon,
  value,
  label,
  sublabel,
  gradient,
}: StatsCardProps) => (
  <View style={[styles.statsCard, { backgroundColor: gradient[0] }]}>
    <View style={styles.statsCardContent}>
      <MaterialIcons
        name={icon as any}
        size={24}
        color={AdminTheme.colors.surface}
      />
      <View style={styles.statsInfo}>
        <Text style={styles.statsValue}>{value}</Text>
        <Text style={styles.statsLabel}>{label}</Text>
        {sublabel && <Text style={styles.statsSublabel}>{sublabel}</Text>}
      </View>
    </View>
  </View>
);

// ==================== STATS ROW COMPONENT ====================

interface StatsRowProps {
  stats: {
    todayCount: number;
    todayAmount: number;
    totalSales: number;
    totalAmount: number;
    totalProfit: number;
    avgSaleValue: number;
  };
  showFinancialInsights: boolean;
}

const StatsRow = ({ stats, showFinancialInsights }: StatsRowProps) => (
  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
    style={styles.statsScroll}
    contentContainerStyle={styles.statsScrollContent}
    decelerationRate="fast"
    snapToInterval={180}
    snapToAlignment="start"
  >
    <StatsCard
      icon="today"
      value={stats.todayCount}
      label="Today's Sales"
      sublabel={formatCurrency(stats.todayAmount)}
      gradient={[
        AdminTheme.colors.primary,
        AdminTheme.colors.primaryDark || AdminTheme.colors.primary,
      ]}
    />

    {showFinancialInsights && (
      <StatsCard
        icon="trending-up"
        value={formatCompactCurrency(stats.totalProfit)}
        label="Total Profit"
        sublabel={`${((stats.totalProfit / stats.totalAmount) * 100 || 0).toFixed(1)}% margin`}
        gradient={[AdminTheme.colors.success, "#059669"]}
      />
    )}

    <StatsCard
      icon="receipt"
      value={stats.totalSales}
      label="Total Sales"
      sublabel={formatCurrency(stats.totalAmount)}
      gradient={[AdminTheme.colors.warning, "#D97706"]}
    />

    <StatsCard
      icon="shopping-cart"
      value={formatCompactCurrency(stats.avgSaleValue)}
      label="Average Sale"
      sublabel="per transaction"
      gradient={[AdminTheme.colors.info || "#8B5CF6", "#7C3AED"]}
    />
  </ScrollView>
);

// ==================== SALE CARD COMPONENT ====================

interface SaleCardProps {
  item: any;
  onPress: (id: string) => void;
  showFinancialInsights: boolean;
}

const SaleCard = ({ item, onPress, showFinancialInsights }: SaleCardProps) => {
  const amount = getSaleAmount(item);
  const qty = getSaleQty(item);
  const saleKind = String(item?.saleKind || "").toUpperCase();
  const paymentInfo = getPaymentInfo(item.paymentMode);
  const statusInfo = getPaymentTagInfo(item);
  const profit = Number(item.totalProfit ?? 0) || 0;
  const cost = Number(item.totalCost ?? 0) || 0;
  const profitPercentage =
    amount > 0 ? ((profit / amount) * 100).toFixed(1) : 0;
  const itemCount = item.items?.length || 0;
  const saleDate = getSaleDateValue(item);
  const seller = getSellerName(item);
  const saleNumber = item?.saleNumber || item?._id?.slice(-8) || "Sale";
  const customerName = item?.customer?.name || "Walk-in Customer";
  const customerPhone = item?.customer?.phone;
  const plantNames = getItemPlantNames(item);
  const thumbnailUri = getSaleThumbnail(item);
  const serviceBatch =
    item?.customerSeedBatch && typeof item.customerSeedBatch === "object"
      ? item.customerSeedBatch
      : null;
  const serviceBatchStatus = String(serviceBatch?.status || "").toUpperCase();
  const serviceStatusText = serviceBatchStatus
    ? serviceBatchStatus.replace(/_/g, " ")
    : "SERVICE";
  const itemSummary =
    saleKind === "SERVICE_SALE"
      ? `Service Batch • ${serviceStatusText}`
      : plantNames.length > 0
        ? `${plantNames.slice(0, 2).join(", ")}${plantNames.length > 2 ? ` +${plantNames.length - 2}` : ""}`
        : `${itemCount} ${itemCount === 1 ? "line item" : "line items"}`;

  return (
    <Animated.View
      entering={FadeIn.duration(400)}
      layout={Layout.springify().damping(20)}
    >
      <StitchCard
        onPress={() => {
          if (item._id) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onPress(item._id);
          }
        }}
        style={styles.saleCard}
      >
        <View style={styles.cardGradient}>
          {thumbnailUri ? (
            <Image
              source={{ uri: thumbnailUri }}
              style={styles.saleImage}
              contentFit="cover"
            />
          ) : (
            <View style={styles.saleImagePlaceholder}>
              <MaterialIcons name="receipt-long" size={28} color="#D1D5DB" />
            </View>
          )}

          <View style={styles.cardContent}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderMeta}>
                <View style={styles.titleRow}>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: statusInfo.bg },
                    ]}
                  >
                    <MaterialIcons
                      name={statusInfo.icon as any}
                      size={11}
                      color={statusInfo.color}
                    />
                    <Text
                      style={[
                        styles.statusBadgeText,
                        { color: statusInfo.color },
                      ]}
                    >
                      {statusInfo.label}
                    </Text>
                  </View>
                  <View style={styles.infoPillRow}>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: paymentInfo.bg },
                      ]}
                    >
                      <MaterialIcons
                        name={paymentInfo.icon as any}
                        size={14}
                        color={paymentInfo.color}
                      />
                      <Text
                        style={[
                          styles.statusBadgeText,
                          { color: paymentInfo.color },
                        ]}
                      >
                        {paymentInfo.label}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.titleRow}>
                  <View
                    style={{
                      gap: 8,
                    }}
                  >
                    <Text style={styles.itemSummaryText} numberOfLines={1}>
                      {itemSummary}
                    </Text>

                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <MaterialIcons
                        name={
                          saleKind === "SERVICE_SALE" ? "spa" : "inventory-2"
                        }
                        size={14}
                        color={AdminTheme.colors.primary}
                      />
                      <Text style={styles.statusBadgeText}>
                        {qty}{" "}
                        {saleKind === "SERVICE_SALE" ? "seedlings" : "units"}
                      </Text>
                    </View>

                    <Text style={styles.dateText}>{formatDate(saleDate)}</Text>
                  </View>
                  <View style={styles.amountRow}>
                    <View style={styles.amountSection}>
                      <Text style={styles.amountLabel}>Total Amount</Text>
                      <Text style={styles.amountValue}>
                        {formatCurrency(amount)}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.customerMetaCard}>
              <View style={styles.customerHeaderRow}>
                <View style={styles.customerMetaRow}>
                  <MaterialIcons
                    name="person"
                    size={14}
                    color={AdminTheme.colors.primary}
                  />
                  <Text style={styles.customerMetaLabel}>Customer</Text>
                </View>
                <View style={styles.customerMetaRow}>
                  <MaterialIcons
                    name="badge"
                    size={13}
                    color={AdminTheme.colors.textMuted}
                  />
                  <Text style={styles.customerMetaLabel}>Performed By</Text>
                </View>
              </View>
              <View style={styles.customerDetailRow}>
                <View style={styles.customerDetailColumn}>
                  <Text style={styles.customerMetaName} numberOfLines={1}>
                    {customerName}
                  </Text>
                  {customerPhone ? (
                    <View style={styles.customerMetaRow}>
                      <MaterialIcons
                        name="call"
                        size={13}
                        color={AdminTheme.colors.textMuted}
                      />
                      <Text style={styles.customerMetaText} numberOfLines={1}>
                        {customerPhone}
                      </Text>
                    </View>
                  ) : null}
                </View>
                <View style={styles.customerDetailColumn}>
                  <Text style={styles.customerMetaName} numberOfLines={1}>
                    {seller}
                  </Text>
                </View>
              </View>
            </View>

            {item.notes && (
              <View style={styles.notesContainer}>
                <MaterialIcons
                  name="notes"
                  size={14}
                  color={AdminTheme.colors.textMuted}
                />
                <Text style={styles.notesText} numberOfLines={1}>
                  {item.notes}
                </Text>
              </View>
            )}
          </View>
        </View>
      </StitchCard>
    </Animated.View>
  );
};

// ==================== EMPTY STATE COMPONENT ====================

interface EmptyStateProps {
  hasFilters: boolean;
  onClearFilters: () => void;
  onCreateSale: () => void;
}

const EmptyState = ({
  hasFilters,
  onClearFilters,
  onCreateSale,
}: EmptyStateProps) => (
  <Animated.View entering={FadeIn.duration(400)} style={styles.emptyContainer}>
    <View style={styles.emptyIconContainer}>
      <View
        style={[
          styles.emptyIconGradient,
          { backgroundColor: AdminTheme.colors.background },
        ]}
      >
        <MaterialIcons
          name={hasFilters ? "search-off" : "receipt-long"}
          size={48}
          color={AdminTheme.colors.textSoft}
        />
      </View>
    </View>

    <Text style={styles.emptyTitle}>
      {hasFilters ? "No Results Found" : "No Sales Records"}
    </Text>

    <Text style={styles.emptyMessage}>
      {hasFilters
        ? "Try adjusting your search or filters to find what you're looking for."
        : "Start tracking your sales by creating your first transaction."}
    </Text>

    {hasFilters ? (
      <TouchableOpacity
        onPress={onClearFilters}
        style={styles.emptyButton}
        activeOpacity={0.7}
      >
        <View
          style={[
            styles.emptyButtonGradient,
            { backgroundColor: AdminTheme.colors.primary },
          ]}
        >
          <MaterialIcons
            name="clear-all"
            size={20}
            color={AdminTheme.colors.surface}
          />
          <Text style={styles.emptyButtonText}>Clear Filters</Text>
        </View>
      </TouchableOpacity>
    ) : (
      <TouchableOpacity
        onPress={onCreateSale}
        style={styles.emptyButton}
        activeOpacity={0.7}
      >
        <View
          style={[
            styles.emptyButtonGradient,
            { backgroundColor: AdminTheme.colors.success },
          ]}
        >
          <MaterialIcons
            name="add-circle"
            size={20}
            color={AdminTheme.colors.surface}
          />
          <Text style={styles.emptyButtonText}>Create First Sale</Text>
        </View>
      </TouchableOpacity>
    )}
  </Animated.View>
);

// ==================== LOADING STATE COMPONENT ====================

const LoadingState = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color={AdminTheme.colors.primary} />
    <Text style={styles.loadingText}>Loading your sales...</Text>
  </View>
);

// ==================== ERROR STATE COMPONENT ====================

interface ErrorStateProps {
  error: any;
  onRetry: () => void;
  onBack: () => void;
}

const ErrorState = ({ error, onRetry, onBack }: ErrorStateProps) => (
  <View style={styles.container}>
    <View
      style={[
        styles.errorHeaderGradient,
        { backgroundColor: AdminTheme.colors.primary },
      ]}
    >
      <SafeAreaView edges={["left", "right"]} style={styles.errorHeaderContent}>
        <TouchableOpacity
          onPress={onBack}
          style={styles.errorBackButton}
          activeOpacity={0.7}
        >
          <MaterialIcons
            name="arrow-back"
            size={20}
            color={AdminTheme.colors.surface}
          />
        </TouchableOpacity>
        <Text style={styles.errorHeaderTitle}>Sales</Text>
        <View style={styles.errorHeaderSpacer} />
      </SafeAreaView>
    </View>

    <View style={styles.errorContainer}>
      <View style={styles.errorIconContainer}>
        <MaterialIcons
          name="receipt-long"
          size={48}
          color={AdminTheme.colors.danger}
        />
      </View>

      <Text style={styles.errorTitle}>Failed to Load Sales</Text>
      <Text style={styles.errorMessage}>
        {error?.message ||
          "We couldn't load your sales records. Please try again."}
      </Text>

      <TouchableOpacity
        onPress={onRetry}
        style={styles.retryButton}
        activeOpacity={0.7}
      >
        <View
          style={[
            styles.retryGradient,
            { backgroundColor: AdminTheme.colors.primary },
          ]}
        >
          <MaterialIcons
            name="refresh"
            size={20}
            color={AdminTheme.colors.surface}
          />
          <Text style={styles.retryButtonText}>Try Again</Text>
        </View>
      </TouchableOpacity>
    </View>
  </View>
);

// ==================== MAIN COMPONENT ====================

export function SalesListScreen({
  title = "Sales History",
  routeGroup,
  canCreate = false,
}: SalesListScreenProps) {
  const router = useRouter();
  const role = useAuthStore((state) => state.user?.role);
  const showFinancialInsights = canViewSensitivePricing(role);

  // Filter state
  const [filters, setFilters] = useState<FilterState>({
    paymentMethods: [],
    status: [],
    dateRange: null,
    minAmount: null,
    maxAmount: null,
    search: "",
    sort: "date_desc",
  });
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Data fetching
  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ["sales"],
    queryFn: SalesService.getAll,
  });

  const sales = useMemo(() => (Array.isArray(data) ? data : []), [data]);

  // Calculate filter counts
  const filterCounts = useMemo(() => {
    const paymentMethods: Record<PaymentMethod, number> = {
      CASH: 0,
      UPI: 0,
      CARD: 0,
      ONLINE: 0,
      OTHER: 0,
    };
    const status: Record<SaleStatus, number> = {
      COMPLETED: 0,
      PENDING: 0,
      CANCELLED: 0,
    };

    sales.forEach((sale: any) => {
      const paymentKey = sale.paymentMode?.toUpperCase() as PaymentMethod;
      if (paymentMethods.hasOwnProperty(paymentKey)) {
        paymentMethods[paymentKey]++;
      } else {
        paymentMethods.OTHER++;
      }

      const statusKey = getStatusKey(sale);
      if (status.hasOwnProperty(statusKey)) {
        status[statusKey]++;
      } else {
        status.COMPLETED++;
      }
    });

    return { paymentMethods, status };
  }, [sales]);

  // Calculate stats
  const stats = useMemo(() => {
    const totalSales = sales.length;
    const totalAmount = sales.reduce(
      (sum, sale) => sum + getSaleAmount(sale),
      0,
    );
    const totalProfit = showFinancialInsights
      ? sales.reduce(
          (sum, sale) => sum + (Number(sale.totalProfit ?? 0) || 0),
          0,
        )
      : 0;

    const today = new Date().toISOString().split("T")[0];
    const todaySales = sales.filter((sale: any) =>
      String(getSaleDateValue(sale) ?? "").startsWith(today),
    );
    const todayAmount = todaySales.reduce(
      (sum, sale) => sum + getSaleAmount(sale),
      0,
    );
    const todayCount = todaySales.length;

    const avgSaleValue = totalSales > 0 ? totalAmount / totalSales : 0;

    return {
      totalSales,
      totalAmount,
      totalProfit,
      todayCount,
      todayAmount,
      avgSaleValue,
    };
  }, [sales, showFinancialInsights]);

  // Filter and search logic
  const filteredSales = useMemo(() => {
    let filtered = [...sales];

    if (filters.paymentMethods.length > 0) {
      filtered = filtered.filter((sale) => {
        const paymentKey = sale.paymentMode?.toUpperCase() as PaymentMethod;
        return filters.paymentMethods.includes(paymentKey);
      });
    }

    if (filters.status.length > 0) {
      filtered = filtered.filter((sale: any) => {
        const statusKey = getStatusKey(sale);
        return filters.status.includes(statusKey);
      });
    }

    if (filters.dateRange) {
      filtered = filtered.filter((sale: any) =>
        isWithinDateRange(getSaleDateValue(sale), filters.dateRange!),
      );
    }

    if (filters.minAmount !== null) {
      filtered = filtered.filter(
        (sale) => getSaleAmount(sale) >= filters.minAmount!,
      );
    }
    if (filters.maxAmount !== null) {
      filtered = filtered.filter(
        (sale) => getSaleAmount(sale) <= filters.maxAmount!,
      );
    }

    if (filters.search.trim()) {
      const query = filters.search.toLowerCase().trim();
      filtered = filtered.filter((sale) => {
        const id = sale._id?.toLowerCase?.() ?? "";
        const saleCode = id.slice(-6);
        const amount = getSaleAmount(sale).toString();
        const paymentMode = (sale.paymentMode ?? "").toLowerCase();
        const performedBy = getSellerName(sale).toLowerCase();
        const saleDate = formatDate(getSaleDateValue(sale)).toLowerCase();
        const plantNames = getItemPlantNames(sale).join(" ").toLowerCase();
        const notes = (sale.notes ?? "").toLowerCase();

        return (
          id.includes(query) ||
          saleCode.includes(query) ||
          amount.includes(query) ||
          paymentMode.includes(query) ||
          performedBy.includes(query) ||
          saleDate.includes(query) ||
          plantNames.includes(query) ||
          notes.includes(query)
        );
      });
    }

    const sortOption = SORT_OPTIONS.find((opt) => opt.id === filters.sort);
    if (sortOption) {
      filtered.sort((a, b) => {
        let aVal, bVal;

        if (sortOption.id.includes("amount")) {
          aVal = getSaleAmount(a);
          bVal = getSaleAmount(b);
        } else if (sortOption.id.includes("profit") && showFinancialInsights) {
          aVal = Number(a.totalProfit ?? 0);
          bVal = Number(b.totalProfit ?? 0);
        } else {
          aVal = getSaleDateValue(a)
            ? new Date(getSaleDateValue(a)!).getTime()
            : 0;
          bVal = getSaleDateValue(b)
            ? new Date(getSaleDateValue(b)!).getTime()
            : 0;
        }

        return sortOption.id.includes("_asc")
          ? (aVal as number) - (bVal as number)
          : (bVal as number) - (aVal as number);
      });
    }

    return filtered;
  }, [sales, filters, showFinancialInsights]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    count += filters.paymentMethods.length;
    count += filters.status.length;
    if (filters.dateRange) count++;
    if (filters.minAmount !== null) count++;
    if (filters.maxAmount !== null) count++;
    return count;
  }, [filters]);

  // Callbacks
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await refetch();
    setIsRefreshing(false);
  }, [refetch]);

  const handleBack = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  }, [router]);

  const handleCreateSale = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!canCreate) return;
    router.push(`/${`(${routeGroup})`}/sales/create` as any);
  }, [canCreate, routeGroup, router]);

  const handleViewSale = useCallback(
    (id: string) => {
      router.push(`/${`(${routeGroup})`}/sales/${id}` as any);
    },
    [routeGroup, router],
  );

  const isRootModuleScreen = routeGroup === "staff" || routeGroup === "admin";

  const handleSearchChange = useCallback((text: string) => {
    setFilters((prev) => ({ ...prev, search: text }));
  }, []);

  const handleSearchClear = useCallback(() => {
    setFilters((prev) => ({ ...prev, search: "" }));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const handleApplyFilters = useCallback((newFilters: Partial<FilterState>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters((prev) => ({
      ...prev,
      paymentMethods: [],
      status: [],
      dateRange: null,
      minAmount: null,
      maxAmount: null,
    }));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  const handleTogglePaymentMethod = useCallback((method: string) => {
    const normalizedMethod = method as PaymentMethod;
    setFilters((prev) => ({
      ...prev,
      paymentMethods: prev.paymentMethods.filter(
        (currentMethod) => currentMethod !== normalizedMethod,
      ),
    }));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const handleToggleStatus = useCallback((status: string) => {
    const normalizedStatus = status as SaleStatus;
    setFilters((prev) => ({
      ...prev,
      status: prev.status.filter(
        (currentStatus) => currentStatus !== normalizedStatus,
      ),
    }));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: any }) => (
      <SaleCard
        item={item}
        onPress={handleViewSale}
        showFinancialInsights={showFinancialInsights}
      />
    ),
    [handleViewSale, showFinancialInsights],
  );

  const keyExtractor = useCallback(
    (item: any) => item._id || Math.random().toString(),
    [],
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={["left", "right"]}>
        <LoadingState />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <ErrorState error={error} onRetry={handleRefresh} onBack={handleBack} />
      </View>
    );
  }

  const hasActiveFilters = activeFilterCount > 0 || filters.search.length > 0;

  return (
    <View style={styles.container}>
      <StitchHeader
        title={title}
        subtitle={`${filteredSales.length} ${filteredSales.length === 1 ? "transaction" : "transactions"}`}
        variant="gradient"
        showBackButton={!isRootModuleScreen}
        onBackPress={!isRootModuleScreen ? handleBack : undefined}
        actions={
          canCreate ? (
            <TouchableOpacity
              onPress={handleCreateSale}
              style={styles.createButton}
              activeOpacity={0.7}
            >
              <View style={[styles.createGradient]}>
                <MaterialIcons
                  name="add"
                  size={20}
                  color={AdminTheme.colors.surface}
                />
              </View>
            </TouchableOpacity>
          ) : null
        }
      />

      {/* Sales List */}
      <FlatList
        data={filteredSales}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListHeaderComponent={
          <View style={styles.topSection}>
            <View style={styles.searchRow}>
              <StitchInput
                containerStyle={styles.inputStyle}
                placeholder="Search"
                value={filters.search}
                onChangeText={handleSearchChange}
                icon={
                  <MaterialIcons
                    name="search"
                    size={18}
                    color={AdminTheme.colors.textMuted}
                  />
                }
                right={
                  filters.search.length > 0 ? (
                    <Pressable onPress={handleSearchClear}>
                      <MaterialIcons
                        name="close"
                        size={16}
                        color={AdminTheme.colors.textMuted}
                      />
                    </Pressable>
                  ) : null
                }
              />
              <TouchableOpacity
                onPress={() => setIsFilterModalVisible(true)}
                style={styles.headerFilterButton}
                activeOpacity={0.7}
              >
                <MaterialIcons
                  name="tune"
                  size={20}
                  color={
                    hasActiveFilters
                      ? AdminTheme.colors.primary
                      : AdminTheme.colors.textMuted
                  }
                />
                {hasActiveFilters && (
                  <View style={styles.headerFilterBadge}>
                    <Text style={styles.headerFilterBadgeText}>
                      {activeFilterCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
            {hasActiveFilters && (
              <View style={styles.activeFiltersRow}>
                {filters.paymentMethods.map((method) => (
                  <View key={method} style={styles.activeFilterChip}>
                    <Text style={styles.activeFilterChipText}>{method}</Text>
                    <Pressable
                      onPress={() => handleTogglePaymentMethod(method)}
                      style={styles.activeFilterChipRemove}
                    >
                      <MaterialIcons
                        name="close"
                        size={12}
                        color={AdminTheme.colors.surface}
                      />
                    </Pressable>
                  </View>
                ))}
                {filters.status.map((status) => (
                  <View key={status} style={styles.activeFilterChip}>
                    <Text style={styles.activeFilterChipText}>{status}</Text>
                    <Pressable
                      onPress={() => handleToggleStatus(status)}
                      style={styles.activeFilterChipRemove}
                    >
                      <MaterialIcons
                        name="close"
                        size={12}
                        color={AdminTheme.colors.surface}
                      />
                    </Pressable>
                  </View>
                ))}
                {filters.dateRange && (
                  <View style={styles.activeFilterChip}>
                    <Text style={styles.activeFilterChipText}>
                      {filters.dateRange}
                    </Text>
                    <Pressable
                      onPress={() =>
                        setFilters((prev) => ({ ...prev, dateRange: null }))
                      }
                      style={styles.activeFilterChipRemove}
                    >
                      <MaterialIcons
                        name="close"
                        size={12}
                        color={AdminTheme.colors.surface}
                      />
                    </Pressable>
                  </View>
                )}
              </View>
            )}

            <StitchSectionHeader title="Summary" subtitle="Sales overview" />

            {sales.length > 0 && (
              <View style={styles.statsWrapper}>
                <StatsRow
                  stats={stats}
                  showFinancialInsights={showFinancialInsights}
                />
              </View>
            )}

            <StitchSectionHeader title="Sales" subtitle="Recent transactions" />
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing || isRefetching}
            onRefresh={handleRefresh}
            colors={[AdminTheme.colors.primary]}
            tintColor={AdminTheme.colors.primary}
            progressViewOffset={20}
          />
        }
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <EmptyState
            hasFilters={hasActiveFilters}
            onClearFilters={handleClearFilters}
            onCreateSale={handleCreateSale}
          />
        }
        showsVerticalScrollIndicator={false}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={true}
      />

      {/* Filter Modal */}
      <FilterModal
        visible={isFilterModalVisible}
        onClose={() => setIsFilterModalVisible(false)}
        filters={filters}
        onApplyFilters={handleApplyFilters}
        onClearFilters={handleClearFilters}
        filterCounts={filterCounts}
      />
    </View>
  );
}

// ==================== STYLES ====================

const cardSurface = {
  borderWidth: 1,
  borderColor: AdminTheme.colors.borderSoft,
  borderRadius: AdminTheme.radius.lg,
  backgroundColor: AdminTheme.colors.surface,
  ...AdminTheme.shadow.card,
};

const styles = {
  container: {
    flex: 1,
    backgroundColor: AdminTheme.colors.background,
  },

  searchRow: {
    flexDirection: "row" as const,
    gap: AdminTheme.spacing.sm,
    width: "100%",
    justifyContent: "space-between",
    alignItems: "center",
  },
  inputStyle: {
    width: "80%",
  },
  topSection: {
    paddingTop: AdminTheme.spacing.xs,
  },
  headerFilterButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: AdminTheme.colors.surface,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderWidth: 1,
    borderColor: AdminTheme.colors.borderSoft,
    position: "relative" as const,
  },
  headerFilterButtonActive: {
    borderColor: AdminTheme.colors.primary,
  },
  headerFilterBadge: {
    ...moduleBadge,
    position: "absolute" as const,
    top: -4,
    right: -4,
    backgroundColor: AdminTheme.colors.danger,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: AdminTheme.colors.surface,
  },
  headerFilterBadgeText: {
    color: AdminTheme.colors.surface,
    fontSize: 10,
    fontWeight: "700" as const,
  },
  headerSortContainer: {
    marginTop: AdminTheme.spacing.xs,
  },

  // Active Filters in Header
  activeFiltersContainer: {
    marginTop: AdminTheme.spacing.sm,
    paddingTop: AdminTheme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.1)",
  },
  activeFiltersScroll: {
    flex: 1,
  },
  activeFiltersContent: {
    gap: AdminTheme.spacing.xs,
    paddingRight: AdminTheme.spacing.md,
  },
  activeFiltersRow: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: 8,
    paddingHorizontal: AdminTheme.spacing.lg,
    paddingBottom: 6,
  },
  activeFilterChip: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingHorizontal: AdminTheme.spacing.sm,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
    backgroundColor: AdminTheme.colors.surface,
    borderWidth: 1,
    borderColor: AdminTheme.colors.borderSoft,
  },
  activeFilterChipText: {
    fontSize: 12,
    fontWeight: "500" as const,
    color: AdminTheme.colors.text,
  },
  activeFilterChipRemove: {
    padding: 2,
    borderRadius: 12,
  },

  // Create Button
  createButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  createGradient: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    width: "100%",
    height: "100%",
  },

  // Stats Styles
  statsWrapper: {
    paddingTop: AdminTheme.spacing.sm,
    paddingBottom: AdminTheme.spacing.sm,
  },
  statsScroll: {
    maxHeight: 100,
  },
  statsScrollContent: {
    gap: AdminTheme.spacing.md,
  },
  statsCard: {
    ...cardSurface,
    width: 160,
    borderRadius: 18,
    padding: AdminTheme.spacing.lg,
    borderWidth: 0,
  },
  statsCardContent: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: AdminTheme.spacing.sm,
  },
  statsInfo: {
    flex: 1,
  },
  statsValue: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: AdminTheme.colors.surface,
    marginBottom: 2,
    letterSpacing: -0.5,
  },
  statsLabel: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.9)",
    fontWeight: "500" as const,
  },
  statsSublabel: {
    fontSize: 10,
    color: "rgba(255, 255, 255, 0.7)",
    marginTop: 1,
  },

  // Sort Styles
  sortContainer: {
    position: "relative" as const,
    zIndex: 1000,
  },
  sortButton: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    paddingHorizontal: AdminTheme.spacing.sm,
    paddingVertical: AdminTheme.spacing.xs,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    height: 36,
    gap: 6,
    alignSelf: "flex-start" as const,
  },
  sortButtonText: {
    fontSize: 13,
    color: AdminTheme.colors.surface,
    fontWeight: "500" as const,
    maxWidth: 120,
  },
  sortDropdown: {
    position: "absolute" as const,
    top: 40,
    left: 0,
    width: 240,
    borderRadius: 12,
    overflow: "hidden" as const,
    shadowColor: AdminTheme.colors.borderSoft,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 1001,
  },
  sortDropdownBlur: {
    padding: AdminTheme.spacing.xs,
  },
  sortDropdownHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    paddingHorizontal: AdminTheme.spacing.sm,
    paddingVertical: AdminTheme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: AdminTheme.colors.borderSoft,
  },
  sortDropdownTitle: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: AdminTheme.colors.text,
  },
  sortDropdownClose: {
    padding: 4,
  },
  sortOption: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    paddingHorizontal: AdminTheme.spacing.sm,
    paddingVertical: AdminTheme.spacing.sm,
    borderRadius: 8,
  },
  sortOptionSelected: {
    backgroundColor: AdminTheme.colors.primary + "10",
  },
  sortOptionContent: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: AdminTheme.spacing.sm,
  },
  sortOptionText: {
    fontSize: 14,
    color: AdminTheme.colors.text,
  },
  sortOptionTextSelected: {
    color: AdminTheme.colors.primary,
    fontWeight: "600" as const,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end" as const,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    width: "100%",
    maxHeight: "88%",
    backgroundColor: AdminTheme.colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: "hidden" as const,
  },
  modalHeader: {
    padding: AdminTheme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: AdminTheme.colors.borderSoft,
  },
  modalHeaderContent: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
  },
  modalHeaderLeft: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: AdminTheme.spacing.sm,
  },
  modalHeaderTitle: {
    fontSize: 18,
    fontWeight: "600" as const,
    color: AdminTheme.colors.text,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalBody: {
    maxHeight: "70%",
  },
  modalBodyContent: {
    padding: AdminTheme.spacing.lg,
    gap: AdminTheme.spacing.lg,
  },
  filterSection: {
    gap: AdminTheme.spacing.sm,
  },
  filterSectionTitle: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: AdminTheme.colors.text,
    marginBottom: AdminTheme.spacing.xs,
  },
  filterOptionsGrid: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: AdminTheme.spacing.sm,
  },
  filterOption: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingHorizontal: AdminTheme.spacing.md,
    paddingVertical: AdminTheme.spacing.sm,
    borderWidth: 1,
    borderColor: AdminTheme.colors.borderSoft,
    borderRadius: 20,
    backgroundColor: AdminTheme.colors.surface,
    gap: AdminTheme.spacing.xs,
    minWidth: 100,
  },
  filterOptionLabel: {
    fontSize: 13,
    color: AdminTheme.colors.text,
  },
  filterOptionBadge: {
    ...moduleBadge,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: 4,
  },
  filterOptionBadgeText: {
    fontSize: 11,
    fontWeight: "600" as const,
  },
  dateRangeGrid: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: AdminTheme.spacing.sm,
  },
  dateRangeOption: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingHorizontal: AdminTheme.spacing.md,
    paddingVertical: AdminTheme.spacing.sm,
    borderWidth: 1,
    borderColor: AdminTheme.colors.borderSoft,
    borderRadius: 20,
    backgroundColor: AdminTheme.colors.surface,
    gap: AdminTheme.spacing.xs,
    minWidth: (SCREEN_WIDTH - 80) / 2,
  },
  dateRangeOptionSelected: {
    borderColor: AdminTheme.colors.primary,
    backgroundColor: AdminTheme.colors.primary + "05",
  },
  dateRangeOptionText: {
    fontSize: 13,
    color: AdminTheme.colors.text,
  },
  dateRangeOptionTextSelected: {
    color: AdminTheme.colors.primary,
    fontWeight: "600" as const,
  },
  amountRangeContainer: {
    gap: AdminTheme.spacing.sm,
  },
  amountInputRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: AdminTheme.spacing.sm,
  },
  amountInputGroup: {
    flex: 1,
  },
  amountInputLabel: {
    fontSize: 12,
    color: AdminTheme.colors.textMuted,
    marginBottom: 4,
  },
  amountInputWrapper: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    borderWidth: 1,
    borderColor: AdminTheme.colors.borderSoft,
    borderRadius: 12,
    paddingHorizontal: AdminTheme.spacing.sm,
    backgroundColor: AdminTheme.colors.surface,
    height: 44,
  },
  amountInputCurrency: {
    fontSize: 15,
    color: AdminTheme.colors.textMuted,
    marginRight: 4,
  },
  amountInput: {
    flex: 1,
    fontSize: 15,
    color: AdminTheme.colors.text,
    paddingVertical: AdminTheme.spacing.sm,
  },
  amountSeparator: {
    paddingHorizontal: AdminTheme.spacing.xs,
  },
  amountSeparatorText: {
    fontSize: 14,
    color: AdminTheme.colors.textMuted,
    fontWeight: "500" as const,
  },
  modalFooter: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    padding: AdminTheme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: AdminTheme.colors.borderSoft,
    gap: AdminTheme.spacing.md,
  },
  modalClearButton: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: AdminTheme.colors.borderSoft,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: AdminTheme.colors.surface,
  },
  modalClearButtonText: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: AdminTheme.colors.textMuted,
  },
  modalApplyButton: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    overflow: "hidden" as const,
  },
  modalApplyGradient: {
    flex: 1,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: AdminTheme.spacing.sm,
  },
  modalApplyButtonText: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: AdminTheme.colors.surface,
  },
  modalApplyBadge: {
    ...moduleBadge,
    backgroundColor: AdminTheme.colors.surface,
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  modalApplyBadgeText: {
    fontSize: 11,
    fontWeight: "700" as const,
    color: AdminTheme.colors.primary,
  },

  // List Styles
  listContent: {
    paddingHorizontal: AdminTheme.spacing.lg,
    paddingTop: AdminTheme.spacing.sm,
    paddingBottom: BOTTOM_NAV_HEIGHT + AdminTheme.spacing.xl,
  },

  // Loading State Styles
  loadingContainer: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    padding: AdminTheme.spacing.xl,
  },
  loadingText: {
    marginTop: AdminTheme.spacing.md,
    fontSize: 15,
    color: AdminTheme.colors.textMuted,
    fontWeight: "500" as const,
  },

  // Error State Styles
  errorHeaderGradient: {
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  errorHeaderContent: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingHorizontal: AdminTheme.spacing.lg,
    paddingVertical: AdminTheme.spacing.md,
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
    color: AdminTheme.colors.surface,
    textAlign: "center" as const,
  },
  errorHeaderSpacer: {
    width: 40,
  },
  errorContainer: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    padding: AdminTheme.spacing.xl,
  },
  errorIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: AdminTheme.colors.danger + "10",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginBottom: AdminTheme.spacing.lg,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: AdminTheme.colors.danger,
    marginBottom: AdminTheme.spacing.sm,
  },
  errorMessage: {
    fontSize: 14,
    color: AdminTheme.colors.textMuted,
    textAlign: "center" as const,
    marginBottom: AdminTheme.spacing.xl,
    lineHeight: 20,
    paddingHorizontal: AdminTheme.spacing.xl,
  },
  retryButton: {
    borderRadius: 12,
    overflow: "hidden" as const,
  },
  retryGradient: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingHorizontal: AdminTheme.spacing.xl,
    paddingVertical: AdminTheme.spacing.md,
    gap: AdminTheme.spacing.sm,
  },
  retryButtonText: {
    color: AdminTheme.colors.surface,
    fontSize: 15,
    fontWeight: "600" as const,
  },

  // Empty State Styles
  emptyContainer: {
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingVertical: AdminTheme.spacing.xl,
    paddingHorizontal: AdminTheme.spacing.xl,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: AdminTheme.spacing.lg,
    overflow: "hidden" as const,
  },
  emptyIconGradient: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600" as const,
    color: AdminTheme.colors.text,
    marginBottom: AdminTheme.spacing.sm,
  },
  emptyMessage: {
    fontSize: 14,
    color: AdminTheme.colors.textMuted,
    textAlign: "center" as const,
    marginBottom: AdminTheme.spacing.xl,
    lineHeight: 20,
    paddingHorizontal: AdminTheme.spacing.xl,
  },
  emptyButton: {
    borderRadius: 12,
    overflow: "hidden" as const,
  },
  emptyButtonGradient: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingHorizontal: AdminTheme.spacing.xl,
    paddingVertical: AdminTheme.spacing.md,
    gap: AdminTheme.spacing.sm,
  },
  emptyButtonText: {
    color: AdminTheme.colors.surface,
    fontSize: 15,
    fontWeight: "600" as const,
  },

  // Sale Card Styles
  saleCard: {
    ...cardSurface,
    borderRadius: 16,
    marginBottom: AdminTheme.spacing.md,
    overflow: "hidden" as const,
    borderWidth: 1,
    borderColor: AdminTheme.colors.borderSoft,
    backgroundColor: AdminTheme.colors.surface,
  },
  cardGradient: {
    padding: 0,
  },
  saleImage: {
    width: "100%" as const,
    height: 140,
  },
  saleImagePlaceholder: {
    width: "100%" as const,
    height: 140,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: "#F9FAFB",
  },
  cardContent: {
    padding: AdminTheme.spacing.md,
    gap: AdminTheme.spacing.sm,
  },
  cardHeader: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
  },
  cardHeaderMeta: {
    flex: 1,
    minWidth: 0,
    gap: 10,
  },
  saleId: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: AdminTheme.colors.text,
  },
  titleRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    gap: 8,
    
  },
  itemSummaryText: {
    fontSize: 13,
    color: AdminTheme.colors.text,
  },
  paymentBadge: {
    ...moduleBadge,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
    paddingHorizontal: AdminTheme.spacing.sm,
    paddingVertical: 4,
    borderRadius: 16,
  },
  paymentBadgeText: {
    fontSize: 11,
    fontWeight: "600" as const,
  },
  statusBadge: {
    ...moduleBadge,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
    paddingHorizontal: AdminTheme.spacing.sm,
    paddingVertical: 4,
    borderRadius: 16,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "600" as const,
  },
  dateText: {
    fontSize: 12,
    color: AdminTheme.colors.textMuted,
  },
  amountSection: {
    paddingTop: AdminTheme.spacing.xs,
  },
  amountRow: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "flex-start" as const,
    gap: AdminTheme.spacing.sm,
  },
  amountLabel: {
    fontSize: 11,
    color: AdminTheme.colors.textSoft,
    marginBottom: 2,
  },
  amountValue: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: AdminTheme.colors.text,
    letterSpacing: -0.5,
  },
  infoPillRow: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    justifyContent: "flex-end" as const,
    gap: 8,
    flex: 1,
  },
  infoPill: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: AdminTheme.colors.background,
    borderWidth: 1,
    borderColor: AdminTheme.colors.borderSoft,
  },
  infoPillText: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: AdminTheme.colors.textMuted,
  },
  customerMetaCard: {
    ...cardSurface,
    marginTop: AdminTheme.spacing.sm,
    padding: AdminTheme.spacing.sm,
    borderRadius: 12,
    backgroundColor: AdminTheme.colors.background,
    borderWidth: 1,
    borderColor: AdminTheme.colors.borderSoft,
    gap: 4,
  },
  customerHeaderRow: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    gap: AdminTheme.spacing.md,
  },
  customerMetaRow: {
    justifyContent: "space-between" as const,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
  },
  customerMetaLabel: {
    fontSize: 11,
    fontWeight: "600" as const,
    color: AdminTheme.colors.textSoft,
    
  },
  customerDetailRow: {
    flexDirection: "row" as const,
    gap: AdminTheme.spacing.md,
    marginTop: 4,
    justifyContent:"space-between",
    
  },
  customerDetailColumn: {
    flex: 1,
    gap: 4,
    alignItems:"center",
    justifyContent:"center",
    
  },
  customerMetaName: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700" as const,
    color: AdminTheme.colors.text,
    
  },
  customerMetaText: {
    flex: 1,
    fontSize: 12,
    color: AdminTheme.colors.textMuted,
    
  },
  cardDivider: {
    height: 1,
    backgroundColor: AdminTheme.colors.borderSoft,
    marginVertical: AdminTheme.spacing.xs,
  },
  detailsGrid: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    gap: AdminTheme.spacing.lg,
  },
  detailItem: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    flex: 1,
  },
  detailLabel: {
    fontSize: 10,
    color: AdminTheme.colors.textSoft,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: AdminTheme.colors.text,
  },
  profitPositive: {
    color: AdminTheme.colors.success,
  },
  profitNegative: {
    color: AdminTheme.colors.danger,
  },
  profitPercentage: {
    ...moduleBadge,
    fontSize: 10,
    color: AdminTheme.colors.success,
    marginTop: 1,
  },
  metaSection: {
    gap: 6,
    paddingTop: AdminTheme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: AdminTheme.colors.borderSoft,
  },
  metaRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
  },
  metaText: {
    fontSize: 12,
    color: AdminTheme.colors.textMuted,
    flex: 1,
  },
  notesContainer: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    marginTop: AdminTheme.spacing.xs,
  },
  notesText: {
    flex: 1,
    fontSize: 12,
    color: AdminTheme.colors.textMuted,
  },
} as const;
