import { MaterialIcons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import KpiCard from "../../components/admin/KpiCard";
import { AuthService } from "../../services/auth.service";
import { StaffDashboardService } from "../../services/staff-dashboard.service";
import { useAuthStore } from "../../stores/auth.store";
import { Colors, Spacing } from "../../theme";
import { getUser } from "../../utils/storage";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const BOTTOM_NAV_HEIGHT = 90;

export default function StaffDashboard() {
  const router = useRouter();
  const isMounted = useRef(true);

  /* ---------------- AUTH ---------------- */
  const storeUser = useAuthStore((state) => state.user);
  const clearAuth = useAuthStore((state) => state.clearAuth);

  const [storageUser, setStorageUser] = useState<any>(null);

  useEffect(() => {
    isMounted.current = true;

    if (!storeUser) {
      (async () => {
        const user = await getUser();
        if (isMounted.current) {
          setStorageUser(user);
        }
      })();
    }

    return () => {
      isMounted.current = false;
    };
  }, [storeUser]);

  const user = storeUser ?? storageUser;
  const userName = user?.name || "Staff Member";
  const userInitials = userName.charAt(0).toUpperCase();

  /* ---------------- DATA ---------------- */
  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ["staff-dashboard"],
    queryFn: StaffDashboardService.getStats,
  });

  /* ---------------- NORMALIZED STATS ---------------- */
  const stats = useMemo(() => {
    return {
      totalPlants: Number(data?.totalPlants ?? 0),
      totalSeeds: Number(data?.totalSeeds ?? 0),
      todaySowingCount: Number(data?.todaySowingCount ?? 0),
      todaySalesCount: Number(data?.todaySalesCount ?? 0),
      activePlants: Number(data?.activePlants ?? 0),
      lowStockItems: Number(data?.lowStockItems ?? 0),
      pendingTasks: Number(data?.pendingTasks ?? 0),
    };
  }, [data]);

  /* ---------------- ACTIONS ---------------- */
  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          await AuthService.logout();
          clearAuth();
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          router.replace("/(auth)/login");
        },
      },
    ]);
  };

  const handleCardPress = (type: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    switch (type) {
      case "plants":
        router.push("/(staff)/plants");
        break;
      case "seeds":
        router.push("/(staff)/seeds");
        break;
      case "sales":
        router.push("/(staff)/sales/create");
        break;
      case "sowing":
        router.push("/(staff)/sowing/create");
        break;
    }
  };

  /* ---------------- LOADING ---------------- */
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={[Colors.primary, Colors.primaryLight]}
          style={styles.fixedHeader}
        >
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.title}>Dashboard</Text>
              <Text style={styles.subtitle}>Loading insights...</Text>
            </View>
            <Pressable onPress={handleLogout} style={styles.logoutButton}>
              <MaterialIcons name="logout" size={20} color={Colors.white} />
            </Pressable>
          </View>

          <View style={styles.userWelcome}>
            <View style={styles.userAvatar}>
              <Text style={styles.userAvatarText}>{userInitials}</Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.welcomeText}>Welcome back,</Text>
              <Text style={styles.userName}>{userName}</Text>
              <View style={styles.roleBadge}>
                <MaterialIcons name="work" size={12} color={Colors.white} />
                <Text style={styles.roleText}>Staff Member</Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.info} />
          <Text style={styles.loadingText}>Loading dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  /* ---------------- ERROR ---------------- */
  if (error || !data) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={[Colors.primary, Colors.primaryLight]}
          style={styles.fixedHeader}
        >
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.title}>Dashboard</Text>
              <Text style={styles.subtitle}>Error loading data</Text>
            </View>
            <Pressable onPress={handleLogout} style={styles.logoutButton}>
              <MaterialIcons name="logout" size={20} color={Colors.white} />
            </Pressable>
          </View>

          <View style={styles.userWelcome}>
            <View style={styles.userAvatar}>
              <Text style={styles.userAvatarText}>{userInitials}</Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.welcomeText}>Hi there,</Text>
              <Text style={styles.userName}>{userName}</Text>
              <View style={styles.roleBadge}>
                <MaterialIcons name="work" size={12} color={Colors.white} />
                <Text style={styles.roleText}>Staff Member</Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={64} color={Colors.error} />
          <Text style={styles.errorTitle}>Unable to Load Dashboard</Text>
          <Text style={styles.errorMessage}>
            Please check your connection and try again
          </Text>
          <Pressable onPress={() => refetch()} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  /* ---------------- KPI CONFIG ---------------- */
  const KPIS = [
    {
      title: "Total Plants",
      value: stats.totalPlants.toLocaleString(),
      icon: "🌿",
      color: Colors.success,
      type: "plants",
      gradient: [Colors.success, "#34D399"],
    },
    {
      title: "Total Seeds",
      value: stats.totalSeeds.toLocaleString(),
      icon: "🌱",
      color: Colors.info,
      type: "seeds",
      gradient: [Colors.info, "#60A5FA"],
    },
    {
      title: "Today's Sowings",
      value: stats.todaySowingCount.toLocaleString(),
      icon: "🌱",
      color: Colors.warning,
      type: "sowing",
      gradient: [Colors.warning, "#FBBF24"],
    },
    {
      title: "Today's Sales",
      value: stats.todaySalesCount.toLocaleString(),
      icon: "💰",
      color: Colors.primary,
      type: "sales",
      gradient: [Colors.primary, Colors.primaryLight],
    },
  ] as const;

  const QUICK_ACTIONS = [
    {
      title: "Record Sale",
      subtitle: "Create sales entry",
      icon: "receipt-long",
      color: Colors.primary,
      action: () => router.push("/(staff)/sales/create"),
    },
    {
      title: "Record Sowing",
      subtitle: "Log new sowing activity",
      icon: "grass",
      color: Colors.success,
      action: () => router.push("/(staff)/sowing/create"),
    },
    {
      title: "View Plants",
      subtitle: "Browse plant inventory",
      icon: "local-florist",
      color: Colors.info,
      action: () => router.push("/(staff)/plants"),
    },
    {
      title: "View Seeds",
      subtitle: "Browse seed inventory",
      icon: "inventory",
      color: Colors.warning,
      action: () => router.push("/(staff)/seeds"),
    },
  ];

  const STATS_CARDS = [
    {
      title: "Active Plants",
      value: data.activePlants?.toLocaleString() || "0",
      change: "+3",
      icon: "spa",
      color: Colors.success,
    },
    {
      title: "Low Stock",
      value: data.lowStockItems?.toLocaleString() || "0",
      change: "+1",
      icon: "warning",
      color: Colors.warning,
    },
    {
      title: "Pending Tasks",
      value: data.pendingTasks?.toLocaleString() || "0",
      change: "-2",
      icon: "pending-actions",
      color: Colors.error,
    },
  ];

  const todaySales = data.todaySalesCount || 0;
  const todaySowings = data.todaySowingCount || 0;
  const totalPlants = data.totalPlants || 0;

  return (
    <SafeAreaView style={styles.container}>
      {/* Fixed Header */}
      <LinearGradient
        colors={[Colors.primary, Colors.primaryLight]}
        style={styles.fixedHeader}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.title}>Dashboard</Text>
          </View>
          <View style={styles.headerActions}>
            <Pressable
              onPress={refetch}
              style={({ pressed }) => [
                styles.refreshButton,
                pressed && styles.refreshButtonPressed,
              ]}
            >
              <MaterialIcons
                name={isRefetching ? "refresh" : "refresh"}
                size={20}
                color={Colors.white}
                style={isRefetching ? styles.refreshingIcon : undefined}
              />
            </Pressable>
            <Pressable
              onPress={handleLogout}
              style={({ pressed }) => [
                styles.logoutButton,
                pressed && styles.logoutButtonPressed,
              ]}
            >
              <MaterialIcons name="logout" size={20} color={Colors.white} />
            </Pressable>
          </View>
        </View>

        {/* User Welcome Section - Same as Admin */}
        <View style={styles.userWelcome}>
          <View style={styles.userAvatar}>
            <Text style={styles.userAvatarText}>{userInitials}</Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.welcomeText}>Welcome back,</Text>
            <Text style={styles.userName}>{userName}</Text>
            <View style={styles.userDetails}>
              <View style={styles.roleBadge}>
                <MaterialIcons name="work" size={12} color={Colors.white} />
                <Text style={styles.roleText}>Staff Member</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Stats Summary - Same as Admin */}
        <View style={styles.statsSummary}>
          <View style={styles.statItem}>
            <MaterialIcons
              name="trending-up"
              size={16}
              color="rgba(255, 255, 255, 0.8)"
            />
            <Text style={styles.statLabel}>Today's Sales</Text>
            <Text style={styles.statValue}>
              {todaySales?.toLocaleString() || "0"}
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <MaterialIcons
              name="grass"
              size={16}
              color="rgba(255, 255, 255, 0.8)"
            />
            <Text style={styles.statLabel}>Today's Sowings</Text>
            <Text style={styles.statValue}>
              {todaySowings?.toLocaleString() || "0"}
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <MaterialIcons
              name="spa"
              size={16}
              color="rgba(255, 255, 255, 0.8)"
            />
            <Text style={styles.statLabel}>Total Plants</Text>
            <Text style={styles.statValue}>
              {totalPlants?.toLocaleString() || "0"}
            </Text>
          </View>
        </View>
      </LinearGradient>

      {/* Scrollable Content */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            colors={[Colors.info]}
            tintColor={Colors.info}
          />
        }
        contentContainerStyle={styles.scrollContent}
      >
        {/* KPI Cards */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="dashboard" size={24} color={Colors.text} />
            <Text style={styles.sectionTitle}>Today's Overview</Text>
          </View>
          <View style={styles.grid}>
            {KPIS.map((kpi) => (
              <Pressable
                key={kpi.title}
                onPress={() => handleCardPress(kpi.type)}
                style={({ pressed }) => [
                  styles.gridItem,
                  pressed && styles.gridItemPressed,
                ]}
              >
                <KpiCard
                  title={kpi.title}
                  value={kpi.value}
                  icon={kpi.icon}
                  color={kpi.color}
                  gradient={kpi.gradient}
                />
              </Pressable>
            ))}
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="bolt" size={24} color={Colors.text} />
            <Text style={styles.sectionTitle}>Quick Actions</Text>
          </View>
          <View style={styles.actionsGrid}>
            {QUICK_ACTIONS.map((action) => (
              <Pressable
                key={action.title}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  action.action();
                }}
                style={({ pressed }) => [
                  styles.actionCard,
                  pressed && styles.actionCardPressed,
                ]}
              >
                <View
                  style={[
                    styles.actionIcon,
                    { backgroundColor: action.color + "15" },
                  ]}
                >
                  <MaterialIcons
                    name={action.icon as any}
                    size={24}
                    color={action.color}
                  />
                </View>
                <Text style={styles.actionTitle}>{action.title}</Text>
                <Text style={styles.actionSubtitle}>{action.subtitle}</Text>
                <MaterialIcons
                  name="chevron-right"
                  size={20}
                  color={Colors.textTertiary}
                  style={styles.actionArrow}
                />
              </Pressable>
            ))}
          </View>
        </View>

        {/* Performance Insights */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="trending-up" size={24} color={Colors.text} />
            <Text style={styles.sectionTitle}>Performance Insights</Text>
          </View>
          <View style={styles.statsGrid}>
            {STATS_CARDS.map((stat) => (
              <View key={stat.title} style={styles.statCard}>
                <View style={styles.statCardHeader}>
                  <View
                    style={[
                      styles.statIcon,
                      { backgroundColor: stat.color + "15" },
                    ]}
                  >
                    <MaterialIcons
                      name={stat.icon as any}
                      size={20}
                      color={stat.color}
                    />
                  </View>
                  <View style={styles.statChange}>
                    <MaterialIcons
                      name={
                        stat.change.startsWith("+")
                          ? "arrow-upward"
                          : "arrow-downward"
                      }
                      size={12}
                      color={
                        stat.change.startsWith("+")
                          ? Colors.success
                          : Colors.error
                      }
                    />
                    <Text
                      style={[
                        styles.statChangeText,
                        {
                          color: stat.change.startsWith("+")
                            ? Colors.success
                            : Colors.error,
                        },
                      ]}
                    >
                      {stat.change}
                    </Text>
                  </View>
                </View>
                <Text style={styles.statCardValue}>{stat.value}</Text>
                <Text style={styles.statCardTitle}>{stat.title}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Recent Activity */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="history" size={24} color={Colors.text} />
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <Pressable style={styles.viewAllButton}>
              <Text style={styles.viewAllText}>View All</Text>
            </Pressable>
          </View>
          <View style={styles.activityList}>
            <View style={styles.activityItem}>
              <View style={styles.activityIcon}>
                <MaterialIcons
                  name="local-florist"
                  size={18}
                  color={Colors.success}
                />
              </View>
              <View style={styles.activityContent}>
                <Text style={styles.activityText}>
                  New plant added: Monstera Deliciosa
                </Text>
                <Text style={styles.activityTime}>2 hours ago</Text>
              </View>
            </View>
            <View style={styles.activityItem}>
              <View style={styles.activityIcon}>
                <MaterialIcons
                  name="receipt"
                  size={18}
                  color={Colors.warning}
                />
              </View>
              <View style={styles.activityContent}>
                <Text style={styles.activityText}>Sale recorded: ₹4,500</Text>
                <Text style={styles.activityTime}>4 hours ago</Text>
              </View>
            </View>
            <View style={styles.activityItem}>
              <View style={styles.activityIcon}>
                <MaterialIcons name="people" size={18} color={Colors.primary} />
              </View>
              <View style={styles.activityContent}>
                <Text style={styles.activityText}>
                  New user registered: John Doe
                </Text>
                <Text style={styles.activityTime}>1 day ago</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.lastUpdated}>
            Last updated:{" "}
            {new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
          <Text style={styles.version}>PNMS Staff Portal • v1.0.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* Updated Styles to Match Admin Dashboard */
const styles = {
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  fixedHeader: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    marginBottom: Spacing.sm,
  },
  headerActions: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: Spacing.sm,
  },
  title: {
    fontSize: 32,
    fontWeight: "700" as const,
    color: Colors.white,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.9)",
    fontWeight: "500" as const,
  },
  refreshButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  refreshButtonPressed: {
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    transform: [{ scale: 0.95 }],
  },
  logoutButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  logoutButtonPressed: {
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    transform: [{ scale: 0.95 }],
  },
  refreshingIcon: {
    transform: [{ rotate: "360deg" }],
  },
  userWelcome: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  userAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  userAvatarText: {
    fontSize: 24,
    fontWeight: "700" as const,
    color: Colors.white,
  },
  userInfo: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
    fontWeight: "500" as const,
    marginBottom: 2,
  },
  userName: {
    fontSize: 20,
    fontWeight: "600" as const,
    color: Colors.white,
    marginBottom: 4,
  },
  userDetails: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: Spacing.md,
    flexWrap: "wrap" as const,
  },
  userEmail: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.7)",
    fontWeight: "500" as const,
  },
  roleBadge: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  roleText: {
    fontSize: 12,
    color: Colors.white,
    fontWeight: "500" as const,
  },
  statsSummary: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    paddingHorizontal: Spacing.md,
  },
  statItem: {
    alignItems: "center" as const,
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.7)",
    fontWeight: "500" as const,
    marginTop: 4,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: Colors.white,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  contentArea: {
    flex: 1,
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
  errorContainer: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    padding: Spacing.xl,
    paddingBottom: BOTTOM_NAV_HEIGHT,
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
    backgroundColor: Colors.info,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: 12,
  },
  retryButtonPressed: {
    backgroundColor: Colors.infoDark || "#1D4ED8",
    transform: [{ scale: 0.98 }],
  },
  retryButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: "600" as const,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: BOTTOM_NAV_HEIGHT + Spacing.xl,
  },
  welcomeCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  welcomeContent: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: Spacing.md,
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: Colors.text,
    marginBottom: 4,
  },
  welcomeMessage: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: Colors.text,
    flex: 1,
  },
  viewAllButton: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
  viewAllText: {
    fontSize: 14,
    color: Colors.info,
    fontWeight: "600" as const,
  },
  grid: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    marginHorizontal: -Spacing.sm,
  },
  gridItem: {
    width: "50%",
    paddingHorizontal: Spacing.sm,
    marginBottom: Spacing.md,
  },
  gridItemPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  actionsGrid: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: Spacing.md,
  },
  actionCard: {
    width: (SCREEN_WIDTH - Spacing.lg * 2 - Spacing.md) / 2,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    position: "relative" as const,
  },
  actionCardPressed: {
    backgroundColor: Colors.surfaceDark,
    transform: [{ scale: 0.98 }],
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginBottom: Spacing.md,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: Colors.text,
    marginBottom: 2,
  },
  actionSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  actionArrow: {
    position: "absolute" as const,
    top: Spacing.lg,
    right: Spacing.lg,
  },
  statsGrid: {
    flexDirection: "row" as const,
    gap: Spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  statCardHeader: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    marginBottom: Spacing.sm,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  statChange: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 2,
  },
  statChangeText: {
    fontSize: 12,
    fontWeight: "600" as const,
  },
  statCardValue: {
    fontSize: 24,
    fontWeight: "700" as const,
    color: Colors.text,
    marginBottom: 2,
  },
  statCardTitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: "500" as const,
  },
  activityList: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    overflow: "hidden" as const,
  },
  activityItem: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  activityIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.info + "10",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginRight: Spacing.md,
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    fontSize: 15,
    color: Colors.text,
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 12,
    color: Colors.textTertiary,
  },
  footer: {
    marginTop: Spacing.md,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    alignItems: "center" as const,
    gap: Spacing.xs,
  },
  lastUpdated: {
    fontSize: 12,
    color: Colors.textTertiary,
    fontWeight: "500" as const,
  },
  version: {
    fontSize: 11,
    color: Colors.textTertiary,
    fontWeight: "500" as const,
    textAlign: "center" as const,
  },
};
