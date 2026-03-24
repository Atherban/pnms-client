import { MaterialIcons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { CustomerActionButton } from "@/src/components/customer/CustomerActionButton";
import { StitchHeaderActionButton } from "@/src/components/common/StitchHeader";
import {
  CustomerCard,
  CustomerEmptyState,
  CustomerScreen,
  SectionHeader,
  StatPill,
  StatusChip,
} from "@/src/components/common/StitchScreen";
import { NotificationService } from "@/src/services/notification.service";
import { useAuthStore } from "@/src/stores/auth.store";
import { CustomerColors, Spacing } from "@/src/theme";
import type { AppNotification } from "@/src/types/notification.types";

type NotificationFilter = "ALL" | "PAYMENTS" | "PLANTS" | "ORDERS" | "GENERAL";

const FILTER_OPTIONS: NotificationFilter[] = ["ALL", "PAYMENTS", "PLANTS", "ORDERS", "GENERAL"];

const formatDate = (value?: string) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;

  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (d.toDateString() === today.toDateString()) {
    return `Today, ${d.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })}`;
  }

  if (d.toDateString() === yesterday.toDateString()) {
    return `Yesterday, ${d.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })}`;
  }

  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const getNotificationCategory = (notification: AppNotification): NotificationFilter => {
  const haystack = `${notification.title} ${notification.body} ${notification.productStatusTag || ""}`.toUpperCase();
  if (haystack.includes("PAYMENT") || haystack.includes("DUE") || haystack.includes("BILL")) {
    return "PAYMENTS";
  }
  if (haystack.includes("ORDER") || haystack.includes("DELIVER") || haystack.includes("SHIP")) {
    return "ORDERS";
  }
  if (
    haystack.includes("SEED") ||
    haystack.includes("PLANT") ||
    haystack.includes("GERMINAT") ||
    haystack.includes("SOWN") ||
    haystack.includes("READY")
  ) {
    return "PLANTS";
  }
  return "GENERAL";
};

const getNotificationIcon = (notification: AppNotification) => {
  const category = getNotificationCategory(notification);
  if (category === "PAYMENTS") return "payments";
  if (category === "ORDERS") return "local-shipping";
  if (category === "PLANTS") return "local-florist";
  return "notifications";
};

const getNotificationTone = (
  notification: AppNotification,
): "success" | "warning" | "info" | "default" => {
  const category = getNotificationCategory(notification);
  if (category === "PAYMENTS") return "info";
  if (category === "ORDERS") return "warning";
  if (category === "PLANTS") return "success";
  return "default";
};

export default function CustomerNotificationsScreen() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [activeFilter, setActiveFilter] = useState<NotificationFilter>("ALL");

  const { data, refetch, isRefetching, isLoading } = useQuery({
    queryKey: ["notifications", "customer", user?.id, user?.phoneNumber],
    queryFn: () =>
      NotificationService.list("CUSTOMER", {
        customerId: user?.id,
        customerPhone: user?.phoneNumber,
      }),
  });

  const notifications = useMemo(() => (Array.isArray(data) ? data : []), [data]);
  const unreadCount = notifications.filter((item) => !item.isRead).length;
  const filteredNotifications = useMemo(
    () =>
      notifications.filter((item) => {
        if (activeFilter === "ALL") return true;
        return getNotificationCategory(item) === activeFilter;
      }),
    [activeFilter, notifications],
  );

  const markReadMutation = useMutation({
    mutationFn: (id: string) => NotificationService.markRead(id),
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ["notifications"] });
      const previous = queryClient.getQueryData<AppNotification[]>([
        "notifications",
        "customer",
        user?.id,
        user?.phoneNumber,
      ]);
      queryClient.setQueryData(
        ["notifications", "customer", user?.id, user?.phoneNumber],
        (old: AppNotification[] | undefined) =>
          (old || []).map((item) => (item.id === id ? { ...item, isRead: true } : item)),
      );
      return { previous };
    },
    onError: (_error, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          ["notifications", "customer", user?.id, user?.phoneNumber],
          context.previous,
        );
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const clearAllMutation = useMutation({
    mutationFn: () => NotificationService.clearAll(),
    onError: (err: any) => {
      Alert.alert("Unable to clear", err?.message || "Please try again.");
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      const unreadIds = notifications.filter((item) => !item.isRead).map((item) => item.id);
      await Promise.all(unreadIds.map((id) => NotificationService.markRead(id)));
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const headerActions = (
    <View style={styles.headerActions}>
      <StitchHeaderActionButton
        iconName={isRefetching ? "sync" : "refresh"}
        onPress={() => refetch()}
      />
      <StitchHeaderActionButton
        iconName={clearAllMutation.isPending ? "hourglass-empty" : "delete-sweep"}
        onPress={() => {
          if (!notifications.length) return;
          Alert.alert("Clear notifications?", "This will remove all notifications from the list.", [
            { text: "Cancel", style: "cancel" },
            {
              text: "Clear",
              style: "destructive",
              onPress: () => clearAllMutation.mutate(),
            },
          ]);
        }}
        disabled={!notifications.length || clearAllMutation.isPending}
      />
    </View>
  );

  return (
    <CustomerScreen
      title="Notifications"
      subtitle="Important updates from the nursery and your account."
      actions={headerActions}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={refetch}
          colors={[CustomerColors.primary]}
          tintColor={CustomerColors.primary}
        />
      }
    >
      <View style={styles.statsGrid}>
        <StatPill label="Total" value={String(notifications.length)} />
        <StatPill label="Unread" value={String(unreadCount)} />
      </View>

      {notifications.length > 0 ? (
        <CustomerCard style={styles.actionsCard}>
          <SectionHeader
            title="Inbox"
            subtitle="Filter what you want to review first."
            trailing={
              unreadCount > 0 ? (
                <CustomerActionButton
                  label={markAllReadMutation.isPending ? "Updating..." : "Mark all read"}
                  onPress={() => markAllReadMutation.mutate()}
                  variant="secondary"
                />
              ) : undefined
            }
          />
          <View style={styles.filterRow}>
            {FILTER_OPTIONS.map((filter) => {
              const active = filter === activeFilter;
              return (
                <Pressable
                  key={filter}
                  onPress={() => setActiveFilter(filter)}
                  style={[styles.filterChip, active && styles.filterChipActive]}
                >
                  <Text style={[styles.filterText, active && styles.filterTextActive]}>
                    {filter === "ALL" ? "All" : filter.charAt(0) + filter.slice(1).toLowerCase()}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </CustomerCard>
      ) : null}

      {isLoading ? (
        <CustomerCard style={styles.loadingCard}>
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </CustomerCard>
      ) : null}

      {!isLoading && filteredNotifications.length === 0 ? (
        notifications.length === 0 ? (
          <CustomerEmptyState
            title="All caught up"
            message="You do not have any notifications right now. New nursery updates will appear here."
            icon={<MaterialIcons name="notifications-none" size={44} color={CustomerColors.textMuted} />}
          />
        ) : (
          <CustomerEmptyState
            title="No notifications in this filter"
            message="Try another category to review the rest of your updates."
            icon={<MaterialIcons name="filter-list-off" size={44} color={CustomerColors.textMuted} />}
          />
        )
      ) : null}

      {!isLoading
        ? filteredNotifications.map((item) => {
            const unread = !item.isRead;
            return (
              <Pressable
                key={item.id}
                onPress={() => {
                  if (!item.isRead) {
                    markReadMutation.mutate(item.id);
                  }
                }}
                style={({ pressed }) => [pressed && styles.notificationPressed]}
              >
                <CustomerCard style={[styles.notificationCard, unread && styles.notificationUnread]}>
                  <View style={styles.notificationHeader}>
                    <View style={styles.notificationTitleRow}>
                      <View style={[styles.notificationIcon, unread && styles.notificationIconUnread]}>
                        <MaterialIcons
                          name={getNotificationIcon(item)}
                          size={20}
                          color={unread ? CustomerColors.primary : CustomerColors.textMuted}
                        />
                      </View>
                      <View style={styles.notificationTextWrap}>
                        <Text style={styles.notificationTitle}>{item.title || "Notification"}</Text>
                        <Text style={styles.notificationTime}>{formatDate(item.createdAt)}</Text>
                      </View>
                    </View>
                    {unread ? <View style={styles.unreadDot} /> : null}
                  </View>

                  {item.body ? <Text style={styles.notificationBody}>{item.body}</Text> : null}

                  <View style={styles.notificationFooter}>
                    <StatusChip
                      label={getNotificationCategory(item) === "ALL" ? "General" : getNotificationCategory(item)}
                      tone={getNotificationTone(item)}
                    />
                    {item.productStatusTag ? (
                      <StatusChip
                        label={item.productStatusTag.replace(/_/g, " ")}
                        tone={getNotificationTone(item)}
                      />
                    ) : null}
                  </View>
                </CustomerCard>
              </Pressable>
            );
          })
        : null}
    </CustomerScreen>
  );
}

const styles = StyleSheet.create({
  headerActions: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  statsGrid: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  actionsCard: {
    gap: Spacing.md,
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: CustomerColors.border,
    borderWidth: 1,
    borderColor: CustomerColors.borderStrong,
  },
  filterChipActive: {
    backgroundColor: CustomerColors.primary,
    borderColor: CustomerColors.primary,
  },
  filterText: {
    fontSize: 13,
    fontWeight: "700",
    color: CustomerColors.textMuted,
  },
  filterTextActive: {
    color: CustomerColors.white,
  },
  loadingCard: {
    paddingVertical: Spacing.xl,
    alignItems: "center",
  },
  loadingText: {
    color: CustomerColors.textMuted,
  },
  notificationPressed: {
    opacity: 0.95,
  },
  notificationCard: {
    gap: Spacing.md,
  },
  notificationUnread: {
    borderColor: CustomerColors.borderStrong,
    backgroundColor: "rgba(15,189,73,0.05)",
  },
  notificationHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  notificationTitleRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  notificationIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: CustomerColors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  notificationIconUnread: {
    backgroundColor: "rgba(15,189,73,0.12)",
  },
  notificationTextWrap: {
    flex: 1,
    gap: 4,
  },
  notificationTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: CustomerColors.text,
  },
  notificationTime: {
    fontSize: 12,
    color: CustomerColors.textMuted,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: CustomerColors.primary,
    marginTop: 4,
  },
  notificationBody: {
    color: CustomerColors.textMuted,
    lineHeight: 21,
  },
  notificationFooter: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
});
