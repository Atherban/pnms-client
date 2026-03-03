import { MaterialIcons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeIn, FadeOut, Layout } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { SalesService } from "../../services/sales.service";
import { useAuthStore } from "../../stores/auth.store";
import { Colors, Spacing } from "../../theme";
import { toImageUrl } from "../../utils/image";
import { canViewSensitivePricing } from "../../utils/rbac";

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
      batch?.germinatedQuantity ?? batch?.seedsGerminated ?? batch?.seedsSown ?? 0,
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
  if (paymentStatus === "PARTIALLY_PAID") return PAYMENT_STATUS_TAGS.PARTIALLY_PAID;
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
                <MaterialIcons name="tune" size={24} color={Colors.primary} />
                <Text style={styles.modalHeaderTitle}>Filter Sales</Text>
              </View>
              <TouchableOpacity
                onPress={onClose}
                style={styles.modalCloseButton}
              >
                <MaterialIcons
                  name="close"
                  size={24}
                  color={Colors.textSecondary}
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
                        color={isSelected ? method.color : Colors.textSecondary}
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
                        color={isSelected ? status.color : Colors.textSecondary}
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
                          ? Colors.primary
                          : Colors.textSecondary
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
                        placeholderTextColor={Colors.textTertiary}
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
                        placeholderTextColor={Colors.textTertiary}
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
              <LinearGradient
                colors={[Colors.primary, Colors.primaryLight || Colors.primary]}
                style={styles.modalApplyGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.modalApplyButtonText}>Apply Filters</Text>
                {activeFilterCount > 0 && (
                  <View style={styles.modalApplyBadge}>
                    <Text style={styles.modalApplyBadgeText}>
                      {activeFilterCount}
                    </Text>
                  </View>
                )}
              </LinearGradient>
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
  <LinearGradient
    colors={gradient}
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 1 }}
    style={styles.statsCard}
  >
    <View style={styles.statsCardContent}>
      <MaterialIcons name={icon as any} size={24} color={Colors.white} />
      <View style={styles.statsInfo}>
        <Text style={styles.statsValue}>{value}</Text>
        <Text style={styles.statsLabel}>{label}</Text>
        {sublabel && <Text style={styles.statsSublabel}>{sublabel}</Text>}
      </View>
    </View>
  </LinearGradient>
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
      gradient={[Colors.primary, Colors.primaryLight || Colors.primary]}
    />

    {showFinancialInsights && (
      <StatsCard
        icon="trending-up"
        value={formatCompactCurrency(stats.totalProfit)}
        label="Total Profit"
        sublabel={`${((stats.totalProfit / stats.totalAmount) * 100 || 0).toFixed(1)}% margin`}
        gradient={[Colors.success, "#059669"]}
      />
    )}

    <StatsCard
      icon="receipt"
      value={stats.totalSales}
      label="Total Sales"
      sublabel={formatCurrency(stats.totalAmount)}
      gradient={[Colors.warning, "#D97706"]}
    />

    <StatsCard
      icon="shopping-cart"
      value={formatCompactCurrency(stats.avgSaleValue)}
      label="Average Sale"
      sublabel="per transaction"
      gradient={[Colors.info || "#8B5CF6", "#7C3AED"]}
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
      <TouchableOpacity
        onPress={() => {
          if (item._id) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onPress(item._id);
          }
        }}
        style={styles.saleCard}
        activeOpacity={0.7}
      >
        <LinearGradient
          colors={[Colors.white, Colors.surface]}
          style={styles.cardGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        >
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
                  <Text style={styles.saleId} numberOfLines={1}>
                    {seller}
                  </Text>
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
                </View>
                <Text style={styles.itemSummaryText} numberOfLines={1}>
                  {itemSummary}
                </Text>
              </View>
              <Text style={styles.dateText}>{formatDate(saleDate)}</Text>
            </View>

            <View style={styles.amountSection}>
              <Text style={styles.amountLabel}>Total Amount</Text>
              <Text style={styles.amountValue}>{formatCurrency(amount)}</Text>
            </View>

            <View style={styles.cardDivider} />

            <View style={styles.detailsGrid}>
              <View style={styles.detailItem}>
                <MaterialIcons
                  name={saleKind === "SERVICE_SALE" ? "spa" : "shopping-bag"}
                  size={14}
                  color={Colors.primary}
                />
                <View>
                  <Text style={styles.detailLabel}>
                    {saleKind === "SERVICE_SALE" ? "Service Units" : "Units"}
                  </Text>
                  <Text style={styles.detailValue}>
                    {saleKind === "SERVICE_SALE"
                      ? `${qty} seedlings`
                      : `${qty} (${itemCount} ${itemCount === 1 ? "item" : "items"})`}
                  </Text>
                </View>
              </View>

              {showFinancialInsights && (
                <View style={styles.detailItem}>
                  <MaterialIcons
                    name="trending-up"
                    size={14}
                    color={profit > 0 ? Colors.success : Colors.textSecondary}
                  />
                  <View>
                    <Text style={styles.detailLabel}>Profit</Text>
                    <Text
                      style={[
                        styles.detailValue,
                        profit > 0 && styles.profitPositive,
                        profit < 0 && styles.profitNegative,
                      ]}
                    >
                      {formatCurrency(profit)}
                    </Text>
                    {profit > 0 && (
                      <Text style={styles.profitPercentage}>
                        +{profitPercentage}%
                      </Text>
                    )}
                  </View>
                </View>
              )}
            </View>

            <View style={styles.metaSection}>
              <View style={styles.metaRow}>
                <MaterialIcons
                  name={paymentInfo.icon as any}
                  size={14}
                  color={paymentInfo.color}
                />
                <Text style={styles.metaText}>Payment: {paymentInfo.label}</Text>
              </View>
              {showFinancialInsights && (
                <View style={styles.metaRow}>
                  <MaterialIcons
                    name="account-balance-wallet"
                    size={14}
                    color={Colors.textSecondary}
                  />
                  <Text style={styles.metaText} numberOfLines={1}>
                    Cost {formatCurrency(cost)} • Margin{" "}
                    {Number(item.grossMarginPercent ?? profitPercentage).toFixed(1)}%
                  </Text>
                </View>
              )}
            </View>

            {item.notes && (
              <View style={styles.notesContainer}>
                <MaterialIcons
                  name="notes"
                  size={14}
                  color={Colors.textSecondary}
                />
                <Text style={styles.notesText} numberOfLines={1}>
                  {item.notes}
                </Text>
              </View>
            )}
          </View>
        </LinearGradient>
      </TouchableOpacity>
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
      <LinearGradient
        colors={[Colors.surface, Colors.background]}
        style={styles.emptyIconGradient}
      >
        <MaterialIcons
          name={hasFilters ? "search-off" : "receipt-long"}
          size={48}
          color={Colors.textTertiary}
        />
      </LinearGradient>
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
        <LinearGradient
          colors={[Colors.primary, Colors.primaryLight || Colors.primary]}
          style={styles.emptyButtonGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <MaterialIcons name="clear-all" size={20} color={Colors.white} />
          <Text style={styles.emptyButtonText}>Clear Filters</Text>
        </LinearGradient>
      </TouchableOpacity>
    ) : (
      <TouchableOpacity
        onPress={onCreateSale}
        style={styles.emptyButton}
        activeOpacity={0.7}
      >
        <LinearGradient
          colors={[Colors.success, "#059669"]}
          style={styles.emptyButtonGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <MaterialIcons name="add-circle" size={20} color={Colors.white} />
          <Text style={styles.emptyButtonText}>Create First Sale</Text>
        </LinearGradient>
      </TouchableOpacity>
    )}
  </Animated.View>
);

// ==================== LOADING STATE COMPONENT ====================

const LoadingState = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color={Colors.primary} />
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
    <LinearGradient
      colors={[Colors.primary, Colors.primaryLight || Colors.primary]}
      style={styles.errorHeaderGradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
    >
      <SafeAreaView edges={["left", "right"]} style={styles.errorHeaderContent}>
        <TouchableOpacity
          onPress={onBack}
          style={styles.errorBackButton}
          activeOpacity={0.7}
        >
          <MaterialIcons name="arrow-back" size={20} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.errorHeaderTitle}>Sales</Text>
        <View style={styles.errorHeaderSpacer} />
      </SafeAreaView>
    </LinearGradient>

    <View style={styles.errorContainer}>
      <View style={styles.errorIconContainer}>
        <MaterialIcons name="receipt-long" size={48} color={Colors.error} />
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
        <LinearGradient
          colors={[Colors.primary, Colors.primaryLight || Colors.primary]}
          style={styles.retryGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <MaterialIcons name="refresh" size={20} color={Colors.white} />
          <Text style={styles.retryButtonText}>Try Again</Text>
        </LinearGradient>
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
      ? sales.reduce((sum, sale) => sum + (Number(sale.totalProfit ?? 0) || 0), 0)
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
          aVal = getSaleDateValue(a) ? new Date(getSaleDateValue(a)!).getTime() : 0;
          bVal = getSaleDateValue(b) ? new Date(getSaleDateValue(b)!).getTime() : 0;
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
    router.push(`/${`(${routeGroup})`}/sales/create`);
  }, [canCreate, routeGroup, router]);

  const handleViewSale = useCallback(
    (id: string) => {
      router.push(`/${`(${routeGroup})`}/sales/${id}`);
    },
    [routeGroup, router],
  );

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

  const removeFilter = useCallback((type: string, value?: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    switch (type) {
      case "payment":
        setFilters((prev) => ({
          ...prev,
          paymentMethods: prev.paymentMethods.filter((m) => m !== value),
        }));
        break;
      case "status":
        setFilters((prev) => ({
          ...prev,
          status: prev.status.filter((s) => s !== value),
        }));
        break;
      case "date":
        setFilters((prev) => ({ ...prev, dateRange: null }));
        break;
      case "amount":
        setFilters((prev) => ({ ...prev, minAmount: null, maxAmount: null }));
        break;
    }
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
      {/* Integrated Header with Search, Filter, and Sort */}
      <LinearGradient
        colors={[Colors.primary, Colors.primaryLight || Colors.primary]}
        style={styles.headerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <SafeAreaView edges={["left", "right"]} style={styles.headerContent}>
          {/* Title and Create Button */}
          <View style={styles.headerTopRow}>
            <View>
              <Text style={styles.headerTitle}>{title}</Text>
              <Text style={styles.headerSubtitle}>
                {filteredSales.length}{" "}
                {filteredSales.length === 1 ? "transaction" : "transactions"}
              </Text>
            </View>

            {canCreate && (
              <TouchableOpacity
                onPress={handleCreateSale}
                style={styles.createButton}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={[Colors.success, "#059669"]}
                  style={styles.createGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <MaterialIcons name="add" size={20} color={Colors.white} />
                  <Text style={styles.createButtonText}>New</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>

          {/* Search Bar and Filter Button */}
          <View style={styles.headerSearchRow}>
            <View style={styles.headerSearchContainer}>
              <View style={styles.headerSearchInputContainer}>
                <MaterialIcons
                  name="search"
                  size={18}
                  color="rgba(255,255,255,0.8)"
                />
                <TextInput
                  style={styles.headerSearchInput}
                  placeholder="Search"
                  placeholderTextColor="rgba(255,255,255,0.6)"
                  value={filters.search}
                  onChangeText={handleSearchChange}
                  returnKeyType="search"
                />
                {filters.search.length > 0 && (
                  <TouchableOpacity
                    onPress={handleSearchClear}
                    style={styles.headerSearchClearButton}
                    activeOpacity={0.7}
                  >
                    <MaterialIcons
                      name="close"
                      size={16}
                      color="rgba(255,255,255,0.8)"
                    />
                  </TouchableOpacity>
                )}
              </View>

              <TouchableOpacity
                onPress={() => setIsFilterModalVisible(true)}
                style={[
                  styles.headerFilterButton,
                  activeFilterCount > 0 && styles.headerFilterButtonActive,
                ]}
                activeOpacity={0.7}
              >
                <MaterialIcons
                  name="tune"
                  size={20}
                  color={activeFilterCount > 0 ? Colors.primary : Colors.white}
                />
                {activeFilterCount > 0 && (
                  <View style={styles.headerFilterBadge}>
                    <Text style={styles.headerFilterBadgeText}>
                      {activeFilterCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Active Filters Chips - In Header */}
          {hasActiveFilters && (
            <Animated.View
              entering={FadeIn.duration(300)}
              exiting={FadeOut.duration(300)}
              style={styles.activeFiltersContainer}
            >
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.activeFiltersScroll}
                contentContainerStyle={styles.activeFiltersContent}
              >
                {filters.paymentMethods.map((method) => (
                  <View
                    key={method}
                    style={[
                      styles.activeFilterChip,
                      {
                        backgroundColor: `${PAYMENT_METHODS[method]?.color}10`,
                      },
                    ]}
                  >
                    <MaterialIcons
                      name={PAYMENT_METHODS[method]?.icon as any}
                      size={12}
                      color={PAYMENT_METHODS[method]?.color}
                    />
                    <Text
                      style={[
                        styles.activeFilterChipText,
                        { color: PAYMENT_METHODS[method]?.color },
                      ]}
                    >
                      {PAYMENT_METHODS[method]?.label}
                    </Text>
                    <TouchableOpacity
                      onPress={() => removeFilter("payment", method)}
                      style={styles.activeFilterChipRemove}
                      activeOpacity={0.7}
                    >
                      <MaterialIcons
                        name="close"
                        size={12}
                        color={PAYMENT_METHODS[method]?.color}
                      />
                    </TouchableOpacity>
                  </View>
                ))}

                {filters.status.map((status) => (
                  <View
                    key={status}
                    style={[
                      styles.activeFilterChip,
                      { backgroundColor: `${SALE_STATUS[status]?.color}10` },
                    ]}
                  >
                    <MaterialIcons
                      name={SALE_STATUS[status]?.icon as any}
                      size={12}
                      color={SALE_STATUS[status]?.color}
                    />
                    <Text
                      style={[
                        styles.activeFilterChipText,
                        { color: SALE_STATUS[status]?.color },
                      ]}
                    >
                      {SALE_STATUS[status]?.label}
                    </Text>
                    <TouchableOpacity
                      onPress={() => removeFilter("status", status)}
                      style={styles.activeFilterChipRemove}
                      activeOpacity={0.7}
                    >
                      <MaterialIcons
                        name="close"
                        size={12}
                        color={SALE_STATUS[status]?.color}
                      />
                    </TouchableOpacity>
                  </View>
                ))}

                {filters.dateRange && (
                  <View
                    style={[
                      styles.activeFilterChip,
                      { backgroundColor: `${Colors.primary}10` },
                    ]}
                  >
                    <MaterialIcons
                      name="date-range"
                      size={12}
                      color={Colors.primary}
                    />
                    <Text
                      style={[
                        styles.activeFilterChipText,
                        { color: Colors.primary },
                      ]}
                    >
                      {
                        DATE_RANGES.find((r) => r.id === filters.dateRange)
                          ?.label
                      }
                    </Text>
                    <TouchableOpacity
                      onPress={() => removeFilter("date")}
                      style={styles.activeFilterChipRemove}
                      activeOpacity={0.7}
                    >
                      <MaterialIcons
                        name="close"
                        size={12}
                        color={Colors.primary}
                      />
                    </TouchableOpacity>
                  </View>
                )}

                {(filters.minAmount !== null || filters.maxAmount !== null) && (
                  <View
                    style={[
                      styles.activeFilterChip,
                      { backgroundColor: `${Colors.success}10` },
                    ]}
                  >
                    <MaterialIcons
                      name="attach-money"
                      size={12}
                      color={Colors.success}
                    />
                    <Text
                      style={[
                        styles.activeFilterChipText,
                        { color: Colors.success },
                      ]}
                    >
                      {filters.minAmount !== null
                        ? `₹${filters.minAmount}`
                        : "0"}{" "}
                      -
                      {filters.maxAmount !== null
                        ? `₹${filters.maxAmount}`
                        : "∞"}
                    </Text>
                    <TouchableOpacity
                      onPress={() => removeFilter("amount")}
                      style={styles.activeFilterChipRemove}
                      activeOpacity={0.7}
                    >
                      <MaterialIcons
                        name="close"
                        size={12}
                        color={Colors.success}
                      />
                    </TouchableOpacity>
                  </View>
                )}
              </ScrollView>
            </Animated.View>
          )}
        </SafeAreaView>
      </LinearGradient>

      {/* Stats Section */}
      {sales.length > 0 && (
        <View style={styles.statsWrapper}>
          <StatsRow stats={stats} showFinancialInsights={showFinancialInsights} />
        </View>
      )}

      {/* Sales List */}
      <FlatList
        data={filteredSales}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing || isRefetching}
            onRefresh={handleRefresh}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
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

const styles = {
  container: {
    flex: 1,
    backgroundColor: Colors.background,
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
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
  },
  headerTopRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    marginBottom: Spacing.md,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700" as const,
    color: Colors.white,
    marginBottom: 2,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.9)",
    fontWeight: "500" as const,
  },
  headerSearchRow: {
    marginBottom: Spacing.sm,
  },
  headerSearchContainer: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: Spacing.sm,
  },
  headerSearchInputContainer: {
    flex: 1,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 12,
    paddingHorizontal: Spacing.md,
    paddingVertical: Platform.OS === "ios" ? Spacing.sm : 0,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    height: 44,
  },
  headerSearchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.white,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.xs,
    marginLeft: Spacing.xs,
  },
  headerSearchClearButton: {
    padding: Spacing.xs,
  },
  headerFilterButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    position: "relative" as const,
  },
  headerFilterButtonActive: {
    backgroundColor: Colors.white,
  },
  headerFilterBadge: {
    position: "absolute" as const,
    top: -4,
    right: -4,
    backgroundColor: Colors.error,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: Colors.white,
  },
  headerFilterBadgeText: {
    color: Colors.white,
    fontSize: 10,
    fontWeight: "700" as const,
  },
  headerSortContainer: {
    marginTop: Spacing.xs,
  },

  // Active Filters in Header
  activeFiltersContainer: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.1)",
  },
  activeFiltersScroll: {
    flex: 1,
  },
  activeFiltersContent: {
    gap: Spacing.xs,
    paddingRight: Spacing.md,
  },
  activeFilterChip: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  activeFilterChipText: {
    fontSize: 12,
    fontWeight: "500" as const,
  },
  activeFilterChipRemove: {
    padding: 2,
    borderRadius: 12,
  },

  // Create Button
  createButton: {
    borderRadius: 20,
    overflow: "hidden" as const,
  },
  createGradient: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.xs,
    minWidth: 80,
  },
  createButtonText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: "600" as const,
  },

  // Stats Styles
  statsWrapper: {
    paddingVertical: Spacing.md,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  statsScroll: {
    maxHeight: 100,
  },
  statsScrollContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  statsCard: {
    width: 160,
    borderRadius: 16,
    padding: Spacing.md,
  },
  statsCardContent: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: Spacing.sm,
  },
  statsInfo: {
    flex: 1,
  },
  statsValue: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: Colors.white,
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
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    height: 36,
    gap: 6,
    alignSelf: "flex-start" as const,
  },
  sortButtonText: {
    fontSize: 13,
    color: Colors.white,
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
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 1001,
  },
  sortDropdownBlur: {
    padding: Spacing.xs,
  },
  sortDropdownHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  sortDropdownTitle: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.text,
  },
  sortDropdownClose: {
    padding: 4,
  },
  sortOption: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderRadius: 8,
  },
  sortOptionSelected: {
    backgroundColor: Colors.primary + "10",
  },
  sortOptionContent: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: Spacing.sm,
  },
  sortOptionText: {
    fontSize: 14,
    color: Colors.text,
  },
  sortOptionTextSelected: {
    color: Colors.primary,
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
    backgroundColor: Colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: "hidden" as const,
  },
  modalHeader: {
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  modalHeaderContent: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
  },
  modalHeaderLeft: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: Spacing.sm,
  },
  modalHeaderTitle: {
    fontSize: 18,
    fontWeight: "600" as const,
    color: Colors.text,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalBody: {
    maxHeight: "70%",
  },
  modalBodyContent: {
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  filterSection: {
    gap: Spacing.sm,
  },
  filterSectionTitle: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  filterOptionsGrid: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: Spacing.sm,
  },
  filterOption: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: 20,
    backgroundColor: Colors.white,
    gap: Spacing.xs,
    minWidth: 100,
  },
  filterOptionLabel: {
    fontSize: 13,
    color: Colors.text,
  },
  filterOptionBadge: {
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
    gap: Spacing.sm,
  },
  dateRangeOption: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: 20,
    backgroundColor: Colors.white,
    gap: Spacing.xs,
    minWidth: (SCREEN_WIDTH - 80) / 2,
  },
  dateRangeOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + "05",
  },
  dateRangeOptionText: {
    fontSize: 13,
    color: Colors.text,
  },
  dateRangeOptionTextSelected: {
    color: Colors.primary,
    fontWeight: "600" as const,
  },
  amountRangeContainer: {
    gap: Spacing.sm,
  },
  amountInputRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: Spacing.sm,
  },
  amountInputGroup: {
    flex: 1,
  },
  amountInputLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  amountInputWrapper: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: 12,
    paddingHorizontal: Spacing.sm,
    backgroundColor: Colors.white,
    height: 44,
  },
  amountInputCurrency: {
    fontSize: 15,
    color: Colors.textSecondary,
    marginRight: 4,
  },
  amountInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    paddingVertical: Spacing.sm,
  },
  amountSeparator: {
    paddingHorizontal: Spacing.xs,
  },
  amountSeparatorText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: "500" as const,
  },
  modalFooter: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    gap: Spacing.md,
  },
  modalClearButton: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: Colors.white,
  },
  modalClearButtonText: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: Colors.textSecondary,
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
    gap: Spacing.sm,
  },
  modalApplyButtonText: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: Colors.white,
  },
  modalApplyBadge: {
    backgroundColor: Colors.white,
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
    color: Colors.primary,
  },

  // List Styles
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: BOTTOM_NAV_HEIGHT + Spacing.xl,
  },

  // Loading State Styles
  loadingContainer: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    padding: Spacing.xl,
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: 15,
    color: Colors.textSecondary,
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
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
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
  errorContainer: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    padding: Spacing.xl,
  },
  errorIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.error + "10",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginBottom: Spacing.lg,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: Colors.error,
    marginBottom: Spacing.sm,
  },
  errorMessage: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center" as const,
    marginBottom: Spacing.xl,
    lineHeight: 20,
    paddingHorizontal: Spacing.xl,
  },
  retryButton: {
    borderRadius: 12,
    overflow: "hidden" as const,
  },
  retryGradient: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  retryButtonText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: "600" as const,
  },

  // Empty State Styles
  emptyContainer: {
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.xl,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: Spacing.lg,
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
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  emptyMessage: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center" as const,
    marginBottom: Spacing.xl,
    lineHeight: 20,
    paddingHorizontal: Spacing.xl,
  },
  emptyButton: {
    borderRadius: 12,
    overflow: "hidden" as const,
  },
  emptyButtonGradient: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  emptyButtonText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: "600" as const,
  },

  // Sale Card Styles
  saleCard: {
    borderRadius: 16,
    marginBottom: Spacing.md,
    overflow: "hidden" as const,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    backgroundColor: Colors.white,
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
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  cardHeader: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
  },
  cardHeaderMeta: {
    flex: 1,
    minWidth: 0,
  },
  saleId: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: Colors.text,
  },
  titleRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    gap: 8,
  },
  itemSummaryText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  paymentBadge: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 16,
  },
  paymentBadgeText: {
    fontSize: 11,
    fontWeight: "600" as const,
  },
  statusBadge: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 16,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "600" as const,
  },
  dateText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  amountSection: {
    paddingTop: Spacing.xs,
  },
  amountLabel: {
    fontSize: 11,
    color: Colors.textTertiary,
    marginBottom: 2,
  },
  amountValue: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: Colors.text,
    letterSpacing: -0.5,
  },
  cardDivider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: Spacing.xs,
  },
  detailsGrid: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    gap: Spacing.lg,
  },
  detailItem: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    flex: 1,
  },
  detailLabel: {
    fontSize: 10,
    color: Colors.textTertiary,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: Colors.text,
  },
  profitPositive: {
    color: Colors.success,
  },
  profitNegative: {
    color: Colors.error,
  },
  profitPercentage: {
    fontSize: 10,
    color: Colors.success,
    marginTop: 1,
  },
  metaSection: {
    gap: 6,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  metaRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
  },
  metaText: {
    fontSize: 12,
    color: Colors.textSecondary,
    flex: 1,
  },
  notesContainer: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    marginTop: Spacing.xs,
  },
  notesText: {
    flex: 1,
    fontSize: 12,
    color: Colors.textSecondary,
  },
} as const;
