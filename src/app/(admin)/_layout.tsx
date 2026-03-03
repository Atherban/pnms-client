import SharedBottomNav, { NavItem } from "@/src/components/navigation/SharedBottomNav";
import { Colors } from "@/src/theme/colors";
import { Redirect, Slot } from "expo-router";
import { Home, Leaf, Menu, Receipt, Users } from "lucide-react-native";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuthStore } from "../../stores/auth.store";

const ADMIN_NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", icon: Home, path: "/(admin)", color: "#6366F1" },
  { label: "Users", icon: Users, path: "/(admin)/users", color: "#EC4899" },
  { label: "Plants", icon: Leaf, path: "/(admin)/plants", color: "#10B981" },
  { label: "Sales", icon: Receipt, path: "/(admin)/sales", color: "#F59E0B" },
  { label: "More", icon: Menu, path: "/(admin)/more", color: "#8B5CF6" },
];

export default function AdminLayout() {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) return <Redirect href="/(auth)/login" />;
  if (user?.role !== "NURSERY_ADMIN") return <Redirect href="/unauthorized" />;

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: Colors.primary }}
      edges={["top", "left", "right"]}
    >
      <View style={{ flexDirection: "column", flex: 1, backgroundColor: Colors.background }}>
        <View style={{ flex: 1 }}>
          <Slot />
        </View>
        <SharedBottomNav items={ADMIN_NAV_ITEMS} />
      </View>
    </SafeAreaView>
  );
}
