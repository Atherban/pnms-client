import { MaterialIcons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Dimensions,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import FixedHeader from "../../components/common/FixedHeader";
import { CustomerService } from "../../services/customer.service";
import { NotificationService } from "../../services/notification.service";
import { useAuthStore } from "../../stores/auth.store";
import { Colors, Spacing } from "../../theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const BOTTOM_NAV_HEIGHT = 80;

const formatDateTime = (dateString?: string) => {
  if (!dateString) return "—";
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return `Today, ${date.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  } else if (date.toDateString() === yesterday.toDateString()) {
    return `Yesterday, ${date.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  }
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// ==================== STATS CARD ====================

interface StatsCardProps {
  totalNotifications: number;
  broadcastCount: number;
  targetedCount: number;
}

const StatsCard = ({ totalNotifications, broadcastCount, targetedCount }: StatsCardProps) => (
  <BlurView intensity={80} tint="light" style={styles.statsCard}>
    <View style={styles.statsRow}>
      <View style={styles.statItem}>
        <View style={[styles.statIcon, { backgroundColor: `${Colors.primary}15` }]}>
          <MaterialIcons name="notifications" size={16} color={Colors.primary} />
        </View>
        <View style={styles.statInfo}>
          <Text style={styles.statNumber}>{totalNotifications}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
      </View>

      <View style={styles.statDivider} />

      <View style={styles.statItem}>
        <View style={[styles.statIcon, { backgroundColor: "#10B98115" }]}>
          <MaterialIcons name="campaign" size={16} color="#10B981" />
        </View>
        <View style={styles.statInfo}>
          <Text style={styles.statNumber}>{broadcastCount}</Text>
          <Text style={styles.statLabel}>Broadcast</Text>
        </View>
      </View>

      <View style={styles.statDivider} />

      <View style={styles.statItem}>
        <View style={[styles.statIcon, { backgroundColor: "#3B82F615" }]}>
          <MaterialIcons name="person" size={16} color="#3B82F6" />
        </View>
        <View style={styles.statInfo}>
          <Text style={styles.statNumber}>{targetedCount}</Text>
          <Text style={styles.statLabel}>Targeted</Text>
        </View>
      </View>
    </View>
  </BlurView>
);

// ==================== NOTIFICATION CARD ====================

interface NotificationCardProps {
  notification: any;
}

const NotificationCard = ({ notification }: NotificationCardProps) => {
  const isTargeted = notification.customerId || notification.customerPhone;

  return (
    <View style={styles.notificationCard}>
      <View style={styles.notificationHeader}>
        <View style={styles.notificationHeaderLeft}>
          <View style={[styles.notificationIcon, { backgroundColor: isTargeted ? "#3B82F610" : "#10B98110" }]}>
            <MaterialIcons 
              name={isTargeted ? "person" : "campaign"} 
              size={18} 
              color={isTargeted ? "#3B82F6" : "#10B981"} 
            />
          </View>
          <View style={styles.notificationInfo}>
            <Text style={styles.notificationTitle} numberOfLines={1}>
              {notification.title}
            </Text>
            <View style={styles.notificationMeta}>
              <MaterialIcons name="access-time" size={10} color="#9CA3AF" />
              <Text style={styles.notificationTime}>{formatDateTime(notification.createdAt)}</Text>
            </View>
          </View>
        </View>
        <View style={[styles.audienceBadge, { backgroundColor: isTargeted ? "#3B82F610" : "#10B98110" }]}>
          <Text style={[styles.audienceBadgeText, { color: isTargeted ? "#3B82F6" : "#10B981" }]}>
            {isTargeted ? "Targeted" : "Broadcast"}
          </Text>
        </View>
      </View>

      <Text style={styles.notificationBody}>{notification.body}</Text>

      {(notification.customerPhone || notification.productStatusTag) && (
        <View style={styles.notificationDetails}>
          {notification.customerPhone && (
            <View style={styles.detailChip}>
              <MaterialIcons name="phone" size={10} color="#6B7280" />
              <Text style={styles.detailChipText}>{notification.customerPhone}</Text>
            </View>
          )}
          {notification.productStatusTag && (
            <View style={styles.detailChip}>
              <MaterialIcons name="label" size={10} color="#6B7280" />
              <Text style={styles.detailChipText}>{notification.productStatusTag}</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

// ==================== MAIN COMPONENT ====================

export default function AdminNotificationsScreen() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<"ALL" | "CUSTOMER" | "STAFF">("ALL");
  const [productStatusTag, setProductStatusTag] = useState<
    | "SOWN"
    | "GERMINATED"
    | "READY"
    | "DISCARDED"
    | "PAYMENT_PENDING"
    | "PAYMENT_VERIFIED"
    | "PAYMENT_REJECTED"
    | ""
  >("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [reminderEveryDays, setReminderEveryDays] = useState("7");
  const [showCustomerResults, setShowCustomerResults] = useState(false);

  const { data, refetch, isRefetching } = useQuery({
    queryKey: ["notifications", "admin"],
    queryFn: () => NotificationService.list("CUSTOMER_NURSERY_ADMIN"),
  });

  const { data: customerData } = useQuery({
    queryKey: ["customers", "notification-targets"],
    queryFn: CustomerService.getAll,
  });

  const notifications = useMemo(() => (Array.isArray(data) ? data : []), [data]);
  const customers = useMemo(
    () => (Array.isArray(customerData) ? customerData : []),
    [customerData],
  );

  const selectedCustomer = useMemo(
    () => customers.find((item: any) => item?._id === selectedCustomerId),
    [customers, selectedCustomerId],
  );

  const filteredCustomers = useMemo(() => {
    if (audience !== "CUSTOMER") return [];
    const q = customerSearch.trim().toLowerCase();
    if (!q) return [];
    return customers
      .filter((customer: any) => {
        const name = String(customer?.name || "").toLowerCase();
        const phone = String(customer?.mobileNumber || "").toLowerCase();
        const id = String(customer?._id || "").toLowerCase();
        return name.includes(q) || phone.includes(q) || id.includes(q);
      })
      .slice(0, 5);
  }, [audience, customerSearch, customers]);

  const stats = useMemo(() => {
    const total = notifications.length;
    const broadcast = notifications.filter(n => !n.customerId && !n.customerPhone).length;
    const targeted = notifications.filter(n => n.customerId || n.customerPhone).length;
    return { total, broadcast, targeted };
  }, [notifications]);

  const createMutation = useMutation({
    mutationFn: () => {
      if (!title.trim() || !body.trim()) {
        throw new Error("Title and message are required");
      }
      if (audience === "CUSTOMER" && customerSearch.trim() && !selectedCustomerId) {
        throw new Error("Select a customer from the results or clear search to broadcast to all customers");
      }
      return NotificationService.create({
        title: title.trim(),
        body: body.trim(),
        audience,
        createdBy: user?.name,
        customerId: audience === "CUSTOMER" && selectedCustomerId ? selectedCustomerId : undefined,
        productStatusTag: productStatusTag || undefined,
      });
    },
    onSuccess: async () => {
      setTitle("");
      setBody("");
      setProductStatusTag("");
      setCustomerSearch("");
      setSelectedCustomerId("");
      setShowCustomerResults(false);
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
      Alert.alert("✅ Success", "Notification broadcasted successfully.");
    },
    onError: (err: any) => Alert.alert("❌ Failed", err?.message || "Please try again"),
  });

  const configMutation = useMutation({
    mutationFn: () => {
      const parsed = Number(reminderEveryDays || 0);
      if (!Number.isFinite(parsed) || parsed < 1) {
        throw new Error("Reminder cadence should be at least 1 day");
      }
      return NotificationService.setDueReminderConfig(parsed);
    },
    onSuccess: () => {
      Alert.alert("✅ Saved", "Due reminder cadence updated.");
    },
    onError: (err: any) => {
      Alert.alert("❌ Error", err?.message || "Please try again");
    },
  });

  const clearAllMutation = useMutation({
    mutationFn: () => NotificationService.clearAll(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (err: any) => {
      Alert.alert("❌ Failed", err?.message || "Unable to clear notifications");
    },
  });

  const handleCustomerSelect = (customer: any) => {
    setSelectedCustomerId(String(customer._id));
    setCustomerSearch(customer.name || "");
    setShowCustomerResults(false);
  };

  const handleClearCustomer = () => {
    setSelectedCustomerId("");
    setCustomerSearch("");
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

  return (
    <View style={styles.container}>
      <FixedHeader
        title="Notification Center"
        subtitle="Send updates to customers and staff"
        titleStyle={styles.headerTitle}
        actions={
          <View style={styles.headerActions}>
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

      {/* Stats Card */}
      {notifications.length > 0 && (
        <View style={styles.statsWrapper}>
          <StatsCard
            totalNotifications={stats.total}
            broadcastCount={stats.broadcast}
            targetedCount={stats.targeted}
          />
        </View>
      )}

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Composer Card */}
        <View style={styles.composerCard}>
          <Text style={styles.sectionTitle}>Compose Notification</Text>

          {/* Audience Selection */}
          <View style={styles.audienceSection}>
            <Text style={styles.sectionLabel}>Send to</Text>
            <View style={styles.audienceRow}>
              {(["ALL", "CUSTOMER", "STAFF"] as const).map((item) => (
                <Pressable
                  key={item}
                  style={[
                    styles.audienceChip,
                    audience === item && styles.audienceChipActive,
                  ]}
                  onPress={() => {
                    setAudience(item);
                    if (item !== "CUSTOMER") {
                      setCustomerSearch("");
                      setSelectedCustomerId("");
                      setShowCustomerResults(false);
                    }
                  }}
                >
                  <Text
                    style={[
                      styles.audienceChipText,
                      audience === item && styles.audienceChipTextActive,
                    ]}
                  >
                    {item}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Title Input */}
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Title</Text>
            <View style={styles.inputContainer}>
              <MaterialIcons name="title" size={18} color="#9CA3AF" />
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="Notification title..."
                placeholderTextColor="#9CA3AF"
                style={styles.input}
              />
            </View>
          </View>

          {/* Message Input */}
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Message</Text>
            <View style={[styles.inputContainer, styles.messageInputContainer]}>
              <MaterialIcons name="message" size={18} color="#9CA3AF" />
              <TextInput
                value={body}
                onChangeText={setBody}
                placeholder="Notification message..."
                placeholderTextColor="#9CA3AF"
                style={[styles.input, styles.messageInput]}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* Customer Selection */}
          {audience === "CUSTOMER" && (
            <View style={styles.customerSection}>
              <Text style={styles.inputLabel}>Target Customer</Text>
              <Text style={styles.helperText}>
                Leave empty to notify all customers
              </Text>

              {/* Customer Search */}
              <View style={styles.inputContainer}>
                <MaterialIcons name="search" size={18} color="#9CA3AF" />
                <TextInput
                  value={customerSearch}
                  onChangeText={(text) => {
                    setCustomerSearch(text);
                    setShowCustomerResults(true);
                    if (!text) setSelectedCustomerId("");
                  }}
                  placeholder="Search by name or phone"
                  placeholderTextColor="#9CA3AF"
                  style={styles.input}
                />
              </View>

              {/* Selected Customer */}
              {selectedCustomer && (
                <View style={styles.selectedCustomerCard}>
                  <View style={styles.selectedCustomerInfo}>
                    <View style={[styles.customerAvatar, { backgroundColor: `${Colors.primary}10` }]}>
                      <Text style={styles.customerInitial}>
                        {selectedCustomer.name?.charAt(0).toUpperCase() || "?"}
                      </Text>
                    </View>
                    <View style={styles.selectedCustomerDetails}>
                      <Text style={styles.selectedCustomerName}>{selectedCustomer.name}</Text>
                      <View style={styles.selectedCustomerMeta}>
                        {selectedCustomer.mobileNumber && (
                          <View style={styles.metaItem}>
                            <MaterialIcons name="phone" size={10} color="#6B7280" />
                            <Text style={styles.metaItemText}>{selectedCustomer.mobileNumber}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                  <Pressable onPress={handleClearCustomer} style={styles.clearCustomerBtn}>
                    <MaterialIcons name="close" size={16} color="#6B7280" />
                  </Pressable>
                </View>
              )}

              {/* Search Results */}
              {showCustomerResults && customerSearch.trim() && filteredCustomers.length > 0 && (
                <View style={styles.customerResults}>
                  {filteredCustomers.map((customer: any) => (
                    <Pressable
                      key={customer._id}
                      style={styles.customerResultItem}
                      onPress={() => handleCustomerSelect(customer)}
                    >
                      <View style={[styles.resultAvatar, { backgroundColor: `${Colors.primary}10` }]}>
                        <Text style={styles.resultInitial}>
                          {customer.name?.charAt(0).toUpperCase() || "?"}
                        </Text>
                      </View>
                      <View style={styles.resultInfo}>
                        <Text style={styles.resultName}>{customer.name}</Text>
                        <View style={styles.resultMeta}>
                          {customer.mobileNumber && (
                            <Text style={styles.resultMetaText}>{customer.mobileNumber}</Text>
                          )}
                        </View>
                      </View>
                    </Pressable>
                  ))}
                </View>
              )}

              {showCustomerResults && customerSearch.trim() && filteredCustomers.length === 0 && (
                <View style={styles.noResults}>
                  <MaterialIcons name="search-off" size={24} color="#9CA3AF" />
                  <Text style={styles.noResultsText}>No customers found</Text>
                </View>
              )}
            </View>
          )}

          {/* Product Status Tag */}
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Product Status Tag (Optional)</Text>
            <View style={styles.inputContainer}>
              <MaterialIcons name="label" size={18} color="#9CA3AF" />
              <TextInput
                value={productStatusTag}
                onChangeText={setProductStatusTag as any}
                placeholder="e.g., READY, GERMINATED, PAYMENT_PENDING"
                placeholderTextColor="#9CA3AF"
                style={styles.input}
              />
            </View>
          </View>

          {/* Send Button */}
          <Pressable
            style={({ pressed }) => [
              styles.sendButton,
              (!title.trim() || !body.trim()) && styles.sendButtonDisabled,
              pressed && styles.sendButtonPressed,
            ]}
            onPress={() => createMutation.mutate()}
            disabled={!title.trim() || !body.trim() || createMutation.isPending}
          >
            <LinearGradient
              colors={[Colors.primary, Colors.primaryLight || Colors.primary]}
              style={styles.sendButtonGradient}
            >
              {createMutation.isPending ? (
                <Text style={styles.sendButtonText}>Sending...</Text>
              ) : (
                <>
                  <MaterialIcons name="send" size={18} color={Colors.white} />
                  <Text style={styles.sendButtonText}>
                    {audience === "CUSTOMER" && selectedCustomerId
                      ? "Send Targeted Notification"
                      : "Send Broadcast"}
                  </Text>
                </>
              )}
            </LinearGradient>
          </Pressable>
        </View>

        {/* Reminder Settings Card */}
        <View style={styles.reminderCard}>
          <View style={styles.reminderHeader}>
            <View style={styles.reminderIconContainer}>
              <MaterialIcons name="repeat" size={20} color={Colors.primary} />
            </View>
            <View style={styles.reminderTitleContainer}>
              <Text style={styles.reminderTitle}>Due Reminder Cadence</Text>
              <Text style={styles.reminderSubtitle}>Set interval in days for automatic due reminders</Text>
            </View>
          </View>

          <View style={styles.reminderInputContainer}>
            <View style={styles.reminderInputWrapper}>
              <TextInput
                value={reminderEveryDays}
                onChangeText={setReminderEveryDays}
                placeholder="Days"
                keyboardType="numeric"
                style={styles.reminderInput}
                placeholderTextColor="#9CA3AF"
              />
              <Text style={styles.reminderInputSuffix}>days</Text>
            </View>
            <Pressable
              style={({ pressed }) => [
                styles.reminderSaveButton,
                pressed && styles.reminderSaveButtonPressed,
              ]}
              onPress={() => configMutation.mutate()}
            >
              <LinearGradient
                colors={[Colors.success, "#059669"]}
                style={styles.reminderSaveGradient}
              >
                <Text style={styles.reminderSaveText}>Save</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </View>

        {/* Notification History */}
        <View style={styles.historySection}>
          <View style={styles.historyHeader}>
            <Text style={styles.historyTitle}>Notification History</Text>
            <Text style={styles.historyCount}>{notifications.length} total</Text>
          </View>

          {notifications.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconContainer}>
                <LinearGradient
                  colors={["#F3F4F6", "#F9FAFB"]}
                  style={styles.emptyIconGradient}
                >
                  <MaterialIcons name="notifications-none" size={48} color="#9CA3AF" />
                </LinearGradient>
              </View>
              <Text style={styles.emptyTitle}>No Notifications Yet</Text>
              <Text style={styles.emptyText}>
                Notifications sent to customers and staff will appear here
              </Text>
            </View>
          ) : (
            notifications.map((notification) => (
              <NotificationCard key={notification.id} notification={notification} />
            ))
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
  headerTitle: {
    fontSize: 24,
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
  },
  headerDangerBtn: {
    backgroundColor: "transparent",
    borderColor: "rgba(255,255,255,0.3)",
  },
  headerIconBtnPressed: {
    backgroundColor: "rgba(255,255,255,0.1)",
    transform: [{ scale: 0.95 }],
  },

  // Stats Card
  statsWrapper: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  statsCard: {
    borderRadius: 20,
    padding: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    backgroundColor: "rgba(255,255,255,0.9)",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
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
    gap: 8,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  statInfo: {
    flex: 1,
  },
  statNumber: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 10,
    color: "#6B7280",
    fontWeight: "500",
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: "#E5E7EB",
    marginHorizontal: 8,
  },

  // Scroll Content
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: BOTTOM_NAV_HEIGHT + 20,
    gap: 16,
  },

  // Composer Card
  composerCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },

  // Audience Section
  audienceSection: {
    marginBottom: 16,
  },
  audienceRow: {
    flexDirection: "row",
    gap: 8,
  },
  audienceChip: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
    alignItems: "center",
  },
  audienceChipActive: {
    borderColor: Colors.primary,
    backgroundColor: `${Colors.primary}10`,
  },
  audienceChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
  },
  audienceChipTextActive: {
    color: Colors.primary,
  },

  // Input Sections
  inputSection: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 6,
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 12,
    height: 48,
    gap: 8,
  },
  messageInputContainer: {
    height: "auto",
    minHeight: 80,
    alignItems: "flex-start",
    paddingVertical: 12,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: "#111827",
    padding: 0,
  },
  messageInput: {
    height: 60,
    textAlignVertical: "top",
  },
  helperText: {
    fontSize: 11,
    color: "#6B7280",
    marginBottom: 8,
    marginLeft: 4,
  },

  // Customer Section
  customerSection: {
    marginBottom: 16,
  },
  selectedCustomerCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: `${Colors.primary}10`,
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: `${Colors.primary}20`,
  },
  selectedCustomerInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  customerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  customerInitial: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.primary,
  },
  selectedCustomerDetails: {
    flex: 1,
  },
  selectedCustomerName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  selectedCustomerMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaItemText: {
    fontSize: 10,
    color: "#6B7280",
  },
  clearCustomerBtn: {
    padding: 4,
  },
  customerResults: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginTop: 8,
    overflow: "hidden",
  },
  customerResultItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  resultAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  resultInitial: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.primary,
  },
  resultInfo: {
    flex: 1,
  },
  resultName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 2,
  },
  resultMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  resultMetaText: {
    fontSize: 10,
    color: "#6B7280",
  },
  resultMetaDot: {
    fontSize: 10,
    color: "#9CA3AF",
  },
  noResults: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    marginTop: 8,
    gap: 8,
  },
  noResultsText: {
    fontSize: 12,
    color: "#6B7280",
  },

  // Send Button
  sendButton: {
    borderRadius: 12,
    overflow: "hidden",
    marginTop: 8,
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
    paddingVertical: 14,
    gap: 8,
  },
  sendButtonText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: "600",
  },

  // Reminder Card
  reminderCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  reminderHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  reminderIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${Colors.primary}10`,
    alignItems: "center",
    justifyContent: "center",
  },
  reminderTitleContainer: {
    flex: 1,
  },
  reminderTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 2,
  },
  reminderSubtitle: {
    fontSize: 11,
    color: "#6B7280",
  },
  reminderInputContainer: {
    flexDirection: "row",
    gap: 12,
  },
  reminderInputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 14,
    height: 48,
  },
  reminderInput: {
    flex: 1,
    fontSize: 14,
    color: "#111827",
    padding: 0,
  },
  reminderInputSuffix: {
    fontSize: 14,
    color: "#6B7280",
    marginLeft: 4,
  },
  reminderSaveButton: {
    width: 80,
    height: 48,
    borderRadius: 12,
    overflow: "hidden",
  },
  reminderSaveButtonPressed: {
    transform: [{ scale: 0.96 }],
  },
  reminderSaveGradient: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  reminderSaveText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: "600",
  },

  // History Section
  historySection: {
    marginTop: 8,
  },
  historyHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  historyCount: {
    fontSize: 12,
    color: "#6B7280",
  },

  // Notification Card
  notificationCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 4,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  notificationHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  notificationHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  notificationIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  notificationInfo: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  notificationMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  notificationTime: {
    fontSize: 10,
    color: "#9CA3AF",
  },
  audienceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  audienceBadgeText: {
    fontSize: 10,
    fontWeight: "600",
  },
  notificationBody: {
    fontSize: 13,
    color: "#374151",
    lineHeight: 18,
    marginBottom: 10,
  },
  notificationDetails: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  detailChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  detailChipText: {
    fontSize: 10,
    color: "#4B5563",
  },

  // Empty State
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    paddingHorizontal: 20,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 16,
    overflow: "hidden",
  },
  emptyIconGradient: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 18,
    paddingHorizontal: 20,
  },
});
