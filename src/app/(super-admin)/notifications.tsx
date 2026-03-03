import { MaterialIcons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import FixedHeader from "../../components/common/FixedHeader";
import { NotificationService } from "../../services/notification.service";
import { NurseryService } from "../../services/nursery.service";
import { Colors } from "../../theme";

const BOTTOM_NAV_HEIGHT = 80;

type SendMode = "TARGETED" | "GLOBAL";

// ==================== MODE SELECTOR ====================

interface ModeSelectorProps {
  mode: SendMode;
  onModeChange: (mode: SendMode) => void;
}

const ModeSelector = ({ mode, onModeChange }: ModeSelectorProps) => (
  <View style={styles.modeContainer}>
    <Text style={styles.sectionLabel}>Send Mode</Text>
    <View style={styles.modeRow}>
      <Pressable
        style={({ pressed }) => [
          styles.modeButton,
          mode === "TARGETED" && styles.modeButtonActive,
          pressed && styles.modeButtonPressed,
        ]}
        onPress={() => onModeChange("TARGETED")}
      >
        <MaterialIcons
          name="people"
          size={18}
          color={mode === "TARGETED" ? Colors.primary : Colors.textSecondary}
        />
        <Text
          style={[
            styles.modeButtonText,
            mode === "TARGETED" && styles.modeButtonTextActive,
          ]}
        >
          Targeted
        </Text>
      </Pressable>

      <Pressable
        style={({ pressed }) => [
          styles.modeButton,
          mode === "GLOBAL" && styles.modeButtonActive,
          pressed && styles.modeButtonPressed,
        ]}
        onPress={() => onModeChange("GLOBAL")}
      >
        <MaterialIcons
          name="public"
          size={18}
          color={mode === "GLOBAL" ? Colors.primary : Colors.textSecondary}
        />
        <Text
          style={[
            styles.modeButtonText,
            mode === "GLOBAL" && styles.modeButtonTextActive,
          ]}
        >
          Global
        </Text>
      </Pressable>
    </View>
  </View>
);

// ==================== NURSERY SELECTOR ====================

interface NurserySelectorProps {
  nurseries: { id: string; name: string }[];
  selectedId: string;
  onSelect: (id: string) => void;
  adminCount: number;
}

const NurserySelector = ({
  nurseries,
  selectedId,
  onSelect,
  adminCount,
}: NurserySelectorProps) => (
  <View style={styles.nurseryContainer}>
    <View style={styles.nurseryHeader}>
      <MaterialIcons name="store" size={16} color={Colors.primary} />
      <Text style={styles.sectionLabel}>Select Nursery</Text>
    </View>

    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.nurseryScroll}
    >
      {nurseries.map((nursery) => {
        const isSelected = nursery.id === selectedId;
        return (
          <Pressable
            key={nursery.id}
            style={({ pressed }) => [
              styles.nurseryChip,
              isSelected && styles.nurseryChipSelected,
              pressed && styles.nurseryChipPressed,
            ]}
            onPress={() => onSelect(nursery.id)}
          >
            <Text
              style={[
                styles.nurseryChipText,
                isSelected && styles.nurseryChipTextSelected,
              ]}
              numberOfLines={1}
            >
              {nursery.name}
            </Text>
            {isSelected && (
              <MaterialIcons
                name="check-circle"
                size={14}
                color={Colors.primary}
              />
            )}
          </Pressable>
        );
      })}
    </ScrollView>

    {selectedId && (
      <View style={styles.adminBadge}>
        <MaterialIcons
          name="admin-panel-settings"
          size={14}
          color={Colors.info}
        />
        <Text style={styles.adminBadgeText}>
          {adminCount} admin{adminCount !== 1 ? "s" : ""} will receive this
          notification
        </Text>
      </View>
    )}
  </View>
);

// ==================== COMPOSER CARD ====================

interface ComposerCardProps {
  title: string;
  body: string;
  onTitleChange: (text: string) => void;
  onBodyChange: (text: string) => void;
  onSend: () => void;
  isPending: boolean;
  mode: SendMode;
  isValid: boolean;
}

const ComposerCard = ({
  title,
  body,
  onTitleChange,
  onBodyChange,
  onSend,
  isPending,
  mode,
  isValid,
}: ComposerCardProps) => (
  <View style={styles.composerCard}>
    <View style={styles.composerHeader}>
      <MaterialIcons name="edit-note" size={18} color={Colors.primary} />
      <Text style={styles.composerTitle}>Compose Message</Text>
    </View>

    <TextInput
      value={title}
      onChangeText={onTitleChange}
      placeholder="Notification title"
      style={styles.titleInput}
      placeholderTextColor="#9CA3AF"
    />

    <TextInput
      value={body}
      onChangeText={onBodyChange}
      placeholder="Write your message here..."
      style={styles.bodyInput}
      multiline
      numberOfLines={4}
      placeholderTextColor="#9CA3AF"
      textAlignVertical="top"
    />

    <Pressable
      style={({ pressed }) => [
        styles.sendButton,
        !isValid && styles.sendButtonDisabled,
        pressed && styles.sendButtonPressed,
      ]}
      onPress={onSend}
      disabled={!isValid || isPending}
    >
      <LinearGradient
        colors={[Colors.primary, Colors.primaryLight || Colors.primary]}
        style={styles.sendButtonGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        {isPending ? (
          <ActivityIndicator size="small" color={Colors.white} />
        ) : (
          <>
            <MaterialIcons
              name={mode === "GLOBAL" ? "public" : "send"}
              size={18}
              color={Colors.white}
            />
            <Text style={styles.sendButtonText}>
              {mode === "GLOBAL"
                ? "Send Global Announcement"
                : "Send to Nursery Admins"}
            </Text>
          </>
        )}
      </LinearGradient>
    </Pressable>
  </View>
);

// ==================== NOTIFICATION CARD ====================

interface NotificationCardProps {
  notification: any;
}

const NotificationCard = ({ notification }: NotificationCardProps) => {
  const getAudienceIcon = () => {
    if (notification.audience === "ALL") return "public";
    if (notification.audience === "NURSERY_ADMIN") return "people";
    return "person";
  };

  const getAudienceColor = () => {
    if (notification.audience === "ALL") return Colors.info;
    if (notification.audience === "NURSERY_ADMIN") return Colors.success;
    return Colors.textSecondary;
  };

  return (
    <View style={styles.notificationCard}>
      <View style={styles.notificationHeader}>
        <View style={styles.notificationHeaderLeft}>
          <View
            style={[
              styles.notificationIcon,
              { backgroundColor: `${getAudienceColor()}10` },
            ]}
          >
            <MaterialIcons
              name={getAudienceIcon()}
              size={16}
              color={getAudienceColor()}
            />
          </View>
          <View style={styles.notificationTitleContainer}>
            <Text style={styles.notificationTitle}>{notification.title}</Text>
            <View style={styles.audienceBadge}>
              <MaterialIcons name="schedule" size={10} color="#9CA3AF" />
              <Text style={styles.audienceBadgeText}>
                {notification.createdAt
                  ? new Date(notification.createdAt).toLocaleDateString()
                  : "Recent"}
              </Text>
            </View>
          </View>
        </View>
        <View
          style={[
            styles.audienceChip,
            { backgroundColor: `${getAudienceColor()}10` },
          ]}
        >
          <Text
            style={[styles.audienceChipText, { color: getAudienceColor() }]}
          >
            {notification.audience === "ALL" ? "Global" : "Targeted"}
          </Text>
        </View>
      </View>

      <Text style={styles.notificationBody}>{notification.body}</Text>

    </View>
  );
};

// ==================== EMPTY STATE ====================

const EmptyState = () => (
  <View style={styles.emptyContainer}>
    <MaterialIcons name="notifications-none" size={48} color="#D1D5DB" />
    <Text style={styles.emptyTitle}>No Notifications Yet</Text>
    <Text style={styles.emptyMessage}>
      Notifications you send will appear here.
    </Text>
  </View>
);

// ==================== MAIN COMPONENT ====================

export default function SuperAdminNotificationsScreen() {
  const queryClient = useQueryClient();
  const notificationsQueryKey = ["notifications", "super-admin"] as const;
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [mode, setMode] = useState<SendMode>("TARGETED");
  const [selectedNurseryId, setSelectedNurseryId] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: notificationsQueryKey,
    queryFn: () => NotificationService.list("SUPER_ADMIN"),
  });

  const { data: nurseries, isLoading: loadingNurseries } = useQuery({
    queryKey: ["super-admin", "nurseries", "notification-targets"],
    queryFn: () => NurseryService.list(),
  });

  const { data: nurseryAdmins, isLoading: loadingAdmins } = useQuery({
    queryKey: ["super-admin", "nursery-admins", selectedNurseryId],
    queryFn: () => NurseryService.listAdmins(selectedNurseryId),
    enabled: Boolean(selectedNurseryId) && mode === "TARGETED",
  });

  const selectedNursery = useMemo(
    () => (nurseries || []).find((n) => n.id === selectedNurseryId),
    [nurseries, selectedNurseryId],
  );

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!title.trim() || !body.trim()) {
        throw new Error("Title and message are required");
      }

      if (mode === "TARGETED") {
        if (!selectedNurseryId) {
          throw new Error("Select a nursery first");
        }
        return NotificationService.create({
          title: title.trim(),
          body: body.trim(),
          audience: "NURSERY_ADMIN",
          nurseryId: selectedNurseryId,
        });
      }

      return NotificationService.create({
        title: title.trim(),
        body: body.trim(),
        audience: "ALL",
      });
    },
    onSuccess: async () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTitle("");
      setBody("");
      setSelectedNurseryId("");
      setMode("TARGETED");
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
      Alert.alert(
        "✅ Success",
        mode === "TARGETED"
          ? `Message sent to ${selectedNursery?.name || "selected nursery"} admin(s).`
          : "Global announcement sent successfully.",
      );
    },
    onError: (err: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("❌ Failed", err?.message || "Unable to send notification");
    },
  });

  const clearAllMutation = useMutation({
    mutationFn: () => NotificationService.clearAll(),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: notificationsQueryKey });
      const previous = queryClient.getQueryData<any[]>(notificationsQueryKey);
      queryClient.setQueryData(notificationsQueryKey, []);
      return { previous };
    },
    onError: (err: any, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(notificationsQueryKey, context.previous);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("❌ Failed", err?.message || "Unable to clear notifications");
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: notificationsQueryKey });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await refetch();
    setRefreshing(false);
  };

  const handleClearAll = () => {
    if (!notifications.length) return;
    Alert.alert(
      "Clear notifications?",
      "This will permanently remove all notifications.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear All",
          style: "destructive",
          onPress: () => clearAllMutation.mutate(),
        },
      ],
    );
  };

  const isValid =
    title.trim().length > 0 &&
    body.trim().length > 0 &&
    (mode === "GLOBAL" || (mode === "TARGETED" && selectedNurseryId));

  const notifications = data || [];

  return (
    <View style={styles.container}>
      <FixedHeader
        title="Notifications"
        subtitle="Send messages to nursery admins"
        showBackButton
        onBackPress={() => {}}
        actions={
          <View style={styles.headerActions}>
            <Pressable
              style={({ pressed }) => [
                styles.headerIconBtn,
                pressed && styles.headerIconBtnPressed,
              ]}
              onPress={handleRefresh}
            >
              <MaterialIcons
                name={refreshing ? "sync" : "refresh"}
                size={20}
                color={Colors.white}
              />
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.headerIconBtn,
                styles.headerDangerBtn,
                pressed && styles.headerIconBtnPressed,
              ]}
              onPress={handleClearAll}
              disabled={!notifications.length || clearAllMutation.isPending}
            >
              <MaterialIcons
                name={clearAllMutation.isPending ? "hourglass-empty" : "delete-sweep"}
                size={20}
                color={Colors.white}
              />
            </Pressable>
          </View>
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
      >
        {/* Composer Section */}
        <View style={styles.composerSection}>
          <ModeSelector mode={mode} onModeChange={setMode} />

          {mode === "TARGETED" && nurseries && (
            <NurserySelector
              nurseries={nurseries}
              selectedId={selectedNurseryId}
              onSelect={setSelectedNurseryId}
              adminCount={nurseryAdmins?.length || 0}
            />
          )}

          <ComposerCard
            title={title}
            body={body}
            onTitleChange={setTitle}
            onBodyChange={setBody}
            onSend={() => createMutation.mutate()}
            isPending={createMutation.isPending}
            mode={mode}
            isValid={isValid}
          />
        </View>

        {/* Sent Notifications */}
        <View style={styles.historySection}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderLeft}>
              <MaterialIcons name="history" size={18} color={Colors.primary} />
              <Text style={styles.sectionTitle}>Sent Notifications</Text>
            </View>
            <Text style={styles.sectionCount}>
              {notifications.length} total
            </Text>
          </View>

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.loadingText}>Loading notifications...</Text>
            </View>
          ) : notifications.length === 0 ? (
            <EmptyState />
          ) : (
            <View style={styles.notificationList}>
              {notifications.map((item) => (
                <NotificationCard key={item.id} notification={item} />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },

  // Header
  headerTitle: {
    fontSize: 24,
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.34)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
  },
  headerDangerBtn: {
    backgroundColor: "transparent",
    borderColor: "rgba(255,255,255,0.34)",
  },
  headerIconBtnPressed: {
    backgroundColor: "rgba(255,255,255,0.1)",
    transform: [{ scale: 0.95 }],
  },

  // Content
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: BOTTOM_NAV_HEIGHT + 100,
    gap: 20,
  },

  // Composer Section
  composerSection: {
    gap: 16,
  },
  composerCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 12,
  },
  composerHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  composerTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  titleInput: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: "#111827",
    backgroundColor: "#F9FAFB",
  },
  bodyInput: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: "#111827",
    backgroundColor: "#F9FAFB",
    minHeight: 100,
    textAlignVertical: "top",
  },
  sendButton: {
    borderRadius: 12,
    overflow: "hidden",
    marginTop: 4,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonPressed: {
    transform: [{ scale: 0.98 }],
  },
  sendButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 8,
  },
  sendButtonText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: "600",
  },

  // Mode Selector
  modeContainer: {
    gap: 8,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    marginLeft: 4,
  },
  modeRow: {
    flexDirection: "row",
    gap: 10,
  },
  modeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
  },
  modeButtonActive: {
    borderColor: Colors.primary,
    backgroundColor: `${Colors.primary}05`,
  },
  modeButtonPressed: {
    transform: [{ scale: 0.98 }],
  },
  modeButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
  },
  modeButtonTextActive: {
    color: Colors.primary,
  },

  // Nursery Selector
  nurseryContainer: {
    gap: 12,
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  nurseryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  nurseryScroll: {
    paddingRight: 20,
    gap: 8,
  },
  nurseryChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
    gap: 6,
    marginRight: 8,
  },
  nurseryChipSelected: {
    borderColor: Colors.primary,
    backgroundColor: `${Colors.primary}05`,
  },
  nurseryChipPressed: {
    transform: [{ scale: 0.96 }],
  },
  nurseryChipText: {
    fontSize: 13,
    color: "#374151",
    fontWeight: "500",
    maxWidth: 150,
  },
  nurseryChipTextSelected: {
    color: Colors.primary,
    fontWeight: "600",
  },
  adminBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  adminBadgeText: {
    fontSize: 11,
    color: "#374151",
    fontWeight: "500",
  },

  // History Section
  historySection: {
    gap: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  sectionCount: {
    fontSize: 12,
    color: "#6B7280",
  },

  // Loading
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    color: "#6B7280",
  },

  // Empty State
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 12,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  emptyMessage: {
    fontSize: 12,
    color: "#6B7280",
    textAlign: "center",
    paddingHorizontal: 32,
  },

  // Notification List
  notificationList: {
    gap: 8,
  },
  notificationCard: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 10,
  },
  notificationHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  notificationHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  notificationIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  notificationTitleContainer: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 2,
  },
  audienceBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  audienceBadgeText: {
    fontSize: 10,
    color: "#9CA3AF",
  },
  audienceChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  audienceChipText: {
    fontSize: 10,
    fontWeight: "600",
  },
  notificationBody: {
    fontSize: 13,
    color: "#4B5563",
    lineHeight: 18,
  },
  nurseryRef: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  nurseryRefText: {
    fontSize: 10,
    color: "#6B7280",
    flex: 1,
  },
});
