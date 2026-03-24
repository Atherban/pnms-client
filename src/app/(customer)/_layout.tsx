import SharedBottomNav, { NavItem } from "@/src/components/navigation/SharedBottomNav";
import { Redirect, Slot } from "expo-router";
import { Bell, Home, Leaf, UserRound, Wallet } from "lucide-react-native";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuthStore } from "../../stores/auth.store";
import { Colors, CustomerColors } from "../../theme";
import { StatusBar } from "expo-status-bar";

const CUSTOMER_NAV_ITEMS: NavItem[] = [
  // Keep a consistent customer accent rather than multi-color tabs.
  { label: "Home", icon: Home, path: "/(customer)", color: CustomerColors.primary },
  { label: "Dues", icon: Wallet, path: "/(customer)/dues", color: CustomerColors.primary },
  { label: "Products", icon: Leaf, path: "/(customer)/products", color: CustomerColors.primary },
  { label: "Alerts", icon: Bell, path: "/(customer)/notifications", color: CustomerColors.primary },
  { label: "Profile", icon: UserRound, path: "/(customer)/profile", color: CustomerColors.primary },
];

export default function CustomerLayout() {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) return <Redirect href="/(auth)/login" />;
  if (user?.role !== "CUSTOMER") {
    return <Redirect href="/unauthorized" />;
  }

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: Colors.primaryDark }}
      edges={["top", "left", "right"]}
    >
      
      <View style={{ flex: 1, backgroundColor: CustomerColors.background }}>
        <View style={{ flex: 1 }}>
          <Slot />
        </View>
        <SharedBottomNav items={CUSTOMER_NAV_ITEMS} />
      </View>
    </SafeAreaView>
  );
}
