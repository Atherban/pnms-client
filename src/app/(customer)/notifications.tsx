import { MaterialIcons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, {
  FadeInDown,
  Layout,
  SlideInRight
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import FixedHeader from "../../components/common/FixedHeader";
import { NotificationService } from "../../services/notification.service";
import { useAuthStore } from "../../stores/auth.store";
import { Colors, Spacing } from "../../theme";

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
  } else if (d.toDateString() === yesterday.toDateString()) {
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

// ==================== STATS CARD ====================

interface StatsCardProps {
  totalNotifications: number;
  unreadCount: number;
}

const StatsCard = ({ totalNotifications, unreadCount }: StatsCardProps) => (
  <Animated.View
    entering={FadeInDown.damping(35).springify()}
    style={styles.statsCard}
  >
    <LinearGradient
      colors={[Colors.white, Colors.surface]}
      style={styles.statsCardGradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <View
            style={[
              styles.statIcon,
              { backgroundColor: Colors.primary + "10" },
            ]}
          >
            <MaterialIcons
              name="notifications"
              size={20}
              color={Colors.primary}
            />
          </View>
          <View style={styles.statContent}>
            <Text style={styles.statLabel}>Total</Text>
            <Text style={[styles.statValue, { color: Colors.primary }]}>
              {totalNotifications}
            </Text>
          </View>
        </View>

        <View style={styles.statDivider} />

        <View style={styles.statItem}>
          <View
            style={[
              styles.statIcon,
              { backgroundColor: Colors.warning + "10" },
            ]}
          >
            <MaterialIcons name="circle" size={20} color={Colors.warning} />
          </View>
          <View style={styles.statContent}>
            <Text style={styles.statLabel}>Unread</Text>
            <Text style={[styles.statValue, { color: Colors.warning }]}>
              {unreadCount}
            </Text>
          </View>
        </View>
      </View>
    </LinearGradient>
  </Animated.View>
);

// ==================== NOTIFICATION CARD ====================

interface NotificationCardProps {
  notification: any;
  onPress: (id: string, isRead: boolean) => void;
  index: number;
}

const NotificationCard = ({
  notification,
  onPress,
  index,
}: NotificationCardProps) => {
  const isUnread = !notification.isRead;

  // Get notification icon based on type/content
  const getNotificationIcon = () => {
    if (notification.productStatusTag) {
      switch (notification.productStatusTag.toUpperCase()) {
        case "GERMINATED":
          return "sprout";
        case "SOWN":
          return "grass";
        case "READY_FOR_SALE":
          return "local-offer";
        case "PAYMENT_RECEIVED":
          return "payments";
        case "PAYMENT_VERIFIED":
          return "check-circle";
        default:
          return "notifications";
      }
    }
    return "notifications";
  };

  // Get icon color based on type
  const getIconColor = () => {
    if (notification.productStatusTag) {
      switch (notification.productStatusTag.toUpperCase()) {
        case "GERMINATED":
          return Colors.success;
        case "SOWN":
          return Colors.primary;
        case "READY_FOR_SALE":
          return Colors.success;
        case "PAYMENT_RECEIVED":
          return Colors.success;
        case "PAYMENT_VERIFIED":
          return Colors.success;
        default:
          return Colors.primary;
      }
    }
    return Colors.primary;
  };

  const icon = getNotificationIcon();
  const iconColor = getIconColor();

  return (
    <Animated.View
      entering={SlideInRight.delay(index * 50)
        .damping(35)
        .springify()}
      layout={Layout.damping(35).springify()}
    >
      <Pressable
        style={[styles.card, isUnread && styles.cardUnread]}
        onPress={() => onPress(notification.id, Boolean(notification.isRead))}
      >
        <LinearGradient
          colors={[
            Colors.white,
            isUnread ? Colors.primary + "02" : Colors.surface,
          ]}
          style={styles.cardGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        >
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <View
                style={[styles.cardIcon, { backgroundColor: iconColor + "10" }]}
              >
                <MaterialIcons name={icon as any} size={18} color={iconColor} />
              </View>
              <View style={styles.cardTitleContainer}>
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {notification.title || "Notification"}
                </Text>
                {isUnread && <View style={styles.unreadDot} />}
              </View>
            </View>
            <Text style={styles.cardTime}>
              {formatDate(notification.createdAt)}
            </Text>
          </View>

          {notification.body ? (
            <Text style={styles.cardBody}>{notification.body}</Text>
          ) : null}

          {notification.productStatusTag && (
            <View style={styles.statusContainer}>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: iconColor + "10" },
                ]}
              >
                <MaterialIcons name="info" size={12} color={iconColor} />
                <Text style={[styles.statusText, { color: iconColor }]}>
                  {notification.productStatusTag.replace(/_/g, " ")}
                </Text>
              </View>
            </View>
          )}
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
};

// ==================== EMPTY STATE ====================

const EmptyState = () => (
  <Animated.View
    entering={FadeInDown.damping(35).springify()}
    style={styles.emptyCard}
  >
    <View style={styles.emptyIconContainer}>
      <LinearGradient
        colors={["#F3F4F6", "#F9FAFB"]}
        style={styles.emptyIconGradient}
      >
        <MaterialIcons name="notifications-none" size={48} color="#9CA3AF" />
      </LinearGradient>
    </View>
    <Text style={styles.emptyTitle}>All Caught Up!</Text>
    <Text style={styles.emptyMessage}>
      You do not have any notifications at the moment. We will notify you when
      there are updates.
    </Text>
  </Animated.View>
);

// ==================== LOADING STATE ====================

const LoadingState = () => (
  <View style={styles.loadingContainer}>
    <Text style={styles.loadingText}>Loading notifications...</Text>
  </View>
);

// ==================== MAIN COMPONENT ====================

export default function CustomerNotificationsScreen() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  const { data, refetch, isRefetching, isLoading } = useQuery({
    queryKey: ["notifications", "customer", user?.id, user?.phoneNumber],
    queryFn: () =>
      NotificationService.list("CUSTOMER", {
        customerId: user?.id,
        customerPhone: user?.phoneNumber,
      }),
  });

  const notifications = data || [];

  // Calculate stats
  const unreadCount = notifications.filter((n: any) => !n.isRead).length;

  const markReadMutation = useMutation({
    mutationFn: (id: string) => NotificationService.markRead(id),
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ["notifications"] });
      const previous = queryClient.getQueryData<any[]>([
        "notifications",
        "customer",
        user?.id,
        user?.phoneNumber,
      ]);
      queryClient.setQueryData(
        ["notifications", "customer", user?.id, user?.phoneNumber],
        (old: any[] | undefined) =>
          (old || []).map((item) =>
            item.id === id ? { ...item, isRead: true } : item,
          ),
      );
      return { previous };
    },
    onError: (_err, _id, context) => {
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

  const handleNotificationPress = (id: string, isRead: boolean) => {
    if (isRead) return;
    markReadMutation.mutate(id);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={["left", "right"]}>
        <FixedHeader
          title="Notifications"
          subtitle="Important updates and reminders"
          titleStyle={styles.headerTitle}
        />
        <LoadingState />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["left", "right"]}>
      <FixedHeader
        title="Notifications"
        subtitle="Important updates and reminders"
        titleStyle={styles.headerTitle}
        actions={
          <Pressable
            style={({ pressed }) => [
              styles.headerIconBtn,
              pressed && styles.headerIconBtnPressed,
            ]}
            onPress={() => refetch()}
          >
            <MaterialIcons
              name={isRefetching ? "sync" : "refresh"}
              size={20}
              color={Colors.white}
            />
          </Pressable>
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* Stats Card */}
        {notifications.length > 0 && (
          <StatsCard
            totalNotifications={notifications.length}
            unreadCount={unreadCount}
          />
        )}

        {/* Notifications List */}
        {notifications.length === 0 ? (
          <EmptyState />
        ) : (
          notifications.map((item: any, index: number) => (
            <NotificationCard
              key={item.id}
              notification={item}
              onPress={handleNotificationPress}
              index={index}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  headerTitle: {
    fontSize: 24,
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.32)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  headerIconBtnPressed: {
    backgroundColor: "rgba(255,255,255,0.2)",
    transform: [{ scale: 0.95 }],
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: 100,
    gap: Spacing.md,
  },

  // Stats Card
  statsCard: {
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: Colors.white,
    marginBottom: Spacing.xs,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statsCardGradient: {
    padding: Spacing.lg,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  statContent: {
    flex: 1,
  },
  statLabel: {
    fontSize: 11,
    color: "#6B7280",
    marginBottom: 2,
  },
  statValue: {
    fontSize: 16,
    fontWeight: "700",
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: "#E5E7EB",
    marginHorizontal: 8,
  },

  // Notification Card
  card: {
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: Colors.white,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardGradient: {
    padding: Spacing.md,
  },
  cardUnread: {
    borderColor: Colors.primary,
    backgroundColor: Colors.white,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.xs,
  },
  cardHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    flex: 1,
  },
  cardIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  cardTime: {
    fontSize: 11,
    color: "#9CA3AF",
  },
  cardBody: {
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 18,
    marginBottom: Spacing.sm,
    paddingLeft: 44, // Align with icon (36px icon + 8px gap)
  },
  statusContainer: {
    paddingLeft: 44, // Align with icon
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
  },

  // Empty State
  emptyCard: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    backgroundColor: Colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: Spacing.md,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 8,
    overflow: "hidden",
  },
  emptyIconGradient: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
  },
  emptyMessage: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    paddingHorizontal: 32,
    lineHeight: 20,
  },

  // Loading State
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.xl,
  },
  loadingText: {
    fontSize: 14,
    color: "#6B7280",
  },
});
