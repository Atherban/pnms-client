// src/app/(admin)/sales/index.tsx - Fix for undefined data
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

  // FIX: Handle undefined data properly
  const sales = Array.isArray(data) ? data : [];

  const filteredSales = useMemo(() => {
    const term = search.toLowerCase();
    return sales.filter(
      (sale) =>
        sale.paymentMode?.toLowerCase().includes(term) ||
        sale.roleAtTime?.toLowerCase().includes(term) ||
        String(sale.totalAmount).includes(term),
    );
  }, [sales, search]);

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
      case "CARD":
        return Colors.info;
      case "UPI":
        return Colors.warning;
      case "ONLINE":
        return Colors.primary;
      default:
        return Colors.textSecondary;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
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

  const calculateStats = useMemo(() => {
    const totalSales = sales.length;
    const totalAmount = sales.reduce(
      (sum, sale) => sum + (sale.totalAmount || 0),
      0,
    );
    const cashSales = sales.filter(
      (s) => s.paymentMode?.toUpperCase() === "CASH",
    ).length;
    const onlineSales = sales.filter(
      (s) =>
        s.paymentMode?.toUpperCase() === "ONLINE" ||
        s.paymentMode?.toUpperCase() === "UPI",
    ).length;

    return { totalSales, totalAmount, cashSales, onlineSales };
  }, [sales]);

  // Handle error state
  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.fixedHeader}>
          <Text style={styles.title}>Sales</Text>
        </View>
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={64} color={Colors.error} />
          <Text style={styles.errorTitle}>Failed to load sales</Text>
          <Text style={styles.errorMessage}>
            {error.message || "Unable to fetch sales data"}
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
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.fixedHeader}>
          <Text style={styles.title}>Sales</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading sales...</Text>
        </View>
      </View>
    );
  }

  // Rest of your component remains the same...

  return (
    <View style={styles.container}>
      {/* Fixed Header */}
      <View style={styles.fixedHeader}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Sales</Text>
            <Text style={styles.subtitle}>
              {calculateStats.totalSales} sales • ₹
              {calculateStats.totalAmount.toLocaleString()}
            </Text>
          </View>
          <Pressable
            onPress={() => router.push("/(admin)/sales/create")}
            style={({ pressed }) => [
              styles.addButton,
              pressed && styles.addButtonPressed,
            ]}
          >
            <MaterialIcons name="add" size={20} color={Colors.white} />
            <Text style={styles.addButtonText}>New Sale</Text>
          </Pressable>
        </View>

        {/* Stats Summary */}
        <View style={styles.statsSummary}>
          <View style={styles.statItem}>
            <MaterialIcons name="payments" size={16} color={Colors.success} />
            <Text style={styles.statValue}>{calculateStats.cashSales}</Text>
            <Text style={styles.statLabel}>Cash</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <MaterialIcons name="credit-card" size={16} color={Colors.info} />
            <Text style={styles.statValue}>{calculateStats.onlineSales}</Text>
            <Text style={styles.statLabel}>Online</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <MaterialIcons
              name="trending-up"
              size={16}
              color={Colors.primary}
            />
            <Text style={styles.statValue}>{sales.length}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <MaterialIcons
            name="search"
            size={20}
            color={Colors.textSecondary}
            style={styles.searchIcon}
          />
          <TextInput
            placeholder="Search by payment mode or amount..."
            placeholderTextColor={Colors.textTertiary}
            value={search}
            onChangeText={setSearch}
            style={styles.searchInput}
            clearButtonMode="while-editing"
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")} style={styles.clearButton}>
              <MaterialIcons
                name="close"
                size={16}
                color={Colors.textSecondary}
              />
            </Pressable>
          )}
        </View>
      </View>

      {/* Sales List */}
      {filteredSales.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialIcons name="receipt-long" size={64} color={Colors.border} />
          <Text style={styles.emptyTitle}>
            {search.length > 0 ? "No sales found" : "No sales yet"}
          </Text>
          <Text style={styles.emptyMessage}>
            {search.length > 0
              ? "Try adjusting your search"
              : "Record your first sale to get started"}
          </Text>
          <Pressable
            onPress={() => router.push("/(admin)/sales/create")}
            style={({ pressed }) => [
              styles.emptyButton,
              pressed && styles.emptyButtonPressed,
            ]}
          >
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
          ListHeaderComponent={<View style={styles.listHeader} />}
          renderItem={({ item }) => {
            const paymentColor = getPaymentColor(item.paymentMode);

            return (
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push(`/(admin)/sales/${item._id}`);
                }}
                style={({ pressed }) => [
                  styles.saleCard,
                  pressed && styles.saleCardPressed,
                ]}
              >
                <View style={styles.saleHeader}>
                  <View style={styles.saleInfo}>
                    <MaterialIcons
                      name="receipt"
                      size={20}
                      color={Colors.primary}
                    />
                    <View style={styles.saleDetails}>
                      <Text style={styles.saleAmount}>
                        ₹{item.totalAmount?.toLocaleString() || "0"}
                      </Text>
                      <View style={styles.saleMeta}>
                        <View
                          style={[
                            styles.paymentBadge,
                            { backgroundColor: paymentColor + "15" },
                          ]}
                        >
                          <MaterialIcons
                            name={
                              item.paymentMode?.toUpperCase() === "CASH"
                                ? "payments"
                                : item.paymentMode?.toUpperCase() === "CARD"
                                  ? "credit-card"
                                  : item.paymentMode?.toUpperCase() === "UPI"
                                    ? "payment"
                                    : "receipt"
                            }
                            size={12}
                            color={paymentColor}
                          />
                          <Text
                            style={[
                              styles.paymentText,
                              { color: paymentColor },
                            ]}
                          >
                            {item.paymentMode || "Unknown"}
                          </Text>
                        </View>
                        <Text style={styles.roleText}>
                          {item.roleAtTime || "Staff"}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <MaterialIcons
                    name="chevron-right"
                    size={20}
                    color={Colors.textTertiary}
                  />
                </View>

                <View style={styles.saleFooter}>
                  <Text style={styles.dateText}>
                    {formatDate(item.createdAt)} • {formatTime(item.createdAt)}
                  </Text>
                  <Text style={styles.itemsText}>
                    {item.items?.length || 0} items
                  </Text>
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = {
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  fixedHeader: {
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  header: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    marginBottom: Spacing.md,
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
  statsSummary: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  statItem: {
    alignItems: "center" as const,
    flex: 1,
    gap: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: Colors.text,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: "500" as const,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: Colors.border,
  },
  searchContainer: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
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
    paddingBottom: BOTTOM_NAV_HEIGHT + Spacing.xl,
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
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: 12,
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
    paddingBottom: BOTTOM_NAV_HEIGHT + Spacing.lg,
  },
  listHeader: {
    height: Spacing.sm,
  },
  saleCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  saleCardPressed: {
    backgroundColor: Colors.surfaceDark,
    transform: [{ scale: 0.98 }],
  },
  saleHeader: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    marginBottom: Spacing.sm,
  },
  saleInfo: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    flex: 1,
    gap: Spacing.md,
  },
  saleDetails: {
    flex: 1,
  },
  saleAmount: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  saleMeta: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: Spacing.sm,
  },
  paymentBadge: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 4,
  },
  paymentText: {
    fontSize: 11,
    fontWeight: "600" as const,
  },
  roleText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: "500" as const,
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
  itemsText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: "600" as const,
  },
  errorContainer: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    padding: Spacing.xl,
    paddingBottom: BOTTOM_NAV_HEIGHT + Spacing.xl,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "600" as const,
    color: Colors.text,
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
