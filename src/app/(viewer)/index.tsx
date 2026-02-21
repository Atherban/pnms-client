import { MaterialIcons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useMemo } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import KpiCard from "../../components/admin/KpiCard";
import { AuthService } from "../../services/auth.service";
import { ViewerDashboardService } from "../../services/viewer-dashboard.service";
import { useAuthStore } from "../../stores/auth.store";
import { Colors, Spacing } from "../../theme";

const NAV_HEIGHT = 90;

export default function ViewerDashboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const headerPaddingTop = Spacing.lg;
  const bottomContentPadding = NAV_HEIGHT + insets.bottom + Spacing.lg;
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const userName = user?.name || "Viewer";
  const userInitials = userName.charAt(0).toUpperCase();

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ["viewer-dashboard"],
    queryFn: ViewerDashboardService.getStats,
  });

  const stats = useMemo(
    () => ({
      totalInventory: Number(data?.totalInventory ?? 0),
      totalSeeds: Number(data?.totalSeeds ?? 0),
      totalSales: Number(data?.totalSales ?? 0),
      totalCustomers: Number(data?.totalCustomers ?? 0),
      totalExpenses: Number(data?.totalExpenses ?? 0),
      totalLabours: Number(data?.totalLabours ?? 0),
      lowStockItems: Number(data?.lowStockItems ?? 0),
    }),
    [data],
  );

  const KPIS = [
    {
      title: "Inventory Items",
      value: stats.totalInventory.toLocaleString(),
      icon: "📦",
      color: Colors.success,
      type: "inventory",
      gradient: [Colors.success, "#34D399"],
    },
    {
      title: "Total Sales",
      value: stats.totalSales.toLocaleString(),
      icon: "💰",
      color: Colors.info,
      type: "sales",
      gradient: [Colors.info, "#60A5FA"],
    },
    {
      title: "Customers",
      value: stats.totalCustomers.toLocaleString(),
      icon: "👥",
      color: Colors.warning,
      type: "customers",
      gradient: [Colors.warning, "#FBBF24"],
    },
    {
      title: "Low Stock",
      value: stats.lowStockItems.toLocaleString(),
      icon: "⚠️",
      color: Colors.error,
      type: "inventory",
      gradient: [Colors.error, "#F87171"],
    },
  ] as const;

  const QUICK_ACTIONS = [
    {
      title: "View Inventory",
      subtitle: "Current stock and batches",
      icon: "inventory",
      color: Colors.success,
      action: () => router.push("/(viewer)/inventory"),
    },
    {
      title: "View Plants",
      subtitle: "Plant type catalog",
      icon: "spa",
      color: Colors.primary,
      action: () => router.push("/(viewer)/plants"),
    },
    {
      title: "View Seeds",
      subtitle: "Seed batches and stock",
      icon: "grass",
      color: Colors.info,
      action: () => router.push("/(viewer)/seeds"),
    },
    {
      title: "View Sowing",
      subtitle: "Sowing activity history",
      icon: "eco",
      color: Colors.warning,
      action: () => router.push("/(viewer)/sowing"),
    },
    {
      title: "View Germination",
      subtitle: "Germination records",
      icon: "local-florist",
      color: Colors.success,
      action: () => router.push("/(viewer)/germination"),
    },
    {
      title: "View Sales",
      subtitle: "Sales history and totals",
      icon: "receipt-long",
      color: Colors.error,
      action: () => router.push("/(viewer)/sales"),
    },
    {
      title: "View Customers",
      subtitle: "Customer directory",
      icon: "groups",
      color: Colors.info,
      action: () => router.push("/(viewer)/customers"),
    },
    {
      title: "View Expenses",
      subtitle: "Operational costs",
      icon: "payments",
      color: Colors.warning,
      action: () => router.push("/(viewer)/expenses"),
    },
    {
      title: "View Labours",
      subtitle: "Labour records",
      icon: "engineering",
      color: Colors.primary,
      action: () => router.push("/(viewer)/labours"),
    },
  ];

  const handleCardPress = (type: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (type === "inventory") router.push("/(viewer)/inventory");
    if (type === "sales") router.push("/(viewer)/sales");
    if (type === "customers") router.push("/(viewer)/customers");
  };

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

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={["left", "right"]}>
        <LinearGradient
          colors={[Colors.primary, Colors.primaryLight]}
          style={[styles.fixedHeader, { paddingTop: headerPaddingTop }]}
        >
          <View style={styles.headerContent}>
            <Text style={styles.title}>Dashboard</Text>
          </View>
          <View style={styles.userWelcome}>
            <View style={styles.userAvatar}>
              <Text style={styles.userAvatarText}>{userInitials}</Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.welcomeText}>Welcome,</Text>
              <Text style={styles.userName}>{userName}</Text>
              <View style={styles.roleBadge}>
                <MaterialIcons name="visibility" size={12} color={Colors.white} />
                <Text style={styles.roleText}>Viewer</Text>
              </View>
            </View>
          </View>
        </LinearGradient>
        <View
          style={[styles.loadingContainer, { paddingBottom: bottomContentPadding }]}
        >
          <ActivityIndicator size="large" color={Colors.info} />
          <Text style={styles.loadingText}>Loading dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !data) {
    return (
      <SafeAreaView style={styles.container} edges={["left", "right"]}>
        <LinearGradient
          colors={[Colors.primary, Colors.primaryLight]}
          style={[styles.fixedHeader, { paddingTop: headerPaddingTop }]}
        >
          <View style={styles.headerContent}>
            <Text style={styles.title}>Dashboard</Text>
          </View>
        </LinearGradient>
        <View
          style={[styles.errorContainer, { paddingBottom: bottomContentPadding }]}
        >
          <MaterialIcons name="error-outline" size={64} color={Colors.error} />
          <Text style={styles.errorTitle}>Unable to load dashboard</Text>
          <Text style={styles.errorMessage}>Please try again.</Text>
          <Pressable onPress={() => refetch()} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["left", "right"]}>
      <LinearGradient
        colors={[Colors.primary, Colors.primaryLight]}
        style={[styles.fixedHeader, { paddingTop: headerPaddingTop }]}
      >
        <View style={styles.headerContent}>
          <Text style={styles.title}>Dashboard</Text>
          <View style={styles.headerActions}>
            <Pressable
              onPress={() => refetch()}
              style={({ pressed }) => [styles.refreshButton, pressed && styles.refreshButtonPressed]}
            >
              <MaterialIcons
                name="refresh"
                size={20}
                color={Colors.white}
                style={isRefetching ? styles.refreshingIcon : undefined}
              />
            </Pressable>
            <Pressable
              onPress={handleLogout}
              style={({ pressed }) => [styles.logoutButton, pressed && styles.logoutButtonPressed]}
            >
              <MaterialIcons name="logout" size={20} color={Colors.white} />
            </Pressable>
          </View>
        </View>
        <View style={styles.userWelcome}>
          <View style={styles.userAvatar}>
            <Text style={styles.userAvatarText}>{userInitials}</Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.welcomeText}>Welcome,</Text>
            <Text style={styles.userName}>{userName}</Text>
            <View style={styles.roleBadge}>
              <MaterialIcons name="visibility" size={12} color={Colors.white} />
              <Text style={styles.roleText}>Viewer</Text>
            </View>
          </View>
        </View>
        <View style={styles.statsSummary}>
          <View style={styles.statItem}>
            <MaterialIcons name="spa" size={16} color="rgba(255,255,255,0.8)" />
            <Text style={styles.statLabel}>Inventory</Text>
            <Text style={styles.statValue}>{stats.totalInventory}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <MaterialIcons name="groups" size={16} color="rgba(255,255,255,0.8)" />
            <Text style={styles.statLabel}>Customers</Text>
            <Text style={styles.statValue}>{stats.totalCustomers}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <MaterialIcons name="warning" size={16} color="#FECACA" />
            <Text style={styles.statLabel}>Low Stock</Text>
            <Text style={[styles.statValue, { color: "#FECACA" }]}>
              {stats.lowStockItems}
            </Text>
          </View>
        </View>
      </LinearGradient>

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
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: bottomContentPadding },
        ]}
      >
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="dashboard" size={24} color={Colors.text} />
            <Text style={styles.sectionTitle}>Overview</Text>
          </View>
          <View style={styles.grid}>
            {KPIS.map((kpi) => (
              <Pressable
                key={kpi.title}
                onPress={() => handleCardPress(kpi.type)}
                style={({ pressed }) => [styles.gridItem, pressed && styles.gridItemPressed]}
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

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="bolt" size={24} color={Colors.text} />
            <Text style={styles.sectionTitle}>Quick Access</Text>
          </View>
          <View style={styles.actionsGrid}>
            {QUICK_ACTIONS.map((action) => (
              <Pressable
                key={action.title}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  action.action();
                }}
                style={({ pressed }) => [styles.actionCard, pressed && styles.actionCardPressed]}
              >
                <View style={[styles.actionIcon, { backgroundColor: action.color + "15" }]}>
                  <MaterialIcons name={action.icon as any} size={24} color={action.color} />
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
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = {
  container: { flex: 1, backgroundColor: Colors.background },
  fixedHeader: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
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
  title: {
    fontSize: 32,
    fontWeight: "700" as const,
    color: Colors.white,
    marginBottom: Spacing.xs,
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
  headerActions: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: Spacing.sm,
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
  refreshingIcon: { transform: [{ rotate: "360deg" }] },
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
  userAvatarText: { fontSize: 24, fontWeight: "700" as const, color: Colors.white },
  userInfo: { flex: 1 },
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
  roleBadge: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    alignSelf: "flex-start" as const,
  },
  roleText: { fontSize: 12, color: Colors.white, fontWeight: "500" as const },
  statsSummary: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    paddingHorizontal: Spacing.md,
  },
  statItem: { flex: 1, alignItems: "center" as const, gap: 2 },
  statDivider: { width: 1, height: 36, backgroundColor: "rgba(255, 255, 255, 0.3)" },
  statLabel: { fontSize: 12, color: "rgba(255,255,255,0.8)", fontWeight: "500" as const },
  statValue: { fontSize: 16, color: Colors.white, fontWeight: "700" as const },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: NAV_HEIGHT + Spacing.lg,
  },
  section: { marginBottom: Spacing.xl },
  sectionHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  sectionTitle: { fontSize: 20, fontWeight: "700" as const, color: Colors.text },
  grid: { flexDirection: "row" as const, flexWrap: "wrap" as const, marginHorizontal: -Spacing.xs },
  gridItem: { width: "50%" as const, paddingHorizontal: Spacing.xs, marginBottom: Spacing.md },
  gridItemPressed: { transform: [{ scale: 0.98 }], opacity: 0.9 },
  actionsGrid: { gap: Spacing.sm },
  actionCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    position: "relative" as const,
  },
  actionCardPressed: { backgroundColor: Colors.surfaceDark, transform: [{ scale: 0.98 }] },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginBottom: Spacing.sm,
  },
  actionTitle: { fontSize: 16, fontWeight: "600" as const, color: Colors.text, marginBottom: 2 },
  actionSubtitle: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
  actionArrow: { position: "absolute" as const, top: Spacing.md, right: Spacing.md },
  loadingContainer: { flex: 1, alignItems: "center" as const, justifyContent: "center" as const },
  loadingText: { marginTop: Spacing.md, fontSize: 16, color: Colors.textSecondary },
  errorContainer: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingHorizontal: Spacing.xl,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: Colors.text,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  errorMessage: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center" as const,
    marginBottom: Spacing.lg,
  },
  retryButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: 12,
  },
  retryButtonText: { color: Colors.white, fontWeight: "600" as const, fontSize: 16 },
};
