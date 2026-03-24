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

import SuperAdminCard from "../../components/super-admin/SuperAdminCard";
import SuperAdminHeader from "../../components/super-admin/SuperAdminHeader";
import SuperAdminKpiCard from "../../components/super-admin/SuperAdminKpiCard";
import SuperAdminSectionHeader from "../../components/super-admin/SuperAdminSectionHeader";
import SuperAdminStatusBadge from "../../components/super-admin/SuperAdminStatusBadge";
import { SHARED_BOTTOM_NAV_HEIGHT } from "../../components/navigation/SharedBottomNav";
import { SuperAdminTheme } from "../../components/super-admin/theme";
import { AuthService } from "../../services/auth.service";
import { NurseryService } from "../../services/nursery.service";
import { SuperAdminService } from "../../services/super-admin.service";
import { useAuthStore } from "../../stores/auth.store";
import { Colors, Spacing } from "@/src/theme";

const formatMoney = (amount: number) =>
  `₹${Math.round(amount || 0).toLocaleString("en-IN")}`;

const formatNumber = (num: number) => num.toLocaleString("en-IN");

type OverviewData = {
  nurseries: Awaited<ReturnType<typeof NurseryService.list>>;
  summaries: Awaited<ReturnType<typeof SuperAdminService.getNurserySummary>>;
};

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
            { backgroundColor: "rgba(15, 189, 73, 0.12)" },
          ]}
        >
          <MaterialIcons name="store" size={18} color={SuperAdminTheme.colors.primary} />
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
      <SuperAdminStatusBadge
        label={nursery.status}
        tone={nursery.status === "ACTIVE" ? "active" : "inactive"}
      />
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
      <MaterialIcons name="chevron-right" size={16} color={SuperAdminTheme.colors.primary} />
    </View>
  </Pressable>
);

// ==================== MAIN COMPONENT ====================

export default function SuperAdminDashboard() {
  const router = useRouter();
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
        <SuperAdminHeader
          title="Super Admin"
          subtitle="Loading dashboard..."
          
          actions={
            <Pressable style={styles.headerIconBtn} onPress={handleRefresh}>
              <MaterialIcons name="refresh" size={20} color={SuperAdminTheme.colors.text} />
            </Pressable>
          }
        />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={SuperAdminTheme.colors.primary} />
          <Text style={styles.loadingText}>Loading dashboard data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <SuperAdminHeader
          title="Super Admin"
          subtitle="Error loading data"
         
          actions={
            <Pressable style={styles.headerIconBtn} onPress={handleRefresh}>
              <MaterialIcons name="refresh" size={20} color={SuperAdminTheme.colors.text} />
            </Pressable>
          }
        />
        <View style={styles.centerContainer}>
          <MaterialIcons name="error-outline" size={48} color={SuperAdminTheme.colors.danger} />
          <Text style={styles.errorTitle}>Failed to Load</Text>
          <Text style={styles.errorMessage}>
            Unable to load dashboard. Please try again.
          </Text>
          <Pressable onPress={handleRefresh} style={styles.retryButton}>
            <LinearGradient
              colors={[SuperAdminTheme.colors.primary, SuperAdminTheme.colors.primaryDark]}
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
      <SuperAdminHeader
        title="Super Admin"
        subtitle="Cross-nursery business overview"
       
        actions={
          <>
            <Pressable style={styles.headerIconBtn} onPress={handleRefresh}>
              <MaterialIcons
                name={refreshing ? "sync" : "refresh"}
                size={20}
                color={SuperAdminTheme.colors.surface}
              />
            </Pressable>
            <Pressable style={styles.headerIconBtn} onPress={handleLogout}>
              <MaterialIcons name="logout" size={20} color={SuperAdminTheme.colors.surface} />
            </Pressable>
          </>
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[SuperAdminTheme.colors.primary]}
            tintColor={SuperAdminTheme.colors.primary}
          />
        }
      >
        {/* Key Metrics */}
        <View style={styles.statsGrid}>
          <View style={styles.kpiItem}>
            <SuperAdminKpiCard
              label="Total Revenue"
              value={formatMoney(totalRevenue)}
              icon={<MaterialIcons name="payments" size={18} color={SuperAdminTheme.colors.primary} />}
              helper="Updated this month"
            />
          </View>
          <View style={styles.kpiItem}>
            <SuperAdminKpiCard
              label="Total Sales"
              value={formatNumber(totalSales)}
              icon={<MaterialIcons name="shopping-cart" size={18} color={SuperAdminTheme.colors.success} />}
              tone="success"
            />
          </View>
          <View style={styles.kpiItem}>
            <SuperAdminKpiCard
              label="Active Nurseries"
              value={activeNurseries}
              icon={<MaterialIcons name="store" size={18} color={SuperAdminTheme.colors.info} />}
              tone="neutral"
            />
          </View>
          <View style={styles.kpiItem}>
            <SuperAdminKpiCard
              label="Avg Revenue"
              value={formatMoney(averageRevenue)}
              icon={<MaterialIcons name="trending-up" size={18} color={SuperAdminTheme.colors.warning} />}
              tone="warning"
            />
          </View>
        </View>

        {/* Top Performer Spotlight */}
        {topNursery && (
          <LinearGradient
            colors={[
              SuperAdminTheme.colors.primary,
              SuperAdminTheme.colors.primaryDark,
            ]}
            style={styles.spotlightCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.spotlightHeader}>
              <View
                style={[
                  styles.spotlightIcon,
                  { backgroundColor: "rgba(255,255,255,0.2)" },
                ]}
              >
                <MaterialIcons
                  name="emoji-events"
                  size={24}
                  color={SuperAdminTheme.colors.surface}
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
          <SuperAdminSectionHeader
            title="Top 5 Nurseries"
            action={
              <Pressable
                onPress={() => router.push("/(super-admin)/nurseries" as any)}
                style={styles.viewAllButton}
              >
                <Text style={styles.viewAllText}>View All</Text>
                <MaterialIcons
                  name="arrow-forward"
                  size={14}
                  color={SuperAdminTheme.colors.primary}
                />
              </Pressable>
            }
          />

          {rankedNurseries.length === 0 ? (
            <SuperAdminCard style={styles.emptyContainer}>
              <View style={{ alignItems: "center" }}>
                <MaterialIcons name="store" size={48} color={SuperAdminTheme.colors.textSoft} />
              </View>
              <Text style={styles.emptyTitle}>No Nurseries Found</Text>
              <Text style={styles.emptyMessage}>
                Create a nursery to start tracking performance.
              </Text>
            </SuperAdminCard>
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
          <View style={styles.auditGradient} >
            <View style={styles.auditContent}>
              <View style={styles.auditIcon}>
                <MaterialIcons name="history" size={24} color={SuperAdminTheme.colors.info} />
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
                color={SuperAdminTheme.colors.info}
              />
            </View>
          </View>
        </Pressable>

        {/* Quick Stats Summary */}
        <SuperAdminCard style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Quick Overview</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryItemLabel}>Total Nurseries</Text>
              <Text style={styles.summaryItemValue}>{mergedRows.length}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryItemLabel}>Active</Text>
              <Text style={[styles.summaryItemValue, { color: SuperAdminTheme.colors.success }]}>
                {activeNurseries}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryItemLabel}>Suspended</Text>
              <Text style={[styles.summaryItemValue, { color: SuperAdminTheme.colors.danger }]}>
                {suspendedNurseries}
              </Text>
            </View>
          </View>
        </SuperAdminCard>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SuperAdminTheme.colors.background,
  },

  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.21)",
    backgroundColor: "rgba(255, 255, 255, 0.17)",
    alignItems: "center",
    justifyContent: "center",
  },

  // Center Container
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: SuperAdminTheme.spacing.lg,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: SuperAdminTheme.colors.textMuted,
  },

  // Content
  content: {
    paddingHorizontal: SuperAdminTheme.spacing.md,
    paddingTop: SuperAdminTheme.spacing.md,
    paddingBottom: SHARED_BOTTOM_NAV_HEIGHT + 100,
    gap: SuperAdminTheme.spacing.lg,
  },

  // Stats Grid
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  kpiItem: {
    width: "48%",
  },

  // Spotlight Card
  spotlightCard: {
    borderRadius: SuperAdminTheme.radius.xl,
    padding: SuperAdminTheme.spacing.md,
    gap: 12,
  },
  spotlightHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  spotlightIcon: {
    width: 56,
    height: 56,
    borderRadius: SuperAdminTheme.radius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  spotlightContent: {
    flex: 1,
  },
  spotlightTitle: {
    fontSize: 11,
    color: "rgba(255,255,255,0.7)",
    marginBottom: 2,
  },
  spotlightName: {
    fontSize: 18,
    fontWeight: "700",
    color: SuperAdminTheme.colors.surface,
  },
  spotlightStats: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: SuperAdminTheme.radius.lg,
    padding: SuperAdminTheme.spacing.sm,
  },
  spotlightStat: {
    flex: 1,
    alignItems: "center",
  },
  spotlightStatLabel: {
    fontSize: 10,
    color: "rgba(255,255,255,0.8)",
    marginBottom: 2,
  },
  spotlightStatValue: {
    fontSize: 14,
    fontWeight: "700",
    color: SuperAdminTheme.colors.surface,
  },
  spotlightStatDivider: {
    width: 1,
    height: 20,
    backgroundColor: "rgba(255,255,255,0.4)",
    marginHorizontal: 8,
  },

  // Section
  section: {
    gap: SuperAdminTheme.spacing.sm,
  },
  viewAllButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  viewAllText: {
    fontSize: 12,
    color: SuperAdminTheme.colors.primary,
    fontWeight: "700",
  },

  // Nursery List
  nurseryList: {
    gap: 12,
  },
  nurseryCard: {
    backgroundColor: SuperAdminTheme.colors.surface,
    borderRadius: SuperAdminTheme.radius.lg,
    padding: SuperAdminTheme.spacing.md,
    borderWidth: 1,
    borderColor: SuperAdminTheme.colors.borderSoft,
    gap: 12,
  },
  nurseryCardPressed: {
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
    width: 44,
    height: 44,
    borderRadius: SuperAdminTheme.radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  nurseryInfo: {
    flex: 1,
  },
  nurseryName: {
    fontSize: 14,
    fontWeight: "700",
    color: SuperAdminTheme.colors.text,
    marginBottom: 2,
  },
  nurseryMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  nurseryMetaText: {
    fontSize: 11,
    color: SuperAdminTheme.colors.textMuted,
  },
  nurseryStats: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: SuperAdminTheme.colors.surfaceMuted,
    borderRadius: SuperAdminTheme.radius.md,
    padding: SuperAdminTheme.spacing.sm,
  },
  nurseryStat: {
    flex: 1,
    alignItems: "center",
  },
  nurseryStatLabel: {
    fontSize: 10,
    color: SuperAdminTheme.colors.textMuted,
    marginBottom: 2,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  nurseryStatValue: {
    fontSize: 13,
    fontWeight: "700",
    color: SuperAdminTheme.colors.text,
  },
  nurseryStatDivider: {
    width: 1,
    height: 20,
    backgroundColor: SuperAdminTheme.colors.border,
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
    color: SuperAdminTheme.colors.primary,
    fontWeight: "600",
  },

  // Audit Card
  auditCard: {
    borderRadius: SuperAdminTheme.radius.lg,
    overflow: "hidden",
  },
  auditCardPressed: {
    transform: [{ scale: 0.98 }],
  },
  auditGradient: {
    borderRadius:Spacing.md,
    backgroundColor: SuperAdminTheme.colors.surface,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal:Spacing.md,
    paddingVertical:Spacing.md,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
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
    borderRadius: SuperAdminTheme.radius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(14, 165, 233, 0.12)",
  },
  auditInfo: {
    flex: 1,
  },
  auditTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: SuperAdminTheme.colors.text,
    marginBottom: 2,
  },
  auditDescription: {
    fontSize: 11,
    color: SuperAdminTheme.colors.textMuted,
  },
  auditArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: SuperAdminTheme.colors.surfaceMuted,
  },

  // Summary Card
  summaryCard: {
    gap: 10,
  },
  summaryTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: SuperAdminTheme.colors.text,
  },
  summaryGrid: {
    flexDirection: "row",
    gap: 12,
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
    backgroundColor: SuperAdminTheme.colors.surfaceMuted,
    borderRadius: SuperAdminTheme.radius.md,
    padding: 10,
  },
  summaryItemLabel: {
    fontSize: 10,
    color: SuperAdminTheme.colors.textMuted,
    marginBottom: 2,
  },
  summaryItemValue: {
    fontSize: 16,
    fontWeight: "700",
    color: SuperAdminTheme.colors.text,
  },

  // Empty State
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: SuperAdminTheme.colors.text,
    textAlign:"center"
  },
  emptyMessage: {
    fontSize: 12,
    color: SuperAdminTheme.colors.textMuted,
    textAlign: "center",
    paddingHorizontal: 24,
  },

  // Error State
  errorTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: SuperAdminTheme.colors.danger,
  },
  errorMessage: {
    fontSize: 13,
    color: SuperAdminTheme.colors.textMuted,
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
    color: SuperAdminTheme.colors.surface,
    fontSize: 13,
    fontWeight: "600",
  },
});
