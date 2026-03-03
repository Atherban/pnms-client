import { MaterialIcons } from "@expo/vector-icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useMemo, useState, useCallback } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Platform,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  FadeInDown,
  FadeInUp,
  Layout,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import FixedHeader from "../../components/common/FixedHeader";
import { SoftDeleteService, SoftDeletedAuditRow } from "../../services/soft-delete.service";
import { useAuthStore } from "../../stores/auth.store";
import { Colors } from "../../theme";

const BOTTOM_NAV_HEIGHT = 80;

// ==================== TYPES ====================

type EntityType = "Seed" | "PlantType" | "Inventory" | "Sowing" | "Germination" | "Sale" | "Customer" | "User" | "ALL";

interface FilterState {
  entityType: EntityType;
  dateRange: "ALL" | "TODAY" | "WEEK" | "MONTH";
  deletedBy: "ALL" | "USER" | "SYSTEM";
}

// ==================== UTILITIES ====================

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
    })}`;
  } else if (d.toDateString() === yesterday.toDateString()) {
    return `Yesterday, ${d.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  }
  
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatDateOnly = (value?: string) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getEntityIcon = (entityType: string) => {
  switch (entityType) {
    case "Seed": return "grass";
    case "PlantType": return "spa";
    case "Inventory": return "inventory";
    case "Sowing": return "agriculture";
    case "Germination": return "sprout";
    case "Sale": return "receipt";
    case "Customer": return "person";
    case "User": return "badge";
    default: return "delete";
  }
};

const getEntityColor = (entityType: string) => {
  switch (entityType) {
    case "Seed": return "#10B981";
    case "PlantType": return "#8B5CF6";
    case "Inventory": return "#3B82F6";
    case "Sowing": return "#F59E0B";
    case "Germination": return "#EC4899";
    case "Sale": return "#059669";
    case "Customer": return "#6366F1";
    case "User": return "#6B7280";
    default: return "#6B7280";
  }
};

const getSafeEntityLabel = (log: SoftDeletedAuditRow) =>
  log.entityName?.trim() || `${log.entityType} record`;

const getAuditActor = (log: SoftDeletedAuditRow) =>
  log.deletedBy?.trim() ||
  (typeof log.metadata?.actorName === "string" ? log.metadata.actorName : "") ||
  "System";

const getAuditAction = (log: SoftDeletedAuditRow) => {
  const rawAction =
    typeof log.metadata?.action === "string" ? log.metadata.action : "SOFT_DELETED";
  const normalized = rawAction.toUpperCase();
  if (normalized.includes("SOFT_DELETED")) return "deleted";
  if (normalized.includes("DELETED")) return "removed";
  if (normalized.includes("UPDATED")) return "updated";
  if (normalized.includes("CREATED")) return "created";
  return "changed";
};

const getAuditSummary = (log: SoftDeletedAuditRow) =>
  `${getAuditActor(log)} ${getAuditAction(log)} ${getSafeEntityLabel(log)}`;

// ==================== STATS CARD ====================

interface StatsCardProps {
  totalLogs: number;
  uniqueEntities: number;
  oldestLog: string;
  newestLog: string;
}

const StatsCard = ({ totalLogs, uniqueEntities, oldestLog, newestLog }: StatsCardProps) => (
  <BlurView intensity={80} tint="light" style={styles.statsCard}>
    <View style={styles.statsRow}>
      <View style={styles.statItem}>
        <View style={[styles.statIcon, { backgroundColor: `${Colors.primary}15` }]}>
          <MaterialIcons name="history" size={18} color={Colors.primary} />
        </View>
        <View style={styles.statInfo}>
          <Text style={styles.statNumber}>{totalLogs}</Text>
          <Text style={styles.statLabel}>Total Logs</Text>
        </View>
      </View>

      <View style={styles.statDivider} />

      <View style={styles.statItem}>
        <View style={[styles.statIcon, { backgroundColor: "#10B98115" }]}>
          <MaterialIcons name="category" size={18} color="#10B981" />
        </View>
        <View style={styles.statInfo}>
          <Text style={styles.statNumber}>{uniqueEntities}</Text>
          <Text style={styles.statLabel}>Entity Types</Text>
        </View>
      </View>

      <View style={styles.statDivider} />

      <View style={styles.statItem}>
        <View style={[styles.statIcon, { backgroundColor: "#3B82F615" }]}>
          <MaterialIcons name="date-range" size={18} color="#3B82F6" />
        </View>
        <View style={styles.statInfo}>
          <Text style={styles.statNumber}>{formatDateOnly(newestLog)}</Text>
          <Text style={styles.statLabel}>Latest</Text>
        </View>
      </View>
    </View>

    <View style={styles.statsSecondaryRow}>
      <MaterialIcons name="history" size={12} color="#6B7280" />
      <Text style={styles.statsSecondaryText}>
        Oldest: {formatDateOnly(oldestLog)}
      </Text>
    </View>
  </BlurView>
);

// ==================== FILTER BAR ====================

interface FilterBarProps {
  filters: FilterState;
  onFilterChange: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
  activeFilterCount: number;
  onClearFilters: () => void;
}

const FilterBar = ({ filters, onFilterChange, activeFilterCount, onClearFilters }: FilterBarProps) => {
  const [showFilters, setShowFilters] = useState(false);

  const filterButtonScale = useSharedValue(1);

  const handlePressIn = () => {
    filterButtonScale.value = withSpring(0.92, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    filterButtonScale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: filterButtonScale.value }],
  }));

  return (
    <View style={styles.filterWrapper}>
      {/* Search Row */}
      <View style={styles.searchRow}>
        <BlurView intensity={80} tint="light" style={styles.searchContainer}>
          <MaterialIcons name="search" size={18} color="rgba(0,0,0,0.4)" />
          <TextInput
            style={styles.searchInput}
            placeholder="Use filters to narrow logs"
            placeholderTextColor="rgba(0,0,0,0.3)"
            value={filters.entityType === "ALL" ? "" : filters.entityType}
            onChangeText={() => {}}
            editable={false}
          />
        </BlurView>

        <Animated.View style={animatedStyle}>
          <Pressable
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            onPress={() => setShowFilters(!showFilters)}
            style={({ pressed }) => [
              styles.filterButton,
              (activeFilterCount > 0 || showFilters) && styles.filterButtonActive,
            ]}
          >
            <BlurView intensity={80} tint="light" style={styles.filterButtonBlur}>
              <MaterialIcons
                name="tune"
                size={18}
                color={(activeFilterCount > 0 || showFilters) ? Colors.primary : "rgba(0,0,0,0.5)"}
              />
              {activeFilterCount > 0 && (
                <View style={styles.filterBadge}>
                  <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
                </View>
              )}
            </BlurView>
          </Pressable>
        </Animated.View>
      </View>

      {/* Filter Chips */}
      {showFilters && (
        <Animated.View 
          entering={FadeInDown.springify().damping(35)} 
          style={styles.filterChipsContainer}
        >
          {/* Entity Type Filters */}
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Entity Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterChipsScroll}>
              <View style={styles.filterChipsRow}>
                {["ALL", "Seed", "PlantType", "Inventory", "Sowing", "Germination", "Sale", "Customer", "User"].map((type) => (
                  <Pressable
                    key={type}
                    style={[
                      styles.filterChip,
                      filters.entityType === type && styles.filterChipActive,
                      filters.entityType === type && { borderColor: getEntityColor(type) },
                    ]}
                    onPress={() => onFilterChange("entityType", type as EntityType)}
                  >
                    {type !== "ALL" && (
                      <MaterialIcons 
                        name={getEntityIcon(type) as any} 
                        size={12} 
                        color={filters.entityType === type ? getEntityColor(type) : "#6B7280"} 
                      />
                    )}
                    <Text
                      style={[
                        styles.filterChipText,
                        filters.entityType === type && styles.filterChipTextActive,
                        filters.entityType === type && { color: getEntityColor(type) },
                      ]}
                    >
                      {type === "ALL" ? "All Types" : type}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Date Range Filters */}
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Date Range</Text>
            <View style={styles.filterChipsRow}>
              {[
                { id: "ALL", label: "All Time" },
                { id: "TODAY", label: "Today" },
                { id: "WEEK", label: "This Week" },
                { id: "MONTH", label: "This Month" },
              ].map((range) => (
                <Pressable
                  key={range.id}
                  style={[
                    styles.filterChip,
                    filters.dateRange === range.id && styles.filterChipActive,
                  ]}
                  onPress={() => onFilterChange("dateRange", range.id as any)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      filters.dateRange === range.id && styles.filterChipTextActive,
                    ]}
                  >
                    {range.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Deleted By Filters */}
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Deleted By</Text>
            <View style={styles.filterChipsRow}>
              {[
                { id: "ALL", label: "All" },
                { id: "USER", label: "User" },
                { id: "SYSTEM", label: "System" },
              ].map((deletedBy) => (
                <Pressable
                  key={deletedBy.id}
                  style={[
                    styles.filterChip,
                    filters.deletedBy === deletedBy.id && styles.filterChipActive,
                  ]}
                  onPress={() => onFilterChange("deletedBy", deletedBy.id as any)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      filters.deletedBy === deletedBy.id && styles.filterChipTextActive,
                    ]}
                  >
                    {deletedBy.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Clear Filters Button */}
          {activeFilterCount > 0 && (
            <Pressable onPress={onClearFilters} style={styles.clearFiltersButton}>
              <Text style={styles.clearFiltersText}>Clear all filters</Text>
            </Pressable>
          )}
        </Animated.View>
      )}
    </View>
  );
};

// ==================== AUDIT LOG CARD ====================

interface AuditLogCardProps {
  log: SoftDeletedAuditRow;
  index: number;
}

const AuditLogCard = ({ log, index }: AuditLogCardProps) => {
  const entityColor = getEntityColor(log.entityType);
  const entityIcon = getEntityIcon(log.entityType);
  const scale = useSharedValue(1);

  // Calculate days until purge
  const daysUntilPurge = useMemo(() => {
    if (!log.purgeAt) return null;
    const purgeDate = new Date(log.purgeAt);
    const now = new Date();
    const diffDays = Math.ceil((purgeDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays;
  }, [log.purgeAt]);

  const handlePressIn = () => {
    scale.value = withSpring(0.98, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      entering={FadeInUp.delay(index * 80).springify().damping(35)}
      layout={Layout.springify().damping(35)}
      style={styles.cardWrapper}
    >
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={({ pressed }) => [
          styles.auditCard,
          pressed && styles.auditCardPressed,
        ]}
      >
        <Animated.View style={[styles.auditCardInner, animatedStyle]}>
          {/* Header */}
          <View style={styles.auditHeader}>
            <View style={styles.auditHeaderLeft}>
              <View style={[styles.entityIcon, { backgroundColor: `${entityColor}15` }]}>
                <MaterialIcons name={entityIcon as any} size={20} color={entityColor} />
              </View>
              <View style={styles.entityInfo}>
                <View style={styles.entityTypeRow}>
                  <Text style={styles.entityType}>{log.entityType}</Text>
                  <View style={[styles.deletedByBadge, { backgroundColor: log.deletedBy ? `${Colors.primary}10` : "#F3F4F6" }]}>
                    <MaterialIcons 
                      name={log.deletedBy ? "person" : "smart-toy"} 
                      size={10} 
                      color={log.deletedBy ? Colors.primary : "#6B7280"} 
                    />
                    <Text style={[styles.deletedByText, { color: log.deletedBy ? Colors.primary : "#6B7280" }]}>
                      {log.deletedBy ? "User" : "System"}
                    </Text>
                  </View>
                </View>
                <Text style={styles.entityName} numberOfLines={1}>
                  {getSafeEntityLabel(log)}
                </Text>
              </View>
            </View>
          </View>

          {/* Action Summary */}
          <View style={[styles.actionSummary, { backgroundColor: `${entityColor}08` }]}>
            <MaterialIcons name="history-toggle-off" size={14} color={entityColor} />
            <Text style={[styles.actionSummaryText, { color: entityColor }]}>
              {getAuditSummary(log)}
            </Text>
          </View>

          {/* Timeline */}
          <View style={styles.timelineContainer}>
            <View style={styles.timelineItem}>
              <View style={[styles.timelineDot, { backgroundColor: Colors.primary }]} />
              <View style={styles.timelineContent}>
                <Text style={styles.timelineLabel}>Deleted</Text>
                <Text style={styles.timelineValue}>{formatDateTime(log.deletedAt)}</Text>
              </View>
            </View>

            <View style={styles.timelineLine} />

            <View style={styles.timelineItem}>
              <View style={[styles.timelineDot, styles.timelineDotWarning]} />
              <View style={styles.timelineContent}>
                <Text style={styles.timelineLabel}>Auto Purge</Text>
                <Text style={styles.timelineValue}>{formatDateTime(log.purgeAt)}</Text>
                {daysUntilPurge !== null && daysUntilPurge <= 7 && (
                  <View style={styles.purgeWarning}>
                    <MaterialIcons name="warning" size={12} color="#D97706" />
                    <Text style={styles.purgeWarningText}>
                      {daysUntilPurge <= 0 ? "Today" : `${daysUntilPurge} days left`}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.auditFooter}>
            <View style={styles.auditFooterItem}>
              <MaterialIcons name="person-outline" size={12} color="#9CA3AF" />
              <Text style={styles.auditFooterText}>By: {getAuditActor(log)}</Text>
            </View>
          </View>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
};

// ==================== EMPTY STATE ====================

interface EmptyStateProps {
  hasFilters: boolean;
  onClearFilters: () => void;
}

const EmptyState = ({ hasFilters, onClearFilters }: EmptyStateProps) => (
  <Animated.View entering={FadeInUp.springify().damping(35)} style={styles.emptyContainer}>
    <View style={styles.emptyIconContainer}>
      <LinearGradient
        colors={["#F3F4F6", "#F9FAFB"]}
        style={styles.emptyIconGradient}
      >
        <MaterialIcons name="history" size={48} color="#9CA3AF" />
      </LinearGradient>
    </View>
    <Text style={styles.emptyTitle}>No Audit Logs Found</Text>
    <Text style={styles.emptyMessage}>
      {hasFilters
        ? "Try adjusting your filters to see more results"
        : "Deleted records will appear here for 30 days before auto-purge"}
    </Text>
    {hasFilters && (
      <Pressable onPress={onClearFilters} style={styles.emptyButton}>
        <LinearGradient
          colors={[Colors.primary, Colors.primaryLight || Colors.primary]}
          style={styles.emptyButtonGradient}
        >
          <MaterialIcons name="clear-all" size={16} color={Colors.white} />
          <Text style={styles.emptyButtonText}>Clear Filters</Text>
        </LinearGradient>
      </Pressable>
    )}
  </Animated.View>
);

// ==================== LOADING STATE ====================

const LoadingState = () => (
  <View style={styles.centerContainer}>
    <View style={styles.loadingCard}>
      <ActivityIndicator size="large" color={Colors.primary} />
      <Text style={styles.loadingText}>Loading audit logs...</Text>
    </View>
  </View>
);

// ==================== MAIN COMPONENT ====================

export default function AdminAuditLogsScreen() {
  const user = useAuthStore((s) => s.user);
  const nurseryId = user?.nurseryId;
  const [refreshing, setRefreshing] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    entityType: "ALL",
    dateRange: "ALL",
    deletedBy: "ALL",
  });

  const { data, refetch, isRefetching, isLoading } = useQuery({
    queryKey: ["audit-logs", "admin", nurseryId],
    queryFn: () => SoftDeleteService.listAuditLogs({ nurseryId }),
    enabled: Boolean(nurseryId),
  });

  const purgeMutation = useMutation({
    mutationFn: () => SoftDeleteService.purgeExpired({ nurseryId, retentionDays: 30 }),
    onSuccess: () => {
      Alert.alert(
        "✅ Cleanup Started",
        "Soft-deleted items and their audit logs older than 30 days are being purged.",
      );
      refetch();
    },
    onError: (err: any) =>
      Alert.alert("❌ Failed", err?.message || "Unable to start cleanup for this nursery."),
  });

  const clearLogsMutation = useMutation({
    mutationFn: () => {
      const params: {
        nurseryId?: string;
        entityType?: string;
        from?: string;
        to?: string;
      } = { nurseryId };

      if (filters.entityType !== "ALL") {
        params.entityType = filters.entityType;
      }

      if (filters.dateRange !== "ALL") {
        const now = new Date();
        const from = new Date(now);
        from.setHours(0, 0, 0, 0);
        if (filters.dateRange === "WEEK") {
          from.setDate(from.getDate() - 7);
        } else if (filters.dateRange === "MONTH") {
          from.setDate(from.getDate() - 30);
        }
        params.from = from.toISOString();
        params.to = now.toISOString();
      }

      return SoftDeleteService.clearAuditLogs(params);
    },
    onSuccess: async (res: any) => {
      const deletedCount = Number(res?.data?.deletedCount ?? res?.deletedCount ?? 0);
      Alert.alert("✅ Logs Cleared", `${deletedCount} log${deletedCount === 1 ? "" : "s"} removed.`);
      await refetch();
    },
    onError: (err: any) =>
      Alert.alert("❌ Failed", err?.message || "Unable to clear audit logs."),
  });

  // Filter and search logic
  const filteredLogs = useMemo(() => {
    const logs: SoftDeletedAuditRow[] = Array.isArray(data) ? data : [];
    
    return logs.filter((log: SoftDeletedAuditRow) => {
      // Entity type filter
      if (filters.entityType !== "ALL" && log.entityType !== filters.entityType) {
        return false;
      }

      // Date range filter
      if (filters.dateRange !== "ALL") {
        const deletedDate = new Date(log.deletedAt);
        const now = new Date();
        const startOfToday = new Date(now);
        startOfToday.setHours(0, 0, 0, 0);

        if (filters.dateRange === "TODAY") {
          if (deletedDate < startOfToday) return false;
        } else if (filters.dateRange === "WEEK") {
          const weekAgo = new Date(startOfToday);
          weekAgo.setDate(weekAgo.getDate() - 7);
          if (deletedDate < weekAgo) return false;
        } else if (filters.dateRange === "MONTH") {
          const monthAgo = new Date(startOfToday);
          monthAgo.setDate(monthAgo.getDate() - 30);
          if (deletedDate < monthAgo) return false;
        }
      }

      // Deleted by filter
      if (filters.deletedBy !== "ALL") {
        const isUserDeleted = !!log.deletedBy;
        if (filters.deletedBy === "USER" && !isUserDeleted) return false;
        if (filters.deletedBy === "SYSTEM" && isUserDeleted) return false;
      }

      return true;
    });
  }, [data, filters]);

  // Calculate stats
  const stats = useMemo(() => {
    const logs = filteredLogs;
    const totalLogs = logs.length;
    const uniqueEntities = new Set(logs.map((log: SoftDeletedAuditRow) => log.entityType)).size;
    const dates = logs
      .map((log: SoftDeletedAuditRow) => new Date(log.deletedAt).getTime())
      .filter((dateMs: number) => !isNaN(dateMs));
    const oldestLog = dates.length ? new Date(Math.min(...dates)).toISOString() : new Date().toISOString();
    const newestLog = dates.length ? new Date(Math.max(...dates)).toISOString() : new Date().toISOString();

    return { totalLogs, uniqueEntities, oldestLog, newestLog };
  }, [filteredLogs]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.entityType !== "ALL") count++;
    if (filters.dateRange !== "ALL") count++;
    if (filters.deletedBy !== "ALL") count++;
    return count;
  }, [filters]);

  const handleFilterChange = <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleClearFilters = () => {
    setFilters({
      entityType: "ALL",
      dateRange: "ALL",
      deletedBy: "ALL",
    });
  };

  const handleRunCleanup = () => {
    Alert.alert(
      "🧹 Run Cleanup",
      "Delete records that are soft-deleted for more than 30 days?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Run Cleanup", onPress: () => purgeMutation.mutate() },
      ],
    );
  };

  const handleClearLogs = () => {
    Alert.alert(
      "🗑️ Clear Logs",
      "Permanently remove currently scoped audit logs?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Clear Logs", style: "destructive", onPress: () => clearLogsMutation.mutate() },
      ],
    );
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <FixedHeader
          title="Audit Logs"
          subtitle="See which user deleted what"
          titleStyle={styles.headerTitle}
        />
        <LoadingState />
      </SafeAreaView>
    );
  }

  const hasLogs = filteredLogs.length > 0;

  return (
    <View style={styles.container}>
      <FixedHeader
        title="Audit Logs"
        subtitle="See which user deleted what"
        titleStyle={styles.headerTitle}
        actions={
          <Pressable 
            style={({ pressed }) => [
              styles.headerIconBtn,
              pressed && styles.headerIconBtnPressed,
            ]} 
            onPress={handleRefresh}
          >
            <MaterialIcons
              name={isRefetching ? "sync" : "refresh"}
              size={20}
              color={Colors.white}
            />
          </Pressable>
        }
      />

      {/* Stats Card */}
      {hasLogs && (
        <View style={styles.statsWrapper}>
          <StatsCard
            totalLogs={stats.totalLogs}
            uniqueEntities={stats.uniqueEntities}
            oldestLog={stats.oldestLog}
            newestLog={stats.newestLog}
          />
        </View>
      )}

      {/* Filter Bar */}
      <FilterBar
        filters={filters}
        onFilterChange={handleFilterChange}
        activeFilterCount={activeFilterCount}
        onClearFilters={handleClearFilters}
      />

      {/* Cleanup Toolbar */}
      {hasLogs && (
        <View style={styles.toolbar}>
          <View style={styles.toolbarLeft}>
            <MaterialIcons name="info-outline" size={16} color="#6B7280" />
            <Text style={styles.toolbarText}>Retention: 30 days auto-delete</Text>
          </View>
          <View style={styles.toolbarActions}>
            <Pressable
              style={({ pressed }) => [
                styles.clearLogsButton,
                pressed && styles.cleanupButtonPressed,
              ]}
              onPress={handleClearLogs}
              disabled={clearLogsMutation.isPending}
            >
              <MaterialIcons name="delete-forever" size={14} color={Colors.error} />
              <Text style={styles.clearLogsButtonText}>
                {clearLogsMutation.isPending ? "Clearing..." : "Clear Logs"}
              </Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.cleanupButton,
                pressed && styles.cleanupButtonPressed,
              ]}
              onPress={handleRunCleanup}
            >
              <LinearGradient
                colors={["#D97706", "#B45309"]}
                style={styles.cleanupButtonGradient}
              >
                <MaterialIcons name="delete-sweep" size={14} color={Colors.white} />
                <Text style={styles.cleanupButtonText}>
                  {purgeMutation.isPending ? "Cleaning..." : "Run Cleanup"}
                </Text>
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      )}

      {/* Results Info */}
      {hasLogs && (
        <View style={styles.resultsInfo}>
          <View style={styles.resultsLeft}>
            <MaterialIcons name="list" size={14} color="#6B7280" />
            <Text style={styles.resultsText}>
              Showing {filteredLogs.length} {filteredLogs.length === 1 ? "log" : "logs"}
            </Text>
          </View>
          {activeFilterCount > 0 && (
            <Pressable onPress={handleClearFilters} style={styles.resultsClear}>
              <Text style={styles.resultsClearText}>Clear filters</Text>
            </Pressable>
          )}
        </View>
      )}

      <ScrollView 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
      >
        {!hasLogs ? (
          <EmptyState
            hasFilters={activeFilterCount > 0}
            onClearFilters={handleClearFilters}
          />
        ) : (
          filteredLogs.map((log, index) => (
            <AuditLogCard key={log.id} log={log} index={index} />
          ))
        )}
      </ScrollView>
    </View>
  );
}

// ==================== STYLES ====================

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
    marginBottom: 12,
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
  statsSecondaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  statsSecondaryText: {
    fontSize: 11,
    color: "#6B7280",
  },

  // Filter Bar
  filterWrapper: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  searchContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.5)",
    backgroundColor: "rgba(255,255,255,0.7)",
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
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#111827",
    padding: 0,
  },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.5)",
  },
  filterButtonActive: {
    borderColor: Colors.primary,
  },
  filterButtonBlur: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  filterBadge: {
    position: "absolute",
    top: 2,
    right: 2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: Colors.white,
  },
  filterBadgeText: {
    color: Colors.white,
    fontSize: 9,
    fontWeight: "700",
  },
  filterChipsContainer: {
    marginTop: 12,
    gap: 12,
  },
  filterSection: {
    gap: 8,
  },
  filterSectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#374151",
    marginLeft: 4,
  },
  filterChipsScroll: {
    flexGrow: 0,
  },
  filterChipsRow: {
    flexDirection: "row",
    gap: 8,
    paddingRight: 20,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
    gap: 4,
  },
  filterChipActive: {
    borderWidth: 1.5,
    backgroundColor: `${Colors.primary}08`,
  },
  filterChipText: {
    fontSize: 12,
    color: "#4B5563",
  },
  filterChipTextActive: {
    color: Colors.primary,
    fontWeight: "600",
  },
  clearFiltersButton: {
    alignItems: "center",
    paddingVertical: 8,
  },
  clearFiltersText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: "600",
  },

  // Toolbar
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 12,
    backgroundColor: Colors.white,
    borderRadius: 14,
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
  toolbarLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  toolbarText: {
    fontSize: 12,
    color: "#4B5563",
  },
  toolbarActions: {
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
    fontSize: 11,
    fontWeight: "600",
    color: Colors.error,
  },
  cleanupButton: {
    borderRadius: 10,
    overflow: "hidden",
  },
  cleanupButtonPressed: {
    transform: [{ scale: 0.96 }],
  },
  cleanupButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 4,
  },
  cleanupButtonText: {
    color: Colors.white,
    fontSize: 11,
    fontWeight: "600",
  },

  // Results Info
  resultsInfo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 20,
    marginBottom: 8,
  },
  resultsLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  resultsText: {
    fontSize: 12,
    color: "#6B7280",
  },
  resultsClear: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: `${Colors.primary}10`,
  },
  resultsClearText: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.primary,
  },

  // Content
  content: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: BOTTOM_NAV_HEIGHT + 20,
    gap: 12,
  },

  // Card Wrapper
  cardWrapper: {
    marginBottom: 8,
  },

  // Audit Card
  auditCard: {
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: Colors.white,
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
  auditCardPressed: {
    opacity: 0.98,
  },
  auditCardInner: {
    padding: 16,
  },
  auditHeader: {
    marginBottom: 12,
  },
  auditHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  entityIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  entityInfo: {
    flex: 1,
  },
  entityTypeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  entityType: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
  },
  deletedByBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },
  deletedByText: {
    fontSize: 10,
    fontWeight: "600",
  },
  entityName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  actionSummary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: 10,
    marginBottom: 16,
  },
  actionSummaryText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "500",
  },

  // Timeline
  timelineContainer: {
    marginBottom: 16,
  },
  timelineItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  timelineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 4,
  },
  timelineDotWarning: {
    backgroundColor: "#D97706",
  },
  timelineContent: {
    flex: 1,
  },
  timelineLabel: {
    fontSize: 11,
    color: "#6B7280",
    marginBottom: 2,
  },
  timelineValue: {
    fontSize: 13,
    fontWeight: "500",
    color: "#111827",
  },
  timelineLine: {
    width: 2,
    height: 16,
    backgroundColor: "#E5E7EB",
    marginLeft: 3,
    marginBottom: 4,
  },
  purgeWarning: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  purgeWarningText: {
    fontSize: 11,
    color: "#D97706",
    fontWeight: "600",
  },

  // Audit Footer
  auditFooter: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  auditFooterItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  auditFooterText: {
    fontSize: 11,
    color: "#6B7280",
  },

  // Center Container
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  loadingCard: {
    backgroundColor: Colors.white,
    padding: 24,
    borderRadius: 20,
    alignItems: "center",
    gap: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  loadingText: {
    fontSize: 15,
    color: "#6B7280",
    fontWeight: "500",
  },

  // Empty State
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    paddingHorizontal: 20,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 20,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
    }),
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
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  emptyButton: {
    borderRadius: 12,
    overflow: "hidden",
  },
  emptyButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  emptyButtonText: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: "600",
  },
});
