import { MaterialIcons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import AdminKpiCard from "../../components/admin/AdminKpiCard";
import { AdminTheme } from "../../components/admin/theme";
import StitchCard from "../../components/common/StitchCard";
import {
  StaffCard,
  StaffScreen,
  StaffSectionHeader,
} from "../../components/common/StitchScreen";
import { AuthService } from "../../services/auth.service";
import { StaffDashboardService } from "../../services/staff-dashboard.service";
import { useAuthStore } from "../../stores/auth.store";
import { Colors, Spacing } from "../../theme";
import { getUser } from "../../utils/storage";

const NAV_HEIGHT = 90;

export default function StaffDashboard() {
  const router = useRouter();
  const isMounted = useRef(true);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const actionCardWidth = (width - Spacing.lg * 2 - Spacing.md) / 2;
  const bottomContentPadding = NAV_HEIGHT + insets.bottom + Spacing.lg;

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
  const userRole = user?.role || "STAFF";
  const roleLabel =
    userRole === "NURSERY_STAFF" || userRole === "STAFF"
      ? "Staff Member"
      : String(userRole)
          .toLowerCase()
          .split("_")
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(" ");
  const avatarText = userName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part: string) => part[0]?.toUpperCase() || "")
    .join("");

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ["staff-dashboard"],
    queryFn: StaffDashboardService.getStats,
  });

  const stats = useMemo(
    () => ({
      totalInventory: Number(data?.totalInventory ?? 0),
      totalSeeds: Number(data?.totalSeeds ?? 0),
      todaySowingCount: Number(data?.todaySowingCount ?? 0),
      todaySalesCount: Number(data?.todaySalesCount ?? 0),
      lowStockItems: Number(data?.lowStockItems ?? 0),
      pendingTasks: Number(data?.pendingTasks ?? 0),
    }),
    [data],
  );

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
      case "inventory":
        router.push("/(staff)/inventory");
        break;
      case "seeds":
        router.push("/(staff)/seeds");
        break;
      case "sales":
        router.push("/(staff)/sales");
        break;
      case "sowing":
        router.push("/(staff)/sowing/create");
        break;
      default:
        break;
    }
  };

  const quickActions = [
    
    {
      title: "Record Sowing",
      subtitle: "Log new sowing activity",
      icon: "grass",
      color: Colors.success,
      action: () => router.push("/(staff)/sowing/create"),
    },
    {
      title: "View Inventory",
      subtitle: "Browse available stock",
      icon: "inventory",
      color: Colors.info,
      action: () => router.push("/(staff)/inventory"),
    },
    {
      title: "View Seeds",
      subtitle: "Browse seed inventory",
      icon: "inventory",
      color: Colors.warning,
      action: () => router.push("/(staff)/seeds"),
    },
    {
      title: "View Plants",
      subtitle: "Browse plant inventory",
      icon: "local-florist",
      color: Colors.success,
      action: () => router.push("/(staff)/plants"),
    },
    {
      title: "Notifications",
      subtitle: "View alerts and updates",
      icon: "notifications",
      color: Colors.primary,
      action: () => router.push("/(staff)/notifications"),
    },
    {
      title: "Seed Batches",
      subtitle: "Manage farmer seed lifecycle",
      icon: "inventory-2",
      color: Colors.primary,
      action: () => router.push("/(staff)/seed-batches"),
    },
    {
      title: "Customers",
      subtitle: "Manage customer records",
      icon: "groups",
      color: Colors.info,
      action: () => router.push("/(staff)/customers"),
    },
    {
      title: "Expenses",
      subtitle: "Track expense entries",
      icon: "payments",
      color: Colors.warning,
      action: () => router.push("/(staff)/expenses"),
    },
    {
      title: "Labours",
      subtitle: "Record labour activity",
      icon: "engineering",
      color: Colors.success,
      action: () => router.push("/(staff)/labours"),
    },
    {
      title: "Record Sale",
      subtitle: "Create sales entry",
      icon: "receipt-long",
      color: Colors.primary,
      action: () => router.push("/(staff)/sales"),
    },
  ];

  const kpis = [
    {
      label: "Inventory Items",
      value: stats.totalInventory.toLocaleString(),
      tone: "info" as const,
      type: "inventory",
      icon: "inventory-2",
    },
    {
      label: "Total Seeds",
      value: stats.totalSeeds.toLocaleString(),
      tone: "primary" as const,
      type: "seeds",
      icon: "grass",
    },
    {
      label: "Today's Sowings",
      value: stats.todaySowingCount.toLocaleString(),
      tone: "warning" as const,
      type: "sowing",
      icon: "spa",
    },
    {
      label: "Today's Sales",
      value: stats.todaySalesCount.toLocaleString(),
      tone: "success" as const,
      type: "sales",
      icon: "payments",
    },
  ];

  const headerActions = (
    <View style={styles.headerActions}>
      <Pressable
        onPress={() => refetch()}
        style={({ pressed }) => [
          styles.iconButton,
          pressed && styles.iconButtonPressed,
        ]}
      >
        <MaterialIcons
          name="refresh"
          size={18}
          color={AdminTheme.colors.surfaceMuted}
          style={isRefetching ? styles.refreshingIcon : undefined}
        />
      </Pressable>
      <Pressable
        onPress={handleLogout}
        style={({ pressed }) => [
          styles.iconButton,
          pressed && styles.iconButtonPressed,
        ]}
      >
        <MaterialIcons
          name="logout"
          size={18}
          color={AdminTheme.colors.surfaceMuted}
        />
      </Pressable>
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={["left", "right"]}>
        <StaffScreen
          title="Dashboard"
          subtitle="Loading staff operations..."
          userName={userName}
          userRoleLabel={roleLabel}
          userAvatarText={avatarText || "SM"}
          userActions={headerActions}
          contentContainerStyle={{ paddingBottom: bottomContentPadding }}
        >
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.info} />
            <Text style={styles.loadingText}>Loading dashboard...</Text>
          </View>
        </StaffScreen>
      </SafeAreaView>
    );
  }

  if (error || !data) {
    return (
      <SafeAreaView style={styles.container} edges={["left", "right"]}>
        <StaffScreen
          title="Dashboard"
          subtitle="Unable to load staff operations"
          userName={userName}
          userRoleLabel={roleLabel}
          userAvatarText={avatarText || "SM"}
          userActions={headerActions}
          contentContainerStyle={{ paddingBottom: bottomContentPadding }}
        >
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
        </StaffScreen>
      </SafeAreaView>
    );
  }

  return (
    <StaffScreen
      title="Dashboard"
      subtitle="Daily staff operations overview"
      userName={userName}
      userRoleLabel={roleLabel}
      userAvatarText={avatarText || "SM"}
      userActions={headerActions}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={refetch}
          colors={[Colors.info]}
          tintColor={Colors.info}
        />
      }
      contentContainerStyle={{ paddingBottom: bottomContentPadding }}
    >
      <StaffCard style={styles.summaryCard}>
        <StaffSectionHeader
          title="Today's Snapshot"
          subtitle="Live counts from active staff work"
        />
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>
              {stats.todaySalesCount.toLocaleString()}
            </Text>
            <Text style={styles.summaryLabel}>Today&apos;s Sales</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>
              {stats.todaySowingCount.toLocaleString()}
            </Text>
            <Text style={styles.summaryLabel}>Today&apos;s Sowings</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>
              {stats.totalInventory.toLocaleString()}
            </Text>
            <Text style={styles.summaryLabel}>Inventory Items</Text>
          </View>
        </View>
      </StaffCard>

      <View style={styles.section}>
        <StaffSectionHeader
          title="Today's Overview"
          subtitle="Primary staff metrics"
        />
        <View style={styles.kpiGrid}>
          {kpis.map((kpi) => (
            <Pressable
              key={kpi.label}
              onPress={() => handleCardPress(kpi.type)}
              style={({ pressed }) => [
                styles.kpiWrap,
                pressed && styles.gridItemPressed,
              ]}
            >
              <AdminKpiCard
                label={kpi.label}
                value={kpi.value}
                helper="Open module"
                tone={kpi.tone}
              />
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <StaffSectionHeader
          title="Quick Actions"
          subtitle="Common tasks across the staff module"
        />
        <View style={styles.actionsGrid}>
          {quickActions.map((action) => (
            <Pressable
              key={action.title}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                action.action();
              }}
              style={({ pressed }) => [
                styles.actionCard,
                { width: actionCardWidth },
                pressed && styles.actionCardPressed,
              ]}
            >
              <StitchCard style={styles.actionCardInner}>
                <View
                  style={[
                    styles.actionIcon,
                    { backgroundColor: action.color + "15" },
                  ]}
                >
                  <MaterialIcons
                    name={action.icon as any}
                    size={22}
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
              </StitchCard>
            </Pressable>
          ))}
        </View>
      </View>

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
    </StaffScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent:"center",
    alignItems:"center"
  },
  iconButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.96 }],
  },
  refreshingIcon: {
    transform: [{ rotate: "360deg" }],
  },
  loadingContainer: {
    minHeight: 360,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.xl,
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: 16,
    color: Colors.textSecondary,
    fontWeight: "500",
  },
  errorContainer: {
    minHeight: 360,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.xl,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: Colors.error,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  errorMessage: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
    marginBottom: Spacing.lg,
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: Colors.info,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: 12,
  },
  retryButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: "600",
  },
  summaryCard: {
    gap: Spacing.md,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: "800",
    color: AdminTheme.colors.text,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: AdminTheme.colors.textMuted,
    marginTop: 4,
    textAlign: "center",
  },
  summaryDivider: {
    width: 1,
    height: 30,
    backgroundColor: AdminTheme.colors.borderSoft,
  },
  section: {
    gap: Spacing.md,
  },
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  kpiWrap: {
    width: "48%",
  },
  gridItemPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.92,
  },
  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
  },
  actionCard: {
    borderRadius: 20,
  },
  actionCardPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.95,
  },
  actionCardInner: {
    minHeight: 150,
    gap: Spacing.sm,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xs,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 2,
  },
  actionSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  actionArrow: {
    position: "absolute",
    top: Spacing.lg,
    right: Spacing.lg,
  },
  footer: {
    marginTop: Spacing.sm,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    alignItems: "center",
    gap: Spacing.xs,
  },
  lastUpdated: {
    fontSize: 12,
    color: Colors.textTertiary,
    fontWeight: "500",
  },
  version: {
    fontSize: 12,
    color: Colors.textTertiary,
  },
});
