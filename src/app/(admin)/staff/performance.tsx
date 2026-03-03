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
import { StaffPerformanceService } from "../../../services/staff-performance.service";
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

// ==================== STATS CARD ====================

interface StatsCardProps {
  totalStaff: number;
  totalRevenue: number;
  totalCollected: number;
  totalDue: number;
  collectionRate: number;
}

const StatsCard = ({ 
  totalStaff, 
  totalRevenue, 
  totalCollected, 
  totalDue, 
  collectionRate 
}: StatsCardProps) => (
  <BlurView intensity={80} tint="light" style={styles.statsCard}>
    <View style={styles.summaryGrid}>
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
          <MaterialIcons name="trending-up" size={16} color="#10B981" />
        </View>
        <View style={styles.statInfo}>
          <Text style={styles.statNumber}>{formatMoney(totalRevenue)}</Text>
          <Text style={styles.statLabel}>Revenue</Text>
        </View>
      </View>

      <View style={styles.statDivider} />

      <View style={styles.statItem}>
        <View style={[styles.statIcon, { backgroundColor: "#3B82F615" }]}>
          <MaterialIcons name="payments" size={16} color="#3B82F6" />
        </View>
        <View style={styles.statInfo}>
          <Text style={styles.statNumber}>{formatMoney(totalCollected)}</Text>
          <Text style={styles.statLabel}>Collected</Text>
        </View>
      </View>
    </View>

    <View style={styles.statsSecondaryRow}>
      <View style={styles.statSecondaryItem}>
        <Text style={styles.statSecondaryLabel}>Total Due</Text>
        <Text style={[styles.statSecondaryValue, { color: "#D97706" }]}>
          {formatMoney(totalDue)}
        </Text>
      </View>
      <View style={styles.statSecondaryDivider} />
      <View style={styles.statSecondaryItem}>
        <Text style={styles.statSecondaryLabel}>Collection Rate</Text>
        <Text style={[styles.statSecondaryValue, { color: collectionRate >= 80 ? "#10B981" : "#D97706" }]}>
          {collectionRate.toFixed(1)}%
        </Text>
      </View>
    </View>

    {/* Progress Bar */}
    <View style={styles.statsProgressContainer}>
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

// ==================== PERFORMANCE CARD ====================

interface PerformanceCardProps {
  staff: any;
  index: number;
}

const PerformanceCard = ({ staff, index }: PerformanceCardProps) => {
  const collectionRate = staff.revenue > 0 
    ? (staff.collectedAmount / staff.revenue) * 100 
    : 0;
  const staffRole = String(staff.staffRole || "STAFF").toUpperCase();

  const getPerformanceColor = (rate: number) => {
    if (rate >= 80) return "#10B981";
    if (rate >= 50) return "#3B82F6";
    if (rate >= 30) return "#D97706";
    return "#DC2626";
  };

  const performanceColor = getPerformanceColor(collectionRate);

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
            <View style={styles.staffMetaRow}>
              <Text style={styles.staffRole}>{staffRole.replace(/_/g, " ")}</Text>
              <Text style={styles.rankBadge}>#{index + 1}</Text>
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
            size={14} 
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
        </View>

        <View style={styles.statBlockDivider} />

        <View style={styles.statBlock}>
          <Text style={styles.statBlockLabel}>Revenue</Text>
          <Text style={[styles.statBlockValue, { color: "#10B981" }]}>
            {formatMoney(staff.revenue)}
          </Text>
        </View>

        <View style={styles.statBlockDivider} />

        <View style={styles.statBlock}>
          <Text style={styles.statBlockLabel}>Collected</Text>
          <Text style={[styles.statBlockValue, { color: "#3B82F6" }]}>
            {formatMoney(staff.collectedAmount)}
          </Text>
        </View>
      </View>

      {/* Due Amount & Progress */}
      <View style={styles.cardFooter}>
        <View style={styles.dueContainer}>
          <MaterialIcons name="warning" size={14} color="#D97706" />
          <Text style={styles.dueLabel}>Due Amount</Text>
          <Text style={styles.dueValue}>{formatMoney(staff.dueAmount)}</Text>
        </View>

        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill,
                { 
                  width: `${Math.min(collectionRate, 100)}%`,
                  backgroundColor: performanceColor,
                }
              ]} 
            />
          </View>
          <Text style={styles.progressText}>
            {collectionRate.toFixed(1)}% collected
          </Text>
        </View>
      </View>
    </View>
  );
};

// ==================== MAIN COMPONENT ====================

export default function StaffPerformanceScreen() {
  const { data, refetch, isRefetching } = useQuery({
    queryKey: ["staff-performance"],
    queryFn: () => StaffPerformanceService.getRows(),
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
    const totalRevenue = staffRows.reduce((sum, r) => sum + r.revenue, 0);
    const totalCollected = staffRows.reduce((sum, r) => sum + r.collectedAmount, 0);
    const totalDue = staffRows.reduce((sum, r) => sum + r.dueAmount, 0);
    const collectionRate = totalRevenue > 0 ? (totalCollected / totalRevenue) * 100 : 0;

    return {
      totalStaff,
      totalRevenue,
      totalCollected,
      totalDue,
      collectionRate,
    };
  }, [staffRows]);

  return (
    <View style={styles.container}>
      <FixedHeader
        title="Staff Performance"
        subtitle="Sales and collection tracking by staff"
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
            totalRevenue={stats.totalRevenue}
            totalCollected={stats.totalCollected}
            totalDue={stats.totalDue}
            collectionRate={stats.collectionRate}
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
                <MaterialIcons name="people" size={48} color="#9CA3AF" />
              </LinearGradient>
            </View>
            <Text style={styles.emptyTitle}>No Performance Data</Text>
            <Text style={styles.emptyText}>
              Sales data will appear here once staff members start making sales
            </Text>
          </View>
        ) : (
          staffRows.map((row, index) => (
            <PerformanceCard 
              key={row.staffId} 
              staff={row} 
              index={index} 
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
  summaryGrid: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
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
  statsSecondaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  statSecondaryItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4,
  },
  statSecondaryLabel: {
    fontSize: 11,
    color: "#6B7280",
  },
  statSecondaryValue: {
    fontSize: 13,
    fontWeight: "600",
  },
  statSecondaryDivider: {
    width: 1,
    height: 20,
    backgroundColor: "#E5E7EB",
    marginHorizontal: 8,
  },
  statsProgressContainer: {
    marginTop: 4,
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
  staffMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  staffName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 2,
  },
  staffRole: {
    fontSize: 12,
    color: "#6B7280",
  },
  rankBadge: {
    fontSize: 10,
    color: Colors.primary,
    fontWeight: "700",
    backgroundColor: `${Colors.primary}14`,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
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
  },
  statBlockDivider: {
    width: 1,
    height: 30,
    backgroundColor: "#E5E7EB",
    marginHorizontal: 8,
  },

  // Card Footer
  cardFooter: {
    gap: 8,
  },
  dueContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFFBEB",
    borderRadius: 12,
    padding: 10,
  },
  dueLabel: {
    fontSize: 12,
    color: "#6B7280",
    flex: 1,
  },
  dueValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#D97706",
  },
  progressContainer: {
    gap: 4,
  },
  progressBar: {
    height: 6,
    backgroundColor: "#E5E7EB",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  progressText: {
    fontSize: 11,
    color: "#6B7280",
    textAlign: "right",
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
