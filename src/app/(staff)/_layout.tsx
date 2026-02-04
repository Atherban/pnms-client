import { Redirect, Stack } from "expo-router";
import { useAuthStore } from "../../stores/auth.store";

export default function StaffLayout() {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  if (user?.role !== "STAFF" && user?.role !== "ADMIN") {
    return <Redirect href="/unauthorized" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
