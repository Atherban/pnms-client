import { MaterialIcons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
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
import { DashboardService } from "../../services/dashboard.service";
import { useAuthStore } from "../../stores/auth.store";
import { Colors, Spacing } from "../../theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const BOTTOM_NAV_HEIGHT = 90; // Adjust based on your bottom nav height

export default function AdminDashboard() {
  const router = useRouter();
  const { user, clearAuth } = useAuthStore();
  
  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ["dashboard"],
    queryFn: DashboardService.getStats,
  });

  const handleLogout = async () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            await AuthService.logout();
            clearAuth();
            router.replace("/(auth)/login");
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  };

  const handleCardPress = (type: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    switch (type) {
      case "plants":
        router.push("/(admin)/plants");
        break;
      case "seeds":
        router.push("/(admin)/seeds");
        break;
      case "sales":
        router.push("/(admin)/sales");
        break;
      case "profit":
        router.push("/(admin)/profit");
        break;
      case "users":
        router.push("/(admin)/users");
        break;
      case "orders":
        router.push("/(admin)/orders");
        break;
      case "inventory":
        router.push("/(admin)/inventory");
        break;
      case "reports":
        router.push("/(admin)/reports");
        break;
    }
  };

  /* Loading */
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.fixedHeader}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.title}>Dashboard</Text>
              <Text style={styles.subtitle}>Loading insights...</Text>
            </View>
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
        <View style={styles.contentArea}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Loading dashboard...</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  /* Error */
  if (error || !data) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.fixedHeader}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.title}>Dashboard</Text>
              <Text style={styles.subtitle}>Error loading data</Text>
            </View>
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
        <View style={styles.contentArea}>
          <View style={styles.errorContainer}>
            <MaterialIcons
              name="error-outline"
              size={64}
              color={Colors.error}
            />
            <Text style={styles.errorTitle}>Unable to Load Dashboard</Text>
            <Text style={styles.errorMessage}>
              Please check your connection and try again
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
      </SafeAreaView>
    );
  }

  const KPIS = [
    {
      title: "Total Plants",
      value: data.totalPlants?.toLocaleString() || "0",
      icon: "🌿",
      color: Colors.success,
      type: "plants",
      gradient: [Colors.success, "#34D399"],
    },
    {
      title: "Total Seeds",
      value: data.totalSeeds?.toLocaleString() || "0",
      icon: "🌱",
      color: Colors.info,
      type: "seeds",
      gradient: [Colors.info, "#60A5FA"],
    },
    {
      title: "Total Sales",
      value: `₹${data.totalSalesAmount?.toLocaleString() || "0"}`,
      icon: "💰",
      color: Colors.warning,
      type: "sales",
      gradient: [Colors.warning, "#FBBF24"],
    },
    {
      title: "Today's Profit",
      value: `₹${data.todayProfit?.toLocaleString() || "0"}`,
      accent: data.todayProfit >= 0 ? "positive" : "negative",
      icon: data.todayProfit >= 0 ? "📈" : "📉",
      color: data.todayProfit >= 0 ? Colors.success : Colors.error,
      type: "profit",
      gradient:
        data.todayProfit >= 0
          ? [Colors.success, "#34D399"]
          : [Colors.error, "#F87171"],
    },
  ] as const;

  const QUICK_ACTIONS = [
    {
      title: "Add New Plant",
      subtitle: "Create plant entry",
      icon: "local-florist",
      color: Colors.success,
      action: () => router.push("/(admin)/plants/create"),
    },
    {
      title: "Add New Seed",
      subtitle: "Create seed entry",
      icon: "grass",
      color: Colors.info,
      action: () => router.push("/(admin)/seeds/create"),
    },
    {
      title: "Record Sale",
      subtitle: "Create sales entry",
      icon: "receipt-long",
      color: Colors.warning,
      action: () => router.push("/(admin)/sales/create"),
    },
    {
      title: "Manage Users",
      subtitle: "User management",
      icon: "people",
      color: Colors.primary,
      action: () => router.push("/(admin)/users"),
    },
  ];

  const STATS_CARDS = [
    {
      title: "Active Users",
      value: data.activeUsers?.toLocaleString() || "12",
      change: "+2",
      icon: "people",
      color: Colors.primary,
    },
    {
      title: "Pending Orders",
      value: data.pendingOrders?.toLocaleString() || "8",
      change: "-1",
      icon: "pending-actions",
      color: Colors.warning,
    },
    {
      title: "Low Stock Items",
      value: data.lowStockItems?.toLocaleString() || "5",
      change: "+1",
      icon: "inventory",
      color: Colors.error,
    },
  ];

  // Calculate additional stats
  const totalRevenue = data.totalSalesAmount || 0;
  const todayProfit = data.todayProfit || 0;
  const totalPlants = data.totalPlants || 0;
  const activeUsers = data.activeUsers || 12;
  const pendingOrders = data.pendingOrders || 8;
  const lowStockItems = data.lowStockItems || 5;

  return (
    <SafeAreaView style={styles.container}>
      {/* Fixed Header */}
      <LinearGradient
        colors={[Colors.primary, Colors.primaryLight]}
        style={styles.fixedHeader}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        {/* Header Top Row */}
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.title}>Dashboard</Text>
            <Text style={styles.subtitle}>
              {user?.name ? `Welcome, ${user.name}` : 'Real-time business insights'}
            </Text>
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

        {/* User Profile Display */}
        {user && (
          <View style={styles.userWelcome}>
            <View style={styles.userAvatar}>
              <Text style={styles.userAvatarText}>
                {user.name?.charAt(0).toUpperCase() || "A"}
              </Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.welcomeText}>Welcome back,</Text>
              <Text style={styles.userName}>{user.name || "Admin"}</Text>
              {user.role && (
                <View style={styles.roleBadge}>
                  <MaterialIcons 
                    name={user.role === "ADMIN" ? "security" : user.role === "STAFF" ? "work" : "visibility"}
                    size={12} 
                    color={Colors.white} 
                  />
                  <Text style={styles.roleText}>
                    {user.role === "ADMIN" ? "Administrator" : 
                     user.role === "STAFF" ? "Staff Member" : "Viewer"}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Stats Summary */}
        <View style={styles.statsSummary}>
          <View style={styles.statItem}>
            <MaterialIcons name="trending-up" size={16} color="rgba(255, 255, 255, 0.8)" />
            <Text style={styles.statLabel}>Total Revenue</Text>
            <Text style={styles.statValue}>
              ₹{totalRevenue?.toLocaleString() || "0"}
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <MaterialIcons name="spa" size={16} color="rgba(255, 255, 255, 0.8)" />
            <Text style={styles.statLabel}>Active Plants</Text>
            <Text style={styles.statValue}>
              {totalPlants?.toLocaleString() || "0"}
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <MaterialIcons 
              name={todayProfit >= 0 ? "trending-up" : "trending-down"} 
              size={16} 
              color={todayProfit >= 0 ? "#BBF7D0" : "#FECACA"} 
            />
            <Text style={styles.statLabel}>Today's Profit</Text>
            <Text
              style={[
                styles.statValue,
                { color: todayProfit >= 0 ? "#BBF7D0" : "#FECACA" },
              ]}
            >
              ₹{todayProfit?.toLocaleString() || "0"}
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
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
        contentContainerStyle={styles.scrollContent}
      >
        {/* KPI Cards - Pressable */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="dashboard" size={24} color={Colors.text} />
            <Text style={styles.sectionTitle}>Key Metrics</Text>
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
                  accent={kpi.accent}
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
            <View style={styles.statCard}>
              <View style={styles.statCardHeader}>
                <View
                  style={[
                    styles.statIcon,
                    { backgroundColor: Colors.primary + "15" },
                  ]}
                >
                  <MaterialIcons
                    name="people"
                    size={20}
                    color={Colors.primary}
                  />
                </View>
                <View style={styles.statChange}>
                  <MaterialIcons
                    name="arrow-upward"
                    size={12}
                    color={Colors.success}
                  />
                  <Text style={[styles.statChangeText, { color: Colors.success }]}>
                    +2
                  </Text>
                </View>
              </View>
              <Text style={styles.statCardValue}>{activeUsers}</Text>
              <Text style={styles.statCardTitle}>Active Users</Text>
            </View>

            <View style={styles.statCard}>
              <View style={styles.statCardHeader}>
                <View
                  style={[
                    styles.statIcon,
                    { backgroundColor: Colors.warning + "15" },
                  ]}
                >
                  <MaterialIcons
                    name="pending-actions"
                    size={20}
                    color={Colors.warning}
                  />
                </View>
                <View style={styles.statChange}>
                  <MaterialIcons
                    name="arrow-downward"
                    size={12}
                    color={Colors.success}
                  />
                  <Text style={[styles.statChangeText, { color: Colors.success }]}>
                    -1
                  </Text>
                </View>
              </View>
              <Text style={styles.statCardValue}>{pendingOrders}</Text>
              <Text style={styles.statCardTitle}>Pending Orders</Text>
            </View>

            <View style={styles.statCard}>
              <View style={styles.statCardHeader}>
                <View
                  style={[
                    styles.statIcon,
                    { backgroundColor: Colors.error + "15" },
                  ]}
                >
                  <MaterialIcons
                    name="inventory"
                    size={20}
                    color={Colors.error}
                  />
                </View>
                <View style={styles.statChange}>
                  <MaterialIcons
                    name="arrow-upward"
                    size={12}
                    color={Colors.error}
                  />
                  <Text style={[styles.statChangeText, { color: Colors.error }]}>
                    +1
                  </Text>
                </View>
              </View>
              <Text style={styles.statCardValue}>{lowStockItems}</Text>
              <Text style={styles.statCardTitle}>Low Stock Items</Text>
            </View>
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
                <MaterialIcons name="local-florist" size={18} color={Colors.success} />
              </View>
              <View style={styles.activityContent}>
                <Text style={styles.activityText}>New plant added: Monstera Deliciosa</Text>
                <Text style={styles.activityTime}>2 hours ago</Text>
              </View>
            </View>
            <View style={styles.activityItem}>
              <View style={styles.activityIcon}>
                <MaterialIcons name="receipt" size={18} color={Colors.warning} />
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
                <Text style={styles.activityText}>New user registered: John Doe</Text>
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
          <Text style={styles.version}>PNMS v1.0.0 • Plant Nursery Management System</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* Styles */
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
  headerTop: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "flex-start",
    marginBottom: Spacing.lg,
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
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  userAvatarText: {
    fontSize: 20,
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
    fontSize: 18,
    fontWeight: "600" as const,
    color: Colors.white,
    marginBottom: 4,
  },
  roleBadge: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    alignSelf: "flex-start",
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
    paddingHorizontal: Spacing.sm,
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
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: BOTTOM_NAV_HEIGHT + Spacing.xl,
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
    color: Colors.primary,
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
    backgroundColor: Colors.primary + "10",
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