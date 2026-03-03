import { MaterialIcons } from "@expo/vector-icons";
import { useMutation, useQuery } from "@tanstack/react-query";
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
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import FixedHeader from "../../components/common/FixedHeader";
import { NurseryService } from "../../services/nursery.service";
import {
  SoftDeleteService,
  SoftDeletedAuditRow,
  SoftDeletedCollectionItem,
} from "../../services/soft-delete.service";
import { Colors } from "../../theme";

const BOTTOM_NAV_HEIGHT = 80;
const COLLECTION_FILTERS = [
  "ALL",
  "users",
  "nurseries",
  "customers",
  "expenses",
  "plantTypes",
  "seeds",
] as const;
type CollectionFilter = (typeof COLLECTION_FILTERS)[number];

const formatDateTime = (value?: string) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";

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

const getEntityIcon = (entityType?: string) => {
  switch (entityType?.toLowerCase()) {
    case "user":
      return "person";
    case "nursery":
      return "store";
    case "inventory":
      return "inventory";
    case "sale":
      return "receipt";
    case "seed":
      return "grass";
    case "plant":
      return "spa";
    default:
      return "delete";
  }
};

const getCollectionLabel = (value: string) =>
  value === "plantTypes"
    ? "Plant Types"
    : value.charAt(0).toUpperCase() + value.slice(1);

const getSafeEntityLabel = (record: SoftDeletedAuditRow) =>
  record.entityName?.trim() || `${record.entityType} record`;

const getAuditActor = (record: SoftDeletedAuditRow) =>
  record.deletedBy?.trim() ||
  (typeof record.metadata?.actorName === "string"
    ? record.metadata.actorName
    : "") ||
  "System";

const getAuditAction = (record: SoftDeletedAuditRow) => {
  const rawAction =
    typeof record.metadata?.action === "string"
      ? record.metadata.action
      : "SOFT_DELETED";
  const normalized = rawAction.toUpperCase();
  if (normalized.includes("SOFT_DELETED")) return "deleted";
  if (normalized.includes("DELETED")) return "removed";
  if (normalized.includes("UPDATED")) return "updated";
  if (normalized.includes("CREATED")) return "created";
  return "changed";
};

const getAuditSummary = (record: SoftDeletedAuditRow) =>
  `${getAuditActor(record)} ${getAuditAction(record)} ${getSafeEntityLabel(
    record,
  )}`;

// ==================== STATS CARD ====================

interface StatsCardProps {
  totalRecords: number;
  entityTypes: number;
  oldestRecord: string;
  newestRecord: string;
}

const StatsCard = ({
  totalRecords,
  entityTypes,
  oldestRecord,
  newestRecord,
}: StatsCardProps) => (
  <View style={styles.statsCard}>
    <View style={styles.statsRow}>
      <View style={styles.statItem}>
        <View
          style={[styles.statIcon, { backgroundColor: `${Colors.primary}10` }]}
        >
          <MaterialIcons name="delete" size={16} color={Colors.primary} />
        </View>
        <View style={styles.statInfo}>
          <Text style={styles.statNumber}>{totalRecords}</Text>
          <Text style={styles.statLabel}>Records</Text>
        </View>
      </View>

      <View style={styles.statDivider} />

      <View style={styles.statItem}>
        <View
          style={[styles.statIcon, { backgroundColor: `${Colors.info}10` }]}
        >
          <MaterialIcons name="category" size={16} color={Colors.info} />
        </View>
        <View style={styles.statInfo}>
          <Text style={styles.statNumber}>{entityTypes}</Text>
          <Text style={styles.statLabel}>Entity Types</Text>
        </View>
      </View>
    </View>
  </View>
);

// ==================== NURSERY SELECTOR ====================

interface NurserySelectorProps {
  nurseries: { id: string; name: string }[];
  selectedId?: string;
  onSelect: (id?: string) => void;
}

const NurserySelector = ({
  nurseries,
  selectedId,
  onSelect,
}: NurserySelectorProps) => (
  <View style={styles.selectorCard}>
    <View style={styles.selectorHeader}>
      <MaterialIcons name="store" size={18} color={Colors.primary} />
      <Text style={styles.selectorTitle}>Select Nursery</Text>
    </View>

    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.selectorScroll}
    >
      <Pressable
        style={[
          styles.nurseryChip,
          !selectedId && styles.nurseryChipSelected,
        ]}
        onPress={() => onSelect(undefined)}
      >
        <Text
          style={[
            styles.nurseryChipText,
            !selectedId && styles.nurseryChipTextSelected,
          ]}
          numberOfLines={1}
        >
          All Nurseries
        </Text>
        {!selectedId && (
          <MaterialIcons
            name="check-circle"
            size={14}
            color={Colors.primary}
          />
        )}
      </Pressable>
      {nurseries.map((nursery) => {
        const isSelected = nursery.id === selectedId;
        return (
          <Pressable
            key={nursery.id}
            style={[
              styles.nurseryChip,
              isSelected && styles.nurseryChipSelected,
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
  </View>
);

// ==================== AUDIT CARD ====================

interface AuditCardProps {
  record: SoftDeletedAuditRow;
}

const AuditCard = ({ record }: AuditCardProps) => {
  const icon = getEntityIcon(record.entityType);
  const isExpired = record.purgeAt && new Date(record.purgeAt) < new Date();

  return (
    <View style={[styles.auditCard, isExpired && styles.auditCardExpired]}>
      <View style={styles.auditHeader}>
        <View style={styles.auditHeaderLeft}>
          <View
            style={[styles.auditIcon, { backgroundColor: `${Colors.error}10` }]}
          >
            <MaterialIcons name={icon as any} size={18} color={Colors.error} />
          </View>
          <View style={styles.auditTitleContainer}>
            <Text style={styles.auditEntityType}>{record.entityType}</Text>
            <Text style={styles.auditEntityName} numberOfLines={1}>
              {getSafeEntityLabel(record)}
            </Text>
          </View>
        </View>
        {isExpired && (
          <View
            style={[
              styles.expiredBadge,
              { backgroundColor: `${Colors.error}10` },
            ]}
          >
            <MaterialIcons name="warning" size={12} color={Colors.error} />
            <Text style={styles.expiredBadgeText}>Expired</Text>
          </View>
        )}
      </View>

      <View style={styles.actionSummary}>
        <MaterialIcons
          name="history-toggle-off"
          size={14}
          color={Colors.primary}
        />
        <Text style={styles.actionSummaryText}>{getAuditSummary(record)}</Text>
      </View>

      <View style={styles.auditDetails}>
        <View style={styles.auditDetailRow}>
          <MaterialIcons name="access-time" size={12} color="#9CA3AF" />
          <Text style={styles.auditDetailLabel}>Deleted:</Text>
          <Text style={styles.auditDetailValue}>
            {formatDateTime(record.deletedAt)}
          </Text>
        </View>

        <View style={styles.auditDetailRow}>
          <MaterialIcons name="update" size={12} color="#9CA3AF" />
          <Text style={styles.auditDetailLabel}>Purge:</Text>
          <Text
            style={[
              styles.auditDetailValue,
              isExpired && { color: Colors.error },
            ]}
          >
            {formatDateTime(record.purgeAt)}
          </Text>
        </View>

        <View style={styles.auditDetailRow}>
          <MaterialIcons name="person" size={12} color="#9CA3AF" />
          <Text style={styles.auditDetailLabel}>Performed By:</Text>
          <Text style={styles.auditDetailValue}>
            {getAuditActor(record)}
          </Text>
        </View>
      </View>
    </View>
  );
};

interface CollectionItemCardProps {
  item: SoftDeletedCollectionItem;
  onDelete: (item: SoftDeletedCollectionItem) => void;
  isDeleting: boolean;
}

const CollectionItemCard = ({
  item,
  onDelete,
  isDeleting,
}: CollectionItemCardProps) => (
  <View style={styles.collectionItemCard}>
    <View style={styles.collectionItemHeader}>
      <View style={styles.collectionItemBadge}>
        <Text style={styles.collectionItemBadgeText}>
          {getCollectionLabel(item.collection)}
        </Text>
      </View>
      <Pressable
        style={({ pressed }) => [
          styles.deleteOneButton,
          pressed && styles.deleteOneButtonPressed,
          isDeleting && styles.deleteOneButtonDisabled,
        ]}
        onPress={() => onDelete(item)}
        disabled={isDeleting}
      >
        {isDeleting ? (
          <ActivityIndicator size="small" color={Colors.error} />
        ) : (
          <>
            <MaterialIcons name="delete-forever" size={14} color={Colors.error} />
            <Text style={styles.deleteOneText}>Permanent Delete</Text>
          </>
        )}
      </Pressable>
    </View>
    <Text style={styles.collectionItemTitle} numberOfLines={1}>
      {item.entityLabel || item.id}
    </Text>
    <Text style={styles.collectionItemMeta}>
      Deleted: {formatDateTime(item.deletedAt)}
    </Text>
  </View>
);

// ==================== MAIN COMPONENT ====================

export default function SuperAdminAuditLogsScreen() {
  const [nurseryId, setNurseryId] = useState<string | undefined>(undefined);
  const [collectionFilter, setCollectionFilter] =
    useState<CollectionFilter>("ALL");
  const [refreshing, setRefreshing] = useState(false);

  const { data: nurseries = [], isLoading: loadingNurseries } = useQuery({
    queryKey: ["super-admin", "nurseries", "audit-selector"],
    queryFn: () => NurseryService.list(),
  });

  const { data, isLoading, refetch, isRefetching } = useQuery<
    SoftDeletedAuditRow[]
  >({
    queryKey: ["audit-logs", "super-admin", nurseryId],
    queryFn: () => SoftDeleteService.listAuditLogs({ nurseryId }),
    enabled: true,
  });

  const {
    data: collectionItems,
    isLoading: loadingCollectionItems,
    refetch: refetchCollectionItems,
    isRefetching: isRefetchingCollectionItems,
  } = useQuery<SoftDeletedCollectionItem[]>({
    queryKey: ["soft-deleted-items", nurseryId, collectionFilter],
    queryFn: () =>
      SoftDeleteService.listCollectionItems({
        nurseryId,
        collection:
          collectionFilter === "ALL"
            ? undefined
            : (collectionFilter as SoftDeletedCollectionItem["collection"]),
        limit: 200,
      }),
    enabled: true,
  });

  const selectedNursery = useMemo(
    () => nurseries.find((n: { id: string }) => n.id === nurseryId),
    [nurseries, nurseryId],
  );

  // Calculate stats
  const stats = useMemo(() => {
    const records = data || [];
    const entityTypes = new Set(records.map((r) => r.entityType)).size;
    const dates = records
      .map((r) => r.deletedAt)
      .filter(Boolean)
      .sort();
    const oldestRecord = dates.length > 0 ? formatDateTime(dates[0]) : "—";
    const newestRecord =
      dates.length > 0 ? formatDateTime(dates[dates.length - 1]) : "—";

    return {
      totalRecords: records.length,
      entityTypes,
      oldestRecord,
      newestRecord,
    };
  }, [data]);

  const purgeMutation = useMutation({
    mutationFn: () =>
      SoftDeleteService.purgeExpired({ nurseryId, retentionDays: 30 }),
    onSuccess: async () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        "✅ Cleanup Started",
        "30-day cleanup has started for soft-deleted items and their audit logs.",
        [{ text: "OK" }],
      );
      await Promise.all([refetch(), refetchCollectionItems()]);
    },
    onError: (err: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        "❌ Failed",
        err?.message || "Unable to start cleanup for selected nursery.",
      );
    },
  });

  const clearLogsMutation = useMutation({
    mutationFn: () =>
      SoftDeleteService.clearAuditLogs({
        nurseryId,
      }),
    onSuccess: async (res: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const deletedCount = Number(res?.data?.deletedCount ?? res?.deletedCount ?? 0);
      Alert.alert("✅ Logs Cleared", `${deletedCount} log${deletedCount === 1 ? "" : "s"} removed.`);
      await refetch();
    },
    onError: (err: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("❌ Failed", err?.message || "Unable to clear audit logs.");
    },
  });

  const hardDeleteMutation = useMutation({
    mutationFn: (item: SoftDeletedCollectionItem) =>
      SoftDeleteService.hardDeleteItems({
        collection: item.collection,
        ids: [item.id],
        nurseryId,
      }),
    onSuccess: async () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await Promise.all([refetchCollectionItems(), refetch()]);
    },
    onError: (err: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("❌ Failed", err?.message || "Unable to permanently delete item.");
    },
  });

  const hardDeleteFilteredMutation = useMutation({
    mutationFn: async () => {
      if (!collectionItems?.length) {
        throw new Error("No soft-deleted items found for current filter");
      }
      const grouped = new Map<string, string[]>();
      for (const item of collectionItems) {
        const list = grouped.get(item.collection) || [];
        list.push(item.id);
        grouped.set(item.collection, list);
      }
      for (const [collection, ids] of grouped.entries()) {
        await SoftDeleteService.hardDeleteItems({
          collection: collection as SoftDeletedCollectionItem["collection"],
          ids,
          nurseryId,
        });
      }
      return grouped.size;
    },
    onSuccess: async () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("✅ Deleted", "Filtered soft-deleted items permanently removed.");
      await Promise.all([refetchCollectionItems(), refetch()]);
    },
    onError: (err: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("❌ Failed", err?.message || "Unable to permanently delete filtered items.");
    },
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Promise.all([refetch(), refetchCollectionItems()]);
    setRefreshing(false);
  };

  if (loadingNurseries) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <FixedHeader
          title="Audit Logs"
          subtitle="Loading nurseries..."
        />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading nurseries...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <FixedHeader
        title="Audit Logs"
        subtitle="Track who deleted what across nurseries"
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={
              refreshing || isRefetching || isRefetchingCollectionItems
            }
            onRefresh={handleRefresh}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
      >
        {/* Nursery Selector */}
        <NurserySelector
          nurseries={nurseries}
          selectedId={nurseryId}
          onSelect={setNurseryId}
        />

        {/* Stats Card */}
        {data && data.length > 0 && (
          <StatsCard
            totalRecords={stats.totalRecords}
            entityTypes={stats.entityTypes}
            oldestRecord={stats.oldestRecord}
            newestRecord={stats.newestRecord}
          />
        )}

        {/* Cleanup Button */}
        <View style={styles.cleanupCard}>
            <View style={styles.cleanupInfo}>
              <MaterialIcons name="info" size={16} color={Colors.warning} />
              <Text style={styles.cleanupText}>
                Records older than 30 days in{" "}
                <Text style={styles.cleanupHighlight}>
                  {selectedNursery?.name || "all nurseries"}
                </Text>{" "}
                will be permanently deleted.
              </Text>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.cleanupButton,
                purgeMutation.isPending && styles.cleanupButtonDisabled,
                pressed && styles.cleanupButtonPressed,
              ]}
              onPress={() =>
                Alert.alert(
                  "⚠️ Run Cleanup",
                  `This will permanently delete records older than 30 days for ${selectedNursery?.name || "all nurseries"}. This action cannot be undone.`,
                  [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Run Cleanup",
                      onPress: () => purgeMutation.mutate(),
                      style: "destructive",
                    },
                  ],
                )
              }
              disabled={purgeMutation.isPending}
            >
              <LinearGradient
                colors={[Colors.warning, "#D97706"]}
                style={styles.cleanupGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {purgeMutation.isPending ? (
                  <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                  <>
                    <MaterialIcons
                      name="cleaning-services"
                      size={16}
                      color={Colors.white}
                    />
                    <Text style={styles.cleanupButtonText}>
                      Run Auto Cleanup
                    </Text>
                  </>
                )}
              </LinearGradient>
            </Pressable>
          </View>

        {/* Real Soft-Deleted Collection Items */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderLeft}>
              <MaterialIcons name="storage" size={18} color={Colors.primary} />
              <Text style={styles.sectionTitle}>Cleanup Queue</Text>
            </View>
            <Text style={styles.sectionCount}>
              {(collectionItems || []).length} items
            </Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.selectorScroll}
          >
            {COLLECTION_FILTERS.map((value) => {
              const selected = value === collectionFilter;
              return (
                <Pressable
                  key={value}
                  style={[
                    styles.nurseryChip,
                    selected && styles.nurseryChipSelected,
                  ]}
                  onPress={() => setCollectionFilter(value)}
                >
                  <Text
                    style={[
                      styles.nurseryChipText,
                      selected && styles.nurseryChipTextSelected,
                    ]}
                  >
                    {value === "ALL" ? "All Collections" : getCollectionLabel(value)}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <Pressable
            style={({ pressed }) => [
              styles.cleanupButton,
              hardDeleteFilteredMutation.isPending && styles.cleanupButtonDisabled,
              pressed && styles.cleanupButtonPressed,
            ]}
            onPress={() =>
              Alert.alert(
                "Permanent Delete",
                "Delete all soft-deleted items shown in current filter? This cannot be undone.",
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Delete All",
                    style: "destructive",
                    onPress: () => hardDeleteFilteredMutation.mutate(),
                  },
                ],
              )
            }
            disabled={
              hardDeleteFilteredMutation.isPending ||
              !(collectionItems || []).length
            }
          >
            <LinearGradient
              colors={[Colors.error, "#DC2626"]}
              style={styles.cleanupGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {hardDeleteFilteredMutation.isPending ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <>
                  <MaterialIcons
                    name="delete-forever"
                    size={16}
                    color={Colors.white}
                  />
                  <Text style={styles.cleanupButtonText}>
                    Delete Filtered Queue
                  </Text>
                </>
              )}
            </LinearGradient>
          </Pressable>

          {loadingCollectionItems ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.loadingSmallText}>
                Loading cleanup queue...
              </Text>
            </View>
          ) : !(collectionItems || []).length ? (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="inventory-2" size={48} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>Queue is Empty</Text>
              <Text style={styles.emptyMessage}>
                No soft-deleted documents found in selected collections.
              </Text>
            </View>
          ) : (
            <View style={styles.auditList}>
              {(collectionItems || []).map((item) => (
                <CollectionItemCard
                  key={`${item.collection}-${item.id}`}
                  item={item}
                  onDelete={(row) =>
                    Alert.alert(
                      "Permanent Delete",
                      `Delete ${row.entityLabel || row.id} from ${getCollectionLabel(row.collection)} permanently?`,
                      [
                        { text: "Cancel", style: "cancel" },
                        {
                          text: "Delete",
                          style: "destructive",
                          onPress: () => hardDeleteMutation.mutate(row),
                        },
                      ],
                    )
                  }
                  isDeleting={hardDeleteMutation.isPending}
                />
              ))}
            </View>
          )}
        </View>

        {/* Audit Logs List */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderLeft}>
              <MaterialIcons name="history" size={18} color={Colors.primary} />
              <Text style={styles.sectionTitle}>Deletion History</Text>
            </View>
            <View style={styles.sectionHeaderActions}>
              <Text style={styles.sectionCount}>{stats.totalRecords} items</Text>
              <Pressable
                style={({ pressed }) => [
                  styles.clearLogsButton,
                  pressed && styles.cleanupButtonPressed,
                ]}
                onPress={() =>
                  Alert.alert(
                    "Clear Logs",
                    "Permanently remove deletion history for current scope?",
                    [
                      { text: "Cancel", style: "cancel" },
                      {
                        text: "Clear Logs",
                        style: "destructive",
                        onPress: () => clearLogsMutation.mutate(),
                      },
                    ],
                  )
                }
                disabled={clearLogsMutation.isPending}
              >
                <MaterialIcons name="delete-forever" size={14} color={Colors.error} />
                <Text style={styles.clearLogsButtonText}>
                  {clearLogsMutation.isPending ? "Clearing..." : "Clear Logs"}
                </Text>
              </Pressable>
            </View>
          </View>

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.loadingSmallText}>Loading audit logs...</Text>
            </View>
          ) : !data?.length ? (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="delete-sweep" size={48} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>No Deleted Records</Text>
              <Text style={styles.emptyMessage}>
                No soft-deleted records found for this nursery.
              </Text>
            </View>
          ) : (
            <View style={styles.auditList}>
              {(data || []).map((row: SoftDeletedAuditRow) => (
                <AuditCard key={row.id} record={row} />
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

  // Center Container
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: "#6B7280",
  },

  // Content
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: BOTTOM_NAV_HEIGHT + 100,
    gap: 20,
  },

  // Stats Card
  statsCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
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
    gap: 12,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  statInfo: {
    flex: 1,
  },
  statNumber: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "500",
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: "#E5E7EB",
    marginHorizontal: 12,
  },

  // Nursery Selector
  selectorCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 12,
  },
  selectorHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  selectorTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  selectorScroll: {
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

  // Cleanup Card
  cleanupCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 12,
  },
  cleanupInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFFBEB",
    borderRadius: 10,
    padding: 10,
  },
  cleanupText: {
    flex: 1,
    fontSize: 12,
    color: "#374151",
  },
  cleanupHighlight: {
    fontWeight: "700",
    color: Colors.warning,
  },
  cleanupButton: {
    borderRadius: 12,
    overflow: "hidden",
  },
  cleanupButtonDisabled: {
    opacity: 0.5,
  },
  cleanupButtonPressed: {
    transform: [{ scale: 0.98 }],
  },
  cleanupGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 8,
  },
  cleanupButtonText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: "600",
  },

  // Section
  section: {
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
  sectionHeaderActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  clearLogsButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#FCA5A5",
    backgroundColor: "#FEF2F2",
  },
  clearLogsButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.error,
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
  loadingSmallText: {
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

  // Audit List
  auditList: {
    gap: 8,
  },
  auditCard: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 12,
  },
  auditCardExpired: {
    borderColor: Colors.error + "30",
    backgroundColor: "#FEF2F2",
  },
  auditHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  auditHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  auditIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  auditTitleContainer: {
    flex: 1,
  },
  auditEntityType: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 2,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  auditEntityName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  actionSummary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: -2,
    marginBottom: 2,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: `${Colors.primary}10`,
  },
  actionSummaryText: {
    flex: 1,
    fontSize: 12,
    color: "#1F2937",
    fontWeight: "500",
  },
  expiredBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  expiredBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: Colors.error,
  },
  auditDetails: {
    gap: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  auditDetailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  auditDetailLabel: {
    fontSize: 11,
    color: "#6B7280",
    width: 70,
  },
  auditDetailValue: {
    flex: 1,
    fontSize: 11,
    fontWeight: "500",
    color: "#111827",
  },
  collectionItemCard: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 8,
  },
  collectionItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  collectionItemBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: `${Colors.primary}10`,
  },
  collectionItemBadgeText: {
    fontSize: 10,
    color: Colors.primary,
    fontWeight: "700",
  },
  collectionItemTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  collectionItemMeta: {
    fontSize: 11,
    color: "#6B7280",
  },
  deleteOneButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#FEF2F2",
  },
  deleteOneButtonPressed: {
    transform: [{ scale: 0.97 }],
  },
  deleteOneButtonDisabled: {
    opacity: 0.6,
  },
  deleteOneText: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.error,
  },
});
