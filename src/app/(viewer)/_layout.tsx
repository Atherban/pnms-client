import ViewerBottomNav from "@/src/components/viewer/ViewerBottomNav";
import { Colors } from "@/src/theme/colors";
import { Redirect, Slot } from "expo-router";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthStore } from "../../stores/auth.store";

export default function ViewerLayout() {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  if (user?.role !== "VIEWER") {
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
        <ViewerBottomNav />
      </View>
    </SafeAreaView>
  );
}
