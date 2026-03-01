import AsyncStorage from "@react-native-async-storage/async-storage";

import { api, apiPath, unwrap } from "./api";
import { getAccessScope, withScopedParams } from "./access-scope.service";
import { getApiList, getApiPayload } from "./api-contract.service";
import { useOfflineActionsStore } from "../stores/offline-actions.store";
import type {
  AppNotification,
  NotificationAudience,
  ProductStatusTag,
} from "../types/notification.types";

const NOTIFICATION_KEY = "pnms_notifications_fallback";

const makeId = () => `notif_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
const normalizePhone = (value?: string) => (value || "").replace(/[^\d]/g, "");

const normalizeNotification = (item: any): AppNotification => ({
  id: String(item?._id || item?.id || makeId()),
  title: item?.title || item?.subject || "Notification",
  body: item?.body || item?.message || "",
  audience: (item?.audience || item?.targetRole || "ALL") as NotificationAudience,
  createdAt: item?.createdAt || new Date().toISOString(),
  isRead: Boolean(item?.isRead ?? item?.read ?? false),
  nurseryId: item?.nurseryId,
  createdBy: item?.createdBy?.name || item?.createdBy,
  customerId: item?.customerId,
  customerPhone: item?.customerPhone,
  productStatusTag: item?.productStatusTag as ProductStatusTag | undefined,
});

const loadFallback = async (): Promise<AppNotification[]> => {
  const raw = await AsyncStorage.getItem(NOTIFICATION_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const saveFallback = async (items: AppNotification[]) => {
  await AsyncStorage.setItem(NOTIFICATION_KEY, JSON.stringify(items));
};

export const NotificationService = {
  async list(
    audience: NotificationAudience | "CUSTOMER_NURSERY_ADMIN",
    options?: { customerId?: string; customerPhone?: string },
  ): Promise<AppNotification[]> {
    try {
      const scope = getAccessScope();
      const res = await api.get(apiPath("/notifications"), {
        params: withScopedParams(
          {
            customerId: options?.customerId,
            customerPhone: options?.customerPhone,
          },
          { includeCustomerIdentity: true },
        ),
      });
      const list = getApiList<any>(unwrap<any>(res));

      const notifications = list.map(normalizeNotification);
      await saveFallback(notifications);

      const allowed =
        audience === "CUSTOMER_NURSERY_ADMIN"
          ? ["CUSTOMER", "NURSERY_ADMIN", "ALL"]
          : [audience, "ALL"];
      const requestedPhone = normalizePhone(options?.customerPhone);

      return notifications
        .filter((item: AppNotification) => allowed.includes(item.audience))
        .filter((item: AppNotification) => {
          if (!item.nurseryId || scope.role === "SUPER_ADMIN") return true;
          return scope.nurseryId === item.nurseryId;
        })
        .filter((item: AppNotification) => {
          if (audience !== "CUSTOMER") return true;
          if (scope.role === "CUSTOMER") return true;
          if (!item.customerId && !item.customerPhone) return true;
          if (options?.customerId && item.customerId === options.customerId) return true;
          if (requestedPhone && normalizePhone(item.customerPhone) === requestedPhone) {
            return true;
          }
          return false;
        })
        .sort((a: AppNotification, b: AppNotification) =>
          b.createdAt.localeCompare(a.createdAt),
        );
    } catch {
      const cached = await loadFallback();
      return cached.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }
  },

  async create(payload: {
    title: string;
    body: string;
    audience: NotificationAudience;
    nurseryId?: string;
    createdBy?: string;
    customerId?: string;
    customerPhone?: string;
    productStatusTag?: ProductStatusTag;
  }) {
    try {
      const scope = getAccessScope();
      const scopedPayload =
        scope.role === "SUPER_ADMIN"
          ? payload
          : {
              ...payload,
              nurseryId: payload.nurseryId || scope.nurseryId,
            };
      const res = await api.post(apiPath("/notifications"), {
        ...scopedPayload,
        message: payload.body,
      });
      return normalizeNotification(getApiPayload<any>(unwrap<any>(res)));
    } catch {
      const current = await loadFallback();
      const next: AppNotification = {
        id: makeId(),
        title: payload.title,
        body: payload.body,
        audience: payload.audience,
        nurseryId: payload.nurseryId,
        createdBy: payload.createdBy,
        customerId: payload.customerId,
        customerPhone: payload.customerPhone,
        productStatusTag: payload.productStatusTag,
        createdAt: new Date().toISOString(),
        isRead: false,
      };
      await saveFallback([next, ...current]);
      return next;
    }
  },

  async markRead(id: string) {
    try {
      await api.patch(apiPath(`/notifications/${id}/read`));
    } catch {
      await useOfflineActionsStore.getState().enqueue({
        id: `off_${Date.now()}_${id}`,
        type: "MARK_NOTIFICATION_READ",
        createdAt: new Date().toISOString(),
        payload: { notificationId: id },
      });
    }

    const cached = await loadFallback();
    const idx = cached.findIndex((item) => item.id === id);
    if (idx !== -1) {
      cached[idx] = { ...cached[idx], isRead: true };
      await saveFallback(cached);
    }
  },

  async registerPushToken(payload: {
    token: string;
    platform?: "ios" | "android" | "web" | "unknown";
    appOwnership?: string;
    deviceName?: string;
  }) {
    const token = payload?.token?.trim();
    if (!token?.trim()) return;
    await api.post(apiPath("/users/push-token"), {
      token,
      platform: payload?.platform || "unknown",
      appOwnership: payload?.appOwnership,
      deviceName: payload?.deviceName,
    });
  },

  async setDueReminderConfig(everyDays: number) {
    const normalized = Number(everyDays || 0);
    if (!Number.isFinite(normalized) || normalized < 1) {
      throw new Error("Reminder interval must be at least 1 day");
    }
    const res = await api.patch(apiPath("/notifications/due-reminder-config"), {
      everyDays: Math.round(normalized),
    });
    return getApiPayload<any>(unwrap<any>(res));
  },
};
