import SharedBottomNav, { NavItem } from "@/src/components/navigation/SharedBottomNav";
import { Colors } from "@/src/theme/colors";
import { Redirect, Slot } from "expo-router";
import { Bean, Home, Leaf, Receipt, Sprout } from "lucide-react-native";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import { useAuthStore } from "../../stores/auth.store";

const STAFF_NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", icon: Home, path: "/(staff)", color: "#6366F1" },
  { label: "Sales", icon: Receipt, path: "/(staff)/sales", color: "#EC4899" },
  { label: "Inventory", icon: Leaf, path: "/(staff)/inventory", color: "#10B981" },
  { label: "Sow", icon: Bean, path: "/(staff)/sowing", color: "#F59E0B" },
  { label: "Germination", icon: Sprout, path: "/(staff)/germination", color: "#8B5CF6" },
];

export default function StaffLayout() {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  if (user?.role !== "STAFF") {
    return <Redirect href="/unauthorized" />;
  }

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: Colors.primaryDark }}
      edges={["top", "left", "right"]}
    >
      <View style={{ flex: 1, backgroundColor: Colors.background }}>
        <View style={{ flex: 1 }}>
          <Slot />
        </View>
        <SharedBottomNav items={STAFF_NAV_ITEMS} />
      </View>
    </SafeAreaView>
  );
}
