import { MaterialIcons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Platform,
} from "react-native";

import StitchCard from "../../../components/common/StitchCard";
import StitchHeader from "../../../components/common/StitchHeader";
import { AdminTheme } from "../../../components/admin/theme";
import { StaffPerformanceService } from "../../../services/staff-performance.service";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const BOTTOM_NAV_HEIGHT = 80;

const DATE_FILTERS = [
  { id: "ALL", label: "All Time", icon: "history" },
  { id: "TODAY", label: "Today", icon: "today" },
  { id: "WEEK", label: "7 Days", icon: "calendar-view-week" },
  { id: "MONTH", label: "30 Days", icon: "calendar-month" },
] as const;

const formatMoney = (amount: number) => 
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);

const formatNumber = (num: number) => num.toLocaleString("en-IN");

// ==================== STATS CARD - HORIZONTAL SCROLL ====================

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
  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
    contentContainerStyle={styles.statsScrollContent}
    style={styles.statsScroll}
  >
    {/* Staff Count Card */}
    <View style={styles.statCard}>
      <View style={[styles.statIconWrapper, { backgroundColor: `${AdminTheme.colors.primary}10` }]}>
        <MaterialIcons name="people" size={20} color={AdminTheme.colors.primary} />
      </View>
      <View style={styles.statContent}>
        <Text style={styles.statNumber}>{formatNumber(totalStaff)}</Text>
        <Text style={styles.statLabel}>Staff</Text>
      </View>
    </View>

    {/* Revenue Card */}
    <View style={styles.statCard}>
      <View style={[styles.statIconWrapper, { backgroundColor: "#10B98110" }]}>
        <MaterialIcons name="trending-up" size={20} color="#10B981" />
      </View>
      <View style={styles.statContent}>
        <Text style={styles.statNumber}>{formatMoney(totalRevenue)}</Text>
        <Text style={styles.statLabel}>Revenue</Text>
      </View>
    </View>

    {/* Collected Card */}
    <View style={styles.statCard}>
      <View style={[styles.statIconWrapper, { backgroundColor: "#3B82F610" }]}>
        <MaterialIcons name="payments" size={20} color="#3B82F6" />
      </View>
      <View style={styles.statContent}>
        <Text style={styles.statNumber}>{formatMoney(totalCollected)}</Text>
        <Text style={styles.statLabel}>Collected</Text>
      </View>
    </View>

    {/* Due Card */}
    <View style={styles.statCard}>
      <View style={[styles.statIconWrapper, { backgroundColor: "#D9770610" }]}>
        <MaterialIcons name="warning" size={20} color="#D97706" />
      </View>
      <View style={styles.statContent}>
        <Text style={styles.statNumber}>{formatMoney(totalDue)}</Text>
        <Text style={styles.statLabel}>Due</Text>
      </View>
    </View>

    {/* Collection Rate Card */}
    <View style={styles.statCard}>
      <View style={[styles.statIconWrapper, { backgroundColor: collectionRate >= 80 ? "#10B98110" : collectionRate >= 50 ? "#3B82F610" : "#D9770610" }]}>
        <MaterialIcons 
          name={collectionRate >= 80 ? "stars" : collectionRate >= 50 ? "trending-up" : "trending-down"} 
          size={20} 
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
  const performanceIcon = collectionRate >= 80 ? "stars" : collectionRate >= 50 ? "trending-up" : "trending-down";

  return (
    <View style={styles.performanceCard}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <View style={[styles.staffAvatar, { backgroundColor: `${AdminTheme.colors.primary}10` }]}>
            <Text style={styles.staffInitial}>
              {staff.staffName?.charAt(0).toUpperCase() || "?"}
            </Text>
          </View>
          <View style={styles.staffInfo}>
            <View style={styles.staffNameRow}>
              <Text style={styles.staffName} numberOfLines={1}>
                {staff.staffName}
              </Text>
              <Text style={styles.rankBadge}>#{index + 1}</Text>
            </View>
            <Text style={styles.staffRole}>{staffRole.replace(/_/g, " ")}</Text>
            {!!staff.staffEmail && (
              <Text style={styles.staffContact} numberOfLines={1}>
                {staff.staffEmail}
              </Text>
            )}
          </View>
        </View>
        <View style={[styles.performanceBadge, { backgroundColor: performanceColor + "10" }]}>
          <MaterialIcons name={performanceIcon as any} size={14} color={performanceColor} />
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

// ==================== FILTERS CARD ====================

interface FiltersCardProps {
  dateFilter: string;
  onDateFilterChange: (filter: string) => void;
  selectedStaffId: string;
  onStaffFilterChange: (staffId: string) => void;
  staffOptions: any[];
}

const FiltersCard = ({
  dateFilter,
  onDateFilterChange,
  selectedStaffId,
  onStaffFilterChange,
  staffOptions,
}: FiltersCardProps) => (
  <View style={styles.filtersCard}>
    <View style={styles.filtersHeader}>
      <MaterialIcons name="filter-alt" size={16} color="#6B7280" />
      <Text style={styles.filtersTitle}>Filters</Text>
    </View>

    {/* Date Filters */}
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false} 
      contentContainerStyle={styles.filterScrollContent}
    >
      {DATE_FILTERS.map((filter) => (
        <Pressable
          key={filter.id}
          onPress={() => onDateFilterChange(filter.id)}
          style={[
            styles.filterChip,
            dateFilter === filter.id && styles.filterChipActive,
          ]}
        >
          <MaterialIcons 
            name={filter.icon as any} 
            size={14} 
            color={dateFilter === filter.id ? AdminTheme.colors.primary : "#6B7280"} 
          />
          <Text
            style={[
              styles.filterChipText,
              dateFilter === filter.id && styles.filterChipTextActive,
            ]}
          >
            {filter.label}
          </Text>
        </Pressable>
      ))}
    </ScrollView>

    {/* Staff Filters */}
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false} 
      contentContainerStyle={styles.filterScrollContent}
    >
      {staffOptions.map((staff) => (
        <Pressable
          key={staff.staffId}
          onPress={() => onStaffFilterChange(staff.staffId)}
          style={[
            styles.filterChip,
            selectedStaffId === staff.staffId && styles.filterChipActive,
          ]}
        >
          <MaterialIcons 
            name="person" 
            size={14} 
            color={selectedStaffId === staff.staffId ? AdminTheme.colors.primary : "#6B7280"} 
          />
          <Text
            style={[
              styles.filterChipText,
              selectedStaffId === staff.staffId && styles.filterChipTextActive,
            ]}
          >
            {staff.staffName}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  </View>
);

// ==================== EMPTY STATE ====================

const EmptyState = () => (
  <View style={styles.emptyContainer}>
    <View style={styles.emptyIconContainer}>
      <MaterialIcons name="people" size={48} color="#9CA3AF" />
    </View>
    <Text style={styles.emptyTitle}>No Performance Data</Text>
    <Text style={styles.emptyMessage}>
      No staff sales matched the selected filters. Try another date range or staff member.
    </Text>
  </View>
);

// ==================== MAIN COMPONENT ====================

export default function StaffPerformanceScreen() {
  const router = useRouter();
  const [dateFilter, setDateFilter] = useState<(typeof DATE_FILTERS)[number]["id"]>("ALL");
  const [selectedStaffId, setSelectedStaffId] = useState<string>("ALL");

  const filters = useMemo(() => {
    const now = new Date();
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);

    const start = new Date(now);
    if (dateFilter === "TODAY") {
      start.setHours(0, 0, 0, 0);
    } else if (dateFilter === "WEEK") {
      start.setDate(start.getDate() - 6);
      start.setHours(0, 0, 0, 0);
    } else if (dateFilter === "MONTH") {
      start.setDate(start.getDate() - 29);
      start.setHours(0, 0, 0, 0);
    }

    return {
      dateFrom: dateFilter === "ALL" ? undefined : start.toISOString(),
      dateTo: dateFilter === "ALL" ? undefined : end.toISOString(),
      staffId: selectedStaffId === "ALL" ? undefined : selectedStaffId,
    };
  }, [dateFilter, selectedStaffId]);

  const { data, refetch, isRefetching } = useQuery({
    queryKey: ["staff-performance", filters],
    queryFn: () => StaffPerformanceService.getRows(filters),
  });
  const { data: allStaffData } = useQuery({
    queryKey: ["staff-performance-options"],
    queryFn: () => StaffPerformanceService.getRows(),
  });

  const rows = useMemo(() => data || [], [data]);
  const staffRows = useMemo(
    () => rows.filter((row) => String(row?.staffRole || "").toUpperCase() === "STAFF"),
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

  const staffOptions = useMemo(
    () => [{ staffId: "ALL", staffName: "All Staff" }, ...((allStaffData || []).filter((row) => String(row?.staffRole || "").toUpperCase() === "STAFF"))],
    [allStaffData],
  );

  const handleRefresh = () => {
    refetch();
  };

  return (
    <View style={styles.container}>
      <StitchHeader
        title="Staff Performance"
        subtitle="Sales and collection tracking by staff"
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
              size={20}
              color={AdminTheme.colors.surface}
            />
          </Pressable>
        }
      />

      {/* Stats Cards */}
      {staffRows.length > 0 && (
        <StatsCard
          totalStaff={stats.totalStaff}
          totalRevenue={stats.totalRevenue}
          totalCollected={stats.totalCollected}
          totalDue={stats.totalDue}
          collectionRate={stats.collectionRate}
        />
      )}

      <ScrollView 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Filters */}
        {staffOptions.length > 1 && (
          <FiltersCard
            dateFilter={dateFilter}
            onDateFilterChange={setDateFilter}
            selectedStaffId={selectedStaffId}
            onStaffFilterChange={setSelectedStaffId}
            staffOptions={staffOptions}
          />
        )}

        {/* Staff Performance List */}
        {staffRows.length === 0 ? (
          <EmptyState />
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
    backgroundColor: AdminTheme.colors.background,
  },
  headerIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  headerIconBtnPressed: {
    
    transform: [{ scale: 0.95 }],
  },

  // Stats Card - Horizontal Scroll
  statsScroll: {
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
  },
  statsScrollContent: {
    gap: 12,
    paddingRight: 20,
  },
  statCard: {
    minWidth: 120,
    backgroundColor: AdminTheme.colors.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    ...AdminTheme.shadow.sm,
  },
  statIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  statContent: {
    flex: 1,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    lineHeight: 22,
  },
  statLabel: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "500",
    marginTop: 2,
  },

  // Filters Card
  filtersCard: {
    backgroundColor: AdminTheme.colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 12,
    ...AdminTheme.shadow.sm,
  },
  filtersHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  filtersTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
  },
  filterScrollContent: {
    gap: 8,
    paddingRight: 16,
    marginBottom: 8,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 30,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  filterChipActive: {
    backgroundColor: `${AdminTheme.colors.primary}08`,
    borderColor: AdminTheme.colors.primary,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#6B7280",
  },
  filterChipTextActive: {
    color: AdminTheme.colors.primary,
    fontWeight: "600",
  },

  // Content
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: BOTTOM_NAV_HEIGHT + 20,
    gap: 12,
  },

  // Performance Card
  performanceCard: {
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
  staffNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 2,
  },
  staffName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    flex: 1,
  },
  rankBadge: {
    fontSize: 10,
    color: AdminTheme.colors.primary,
    fontWeight: "700",
    backgroundColor: `${AdminTheme.colors.primary}10`,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  staffRole: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 2,
  },
  staffContact: {
    fontSize: 11,
    color: "#9CA3AF",
  },
  performanceBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
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
  },
  statBlockDivider: {
    width: 1,
    height: 30,
    backgroundColor: "#E5E7EB",
    marginHorizontal: 8,
  },

  // Card Footer
  cardFooter: {
    gap: 10,
  },
  dueContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
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
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
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
