import { Redirect, Stack } from "expo-router";
import { useAuthStore } from "../../stores/auth.store";

export default function AuthLayout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const role = useAuthStore((s) => s.user?.role);

  if (isAuthenticated && role) {
    if (role === "SUPER_ADMIN") {
      return <Redirect href={"/(super-admin)" as any} />;
    }
    if (role === "NURSERY_ADMIN") {
      return <Redirect href="/(admin)" />;
    }
    if (role === "STAFF") return <Redirect href="/(staff)" />;
    if (role === "CUSTOMER") {
      return <Redirect href={"/(customer)" as any} />;
    }
    return <Redirect href="/unauthorized" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
