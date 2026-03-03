import { MaterialIcons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useMemo } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Dimensions,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import FixedHeader from "../../../components/common/FixedHeader";
import { StaffAccountingService } from "../../../services/staff-accounting.service";
import { Colors, Spacing } from "../../../theme";

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

// ==================== STATS CARD ====================

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
    <BlurView intensity={80} tint="light" style={styles.statsCard}>
      {/* Primary Stats */}
      <View style={styles.statsPrimaryRow}>
        <View style={styles.statItem}>
          <View style={[styles.statIcon, { backgroundColor: `${Colors.primary}15` }]}>
            <MaterialIcons name="people" size={16} color={Colors.primary} />
          </View>
          <View style={styles.statInfo}>
            <Text style={styles.statNumber}>{formatNumber(totalStaff)}</Text>
            <Text style={styles.statLabel}>Staff</Text>
          </View>
        </View>

        <View style={styles.statDivider} />

        <View style={styles.statItem}>
          <View style={[styles.statIcon, { backgroundColor: "#10B98115" }]}>
            <MaterialIcons name="shopping-cart" size={16} color="#10B981" />
          </View>
          <View style={styles.statInfo}>
            <Text style={styles.statNumber}>{formatNumber(totalSales)}</Text>
            <Text style={styles.statLabel}>Sales</Text>
          </View>
        </View>

        <View style={styles.statDivider} />

        <View style={styles.statItem}>
          <View style={[styles.statIcon, { backgroundColor: "#3B82F615" }]}>
            <MaterialIcons name="payments" size={16} color="#3B82F6" />
          </View>
          <View style={styles.statInfo}>
            <Text style={styles.statNumber}>{formatMoney(totalCollections)}</Text>
            <Text style={styles.statLabel}>Collected</Text>
          </View>
        </View>
      </View>

      {/* Secondary Stats */}
      <View style={styles.statsSecondaryGrid}>
        <View style={styles.statsSecondaryItem}>
          <Text style={styles.statsSecondaryLabel}>Expenses</Text>
          <Text style={[styles.statsSecondaryValue, { color: "#DC2626" }]}>
            {formatMoney(totalExpenses)}
          </Text>
        </View>

        <View style={styles.statsSecondaryDivider} />

        <View style={styles.statsSecondaryItem}>
          <Text style={styles.statsSecondaryLabel}>Pending Due</Text>
          <Text style={[styles.statsSecondaryValue, { color: "#D97706" }]}>
            {formatMoney(totalPendingDue)}
          </Text>
        </View>

        <View style={styles.statsSecondaryDivider} />

        <View style={styles.statsSecondaryItem}>
          <Text style={styles.statsSecondaryLabel}>Net Balance</Text>
          <Text style={[styles.statsSecondaryValue, { color: netBalance >= 0 ? "#10B981" : "#DC2626" }]}>
            {formatMoney(netBalance)}
          </Text>
        </View>
      </View>

      {/* Collection Rate Progress */}
      <View style={styles.statsProgressContainer}>
        <View style={styles.statsProgressHeader}>
          <Text style={styles.statsProgressLabel}>Collection Rate</Text>
          <Text style={styles.statsProgressValue}>{collectionRate.toFixed(1)}%</Text>
        </View>
        <View style={styles.statsProgressBar}>
          <View 
            style={[
              styles.statsProgressFill,
              { 
                width: `${Math.min(collectionRate, 100)}%`,
                backgroundColor: collectionRate >= 80 ? "#10B981" : collectionRate >= 50 ? "#3B82F6" : "#D97706",
              }
            ]} 
          />
        </View>
      </View>
    </BlurView>
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
  const isAdminLike =
    staffRole === "NURSERY_ADMIN" || staffRole === "SUPER_ADMIN";

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <View style={[styles.staffAvatar, { backgroundColor: `${Colors.primary}10` }]}>
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
                  color={isAdminLike ? "#8B5CF6" : Colors.primary} 
                />
                <Text style={[styles.roleText, { color: isAdminLike ? "#8B5CF6" : Colors.primary }]}>
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
            {!!staff.staffPhoneNumber && (
              <Text style={styles.staffContact} numberOfLines={1}>
                {staff.staffPhoneNumber}
              </Text>
            )}
          </View>
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
            <MaterialIcons name="warning" size={16} color="#D97706" />
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
            size={16} 
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
  const { data, refetch, isRefetching } = useQuery({
    queryKey: ["staff-accounting"],
    queryFn: () => StaffAccountingService.getRows(),
  });

  const rows = data || [];
  const staffRows = useMemo(
    () =>
      rows.filter(
        (row) => String(row?.staffRole || "").toUpperCase() === "STAFF",
      ),
    [rows],
  );

  const stats = useMemo(() => {
    const totalStaff = staffRows.length;
    const totalSales = staffRows.reduce((sum, r) => sum + r.salesCount, 0);
    const totalSalesAmount = staffRows.reduce((sum, r) => sum + r.salesAmount, 0);
    const totalCollections = staffRows.reduce((sum, r) => sum + r.collectionsAmount, 0);
    const totalExpenses = staffRows.reduce((sum, r) => sum + r.expensesAmount, 0);
    const totalPendingDue = staffRows.reduce((sum, r) => sum + r.pendingDueAmount, 0);
    const netBalance = staffRows.reduce((sum, r) => sum + r.netBalance, 0);

    return {
      totalStaff,
      totalSales,
      totalSalesAmount,
      totalCollections,
      totalExpenses,
      totalPendingDue,
      netBalance,
    };
  }, [staffRows]);

  return (
    <View style={styles.container}>
      <FixedHeader
        title="Staff Accounting"
        subtitle="Sales, collections, expenses and net"
        titleStyle={styles.headerTitle}
        actions={
          <Pressable 
            style={({ pressed }) => [
              styles.headerIconBtn,
              pressed && styles.headerIconBtnPressed,
            ]} 
            onPress={() => refetch()}
          >
            <MaterialIcons
              name={isRefetching ? "sync" : "refresh"}
              size={20}
              color={Colors.white}
            />
          </Pressable>
        }
      />

      {/* Stats Card */}
      {staffRows.length > 0 && (
        <View style={styles.statsWrapper}>
          <StatsCard
            totalStaff={stats.totalStaff}
            totalSales={stats.totalSalesAmount}
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
            <Text style={styles.emptyText}>
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
  headerTitle: {
    fontSize: 24,
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerIconBtnPressed: {
    backgroundColor: "rgba(255,255,255,0.1)",
    transform: [{ scale: 0.95 }],
  },

  // Stats Card
  statsWrapper: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  statsCard: {
    borderRadius: 20,
    padding: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    backgroundColor: "rgba(255,255,255,0.9)",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  statsPrimaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  statInfo: {
    flex: 1,
  },
  statNumber: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 10,
    color: "#6B7280",
    fontWeight: "500",
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: "#E5E7EB",
    marginHorizontal: 8,
  },
  statsSecondaryGrid: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  statsSecondaryItem: {
    flex: 1,
    alignItems: "center",
  },
  statsSecondaryLabel: {
    fontSize: 10,
    color: "#6B7280",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  statsSecondaryValue: {
    fontSize: 14,
    fontWeight: "700",
  },
  statsSecondaryDivider: {
    width: 1,
    height: 24,
    backgroundColor: "#E5E7EB",
    marginHorizontal: 8,
  },
  statsProgressContainer: {
    gap: 6,
  },
  statsProgressHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statsProgressLabel: {
    fontSize: 11,
    color: "#6B7280",
  },
  statsProgressValue: {
    fontSize: 12,
    fontWeight: "600",
    color: "#111827",
  },
  statsProgressBar: {
    height: 4,
    backgroundColor: "#E5E7EB",
    borderRadius: 2,
    overflow: "hidden",
  },
  statsProgressFill: {
    height: "100%",
    borderRadius: 2,
  },

  // Content
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: BOTTOM_NAV_HEIGHT + 20,
    gap: 12,
  },

  // Card
  card: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
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
    color: Colors.primary,
  },
  staffInfo: {
    flex: 1,
  },
  staffContact: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2,
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

  // Stats Grid
  statsGrid: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
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
    fontSize: 13,
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
    fontSize: 13,
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
  emptyText: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 18,
    paddingHorizontal: 20,
  },
});
