import { MaterialIcons } from "@expo/vector-icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
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

import StitchHeader from "../../components/common/StitchHeader";
import { SHARED_BOTTOM_NAV_HEIGHT } from "../../components/navigation/SharedBottomNav";
import { AdminTheme } from "../../components/admin/theme";
import { SoftDeleteService, SoftDeletedAuditRow } from "../../services/soft-delete.service";

const ENTITY_FILTERS = [
  "ALL",
  "Seed",
  "PlantType",
  "Inventory",
  "Sowing",
  "Germination",
  "Sale",
  "Customer",
  "User",
] as const;

type EntityFilter = (typeof ENTITY_FILTERS)[number];

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

const getEntityIcon = (entityType?: string) => {
  switch (entityType?.toLowerCase()) {
    case "seed":
      return "grass";
    case "planttype":
      return "spa";
    case "inventory":
      return "inventory";
    case "sowing":
      return "agriculture";
    case "germination":
      return "eco";
    case "sale":
      return "receipt";
    case "customer":
      return "person";
    case "user":
      return "badge";
    default:
      return "delete";
  }
};

const getSafeEntityLabel = (record: SoftDeletedAuditRow) =>
  record.entityName?.trim() || `${record.entityType} record`;

const getAuditActor = (record: SoftDeletedAuditRow) =>
  record.deletedBy?.trim() ||
  (typeof record.metadata?.actorName === "string" ? record.metadata.actorName : "") ||
  "System";

const getAuditAction = (record: SoftDeletedAuditRow) => {
  const rawAction =
    typeof record.metadata?.action === "string" ? record.metadata.action : "SOFT_DELETED";
  const normalized = rawAction.toUpperCase();
  if (normalized.includes("SOFT_DELETED")) return "deleted";
  if (normalized.includes("DELETED")) return "removed";
  if (normalized.includes("UPDATED")) return "updated";
  if (normalized.includes("CREATED")) return "created";
  return "changed";
};

const getAuditSummary = (record: SoftDeletedAuditRow) =>
  `${getAuditActor(record)} ${getAuditAction(record)} ${getSafeEntityLabel(record)}`;

const StatsCard = ({
  totalRecords,
  entityTypes,
  latestRecord,
}: {
  totalRecords: number;
  entityTypes: number;
  latestRecord?: string;
}) => (
  <View style={styles.statsCard}>
    <View style={styles.statsRow}>
      <View style={styles.statItem}>
        <View style={[styles.statIcon, { backgroundColor: `${AdminTheme.colors.primary}12` }]}>
          <MaterialIcons name="delete-outline" size={16} color={AdminTheme.colors.primary} />
        </View>
        <View style={styles.statInfo}>
          <Text style={styles.statNumber}>{totalRecords}</Text>
          <Text style={styles.statLabel}>Records</Text>
        </View>
      </View>

      <View style={styles.statDivider} />

      <View style={styles.statItem}>
        <View style={[styles.statIcon, { backgroundColor: "#DBEAFE" }]}>
          <MaterialIcons name="category" size={16} color="#2563EB" />
        </View>
        <View style={styles.statInfo}>
          <Text style={styles.statNumber}>{entityTypes}</Text>
          <Text style={styles.statLabel}>Types</Text>
        </View>
      </View>
    </View>
  </View>
);

const FilterCard = ({
  selected,
  onSelect,
  onClear,
}: {
  selected: EntityFilter;
  onSelect: (value: EntityFilter) => void;
  onClear: () => void;
}) => (
  <View style={styles.selectorCard}>
    <View style={styles.selectorHeader}>
      <View style={styles.selectorTitleRow}>
        <MaterialIcons name="filter-alt" size={18} color={AdminTheme.colors.primary} />
        <Text style={styles.selectorTitle}>Filter Entity Type</Text>
      </View>
      {selected !== "ALL" ? (
        <Pressable onPress={onClear} hitSlop={8}>
          <Text style={styles.clearText}>Clear</Text>
        </Pressable>
      ) : null}
    </View>

    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.selectorScroll}
    >
      {ENTITY_FILTERS.map((item) => {
        const isSelected = item === selected;
        return (
          <Pressable
            key={item}
            style={[styles.filterChip, isSelected && styles.filterChipSelected]}
            onPress={() => onSelect(item)}
          >
            <Text style={[styles.filterChipText, isSelected && styles.filterChipTextSelected]}>
              {item === "ALL" ? "All Logs" : item}
            </Text>
            {isSelected ? (
              <MaterialIcons name="check-circle" size={14} color={AdminTheme.colors.primary} />
            ) : null}
          </Pressable>
        );
      })}
    </ScrollView>
  </View>
);

const AuditCard = ({ record }: { record: SoftDeletedAuditRow }) => {
  const icon = getEntityIcon(record.entityType);
  const isExpired = record.purgeAt && new Date(record.purgeAt) < new Date();

  return (
    <View style={[styles.auditCard, isExpired && styles.auditCardExpired]}>
      <View style={styles.auditHeader}>
        <View style={styles.auditHeaderLeft}>
          <View style={[styles.auditIcon, { backgroundColor: `${AdminTheme.colors.danger}10` }]}>
            <MaterialIcons name={icon as any} size={18} color={AdminTheme.colors.danger} />
          </View>
          <View style={styles.auditTitleContainer}>
            <Text style={styles.auditEntityType}>{record.entityType}</Text>
            <Text style={styles.auditEntityName} numberOfLines={1}>
              {getSafeEntityLabel(record)}
            </Text>
          </View>
        </View>

        {isExpired ? (
          <View style={styles.expiredBadge}>
            <MaterialIcons name="warning" size={12} color={AdminTheme.colors.danger} />
            <Text style={styles.expiredBadgeText}>Expired</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.actionSummary}>
        <MaterialIcons name="history-toggle-off" size={14} color={AdminTheme.colors.primary} />
        <Text style={styles.actionSummaryText}>{getAuditSummary(record)}</Text>
      </View>

      <View style={styles.auditDetails}>
        <View style={styles.auditDetailRow}>
          <MaterialIcons name="access-time" size={12} color="#9CA3AF" />
          <Text style={styles.auditDetailLabel}>Deleted:</Text>
          <Text style={styles.auditDetailValue}>{formatDateTime(record.deletedAt)}</Text>
        </View>
        <View style={styles.auditDetailRow}>
          <MaterialIcons name="person-outline" size={12} color="#9CA3AF" />
          <Text style={styles.auditDetailLabel}>Actor:</Text>
          <Text style={styles.auditDetailValue}>{getAuditActor(record)}</Text>
        </View>
        <View style={styles.auditDetailRow}>
          <MaterialIcons name="event-busy" size={12} color="#9CA3AF" />
          <Text style={styles.auditDetailLabel}>Purge:</Text>
          <Text
            style={[
              styles.auditDetailValue,
              isExpired ? { color: AdminTheme.colors.danger } : undefined,
            ]}
          >
            {formatDateTime(record.purgeAt)}
          </Text>
        </View>
      </View>
    </View>
  );
};

const EmptyState = ({ hasFilter }: { hasFilter: boolean }) => (
  <View style={styles.emptyState}>
    <View style={styles.emptyIconWrap}>
      <MaterialIcons name="delete-sweep" size={42} color="#9CA3AF" />
    </View>
    <Text style={styles.emptyTitle}>No Audit Logs Found</Text>
    <Text style={styles.emptyText}>
      {hasFilter
        ? "No soft-delete audit logs matched the selected entity filter."
        : "Deleted records and their activity trail will appear here."}
    </Text>
  </View>
);

export default function AdminAuditLogsScreen() {
  const router = useRouter();
  const [entityFilter, setEntityFilter] = useState<EntityFilter>("ALL");

  const queryParams = useMemo(
    () => ({
      entityType: entityFilter === "ALL" ? undefined : entityFilter,
      limit: 100,
    }),
    [entityFilter],
  );

  const logsQuery = useQuery({
    queryKey: ["admin-soft-delete-audit", queryParams],
    queryFn: () => SoftDeleteService.listAuditLogs(queryParams),
  });

  const clearMutation = useMutation({
    mutationFn: () =>
      SoftDeleteService.clearAuditLogs({
        entityType: entityFilter === "ALL" ? undefined : entityFilter,
      }),
    onSuccess: async () => {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await logsQuery.refetch();
      Alert.alert("Logs Cleared", "Matching soft-delete audit logs were cleared successfully.");
    },
    onError: async (err: any) => {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Unable to Clear Logs", err?.message || "Please try again.");
    },
  });

  const rows = useMemo(() => logsQuery.data ?? [], [logsQuery.data]);
  const stats = useMemo(() => {
    const entityTypes = new Set(rows.map((row) => row.entityType)).size;
    const latestRecord = rows[0]?.deletedAt;
    return {
      totalRecords: rows.length,
      entityTypes,
      latestRecord,
    };
  }, [rows]);

  return (
    <SafeAreaView style={styles.container} edges={["left", "right"]}>
      <StitchHeader
        title="Audit Logs"
        subtitle="Deleted records and recovery trail"
        onBackPress={() => router.back()}
        actions={
          <Pressable
            style={styles.headerAction}
            onPress={() => logsQuery.refetch()}
          >
            <MaterialIcons
              name={logsQuery.isRefetching ? "sync" : "refresh"}
              size={18}
              color={AdminTheme.colors.surface}
            />
          </Pressable>
        }
      />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={logsQuery.isRefetching}
            onRefresh={() => logsQuery.refetch()}
            tintColor={AdminTheme.colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {logsQuery.isLoading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={AdminTheme.colors.primary} />
            <Text style={styles.loadingText}>Loading audit logs…</Text>
          </View>
        ) : (
          <>
            <LinearGradient
              colors={[AdminTheme.colors.primary, AdminTheme.colors.primaryDark || "#15803D"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroCard}
            >
              <View style={styles.heroTopRow}>
                <View style={styles.heroBadge}>
                  <MaterialIcons name="policy" size={14} color={AdminTheme.colors.surface} />
                  <Text style={styles.heroBadgeText}>Recovery Trail</Text>
                </View>
                <View style={styles.heroPill}>
                  <MaterialIcons name="shield" size={14} color={AdminTheme.colors.surface} />
                  <Text style={styles.heroPillText}>Admin View</Text>
                </View>
              </View>
              <Text style={styles.heroTitle}>Track every soft-deleted record in one place</Text>
              <Text style={styles.heroSubtitle}>
                Review deletion history, confirm who made the change, and clear stale entries when
                needed.
              </Text>
            </LinearGradient>

            <StatsCard
              totalRecords={stats.totalRecords}
              entityTypes={stats.entityTypes}
              latestRecord={stats.latestRecord}
            />

            <FilterCard
              selected={entityFilter}
              onSelect={setEntityFilter}
              onClear={() => setEntityFilter("ALL")}
            />

            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={styles.sectionEyebrow}>Activity Feed</Text>
                <Text style={styles.sectionHeading}>Soft Delete Activity</Text>
              </View>
              {rows.length > 0 ? (
                <Pressable
                  onPress={() => {
                    Alert.alert(
                      "Clear Audit Logs",
                      "This will remove the visible soft-delete audit logs. Continue?",
                      [
                        { text: "Cancel", style: "cancel" },
                        {
                          text: clearMutation.isPending ? "Clearing..." : "Clear",
                          style: "destructive",
                          onPress: () => clearMutation.mutate(),
                        },
                      ],
                    );
                  }}
                  disabled={clearMutation.isPending}
                >
                  <Text style={styles.clearLogsText}>
                    {clearMutation.isPending ? "Clearing..." : "Clear Logs"}
                  </Text>
                </Pressable>
              ) : null}
            </View>

            {rows.length === 0 ? (
              <EmptyState hasFilter={entityFilter !== "ALL"} />
            ) : (
              rows.map((record) => <AuditCard key={record.id} record={record} />)
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7FAFC",
  },
  content: {
    padding: 20,
    paddingBottom: SHARED_BOTTOM_NAV_HEIGHT + 24,
    gap: 14,
  },
  heroCard: {
    borderRadius: 24,
    padding: 20,
    gap: 12,
    overflow: "hidden",
  },
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  heroBadgeText: {
    color: AdminTheme.colors.surface,
    fontSize: 12,
    fontWeight: "700",
  },
  heroPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  heroPillText: {
    color: AdminTheme.colors.surface,
    fontSize: 12,
    fontWeight: "700",
  },
  heroTitle: {
    color: AdminTheme.colors.surface,
    fontSize: 22,
    lineHeight: 30,
    fontWeight: "800",
    maxWidth: "92%",
  },
  heroSubtitle: {
    color: "rgba(255,255,255,0.86)",
    fontSize: 13,
    lineHeight: 20,
    maxWidth: "95%",
  },
  headerAction: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.18)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
  },
  loadingWrap: {
    paddingVertical: 80,
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    color: "#6B7280",
    fontSize: 15,
  },
  statsCard: {
    backgroundColor: AdminTheme.colors.surface,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    ...AdminTheme.shadow.card,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  statItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  statIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  statInfo: {
    flex: 1,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
  },
  statLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 34,
    backgroundColor: "#E5E7EB",
    marginHorizontal: 10,
  },
  latestRow: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  latestText: {
    fontSize: 12,
    color: "#6B7280",
  },
  selectorCard: {
    backgroundColor: AdminTheme.colors.surface,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    ...AdminTheme.shadow.card,
  },
  selectorHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  selectorTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  selectorTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  clearText: {
    fontSize: 12,
    fontWeight: "700",
    color: AdminTheme.colors.primary,
  },
  selectorScroll: {
    gap: 10,
    paddingRight: 12,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
  },
  filterChipSelected: {
    borderColor: "#BFDBFE",
    backgroundColor: "#EFF6FF",
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#374151",
  },
  filterChipTextSelected: {
    color: AdminTheme.colors.primary,
  },
  sectionHeaderRow: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionEyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: AdminTheme.colors.primary,
    marginBottom: 4,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
  },
  clearLogsText: {
    fontSize: 12,
    fontWeight: "700",
    color: AdminTheme.colors.danger,
  },
  auditCard: {
    backgroundColor: AdminTheme.colors.surface,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    ...AdminTheme.shadow.card,
  },
  auditCardExpired: {
    borderColor: "#FECACA",
    backgroundColor: "#FFFBFB",
  },
  auditHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  auditHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  auditIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  auditTitleContainer: {
    flex: 1,
  },
  auditEntityType: {
    fontSize: 11,
    fontWeight: "700",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  auditEntityName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    marginTop: 4,
  },
  expiredBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "#FEE2E2",
  },
  expiredBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: AdminTheme.colors.danger,
  },
  actionSummary: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  actionSummaryText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: "#374151",
  },
  auditDetails: {
    marginTop: 12,
    gap: 8,
  },
  auditDetailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  auditDetailLabel: {
    fontSize: 12,
    color: "#6B7280",
    minWidth: 48,
  },
  auditDetailValue: {
    flex: 1,
    fontSize: 12,
    color: "#111827",
  },
  emptyState: {
    backgroundColor: AdminTheme.colors.surface,
    borderRadius: 20,
    paddingVertical: 40,
    paddingHorizontal: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  emptyIconWrap: {
    width: 78,
    height: 78,
    borderRadius: 39,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
  },
  emptyText: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 22,
    color: "#6B7280",
    textAlign: "center",
  },
});
