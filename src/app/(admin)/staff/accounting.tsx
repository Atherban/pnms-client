import { MaterialIcons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Platform,
} from "react-native";

import StitchHeader from "../../../components/common/StitchHeader";
import { AdminTheme } from "../../../components/admin/theme";
import { StaffAccountingService } from "../../../services/staff-accounting.service";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const BOTTOM_NAV_HEIGHT = 80;

const formatMoney = (amount: number) => 
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);

const formatNumber = (num: number) => num.toLocaleString("en-IN");

const formatDateRange = (start?: string, end?: string) => {
  if (!start || !end) return "";
  const startDate = new Date(start);
  const endDate = new Date(end);
  return `${startDate.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
  })} - ${endDate.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })}`;
};

// ==================== STATS CARD - HORIZONTAL SCROLL WITH FIXED HEIGHT ====================

interface StatsCardProps {
  totalStaff: number;
  totalSales: number;
  totalCollections: number;
  totalExpenses: number;
  totalPendingDue: number;
  netBalance: number;
}

const StatsCard = ({ 
  totalStaff, 
  totalSales,
  totalCollections,
  totalExpenses,
  totalPendingDue,
  netBalance,
}: StatsCardProps) => {
  const collectionRate = totalSales > 0 ? (totalCollections / totalSales) * 100 : 0;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.statsScrollContent}
      style={styles.statsScroll}
    >
      {/* Staff Count Card */}
      <View style={styles.statCard}>
        <View style={[styles.statIconWrapper, { backgroundColor: `${AdminTheme.colors.primary}10` }]}>
          <MaterialIcons name="people" size={22} color={AdminTheme.colors.primary} />
        </View>
        <View style={styles.statContent}>
          <Text style={styles.statNumber}>{formatNumber(totalStaff)}</Text>
          <Text style={styles.statLabel}>Staff</Text>
        </View>
      </View>

      {/* Sales Card */}
      <View style={styles.statCard}>
        <View style={[styles.statIconWrapper, { backgroundColor: "#10B98110" }]}>
          <MaterialIcons name="shopping-cart" size={22} color="#10B981" />
        </View>
        <View style={styles.statContent}>
          <Text style={styles.statNumber}>{formatMoney(totalSales)}</Text>
          <Text style={styles.statLabel}>Sales</Text>
        </View>
      </View>

      {/* Collections Card */}
      <View style={styles.statCard}>
        <View style={[styles.statIconWrapper, { backgroundColor: "#3B82F610" }]}>
          <MaterialIcons name="payments" size={22} color="#3B82F6" />
        </View>
        <View style={styles.statContent}>
          <Text style={styles.statNumber}>{formatMoney(totalCollections)}</Text>
          <Text style={styles.statLabel}>Collected</Text>
        </View>
      </View>

      {/* Expenses Card */}
      <View style={styles.statCard}>
        <View style={[styles.statIconWrapper, { backgroundColor: "#DC262610" }]}>
          <MaterialIcons name="receipt" size={22} color="#DC2626" />
        </View>
        <View style={styles.statContent}>
          <Text style={styles.statNumber}>{formatMoney(totalExpenses)}</Text>
          <Text style={styles.statLabel}>Expenses</Text>
        </View>
      </View>

      {/* Pending Due Card */}
      <View style={styles.statCard}>
        <View style={[styles.statIconWrapper, { backgroundColor: "#D9770610" }]}>
          <MaterialIcons name="warning" size={22} color="#D97706" />
        </View>
        <View style={styles.statContent}>
          <Text style={styles.statNumber}>{formatMoney(totalPendingDue)}</Text>
          <Text style={styles.statLabel}>Pending Due</Text>
        </View>
      </View>

      {/* Net Balance Card */}
      <View style={styles.statCard}>
        <View style={[styles.statIconWrapper, { backgroundColor: netBalance >= 0 ? "#10B98110" : "#DC262610" }]}>
          <MaterialIcons 
            name={netBalance >= 0 ? "trending-up" : "trending-down"} 
            size={22} 
            color={netBalance >= 0 ? "#10B981" : "#DC2626"} 
          />
        </View>
        <View style={styles.statContent}>
          <Text style={[styles.statNumber, { color: netBalance >= 0 ? "#10B981" : "#DC2626" }]}>
            {formatMoney(netBalance)}
          </Text>
          <Text style={styles.statLabel}>Net Balance</Text>
        </View>
      </View>

      {/* Collection Rate Card */}
      <View style={styles.statCard}>
        <View style={[styles.statIconWrapper, { backgroundColor: collectionRate >= 80 ? "#10B98110" : collectionRate >= 50 ? "#3B82F610" : "#D9770610" }]}>
          <MaterialIcons 
            name={collectionRate >= 80 ? "stars" : collectionRate >= 50 ? "trending-up" : "trending-down"} 
            size={22} 
            color={collectionRate >= 80 ? "#10B981" : collectionRate >= 50 ? "#3B82F6" : "#D97706"} 
          />
        </View>
        <View style={styles.statContent}>
          <Text style={styles.statNumber}>{collectionRate.toFixed(1)}%</Text>
          <Text style={styles.statLabel}>Collection Rate</Text>
        </View>
      </View>
    </ScrollView>
  );
};

// ==================== ACCOUNTING CARD ====================

interface AccountingCardProps {
  staff: any;
}

const AccountingCard = ({ staff }: AccountingCardProps) => {
  const dateRange = formatDateRange(staff.periodStart, staff.periodEnd);
  const collectionRate = staff.salesAmount > 0 
    ? (staff.collectionsAmount / staff.salesAmount) * 100 
    : 0;
  const staffRole = String(staff.staffRole || "STAFF").toUpperCase();
  const isAdminLike = staffRole === "NURSERY_ADMIN" || staffRole === "SUPER_ADMIN";

  const performanceColor = collectionRate >= 80 ? "#10B981" : collectionRate >= 50 ? "#3B82F6" : "#D97706";

  return (
    <View style={styles.accountingCard}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <View style={[styles.staffAvatar, { backgroundColor: `${AdminTheme.colors.primary}10` }]}>
            <Text style={styles.staffInitial}>
              {staff.staffName?.charAt(0).toUpperCase() || "?"}
            </Text>
          </View>
          <View style={styles.staffInfo}>
            <Text style={styles.staffName} numberOfLines={1}>
              {staff.staffName}
            </Text>
            <View style={styles.staffMeta}>
              <View style={[styles.roleBadge, { backgroundColor: isAdminLike ? "#F5F3FF" : "#EFF6FF" }]}>
                <MaterialIcons 
                  name={isAdminLike ? "verified-user" : "person"} 
                  size={10} 
                  color={isAdminLike ? "#8B5CF6" : AdminTheme.colors.primary} 
                />
                <Text style={[styles.roleText, { color: isAdminLike ? "#8B5CF6" : AdminTheme.colors.primary }]}>
                  {staffRole}
                </Text>
              </View>
              {dateRange ? (
                <>
                  <View style={styles.metaDot} />
                  <Text style={styles.dateRangeText}>{dateRange}</Text>
                </>
              ) : null}
            </View>
            {!!staff.staffEmail && (
              <Text style={styles.staffContact} numberOfLines={1}>
                {staff.staffEmail}
              </Text>
            )}
          </View>
        </View>
        <View style={[styles.performanceBadge, { backgroundColor: performanceColor + "10" }]}>
          <MaterialIcons 
            name={collectionRate >= 80 ? "stars" : collectionRate >= 50 ? "trending-up" : "trending-down"} 
            size={12} 
            color={performanceColor} 
          />
          <Text style={[styles.performanceText, { color: performanceColor }]}>
            {collectionRate.toFixed(0)}%
          </Text>
        </View>
      </View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <View style={styles.statBlock}>
          <Text style={styles.statBlockLabel}>Sales</Text>
          <Text style={styles.statBlockValue}>{formatNumber(staff.salesCount)}</Text>
          <Text style={styles.statBlockSubvalue}>{formatMoney(staff.salesAmount)}</Text>
        </View>

        <View style={styles.statBlockDivider} />

        <View style={styles.statBlock}>
          <Text style={styles.statBlockLabel}>Collected</Text>
          <Text style={[styles.statBlockValue, { color: "#3B82F6" }]}>
            {formatMoney(staff.collectionsAmount)}
          </Text>
          <Text style={styles.statBlockSubvalue}>
            {collectionRate.toFixed(0)}% of sales
          </Text>
        </View>

        <View style={styles.statBlockDivider} />

        <View style={styles.statBlock}>
          <Text style={styles.statBlockLabel}>Expenses</Text>
          <Text style={[styles.statBlockValue, { color: "#DC2626" }]}>
            {formatMoney(staff.expensesAmount)}
          </Text>
        </View>
      </View>

      {/* Due Information */}
      {staff.pendingDueAmount > 0 && (
        <View style={styles.dueContainer}>
          <View style={styles.dueHeader}>
            <MaterialIcons name="warning" size={14} color="#D97706" />
            <Text style={styles.dueTitle}>Pending Dues</Text>
          </View>
          <View style={styles.dueContent}>
            <View style={styles.dueItem}>
              <Text style={styles.dueLabel}>Amount</Text>
              <Text style={[styles.dueValue, { color: "#D97706" }]}>
                {formatMoney(staff.pendingDueAmount)}
              </Text>
            </View>
            <View style={styles.dueDivider} />
            <View style={styles.dueItem}>
              <Text style={styles.dueLabel}>Sales Count</Text>
              <Text style={styles.dueValue}>{formatNumber(staff.pendingDueSalesCount)}</Text>
            </View>
          </View>
        </View>
      )}

      {/* Net Balance */}
      <View style={styles.netContainer}>
        <View style={styles.netLeft}>
          <MaterialIcons 
            name={staff.netBalance >= 0 ? "trending-up" : "trending-down"} 
            size={14} 
            color={staff.netBalance >= 0 ? "#10B981" : "#DC2626"} 
          />
          <Text style={styles.netLabel}>Net Balance</Text>
        </View>
        <Text style={[styles.netValue, { color: staff.netBalance >= 0 ? "#10B981" : "#DC2626" }]}>
          {formatMoney(staff.netBalance)}
        </Text>
      </View>
    </View>
  );
};

// ==================== MAIN COMPONENT ====================

export default function StaffAccountingScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const { data, refetch, isRefetching } = useQuery({
    queryKey: ["staff-accounting"],
    queryFn: () => StaffAccountingService.getRows(),
  });

  const allStaffRows = useMemo(
    () => (data || []).filter(
      (row) => String(row?.staffRole || "").toUpperCase() === "STAFF",
    ),
    [data]
  );

  const staffRows = useMemo(
    () => {
      const query = searchQuery.trim().toLowerCase();
      if (!query) return allStaffRows;

      return allStaffRows.filter((row) => {
        const haystack = [
          row.staffName,
          row.staffEmail,
          row.staffPhoneNumber,
          row.staffRole,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(query);
      });
    },
    [allStaffRows, searchQuery],
  );

  const stats = useMemo(() => {
    const totalStaff = staffRows.length;
    const totalSalesAmount = staffRows.reduce((sum, r) => sum + r.salesAmount, 0);
    const totalCollections = staffRows.reduce((sum, r) => sum + r.collectionsAmount, 0);
    const totalExpenses = staffRows.reduce((sum, r) => sum + r.expensesAmount, 0);
    const totalPendingDue = staffRows.reduce((sum, r) => sum + r.pendingDueAmount, 0);
    const netBalance = staffRows.reduce((sum, r) => sum + r.netBalance, 0);

    return {
      totalStaff,
      totalSales: totalSalesAmount,
      totalCollections,
      totalExpenses,
      totalPendingDue,
      netBalance,
    };
  }, [staffRows]);

  const handleRefresh = () => {
    refetch();
  };

  return (
    <View style={styles.container}>
      <StitchHeader
        title="Staff Accounting"
        subtitle="Sales, collections, expenses and net"
        onBackPress={() => router.back()}
        actions={
          <Pressable
            style={({ pressed }) => [
              styles.headerIconBtn,
              pressed && styles.headerIconBtnPressed,
            ]}
            onPress={handleRefresh}
          >
            <MaterialIcons
              name={isRefetching ? "sync" : "refresh"}
              size={18}
              color={AdminTheme.colors.surface}
            />
          </Pressable>
        }
      />

      {/* Stats Cards - Fixed Height */}
      {staffRows.length > 0 && (
        <View style={styles.statsWrapper}>
          <StatsCard
            totalStaff={stats.totalStaff}
            totalSales={stats.totalSales}
            totalCollections={stats.totalCollections}
            totalExpenses={stats.totalExpenses}
            totalPendingDue={stats.totalPendingDue}
            netBalance={stats.netBalance}
          />
        </View>
      )}

      <ScrollView 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {allStaffRows.length > 0 ? (
          <View style={styles.searchCard}>
            <MaterialIcons name="search" size={18} color="#6B7280" />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search by staff name, email, phone or role"
              placeholderTextColor="#9CA3AF"
              style={styles.searchInput}
            />
            {searchQuery ? (
              <Pressable onPress={() => setSearchQuery("")} hitSlop={8}>
                <MaterialIcons name="close" size={18} color="#6B7280" />
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {staffRows.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <LinearGradient
                colors={["#F3F4F6", "#F9FAFB"]}
                style={styles.emptyIconGradient}
              >
                <MaterialIcons name="account-balance" size={48} color="#9CA3AF" />
              </LinearGradient>
            </View>
            <Text style={styles.emptyTitle}>No Accounting Data</Text>
            <Text style={styles.emptyMessage}>
              Accounting data will appear here once staff members have sales and expenses
            </Text>
          </View>
        ) : (
          staffRows.map((row) => (
            <AccountingCard 
              key={row.staffId} 
              staff={row} 
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  headerIconBtnPressed: {
    backgroundColor: "rgba(255,255,255,0.1)",
    transform: [{ scale: 0.95 }],
  },

  // Stats Wrapper - Fixed Height Container
  statsWrapper: {
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 12,
  },
  statsScroll: {
    flexGrow: 0,
  },
  statsScrollContent: {
    gap: 12,
    paddingRight: 20,
  },
  statCard: {
    width: 150,
    height: 88,
    backgroundColor: AdminTheme.colors.surface,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    ...AdminTheme.shadow.sm,
  },
  statIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  statContent: {
    flex: 1,
  },
  statNumber: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    lineHeight: 20,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "500",
  },

  // Content
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: BOTTOM_NAV_HEIGHT + 20,
    gap: 12,
  },
  searchCard: {
    backgroundColor: AdminTheme.colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    ...AdminTheme.shadow.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#111827",
    paddingVertical: 0,
  },

  // Accounting Card
  accountingCard: {
    backgroundColor: AdminTheme.colors.surface,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    ...AdminTheme.shadow.sm,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  cardHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  staffAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  staffInitial: {
    fontSize: 20,
    fontWeight: "600",
    color: AdminTheme.colors.primary,
  },
  staffInfo: {
    flex: 1,
  },
  staffName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  staffMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    gap: 4,
  },
  roleText: {
    fontSize: 10,
    fontWeight: "600",
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "#D1D5DB",
  },
  dateRangeText: {
    fontSize: 10,
    color: "#6B7280",
  },
  staffContact: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2,
  },
  performanceBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 4,
  },
  performanceText: {
    fontSize: 12,
    fontWeight: "600",
  },

  // Stats Grid
  statsGrid: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
  },
  statBlock: {
    flex: 1,
    alignItems: "center",
  },
  statBlockLabel: {
    fontSize: 10,
    color: "#9CA3AF",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  statBlockValue: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 2,
  },
  statBlockSubvalue: {
    fontSize: 10,
    color: "#6B7280",
  },
  statBlockDivider: {
    width: 1,
    height: 40,
    backgroundColor: "#E5E7EB",
    marginHorizontal: 8,
  },

  // Due Container
  dueContainer: {
    backgroundColor: "#FFFBEB",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#FEF3C7",
  },
  dueHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  dueTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#92400E",
  },
  dueContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dueItem: {
    flex: 1,
    alignItems: "center",
  },
  dueLabel: {
    fontSize: 11,
    color: "#92400E",
    marginBottom: 4,
  },
  dueValue: {
    fontSize: 14,
    fontWeight: "700",
  },
  dueDivider: {
    width: 1,
    height: 24,
    backgroundColor: "#FDE68A",
    marginHorizontal: 8,
  },

  // Net Container
  netContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 12,
  },
  netLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  netLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#374151",
  },
  netValue: {
    fontSize: 16,
    fontWeight: "700",
  },

  // Empty State
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    paddingHorizontal: 20,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 16,
    overflow: "hidden",
  },
  emptyIconGradient: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  emptyMessage: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 18,
    paddingHorizontal: 20,
  },
});
