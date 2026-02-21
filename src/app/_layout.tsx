import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { Stack } from "expo-router";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import AuthInitializer from "../components/AuthInitializer";
import { useUIStore } from "../stores/ui.store";
import { Colors } from "../theme";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 60_000,
      refetchOnWindowFocus: false,
    },
  },
});

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const hydrateUI = useUIStore((s) => s.hydrate);

  useEffect(() => {
    void hydrateUI();
  }, [hydrateUI]);

  return (
    <SafeAreaProvider>
      <AuthInitializer>
        <QueryClientProvider client={queryClient}>
          <StatusBar
            style="light"
            backgroundColor={Colors.primary}
            translucent={false}
            animated
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
    </SafeAreaProvider>
  );
}
