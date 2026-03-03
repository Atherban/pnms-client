import { NotificationService } from "./notification.service";

let registeredUserId: string | null = null;
let unavailableEnvironmentKey: string | null = null;
let handlersConfigured = false;

const normalizeDataValue = (value: unknown) => String(value || "").trim();

const normalizeNotificationData = (rawData: unknown) => {
  if (!rawData || typeof rawData !== "object") return {};
  return rawData as Record<string, unknown>;
};

const getRuntimeEnvironment = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Constants = require("expo-constants");
  const executionEnvironment = String(Constants?.executionEnvironment || "");
  const appOwnership = String(Constants?.appOwnership || "");
  const isExpoGo =
    executionEnvironment.toLowerCase() === "storeclient" ||
    appOwnership.toLowerCase() === "expo";
  return { Constants, isExpoGo };
};

export const PushNotificationService = {
  async configure() {
    if (handlersConfigured) return;
    handlersConfigured = true;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const Notifications = require("expo-notifications");
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
        }),
      });

      // Android requires an explicit channel for foreground/background delivery.
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#2563EB",
      });
    } catch {
      // Keep silent if notifications module is unavailable in current runtime.
    }
  },

  async registerForPushNotificationsAsync(userId?: string | null) {
    if (!userId || registeredUserId === userId) return;

    try {
      const { Constants, isExpoGo } = getRuntimeEnvironment();
      await this.configure();

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const Device = require("expo-device");
      if (!Device?.isDevice) {
        unavailableEnvironmentKey = "simulator_or_emulator";
        console.log(
          "Push registration skipped: simulator/emulator cannot receive native push."
        );
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const Notifications = require("expo-notifications");
      if (!Notifications?.getExpoPushTokenAsync) {
        unavailableEnvironmentKey = "notifications_module_unavailable";
        console.log("Push registration skipped: expo-notifications unavailable.");
        return;
      }

      const currentPermissions = await Notifications.getPermissionsAsync();
      let finalStatus = currentPermissions?.status;

      if (finalStatus !== "granted") {
        const requestResult = await Notifications.requestPermissionsAsync();
        finalStatus = requestResult?.status;
      }

      if (finalStatus !== "granted") {
        unavailableEnvironmentKey = "permission_denied";
        console.log("Push registration skipped: notification permission denied.");
        return;
      }

      const projectId =
        Constants?.expoConfig?.extra?.eas?.projectId ||
        Constants?.easConfig?.projectId;

      const tokenResponse = projectId
        ? await Notifications.getExpoPushTokenAsync({ projectId })
        : await Notifications.getExpoPushTokenAsync();
      const token = String(tokenResponse?.data || "").trim();

      if (!token) return;
      console.log("Push Token:", token);
      await NotificationService.registerPushToken({
        token,
        platform:
          Device?.osName?.toLowerCase() === "ios"
            ? "ios"
            : Device?.osName?.toLowerCase() === "android"
              ? "android"
              : "unknown",
        appOwnership: isExpoGo ? "expo-go" : "standalone",
        deviceName: Device?.deviceName || undefined,
      });
      registeredUserId = userId;
      unavailableEnvironmentKey = null;
    } catch (err) {
      unavailableEnvironmentKey = unavailableEnvironmentKey || "unknown";
      console.error("Push registration failed:", err);
    }
  },

  async registerForAuthenticatedUser(userId?: string | null) {
    return this.registerForPushNotificationsAsync(userId);
  },

  resetRegistrationState() {
    registeredUserId = null;
  },

  getRegistrationState() {
    return {
      registeredUserId,
      unavailableEnvironmentKey,
    };
  },

  resolveRouteFromNotificationData(
    rawData: unknown,
    role?: "SUPER_ADMIN" | "NURSERY_ADMIN" | "STAFF" | "CUSTOMER",
  ) {
    const data = normalizeNotificationData(rawData);
    const explicitPath = normalizeDataValue(data.path);
    if (explicitPath.startsWith("/")) return explicitPath;

    const screen = normalizeDataValue(data.screen).toUpperCase();
    const action = normalizeDataValue(data.action).toUpperCase();
    const type = normalizeDataValue(data.type).toUpperCase();

    const isPaymentVerificationTarget =
      screen === "PAYMENT_VERIFICATION" ||
      action === "VERIFY_PAYMENT" ||
      type === "PAYMENT_VERIFICATION_REQUIRED";

    if (!isPaymentVerificationTarget) return null;

    if (role === "SUPER_ADMIN") {
      return "/(super-admin)/payments/verification";
    }
    if (role === "NURSERY_ADMIN") {
      return "/(admin)/payments/verification";
    }

    return null;
  },
};
