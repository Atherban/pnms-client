// components/AuthInitializer.tsx
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import { useAuthStore } from "../stores/auth.store";

export default function AuthInitializer({
  children,
}: {
  children: React.ReactNode;
}) {
  const loadFromStorage = useAuthStore((state) => state.loadFromStorage);
  const isLoading = useAuthStore((state) => state.isLoading);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      try {
        await loadFromStorage();
        if (isMounted) {
          setInitialized(true);
        }
      } finally {
        await SplashScreen.hideAsync().catch(() => {
          // Ignore if splash is already hidden during fast refresh.
        });
      }
    };

    void initializeAuth();

    return () => {
      isMounted = false;
    };
  }, [loadFromStorage]);

  if (!initialized || isLoading) {
    return null;
  }

  return <>{children}</>;
}
