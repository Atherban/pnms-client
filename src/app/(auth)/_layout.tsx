import { Redirect, Stack } from "expo-router";
import { useAuthStore } from "../../stores/auth.store";

export default function AuthLayout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const role = useAuthStore((s) => s.user?.role);

  if (isAuthenticated && role) {
    if (role === "ADMIN") return <Redirect href="/(admin)" />;
    if (role === "STAFF") return <Redirect href="/(staff)" />;
    return <Redirect href="/(viewer)" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
