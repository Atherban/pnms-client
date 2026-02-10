import { MaterialIcons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { SalesService } from "../../../services/sales.service";
import { Colors, Spacing } from "../../../theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const BOTTOM_NAV_HEIGHT = 80;

export default function AdminSales() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, refetch, error } = useQuery({
    queryKey: ["sales"],
    queryFn: SalesService.getAll,
  });

  /* -------------------- DATA NORMALIZATION -------------------- */
  const sales = useMemo(() => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (Array.isArray(data.data)) return data.data;
    return [];
  }, [data]);

  /* -------------------- HELPERS -------------------- */
  const getSaleAmount = (sale: any) =>
    Array.isArray(sale.items)
      ? sale.items.reduce(
          (sum: number, i: any) =>
            sum +
            (Number(i.priceAtSale ?? i.unitPrice ?? i.price ?? 0) || 0) *
              (Number(i.quantity) || 0),
          0,
        )
      : 0;

  const getSaleQuantity = (sale: any) =>
    Array.isArray(sale.items)
      ? sale.items.reduce(
          (sum: number, i: any) => sum + (Number(i.quantity) || 0),
          0,
        )
      : 0;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const filteredSales = useMemo(() => {
    const term = search.toLowerCase();
    return sales.filter(
      (sale) =>
        sale.paymentMode?.toLowerCase().includes(term) ||
        sale.roleAtTime?.toLowerCase().includes(term) ||
        String(getSaleAmount(sale)).includes(term),
    );
  }, [sales, search]);

  const calculateStats = useMemo(() => {
    const totalSales = sales.length;
    const totalAmount = sales.reduce(
      (sum, sale) => sum + getSaleAmount(sale),
      0,
    );
    const cashSales = sales.filter(
      (s) => s.paymentMode?.toUpperCase() === "CASH",
    ).length;
    const onlineSales = sales.filter((s) =>
      ["UPI", "ONLINE", "CARD"].includes(s.paymentMode?.toUpperCase() || ""),
    ).length;
    const todaySales = sales.filter((s) => {
      const d = new Date(s.saleDate || s.createdAt);
      const t = new Date();
      return (
        d.getDate() === t.getDate() &&
        d.getMonth() === t.getMonth() &&
        d.getFullYear() === t.getFullYear()
      );
    }).length;

    return { totalSales, totalAmount, cashSales, onlineSales, todaySales };
  }, [sales]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const getPaymentColor = (mode: string) => {
    switch (mode?.toUpperCase()) {
      case "CASH":
        return Colors.success;
      case "UPI":
      case "ONLINE":
        return Colors.primary;
      case "CARD":
        return Colors.info;
      default:
        return Colors.textSecondary;
    }
  };

  const getPaymentIcon = (mode: string) => {
    switch (mode?.toUpperCase()) {
      case "CASH":
        return "payments";
      case "UPI":
        return "payment";
      case "ONLINE":
        return "online-prediction";
      case "CARD":
        return "credit-card";
      default:
        return "receipt";
    }
  };

  /* -------------------- ERROR -------------------- */
  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.fixedHeader}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Sales History</Text>
              <Text style={styles.subtitle}>Unable to load data</Text>
            </View>
          </View>
        </View>
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={64} color={Colors.error} />
          <Text style={styles.errorTitle}>Failed to Load Sales</Text>
          <Text style={styles.errorMessage}>
            Unable to fetch sales data. Please check your connection.
          </Text>
          <Pressable
            onPress={() => refetch()}
            style={({ pressed }) => [
              styles.retryButton,
              pressed && styles.retryButtonPressed,
            ]}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  /* -------------------- LOADING -------------------- */
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.fixedHeader}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Sales History</Text>
              <Text style={styles.subtitle}>Loading sales data...</Text>
            </View>
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading sales...</Text>
        </View>
      </SafeAreaView>
    );
  }

  /* -------------------- UI -------------------- */
  return (
    <SafeAreaView style={styles.container}>
      {/* Fixed Header */}
      <View style={styles.fixedHeader}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.title}>Sales History</Text>
            <Text style={styles.subtitle}>
              {calculateStats.totalSales} transactions • ₹
              {calculateStats.totalAmount.toLocaleString()}
            </Text>
          </View>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push("/(admin)/sales/create");
            }}
            style={({ pressed }) => [
              styles.addButton,
              pressed && styles.addButtonPressed,
            ]}
          >
            <MaterialIcons name="add" size={20} color={Colors.white} />
            <Text style={styles.addButtonText}>New Sale</Text>
          </Pressable>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View
            style={[
              styles.statCard,
              { backgroundColor: Colors.success + "10" },
            ]}
          >
            <MaterialIcons name="today" size={24} color={Colors.success} />
            <Text style={styles.statValue}>{calculateStats.todaySales}</Text>
            <Text style={styles.statLabel}>Today</Text>
          </View>

          <View
            style={[
              styles.statCard,
              { backgroundColor: Colors.primary + "10" },
            ]}
          >
            <MaterialIcons name="payments" size={24} color={Colors.primary} />
            <Text style={styles.statValue}>{calculateStats.cashSales}</Text>
            <Text style={styles.statLabel}>Cash</Text>
          </View>

          <View
            style={[styles.statCard, { backgroundColor: Colors.info + "10" }]}
          >
            <MaterialIcons name="credit-card" size={24} color={Colors.info} />
            <Text style={styles.statValue}>{calculateStats.onlineSales}</Text>
            <Text style={styles.statLabel}>Online</Text>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <MaterialIcons
            name="search"
            size={20}
            color={Colors.textSecondary}
            style={styles.searchIcon}
          />
          <TextInput
            placeholder="Search sales by payment mode, amount..."
            placeholderTextColor={Colors.textTertiary}
            value={search}
            onChangeText={setSearch}
            style={styles.searchInput}
          />
          {search.length > 0 && (
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSearch("");
              }}
              style={styles.clearButton}
            >
              <MaterialIcons
                name="close"
                size={18}
                color={Colors.textTertiary}
              />
            </Pressable>
          )}
        </View>
      </View>

      {/* Sales List */}
      {filteredSales.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialIcons
            name="receipt-long"
            size={64}
            color={Colors.textSecondary}
          />
          <Text style={styles.emptyTitle}>
            {search.length > 0 ? "No Sales Found" : "No Sales Recorded"}
          </Text>
          <Text style={styles.emptyMessage}>
            {search.length > 0
              ? "Try searching with different terms"
              : "Start recording sales to track your revenue"}
          </Text>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push("/(admin)/sales/create");
            }}
            style={({ pressed }) => [
              styles.emptyButton,
              pressed && styles.emptyButtonPressed,
            ]}
          >
            <MaterialIcons name="add" size={20} color={Colors.white} />
            <Text style={styles.emptyButtonText}>Record First Sale</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={filteredSales}
          keyExtractor={(item) => item._id}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[Colors.primary]}
              tintColor={Colors.primary}
            />
          }
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <View style={styles.listHeader}>
              <Text style={styles.resultsCount}>
                {filteredSales.length} sale
                {filteredSales.length !== 1 ? "s" : ""}
                {search && ` for "${search}"`}
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const amount = getSaleAmount(item);
            const qty = getSaleQuantity(item);
            const color = getPaymentColor(item.paymentMode);
            const icon = getPaymentIcon(item.paymentMode);
            const date = item.saleDate || item.createdAt;

            return (
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  // Navigate to sale details when implemented
                }}
                style={({ pressed }) => [
                  styles.saleCard,
                  pressed && styles.saleCardPressed,
                ]}
              >
                {/* Card Header */}
                <View style={styles.cardHeader}>
                  <View style={styles.titleContainer}>
                    <MaterialIcons
                      name="receipt"
                      size={20}
                      color={Colors.primary}
                    />
                    <Text style={styles.saleAmount} numberOfLines={1}>
                      ₹{amount.toLocaleString()}
                    </Text>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: color + "15" },
                      ]}
                    >
                      <MaterialIcons name={icon} size={12} color={color} />
                      <Text style={[styles.statusText, { color }]}>
                        {item.paymentMode || "Unknown"}
                      </Text>
                    </View>
                  </View>
                  <MaterialIcons
                    name="chevron-right"
                    size={20}
                    color={Colors.textTertiary}
                  />
                </View>

                {/* Info Grid */}
                <View style={styles.infoGrid}>
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Items</Text>
                    <Text style={styles.infoValue}>{qty}</Text>
                  </View>

                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Role</Text>
                    <Text style={styles.infoValue}>
                      {item.roleAtTime || "Staff"}
                    </Text>
                  </View>

                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Date</Text>
                    <Text style={styles.infoValue}>{formatDate(date)}</Text>
                  </View>
                </View>

                {/* Footer */}
                <View style={styles.saleFooter}>
                  <Text style={styles.dateText}>
                    {formatDate(date)} • {formatTime(date)}
                  </Text>
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

/* -------------------- ENHANCED STYLES -------------------- */
const styles = {
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  fixedHeader: {
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  header: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    marginBottom: Spacing.md,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: "700" as const,
    color: Colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  addButton: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 10,
    gap: Spacing.xs,
  },
  addButtonPressed: {
    backgroundColor: Colors.primaryDark,
    transform: [{ scale: 0.98 }],
  },
  addButtonText: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: "600" as const,
  },
  statsGrid: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    marginBottom: Spacing.md,
  },
  statCard: {
    width: (SCREEN_WIDTH - Spacing.lg * 2 - Spacing.md * 2) / 3,
    padding: Spacing.sm,
    borderRadius: 12,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: Colors.text,
    marginTop: Spacing.xs,
  },
  statLabel: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontWeight: "500" as const,
    marginTop: Spacing.xs,
    textAlign: "center" as const,
  },
  searchContainer: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    height: 44,
  },
  searchIcon: {
    marginRight: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    padding: 0,
  },
  clearButton: {
    padding: Spacing.xs,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    padding: Spacing.xl,
    paddingBottom: BOTTOM_NAV_HEIGHT,
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: 16,
    color: Colors.textSecondary,
    fontWeight: "500" as const,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    padding: Spacing.xl,
    paddingBottom: BOTTOM_NAV_HEIGHT + 2 * Spacing.xl,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600" as const,
    color: Colors.text,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  emptyMessage: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center" as const,
    marginBottom: Spacing.lg,
    lineHeight: 20,
  },
  emptyButton: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: 12,
    gap: Spacing.sm,
  },
  emptyButtonPressed: {
    backgroundColor: Colors.primaryDark,
    transform: [{ scale: 0.98 }],
  },
  emptyButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: "600" as const,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: BOTTOM_NAV_HEIGHT + 2 * Spacing.lg,
  },
  listHeader: {
    marginBottom: Spacing.md,
  },
  resultsCount: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: "500" as const,
  },
  saleCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  saleCardPressed: {
    backgroundColor: Colors.surfaceDark,
    transform: [{ scale: 0.98 }],
  },
  cardHeader: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "flex-start" as const,
    marginBottom: Spacing.xs,
  },
  titleContainer: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    flex: 1,
    gap: Spacing.sm,
  },
  saleAmount: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: Colors.text,
    flex: 1,
  },
  statusBadge: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600" as const,
  },
  infoGrid: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    marginBottom: Spacing.xs,
    paddingTop: Spacing.xs,
    borderTopWidth: 1,
    borderColor: Colors.borderLight,
  },
  infoItem: {
    alignItems: "center" as const,
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    color: Colors.textTertiary,
    marginBottom: Spacing.xs,
    fontWeight: "500" as const,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: Colors.text,
  },
  saleFooter: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  dateText: {
    fontSize: 12,
    color: Colors.textTertiary,
    fontWeight: "500" as const,
  },
  errorContainer: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    padding: Spacing.xl,
    paddingBottom: BOTTOM_NAV_HEIGHT + 2 * Spacing.xl,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "600" as const,
    color: Colors.error,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  errorMessage: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center" as const,
    marginBottom: Spacing.lg,
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: 12,
  },
  retryButtonPressed: {
    backgroundColor: Colors.primaryDark,
    transform: [{ scale: 0.98 }],
  },
  retryButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: "600" as const,
  },
};
