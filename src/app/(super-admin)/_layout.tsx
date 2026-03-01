import SharedBottomNav, { NavItem } from "@/src/components/navigation/SharedBottomNav";
import { Colors } from "@/src/theme/colors";
import { Redirect, Slot } from "expo-router";
import { Bell, Images, LayoutDashboard, Store } from "lucide-react-native";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuthStore } from "../../stores/auth.store";

const SUPER_ADMIN_NAV_ITEMS: NavItem[] = [
  { label: "Overview", icon: LayoutDashboard, path: "/(super-admin)", color: "#6366F1" },
  { label: "Nurseries", icon: Store, path: "/(super-admin)/nurseries", color: "#EC4899" },
  { label: "Banners", icon: Images, path: "/(super-admin)/banners", color: "#10B981" },
  { label: "Alerts", icon: Bell, path: "/(super-admin)/notifications", color: "#F59E0B" },
];

export default function SuperAdminLayout() {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) return <Redirect href="/(auth)/login" />;
  if (user?.role !== "SUPER_ADMIN") return <Redirect href="/unauthorized" />;

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: Colors.primary }}
      edges={["top", "left", "right"]}
    >
      <View style={{ flex: 1, backgroundColor: Colors.background }}>
        <View style={{ flex: 1 }}>
          <Slot />
        </View>
        <SharedBottomNav items={SUPER_ADMIN_NAV_ITEMS} />
      </View>
    </SafeAreaView>
  );
}
