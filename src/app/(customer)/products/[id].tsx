import { MaterialIcons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import FixedHeader from "../../../components/common/FixedHeader";
import { SalesService } from "../../../services/sales.service";
import { useAuthStore } from "../../../stores/auth.store";
import { Colors } from "../../../theme";

const BOTTOM_NAV_HEIGHT = 80;

const toNumber = (value: unknown) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatMoney = (amount: number) =>
  `₹${Math.round(amount).toLocaleString("en-IN")}`;

const formatDate = (dateString?: string) => {
  if (!dateString) return "-";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "-";

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
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

interface ProductSaleRow {
  saleId: string;
  soldAt: string;
  quantity: number;
  amount: number;
  paidShare: number;
  dueShare: number;
}

// ==================== STATS CARD ====================

interface StatCardProps {
  label: string;
  value: string;
  icon: string;
  color: string;
  subValue?: string;
}

const StatCard = ({ label, value, icon, color, subValue }: StatCardProps) => (
  <View style={[styles.statCard, { backgroundColor: `${color}08` }]}>
    <View style={[styles.statIcon, { backgroundColor: `${color}15` }]}>
      <MaterialIcons name={icon as any} size={18} color={color} />
    </View>
    <Text style={styles.statLabel}>{label}</Text>
    <Text style={[styles.statValue, { color }]}>{value}</Text>
    {subValue && <Text style={styles.statSubValue}>{subValue}</Text>}
  </View>
);

// ==================== PURCHASE ROW CARD ====================

interface PurchaseRowCardProps {
  row: ProductSaleRow;
  onPress: (saleId: string) => void;
}

const PurchaseRowCard = ({ row, onPress }: PurchaseRowCardProps) => {
  const isFullyPaid = row.dueShare <= 0;

  return (
    <View style={styles.rowCard}>
      {/* Header */}
      <View style={styles.rowHeader}>
        <View>
          <Text style={styles.rowDate}>{formatDate(row.soldAt)}</Text>
          <Text style={styles.rowQty}>{row.quantity} units</Text>
        </View>
        <View
          style={[
            styles.paidBadge,
            { backgroundColor: isFullyPaid ? "#ECFDF5" : "#FFFBEB" },
          ]}
        >
          <Text
            style={[
              styles.paidBadgeText,
              { color: isFullyPaid ? Colors.success : Colors.warning },
            ]}
          >
            {isFullyPaid ? "Paid" : "Partial"}
          </Text>
        </View>
      </View>

      {/* Amount Breakdown */}
      <View style={styles.breakdownContainer}>
        <View style={styles.breakdownItem}>
          <Text style={styles.breakdownLabel}>Total</Text>
          <Text style={styles.breakdownValue}>{formatMoney(row.amount)}</Text>
        </View>

        <View style={styles.breakdownDivider} />

        <View style={styles.breakdownItem}>
          <Text style={styles.breakdownLabel}>Paid</Text>
          <Text style={[styles.breakdownValue, { color: Colors.success }]}>
            {formatMoney(row.paidShare)}
          </Text>
        </View>

        <View style={styles.breakdownDivider} />

        <View style={styles.breakdownItem}>
          <Text style={styles.breakdownLabel}>Due</Text>
          <Text
            style={[
              styles.breakdownValue,
              { color: row.dueShare > 0 ? Colors.error : Colors.success },
            ]}
          >
            {formatMoney(row.dueShare)}
          </Text>
        </View>
      </View>

      {/* Payment Button */}
      <TouchableOpacity
        onPress={() => onPress(row.saleId)}
        style={styles.paymentButton}
        activeOpacity={0.7}
      >
        <LinearGradient
          colors={[Colors.primary, Colors.primaryLight || Colors.primary]}
          style={styles.paymentButtonGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <MaterialIcons name="payment" size={16} color={Colors.white} />
          <Text style={styles.paymentButtonText}>View Payment Details</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
};

// ==================== MAIN COMPONENT ====================

export default function CustomerProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [
      "customer-product-detail",
      id,
      user?.id,
      user?.phoneNumber,
      user?.nurseryId,
    ],
    enabled: !!id && !!user,
    queryFn: async () => {
      if (!user) throw new Error("User not authenticated");

      const sales = await SalesService.getAll({
        nurseryId: user?.nurseryId,
        customerId: user?.id,
        customerPhone: user?.phoneNumber,
      }).catch(() => []);

      let productName = "Product";
      let totalQty = 0;
      let totalAmount = 0;
      let totalPaid = 0;
      let expectedSeedQtyPerBatch: number | undefined;
      const rows: ProductSaleRow[] = [];

      for (const sale of Array.isArray(sales) ? sales : []) {
        const items = Array.isArray((sale as any)?.items)
          ? (sale as any).items
          : [];
        const saleTotal = items.reduce((sum: number, row: any) => {
          const qty = toNumber(row?.quantity);
          const price = toNumber(
            row?.priceAtSale ?? row?.unitPrice ?? row?.price,
          );
          return sum + qty * price;
        }, 0);
        const salePaid = toNumber(
          (sale as any)?.paidAmount ?? (sale as any)?.amountPaid,
        );
        const paidRatio = saleTotal > 0 ? Math.min(1, salePaid / saleTotal) : 0;

        for (const item of items) {
          const itemId = String(
            item?.inventory?._id || item?.inventoryId || item?._id || "",
          );
          if (itemId !== id) continue;

          productName =
            item?.inventory?.plantType?.name ||
            item?.plantType?.name ||
            item?.name ||
            productName;
          const expectedSeeds = toNumber(
            item?.inventory?.plantType?.expectedSeedQtyPerBatch,
          );
          if (expectedSeeds > 0) expectedSeedQtyPerBatch = expectedSeeds;

          const qty = toNumber(item?.quantity);
          const unitPrice = toNumber(
            item?.priceAtSale ?? item?.unitPrice ?? item?.price,
          );
          const amount = qty * unitPrice;
          const paidShare = amount * paidRatio;
          const dueShare = Math.max(0, amount - paidShare);

          totalQty += qty;
          totalAmount += amount;
          totalPaid += paidShare;

          rows.push({
            saleId: String((sale as any)?._id || ""),
            soldAt: String(
              (sale as any)?.createdAt ||
                (sale as any)?.saleDate ||
                new Date().toISOString(),
            ),
            quantity: qty,
            amount,
            paidShare,
            dueShare,
          });
        }
      }

      return {
        id,
        productName,
        totalQty,
        totalAmount,
        totalPaid,
        totalDue: Math.max(0, totalAmount - totalPaid),
        expectedSeedQtyPerBatch,
        rows: rows.sort((a, b) => b.soldAt.localeCompare(a.soldAt)),
      };
    },
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await refetch();
    setRefreshing(false);
  };

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const handleViewPayment = (saleId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/(customer)/dues/${saleId}` as any);
  };

  if (!id) return null;

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <FixedHeader
          title="Product Details"
          subtitle="Loading product information..."
          showBackButton
          onBackPress={handleBack}
        />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading product details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !data) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <FixedHeader
          title="Product Details"
          subtitle="Error loading data"
          showBackButton
          onBackPress={handleBack}
        />
        <View style={styles.centerContainer}>
          <MaterialIcons name="error-outline" size={48} color={Colors.error} />
          <Text style={styles.errorTitle}>Failed to Load</Text>
          <Text style={styles.errorMessage}>
            Unable to load this product. Please try again.
          </Text>
          <TouchableOpacity onPress={handleRefresh} style={styles.retryButton}>
            <LinearGradient
              colors={[Colors.primary, Colors.primaryLight || Colors.primary]}
              style={styles.retryGradient}
            >
              <Text style={styles.retryButtonText}>Try Again</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const paymentProgress = (data.totalPaid / data.totalAmount) * 100;

  return (
    <View style={styles.container}>
      <FixedHeader
        title="Product Details"
        subtitle={data.productName}
        showBackButton
        onBackPress={handleBack}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
      >
        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <StatCard
            label="Total Quantity"
            value={`${data.totalQty} units`}
            icon="inventory"
            color={Colors.primary}
          />
          <StatCard
            label="Total Amount"
            value={formatMoney(data.totalAmount)}
            icon="receipt"
            color={Colors.primary}
          />
          <StatCard
            label="Paid"
            value={formatMoney(data.totalPaid)}
            icon="check-circle"
            color={Colors.success}
            subValue={`${paymentProgress.toFixed(1)}%`}
          />
          <StatCard
            label="Pending"
            value={formatMoney(data.totalDue)}
            icon="account-balance"
            color={data.totalDue > 0 ? Colors.error : Colors.success}
          />
        </View>

        {/* Expected Seeds Info */}
        {data.expectedSeedQtyPerBatch ? (
          <View style={styles.infoCard}>
            <MaterialIcons name="info" size={16} color={Colors.primary} />
            <Text style={styles.infoText}>
              Expected seeds per batch:{" "}
              <Text style={styles.infoHighlight}>
                {data.expectedSeedQtyPerBatch}
              </Text>
            </Text>
          </View>
        ) : null}

        {/* Purchase History */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderLeft}>
              <MaterialIcons name="history" size={18} color={Colors.primary} />
              <Text style={styles.sectionTitle}>Purchase History</Text>
            </View>
            <Text style={styles.sectionCount}>{data.rows.length} entries</Text>
          </View>

          {data.rows.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="history" size={32} color="#9CA3AF" />
              <Text style={styles.emptyTitle}>No Purchase Records</Text>
              <Text style={styles.emptyMessage}>
                No purchases found for this product.
              </Text>
            </View>
          ) : (
            data.rows.map((row) => (
              <PurchaseRowCard
                key={`${row.saleId}_${row.soldAt}`}
                row={row}
                onPress={handleViewPayment}
              />
            ))
          )}
        </View>

        {/* Back Link */}
        <TouchableOpacity onPress={() => router.back()} style={styles.backLink}>
          <MaterialIcons name="arrow-back" size={16} color={Colors.primary} />
          <Text style={styles.backLinkText}>Back to products</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },

  // Header
  headerTitle: {
    fontSize: 24,
  },

  // Center Container
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: "#6B7280",
  },

  // Content
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: BOTTOM_NAV_HEIGHT + 100,
    gap: 20,
  },

  // Stats Grid
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  statCard: {
    width: "48%",
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 11,
    color: "#6B7280",
    marginBottom: 2,
  },
  statValue: {
    fontSize: 15,
    fontWeight: "700",
  },
  statSubValue: {
    fontSize: 10,
    color: "#6B7280",
    marginTop: 2,
  },

  // Info Card
  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    padding: 12,
  },
  infoText: {
    fontSize: 13,
    color: "#374151",
    flex: 1,
  },
  infoHighlight: {
    fontWeight: "700",
    color: Colors.primary,
  },

  // Section
  section: {
    gap: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  sectionCount: {
    fontSize: 12,
    color: "#6B7280",
  },

  // Row Card
  rowCard: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 12,
  },
  rowHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rowDate: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 2,
  },
  rowQty: {
    fontSize: 12,
    color: "#6B7280",
  },
  paidBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  paidBadgeText: {
    fontSize: 11,
    fontWeight: "600",
  },

  // Breakdown
  breakdownContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 10,
    padding: 10,
  },
  breakdownItem: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  breakdownLabel: {
    fontSize: 10,
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  breakdownValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
  },
  breakdownDivider: {
    width: 1,
    height: 20,
    backgroundColor: "#E5E7EB",
    marginHorizontal: 8,
  },

  // Payment Button
  paymentButton: {
    borderRadius: 10,
    overflow: "hidden",
  },
  paymentButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    gap: 6,
  },
  paymentButtonText: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: "600",
  },

  // Empty State
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
    backgroundColor: Colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  emptyMessage: {
    fontSize: 12,
    color: "#6B7280",
    textAlign: "center",
    paddingHorizontal: 24,
  },

  // Back Link
  backLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
  },
  backLinkText: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: "500",
  },

  // Error State
  errorTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#DC2626",
  },
  errorMessage: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    paddingHorizontal: 20,
  },
  retryButton: {
    borderRadius: 10,
    overflow: "hidden",
    marginTop: 8,
  },
  retryGradient: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  retryButtonText: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: "600",
  },
});
