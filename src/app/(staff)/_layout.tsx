import StaffBottomNav from "@/src/components/staff/StaffBottomNav";
import { Redirect, Stack } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthStore } from "../../stores/auth.store";

export default function StaffLayout() {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  if (user?.role !== "STAFF" && user?.role !== "ADMIN") {
    return <Redirect href="/unauthorized" />;
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "simple_push",
        }}
      />
      <StaffBottomNav />
    </SafeAreaView>
  );
}
