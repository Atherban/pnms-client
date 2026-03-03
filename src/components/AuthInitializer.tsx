// components/AuthInitializer.tsx
import * as SplashScreen from "expo-splash-screen";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { PushNotificationService } from "../services/push-notification.service";
import { useAuthStore } from "../stores/auth.store";

export default function AuthInitializer({
  children,
}: {
  children: React.ReactNode;
}) {
  const loadFromStorage = useAuthStore((state) => state.loadFromStorage);
  const isLoading = useAuthStore((state) => state.isLoading);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const userId = useAuthStore((state) => state.user?.id);
  const userRole = useAuthStore((state) => state.user?.role);
  const [initialized, setInitialized] = useState(false);
  const router = useRouter();
  const lastHandledResponseIdRef = useRef<string | null>(null);

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

  useEffect(() => {
    if (!initialized || !isAuthenticated || !userId) return;
    void PushNotificationService.registerForPushNotificationsAsync(userId);
  }, [initialized, isAuthenticated, userId]);

  useEffect(() => {
    if (!initialized || !isAuthenticated) return;

    let responseSubscription: { remove?: () => void } | null = null;
    let isMounted = true;

    const handleNotificationResponse = (response: any) => {
      const identifier = String(
        response?.notification?.request?.identifier ||
          response?.notification?.date ||
          "",
      );
      if (identifier && lastHandledResponseIdRef.current === identifier) {
        return;
      }
      if (identifier) {
        lastHandledResponseIdRef.current = identifier;
      }

      const data = response?.notification?.request?.content?.data;
      const route = PushNotificationService.resolveRouteFromNotificationData(
        data,
        userRole,
      );
      if (route) {
        router.push(route as any);
      }
    };

    const setupNotificationTapListener = async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const Notifications = require("expo-notifications");
        if (!Notifications?.addNotificationResponseReceivedListener) return;

        const lastResponse = await Notifications.getLastNotificationResponseAsync?.();
        if (isMounted && lastResponse) {
          handleNotificationResponse(lastResponse);
        }

        responseSubscription =
          Notifications.addNotificationResponseReceivedListener(
            handleNotificationResponse,
          );
      } catch {
        // Ignore environments where expo-notifications is unavailable.
      }
    };

    void setupNotificationTapListener();

    return () => {
      isMounted = false;
      responseSubscription?.remove?.();
    };
  }, [initialized, isAuthenticated, userRole, router]);

  if (!initialized || isLoading) {
    return null;
  }

  return <>{children}</>;
}
