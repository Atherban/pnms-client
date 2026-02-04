import { Redirect, Stack } from "expo-router";
import { useAuthStore } from "../../stores/auth.store";

export default function ViewerLayout() {
  const { isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
