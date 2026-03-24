import SharedBottomNav, { NavItem } from "@/src/components/navigation/SharedBottomNav";
import { SuperAdminTheme } from "@/src/components/super-admin/theme";
import { Redirect, Slot } from "expo-router";
import { Bell, Images, LayoutDashboard, Store } from "lucide-react-native";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import { useAuthStore } from "../../stores/auth.store";
import { Colors } from "../../theme";

const SUPER_ADMIN_NAV_ITEMS: NavItem[] = [
  {
    label: "Overview",
    icon: LayoutDashboard,
    path: "/(super-admin)",
    color: SuperAdminTheme.colors.primary,
  },
  {
    label: "Nurseries",
    icon: Store,
    path: "/(super-admin)/nurseries",
    color: SuperAdminTheme.colors.primaryDark,
  },
  {
    label: "Banners",
    icon: Images,
    path: "/(super-admin)/banners",
    color: SuperAdminTheme.colors.success,
  },
  {
    label: "Alerts",
    icon: Bell,
    path: "/(super-admin)/notifications",
    color: SuperAdminTheme.colors.warning,
  },
];

export default function SuperAdminLayout() {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) return <Redirect href="/(auth)/login" />;
  if (user?.role !== "SUPER_ADMIN") return <Redirect href="/unauthorized" />;

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: Colors.primaryDark }}
      edges={["top", "left", "right"]}
    >
      <View style={{ flex: 1, backgroundColor: SuperAdminTheme.colors.background }}>
        <View style={{ flex: 1 }}>
          <Slot />
        </View>
        <SharedBottomNav items={SUPER_ADMIN_NAV_ITEMS} />
      </View>
    </SafeAreaView>
  );
}
