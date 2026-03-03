import { MaterialIcons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import FixedHeader from "../../components/common/FixedHeader";
import { AuthService } from "../../services/auth.service";
import { NurseryService } from "../../services/nursery.service";
import { SuperAdminService } from "../../services/super-admin.service";
import { useAuthStore } from "../../stores/auth.store";
import { Colors } from "../../theme";

const BOTTOM_NAV_HEIGHT = 80;

const formatMoney = (amount: number) =>
  `₹${Math.round(amount || 0).toLocaleString("en-IN")}`;

const formatNumber = (num: number) => num.toLocaleString("en-IN");

type OverviewData = {
  nurseries: Awaited<ReturnType<typeof NurseryService.list>>;
  summaries: Awaited<ReturnType<typeof SuperAdminService.getNurserySummary>>;
};

// ==================== STATS CARD ====================

interface StatCardProps {
  label: string;
  value: string | number;
  icon: string;
  color: string;
  trend?: number;
}

const StatCard = ({ label, value, icon, color, trend }: StatCardProps) => (
  <View style={[styles.statCard, { backgroundColor: `${color}08` }]}>
    <View style={styles.statHeader}>
      <View style={[styles.statIcon, { backgroundColor: `${color}15` }]}>
        <MaterialIcons name={icon as any} size={18} color={color} />
      </View>
      {trend !== undefined && (
        <View
          style={[
            styles.trendBadge,
            { backgroundColor: trend > 0 ? "#ECFDF5" : "#FEF2F2" },
          ]}
        >
          <MaterialIcons
            name={trend > 0 ? "arrow-upward" : "arrow-downward"}
            size={12}
            color={trend > 0 ? Colors.success : Colors.error}
          />
        </View>
      )}
    </View>
    <Text style={styles.statLabel}>{label}</Text>
    <Text style={[styles.statValue, { color }]}>{value}</Text>
  </View>
);

// ==================== NURSERY CARD ====================

interface NurseryCardProps {
  nursery: any;
  onPress: (id: string) => void;
}

const NurseryCard = ({ nursery, onPress }: NurseryCardProps) => (
  <Pressable
    style={({ pressed }) => [
      styles.nurseryCard,
      pressed && styles.nurseryCardPressed,
    ]}
    onPress={() => onPress(nursery.nurseryId)}
  >
    <View style={styles.nurseryCardHeader}>
      <View style={styles.nurseryCardLeft}>
        <View
          style={[
            styles.nurseryIcon,
            { backgroundColor: `${Colors.primary}10` },
          ]}
        >
          <MaterialIcons name="store" size={18} color={Colors.primary} />
        </View>
        <View style={styles.nurseryInfo}>
          <Text style={styles.nurseryName} numberOfLines={1}>
            {nursery.nurseryName}
          </Text>
          <View style={styles.nurseryMeta}>
            <MaterialIcons name="shopping-bag" size={10} color="#9CA3AF" />
            <Text style={styles.nurseryMetaText}>
              {nursery.salesCount} sales
            </Text>
          </View>
        </View>
      </View>
      <View
        style={[
          styles.statusBadge,
          nursery.status === "ACTIVE"
            ? styles.activeBadge
            : styles.suspendedBadge,
        ]}
      >
        <Text
          style={[
            styles.statusText,
            nursery.status === "ACTIVE"
              ? styles.activeText
              : styles.suspendedText,
          ]}
        >
          {nursery.status}
        </Text>
      </View>
    </View>

    <View style={styles.nurseryStats}>
      <View style={styles.nurseryStat}>
        <Text style={styles.nurseryStatLabel}>Revenue</Text>
        <Text style={styles.nurseryStatValue}>
          {formatMoney(nursery.revenue)}
        </Text>
      </View>
      <View style={styles.nurseryStatDivider} />
      <View style={styles.nurseryStat}>
        <Text style={styles.nurseryStatLabel}>Rank</Text>
        <Text style={styles.nurseryStatValue}>#{nursery.rank}</Text>
      </View>
    </View>

    <View style={styles.viewDetails}>
      <Text style={styles.viewDetailsText}>View Details</Text>
      <MaterialIcons name="chevron-right" size={16} color={Colors.primary} />
    </View>
  </Pressable>
);

// ==================== MAIN COMPONENT ====================

export default function SuperAdminDashboard() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, error, refetch } = useQuery<OverviewData>({
    queryKey: ["super-admin-overview-v2"],
    queryFn: async () => {
      const [nurseries, summaries] = await Promise.all([
        NurseryService.list(),
        SuperAdminService.getNurserySummary(),
      ]);
      return { nurseries, summaries };
    },
  });

  const nurseries = data?.nurseries || [];
  const summaries = data?.summaries || [];

  const summaryByNurseryId = new Map(
    summaries.map((row) => [row.nurseryId, row]),
  );
  const mergedRows = nurseries.map((nursery) => {
    const summary = summaryByNurseryId.get(nursery.id);
    return {
      nurseryId: nursery.id,
      nurseryName: nursery.name,
      status: nursery.status || "ACTIVE",
      salesCount: summary?.salesCount || 0,
      revenue: summary?.revenue || 0,
    };
  });

  // Calculate stats
  const totalRevenue = mergedRows.reduce((sum, row) => sum + row.revenue, 0);
  const totalSales = mergedRows.reduce((sum, row) => sum + row.salesCount, 0);
  const activeNurseries = mergedRows.filter(
    (row) => row.status === "ACTIVE",
  ).length;
  const suspendedNurseries = mergedRows.filter(
    (row) => row.status !== "ACTIVE",
  ).length;

  // Sort by revenue and add rank
  const rankedNurseries = [...mergedRows]
    .sort((a, b) => b.revenue - a.revenue)
    .map((nursery, index) => ({
      ...nursery,
      rank: index + 1,
    }));

  const topNursery = rankedNurseries[0];
  const averageRevenue =
    mergedRows.length > 0 ? totalRevenue / mergedRows.length : 0;

  const handleRefresh = async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await refetch();
    setRefreshing(false);
  };

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          await AuthService.logout();
          clearAuth();
          router.replace("/(auth)/login");
        },
      },
    ]);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <FixedHeader
          title="Super Admin"
          subtitle="Loading dashboard..."
          showBackButton
          onBackPress={() => router.back()}
          userName={user?.name || "Super Admin"}
          userRoleLabel="Super Admin"
          onLogout={handleLogout}
        />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading dashboard data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <FixedHeader
          title="Super Admin"
          subtitle="Error loading data"
          showBackButton
          onBackPress={() => router.back()}
          userName={user?.name || "Super Admin"}
          userRoleLabel="Super Admin"
          onLogout={handleLogout}
        />
        <View style={styles.centerContainer}>
          <MaterialIcons name="error-outline" size={48} color={Colors.error} />
          <Text style={styles.errorTitle}>Failed to Load</Text>
          <Text style={styles.errorMessage}>
            Unable to load dashboard. Please try again.
          </Text>
          <Pressable onPress={handleRefresh} style={styles.retryButton}>
            <LinearGradient
              colors={[Colors.primary, Colors.primaryLight || Colors.primary]}
              style={styles.retryGradient}
            >
              <Text style={styles.retryButtonText}>Try Again</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <FixedHeader
        title="Super Admin"
        subtitle="Cross-nursery business overview"
        showBackButton
        onBackPress={() => router.back()}
        userName={user?.name || "Super Admin"}
        userRoleLabel="Super Admin"
        onLogout={handleLogout}
        actions={
          <Pressable
            style={({ pressed }) => [
              styles.headerIconBtn,
              pressed && styles.headerIconBtnPressed,
            ]}
            onPress={handleRefresh}
          >
            <MaterialIcons
              name={refreshing ? "sync" : "refresh"}
              size={20}
              color={Colors.white}
            />
          </Pressable>
        }
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
        {/* Key Metrics */}
        <View style={styles.statsGrid}>
          <StatCard
            label="Total Revenue"
            value={formatMoney(totalRevenue)}
            icon="payments"
            color={Colors.primary}
          />
          <StatCard
            label="Total Sales"
            value={formatNumber(totalSales)}
            icon="shopping-cart"
            color={Colors.success}
          />
          <StatCard
            label="Active Nurseries"
            value={activeNurseries}
            icon="store"
            color={Colors.info}
          />
          <StatCard
            label="Avg Revenue"
            value={formatMoney(averageRevenue)}
            icon="trending-up"
            color={Colors.warning}
          />
        </View>

        {/* Top Performer Spotlight */}
        {topNursery && (
          <LinearGradient
            colors={[Colors.primary + "20", Colors.primary + "08"]}
            style={styles.spotlightCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.spotlightHeader}>
              <View
                style={[
                  styles.spotlightIcon,
                  { backgroundColor: `${Colors.primary}20` },
                ]}
              >
                <MaterialIcons
                  name="emoji-events"
                  size={24}
                  color={Colors.primary}
                />
              </View>
              <View style={styles.spotlightContent}>
                <Text style={styles.spotlightTitle}>
                  Top Performing Nursery
                </Text>
                <Text style={styles.spotlightName}>
                  {topNursery.nurseryName}
                </Text>
              </View>
            </View>
            <View style={styles.spotlightStats}>
              <View style={styles.spotlightStat}>
                <Text style={styles.spotlightStatLabel}>Revenue</Text>
                <Text style={styles.spotlightStatValue}>
                  {formatMoney(topNursery.revenue)}
                </Text>
              </View>
              <View style={styles.spotlightStatDivider} />
              <View style={styles.spotlightStat}>
                <Text style={styles.spotlightStatLabel}>Sales</Text>
                <Text style={styles.spotlightStatValue}>
                  {topNursery.salesCount}
                </Text>
              </View>
            </View>
          </LinearGradient>
        )}

        {/* Nursery Performance */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderLeft}>
              <MaterialIcons name="store" size={18} color={Colors.primary} />
              <Text style={styles.sectionTitle}>Nursery Performance</Text>
            </View>
            <Pressable
              onPress={() => router.push("/(super-admin)/nurseries" as any)}
              style={({ pressed }) => [
                styles.viewAllButton,
                pressed && styles.viewAllButtonPressed,
              ]}
            >
              <Text style={styles.viewAllText}>View All</Text>
              <MaterialIcons
                name="arrow-forward"
                size={14}
                color={Colors.primary}
              />
            </Pressable>
          </View>

          {rankedNurseries.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="store" size={48} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>No Nurseries Found</Text>
              <Text style={styles.emptyMessage}>
                Create a nursery to start tracking performance.
              </Text>
            </View>
          ) : (
            <View style={styles.nurseryList}>
              {rankedNurseries.slice(0, 5).map((nursery) => (
                <NurseryCard
                  key={nursery.nurseryId}
                  nursery={nursery}
                  onPress={(id) =>
                    router.push({
                      pathname: "/(super-admin)/nurseries/[id]",
                      params: { id },
                    } as any)
                  }
                />
              ))}
            </View>
          )}
        </View>

        {/* Audit Logs Card */}
        <Pressable
          style={({ pressed }) => [
            styles.auditCard,
            pressed && styles.auditCardPressed,
          ]}
          onPress={() => router.push("/(super-admin)/audit-logs" as any)}
        >
          <LinearGradient
            colors={[Colors.info + "20", Colors.info + "08"]}
            style={styles.auditGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.auditContent}>
              <View
                style={[
                  styles.auditIcon,
                  { backgroundColor: `${Colors.info}20` },
                ]}
              >
                <MaterialIcons name="history" size={24} color={Colors.info} />
              </View>
              <View style={styles.auditInfo}>
                <Text style={styles.auditTitle}>Soft Delete Audit Logs</Text>
                <Text style={styles.auditDescription}>
                  Review deleted records and manage 30-day purge actions
                </Text>
              </View>
            </View>
            <View style={styles.auditArrow}>
              <MaterialIcons
                name="arrow-forward"
                size={20}
                color={Colors.info}
              />
            </View>
          </LinearGradient>
        </Pressable>

        {/* Quick Stats Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Quick Overview</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryItemLabel}>Total Nurseries</Text>
              <Text style={styles.summaryItemValue}>{mergedRows.length}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryItemLabel}>Active</Text>
              <Text
                style={[styles.summaryItemValue, { color: Colors.success }]}
              >
                {activeNurseries}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryItemLabel}>Suspended</Text>
              <Text style={[styles.summaryItemValue, { color: Colors.error }]}>
                {suspendedNurseries}
              </Text>
            </View>
          </View>
        </View>
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
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.34)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerIconBtnPressed: {
    backgroundColor: "rgba(255,255,255,0.1)",
    transform: [{ scale: 0.95 }],
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
  statHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  trendBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
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

  // Spotlight Card
  spotlightCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: `${Colors.primary}30`,
    gap: 12,
  },
  spotlightHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  spotlightIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  spotlightContent: {
    flex: 1,
  },
  spotlightTitle: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 2,
  },
  spotlightName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  spotlightStats: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.5)",
    borderRadius: 12,
    padding: 12,
  },
  spotlightStat: {
    flex: 1,
    alignItems: "center",
  },
  spotlightStatLabel: {
    fontSize: 10,
    color: "#6B7280",
    marginBottom: 2,
  },
  spotlightStatValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  spotlightStatDivider: {
    width: 1,
    height: 20,
    backgroundColor: "#E5E7EB",
    marginHorizontal: 8,
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
  viewAllButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  viewAllButtonPressed: {
    opacity: 0.7,
  },
  viewAllText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: "500",
  },

  // Nursery List
  nurseryList: {
    gap: 8,
  },
  nurseryCard: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 12,
  },
  nurseryCardPressed: {
    backgroundColor: "#F9FAFB",
    transform: [{ scale: 0.98 }],
  },
  nurseryCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  nurseryCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  nurseryIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  nurseryInfo: {
    flex: 1,
  },
  nurseryName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 2,
  },
  nurseryMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  nurseryMetaText: {
    fontSize: 11,
    color: "#6B7280",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeBadge: {
    backgroundColor: "#ECFDF5",
  },
  suspendedBadge: {
    backgroundColor: "#FEF2F2",
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
  },
  activeText: {
    color: Colors.success,
  },
  suspendedText: {
    color: Colors.error,
  },
  nurseryStats: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 10,
    padding: 10,
  },
  nurseryStat: {
    flex: 1,
    alignItems: "center",
  },
  nurseryStatLabel: {
    fontSize: 10,
    color: "#6B7280",
    marginBottom: 2,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  nurseryStatValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
  },
  nurseryStatDivider: {
    width: 1,
    height: 20,
    backgroundColor: "#E5E7EB",
    marginHorizontal: 8,
  },
  viewDetails: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
  },
  viewDetailsText: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: "600",
  },

  // Audit Card
  auditCard: {
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: `${Colors.info}30`,
  },
  auditCardPressed: {
    transform: [{ scale: 0.98 }],
  },
  auditGradient: {
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  auditContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  auditIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  auditInfo: {
    flex: 1,
  },
  auditTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 2,
  },
  auditDescription: {
    fontSize: 11,
    color: "#6B7280",
  },
  auditArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.5)",
  },

  // Summary Card
  summaryCard: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 10,
  },
  summaryTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
  },
  summaryGrid: {
    flexDirection: "row",
    gap: 12,
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 10,
    padding: 10,
  },
  summaryItemLabel: {
    fontSize: 10,
    color: "#6B7280",
    marginBottom: 2,
  },
  summaryItemValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
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
