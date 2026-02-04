// src/app/(admin)/_layout.tsx
import CoolBottomNav from "@/src/components/admin/BottomNavigation";
import { Colors } from "@/src/theme/colors";
import { Redirect, Slot } from "expo-router";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthStore } from "../../stores/auth.store";

export default function AdminLayout() {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) return <Redirect href="/(auth)/login" />;
  if (user?.role !== "ADMIN") return <Redirect href="/unauthorized" />;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
      <View style={{ flexDirection: "column", flex: 1 }}>
        {/* Main Content Area */}
        <View style={{ flex: 1 }}>
          <Slot />
        </View>
        <CoolBottomNav />
      </View>
    </SafeAreaView>
  );
}
