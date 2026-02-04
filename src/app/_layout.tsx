import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { useEffect } from "react";
import { StatusBar } from "react-native";
import { Loader } from "../components";
import AuthInitializer from "../components/AuthInitializer";
import { useAuthBootstrap } from "../hooks/useAuthBootstrap";
import { useUIStore } from "../stores/ui.store";
import { Colors } from "../theme";
const queryClient = new QueryClient();

export default function RootLayout() {
  const { loading } = useAuthBootstrap();
  const hydrateUI = useUIStore((s) => s.hydrate);

  useEffect(() => {
    hydrateUI();
  }, []);

  if (loading) return <Loader />;

  return (
    <AuthInitializer>
      <QueryClientProvider client={queryClient}>
        <StatusBar
          backgroundColor={Colors.primary}
          barStyle="light-content"
          animated={true}
        />
        <Stack
          screenOptions={{
            headerShown: false,
            gestureEnabled: true,
            animation: "slide_from_right",
          }}
        />
      </QueryClientProvider>
    </AuthInitializer>
  );
}
