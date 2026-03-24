import { MaterialIcons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
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

import StitchCard from "../../components/common/StitchCard";
import StitchHeader from "../../components/common/StitchHeader";
import AdminKpiCard from "../../components/admin/AdminKpiCard";
import StitchSectionHeader from "../../components/common/StitchSectionHeader";
import { AdminTheme } from "../../components/admin/theme";
import { AuthService } from "../../services/auth.service";
import { DashboardService } from "../../services/dashboard.service";
import { useAuthStore } from "../../stores/auth.store";
import { getUser } from "../../utils/storage";

const NAV_HEIGHT = 90;

export default function AdminDashboard() {
  const router = useRouter();

  const storeUser = useAuthStore((state) => state.user);
  const clearAuth = useAuthStore((state) => state.clearAuth);

  const [storageUser, setStorageUser] = useState<any>(null);

  useEffect(() => {
    const loadUserFromStorage = async () => {
      const user = await getUser();
      setStorageUser(user);
    };

    loadUserFromStorage();
  }, []);

  const user = storeUser || storageUser;
  const userName = user?.name || "Admin User";
  const userRole = user?.role || "NURSERY_ADMIN";
  const avatarText = userName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part: string) => part[0]?.toUpperCase() || "")
    .join("");
  const roleLabel = userRole === "NURSERY_ADMIN" ? "Nursery Admin" : userRole;

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ["dashboard"],
    queryFn: DashboardService.getStats,
  });

  const handleLogout = async () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
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
    ]);
  };

  const handleCardPress = (type: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    switch (type) {
      case "inventory":
        router.push("/(admin)/inventory");
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
      default:
        break;
    }
  };

  const quickActions = [
    {
      title: "Create Sale",
      subtitle: "Start a new order",
      icon: "point-of-sale",
      color: AdminTheme.colors.primary,
      action: () => router.push("/(admin)/sales/create"),
    },
    {
      title: "Add Plant",
      subtitle: "Plant types",
      icon: "spa",
      color: AdminTheme.colors.success,
      action: () => router.push("/(admin)/plants/create"),
    },
    {
      title: "New Expense",
      subtitle: "Record costs",
      icon: "receipt-long",
      color: AdminTheme.colors.warning,
      action: () => router.push("/(admin)/expenses"),
    },
    {
      title: "Verify Payment",
      subtitle: "Pending checks",
      icon: "verified-user",
      color: AdminTheme.colors.info,
      action: () => router.push("/(admin)/payments/verification"),
    },
  ];

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={["left", "right"]}>
        <StitchHeader
          title="Admin Dashboard"
          subtitle="Operations overview"
          variant="gradient"
          userName={userName}
          userRoleLabel={roleLabel}
          userAvatarText={avatarText || "AU"}
        />
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={AdminTheme.colors.primary} />
          <Text style={styles.stateText}>Loading dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !data) {
    return (
      <SafeAreaView style={styles.container} edges={["left", "right"]}>
        <StitchHeader
          title="Admin Dashboard"
          subtitle="Operations overview"
          variant="gradient"
          userName={userName}
          userRoleLabel={roleLabel}
          userAvatarText={avatarText || "AU"}
        />
        <View style={styles.centerState}>
          <MaterialIcons
            name="error-outline"
            size={48}
            color={AdminTheme.colors.danger}
          />
          <Text style={styles.stateTitle}>Unable to load dashboard</Text>
          <Text style={styles.stateText}>
            Please check your connection and try again.
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
      </SafeAreaView>
    );
  }

  const kpis = [
    {
      label: "Revenue",
      value: `₹${data.totalSalesAmount?.toLocaleString() || "0"}`,
      helper: "All time",
      tone: "success" as const,
      type: undefined as string | undefined,
    },
    {
      label: "Seeds",
      value: `${data.totalSeeds?.toLocaleString() || "0"}`,
      helper: "Items",
      tone: "primary" as const,
      type: "seeds",
    },
    {
      label: "Inventory",
      value: `${data.totalInventory?.toLocaleString() || "0"}`,
      helper: "Items",
      tone: "info" as const,
      type: "inventory",
    },
    {
      label: "Profit",
      value: `₹${data.todayProfit?.toLocaleString() || "0"}`,
      helper: "Today",
      tone: data.todayProfit >= 0 ? ("success" as const) : ("danger" as const),
      type: "profit",
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={["left", "right"]}>
      <StitchHeader
        title="Admin Dashboard"
        subtitle="Operations overview"
        variant="gradient"
        userName={userName}
        userRoleLabel={roleLabel}
        userAvatarText={avatarText || "AU"}
        userActions={
          <View style={styles.headerActions}>
            <Pressable
              onPress={refetch}
              style={({ pressed }) => [
                styles.iconButton,
                pressed && styles.iconButtonPressed,
              ]}
            >
              <MaterialIcons
                name="refresh"
                size={18}
                color={AdminTheme.colors.surfaceMuted}
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
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            colors={[AdminTheme.colors.primary]}
            tintColor={AdminTheme.colors.primary}
          />
        }
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.section}>
          <StitchSectionHeader
            title="Key Metrics"
            subtitle="Snapshot overview"
          />
          <View style={styles.kpiGrid}>
            {kpis.map((kpi) => (
              <Pressable
                key={kpi.label}
                onPress={() =>
                  kpi.type ? handleCardPress(kpi.type) : undefined
                }
                style={({ pressed }) => [
                  styles.kpiItem,
                  pressed && kpi.type ? styles.cardPressed : null,
                ]}
                disabled={!kpi.type}
              >
                <AdminKpiCard
                  label={kpi.label}
                  value={kpi.value}
                  helper={kpi.helper}
                  tone={kpi.tone}
                />
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <StitchSectionHeader
            title="Quick Actions"
            subtitle="Jump to common tasks"
          />
          <View style={styles.kpiGrid}>
            {quickActions.map((action) => (
              <Pressable
                key={action.title}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  action.action();
                }}
                style={({ pressed }) => [
                  styles.kpiItem,
                  pressed && styles.cardPressed,
                ]}
              >
                <StitchCard style={styles.actionCardInner}>
                  <View
                    style={[
                      styles.actionIcon,
                      { backgroundColor: `${action.color}1A` },
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
                </StitchCard>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Last updated:{" "}
            {new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
          <Text style={styles.footerText}>
            PNMS v1.0.0 • Plant Nursery Management System
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AdminTheme.colors.background,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: AdminTheme.spacing.sm,
  },
  iconButton: {
   width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent:"center",
    alignItems:"center",
  },
  iconButtonPressed: {
    opacity: 0.85,
  },
  scrollContent: {
    padding: AdminTheme.spacing.md,
    paddingBottom: NAV_HEIGHT + AdminTheme.spacing.lg,
    gap: AdminTheme.spacing.lg,
  },
  section: {
    gap: AdminTheme.spacing.sm,
  },
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -AdminTheme.spacing.xs, // Negative margin for gap effect
  },
  kpiItem: {
    width: "50%", // For 2 columns
    paddingHorizontal: AdminTheme.spacing.xs, // This creates the gap
    marginBottom: AdminTheme.spacing.sm,
  },

  actionCardInner: {
    alignItems: "flex-start",
    gap: 6,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: AdminTheme.colors.text,
  },
  actionSubtitle: {
    fontSize: 12,
    color: AdminTheme.colors.textMuted,
  },
  cardPressed: {
    opacity: 0.92,
  },
  footer: {
    alignItems: "center",
    gap: 4,
    paddingBottom: AdminTheme.spacing.sm,
  },
  footerText: {
    fontSize: 11,
    color: AdminTheme.colors.textSoft,
  },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: AdminTheme.spacing.sm,
    padding: AdminTheme.spacing.lg,
  },
  stateTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: AdminTheme.colors.text,
  },
  stateText: {
    fontSize: 13,
    color: AdminTheme.colors.textMuted,
    textAlign: "center",
  },
  retryButton: {
    marginTop: AdminTheme.spacing.sm,
    paddingHorizontal: AdminTheme.spacing.lg,
    paddingVertical: 10,
    borderRadius: AdminTheme.radius.full,
    backgroundColor: AdminTheme.colors.primary,
  },
  retryButtonPressed: {
    opacity: 0.85,
  },
  retryButtonText: {
    color: AdminTheme.colors.surface,
    fontWeight: "700",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
});
