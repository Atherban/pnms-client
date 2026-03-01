import SharedBottomNav, { NavItem } from "@/src/components/navigation/SharedBottomNav";
import { Colors } from "@/src/theme/colors";
import { Redirect, Slot } from "expo-router";
import { Bell, Home, Leaf, UserRound, Wallet } from "lucide-react-native";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuthStore } from "../../stores/auth.store";

const CUSTOMER_NAV_ITEMS: NavItem[] = [
  { label: "Home", icon: Home, path: "/(customer)", color: "#6366F1" },
  { label: "Dues", icon: Wallet, path: "/(customer)/dues", color: "#EC4899" },
  { label: "Products", icon: Leaf, path: "/(customer)/products", color: "#10B981" },
  { label: "Alerts", icon: Bell, path: "/(customer)/notifications", color: "#F59E0B" },
  { label: "Profile", icon: UserRound, path: "/(customer)/profile", color: "#8B5CF6" },
];

export default function CustomerLayout() {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) return <Redirect href="/(auth)/login" />;
  if (user?.role !== "CUSTOMER") {
    return <Redirect href="/unauthorized" />;
  }

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: Colors.primary }}
      edges={["top", "left", "right"]}
    >
      <View style={{ flex: 1, backgroundColor: Colors.background }}>
        <View style={{ flex: 1 }}>
          <Slot />
        </View>
        <SharedBottomNav items={CUSTOMER_NAV_ITEMS} />
      </View>
    </SafeAreaView>
  );
}
