import { MaterialIcons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { GerminationService } from "../../services/germination.service";
import { useAuthStore } from "../../stores/auth.store";
import { Colors, Spacing } from "../../theme";
import { toImageUrl } from "../../utils/image";
import { canViewSourcingDetails } from "../../utils/rbac";
import BannerCardImage from "../ui/BannerCardImage";

const BOTTOM_NAV_HEIGHT = 80;

type DateFilter = "ALL" | "TODAY" | "LAST_7_DAYS" | "LAST_30_DAYS";
type InventoryFilter = "ALL" | "CREATED" | "NOT_CREATED";
type PerformanceFilter = "ALL" | "HIGH" | "MEDIUM" | "LOW";

type GerminationFilters = {
  dateRange: DateFilter;
  inventory: InventoryFilter;
  performance: PerformanceFilter;
};

interface GerminationReadScreenProps {
  title: string;
  canCreate?: boolean;
  onCreatePress?: () => void;
}

type GerminationDetails = {
  id: string;
  recordId: string;
  recordCreatedAt?: string;
  recordUpdatedAt?: string;
  plantName: string;
  variety: string;
  category: string;
  expectedSeedQtyPerBatch: number | null;
  seedName: string;
  supplierName: string;
  seedExpiryDate?: string;
  sownQuantity: number;
  sowingGerminated: number;
  sowingPending: number;
  germinatedSeeds: number;
  discardedSeeds: number;
  pendingSeeds: number;
  performedBy: string;
  performedByEmail: string;
  roleAtTime: string;
  sowingId: string;
  sowingCreatedAt?: string;
  sowingUpdatedAt?: string;
  germinationDate?: string;
  sowingDate?: string;
  inventoryId: string;
  inventoryStatus: string;
  inventoryGrowthStage: string;
  inventorySourceType: string;
  inventorySourceModel: string;
  inventorySource: string;
  inventoryUnitCost: number;
  inventoryReceivedAt?: string;
  inventoryUpdatedAt?: string;
  inventoryInitialQuantity: number;
  inventoryInStockQuantity: number;
  thumbnail?: string;
  sourceCount: number;
};

const formatDate = (dateString?: string) => {
  if (!dateString) return "-";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "-";

  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatNumber = (value: number) => value.toLocaleString("en-IN");
const formatPercent = (value: number) => `${value.toFixed(1)}%`;
const formatDateTime = (dateString?: string) => {
  if (!dateString) return "-";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const isInDateRange = (dateString: string | undefined, range: DateFilter) => {
  if (range === "ALL") return true;
  if (!dateString) return false;

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return false;

  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  if (range === "TODAY") return date >= startOfToday;

  if (range === "LAST_7_DAYS") {
    const since = new Date(startOfToday);
    since.setDate(since.getDate() - 6);
    return date >= since;
  }

  if (range === "LAST_30_DAYS") {
    const since = new Date(startOfToday);
    since.setDate(since.getDate() - 29);
    return date >= since;
  }

  return true;
};

const extractRecordDetails = (record: any): GerminationDetails => {
  const sowing = typeof record?.sowingId === "object" ? record.sowingId : {};
  const customerSeedBatch =
    (typeof sowing?.customerSeedBatch === "object" && sowing.customerSeedBatch) ||
    (typeof sowing?.customerSeedBatchId === "object" && sowing.customerSeedBatchId) ||
    {};
  const inventory =
    (typeof record?.inventoryBatch === "object" && record.inventoryBatch) ||
    (typeof record?.generatedInventory === "object" &&
      record.generatedInventory) ||
    (typeof record?.inventory === "object" && record.inventory) ||
    null;

  const plantType =
    sowing?.plantType ??
    customerSeedBatch?.plantTypeId ??
    inventory?.plantType ??
    {};
  const seed =
    (typeof sowing?.seed === "object" && sowing.seed) ||
    (typeof sowing?.seedId === "object" && sowing.seedId) ||
    {};
  const seedName =
    seed?.name ||
    sowing?.seedName ||
    customerSeedBatch?.seedName ||
    (customerSeedBatch?._id
      ? `${customerSeedBatch?.plantTypeId?.name || "Farmer"} Seed Batch`
      : undefined) ||
    "Unknown Seed";

  const sownQuantity =
    Number(
      sowing?.quantitySown ??
        sowing?.quantity ??
        customerSeedBatch?.seedsSown ??
        0,
    ) || 0;
  const sowingGerminated = Number(sowing?.quantityGerminated ?? 0) || 0;
  const sowingPending = Number(sowing?.quantityPendingGermination ?? 0) || 0;
  const germinatedSeeds = Number(record?.germinatedSeeds ?? 0) || 0;
  const discardedSeeds = Number(record?.discardedSeeds ?? 0) || 0;
  const pendingSeeds = Math.max(
    0,
    sownQuantity - germinatedSeeds - discardedSeeds,
  );

  return {
    id: String(record?._id ?? record?.id ?? ""),
    recordId: String(record?._id ?? record?.id ?? ""),
    recordCreatedAt: record?.createdAt,
    recordUpdatedAt: record?.updatedAt,
    plantName: plantType?.name ?? "Unknown Plant",
    variety: plantType?.variety ?? "",
    category: plantType?.category ?? "",
    expectedSeedQtyPerBatch:
      Number(plantType?.expectedSeedQtyPerBatch) > 0
        ? Number(plantType?.expectedSeedQtyPerBatch)
        : null,
    seedName,
    supplierName:
      seed?.supplierName ??
      customerSeedBatch?.customerId?.name ??
      customerSeedBatch?.customerName ??
      "",
    seedExpiryDate: seed?.expiryDate,
    sownQuantity,
    sowingGerminated,
    sowingPending,
    germinatedSeeds,
    discardedSeeds,
    pendingSeeds,
    performedBy:
      record?.performedBy?.name ?? sowing?.performedBy?.name ?? "Unknown Staff",
    performedByEmail: record?.performedBy?.email ?? sowing?.performedBy?.email ?? "",
    roleAtTime: record?.roleAtTime ?? sowing?.roleAtTime ?? "STAFF",
    sowingId: String(sowing?._id ?? sowing?.id ?? record?.sowingId ?? ""),
    sowingCreatedAt: sowing?.createdAt,
    sowingUpdatedAt: sowing?.updatedAt,
    germinationDate: record?.germinationDate ?? record?.createdAt,
    sowingDate: sowing?.sowingDate ?? sowing?.createdAt,
    inventoryId: String(inventory?._id ?? inventory?.id ?? record?.inventoryBatch ?? ""),
    inventoryStatus:
      inventory?.status ?? inventory?.growthStage ?? "Not Generated",
    inventoryGrowthStage: inventory?.growthStage ?? "-",
    inventorySourceType: inventory?.sourceType ?? "-",
    inventorySourceModel: inventory?.sourceModel ?? "-",
    inventorySource: inventory?.source ?? "-",
    inventoryUnitCost: Number(inventory?.unitCost ?? 0) || 0,
    inventoryReceivedAt: inventory?.receivedAt,
    inventoryUpdatedAt: inventory?.updatedAt,
    inventoryInitialQuantity:
      Number(inventory?.initialQuantity ?? inventory?.quantity ?? 0) || 0,
    inventoryInStockQuantity: Number(inventory?.quantity ?? 0) || 0,
    thumbnail: toImageUrl(
      plantType?.imageUrl ??
        (Array.isArray(plantType?.images) ? plantType.images[0]?.fileName : undefined) ??
        seed?.imageUrl ??
        (Array.isArray(seed?.images) ? seed.images[0]?.fileName : undefined),
    ),
    sourceCount: 1,
  };
};

const getGerminationMergeKey = (item: GerminationDetails) =>
  [
    item.seedName || "-",
    item.plantName || "-",
    item.variety || "-",
    item.supplierName || "-",
  ].join("|");

const mergeGerminationDetails = (
  rows: GerminationDetails[],
): GerminationDetails[] => {
  const grouped = new Map<string, GerminationDetails>();

  for (const row of rows) {
    const key = getGerminationMergeKey(row);
    const existing = grouped.get(key);

    if (!existing) {
      grouped.set(key, { ...row, id: key });
      continue;
    }

    const latestDate = [existing.germinationDate, row.germinationDate]
      .filter(Boolean)
      .sort(
        (a, b) =>
          new Date(b as string).getTime() - new Date(a as string).getTime(),
      )[0];

    existing.germinatedSeeds += row.germinatedSeeds;
    existing.discardedSeeds += row.discardedSeeds;
    existing.pendingSeeds += row.pendingSeeds;
    existing.sownQuantity += row.sownQuantity;
    existing.sourceCount += row.sourceCount;
    existing.sowingGerminated += row.sowingGerminated;
    existing.sowingPending += row.sowingPending;
    existing.inventoryInitialQuantity += row.inventoryInitialQuantity;
    existing.inventoryInStockQuantity += row.inventoryInStockQuantity;
    existing.germinationDate = latestDate ?? existing.germinationDate;
    existing.recordId = `Merged (${existing.sourceCount} records)`;
    existing.sowingId = `Merged (${existing.sourceCount} sowings)`;
    existing.performedBy =
      existing.performedBy === row.performedBy
        ? existing.performedBy
        : "Multiple Staff";
  }

  return Array.from(grouped.values()).sort(
    (a, b) =>
      new Date(b.germinationDate ?? 0).getTime() -
      new Date(a.germinationDate ?? 0).getTime(),
  );
};

const getSuccessRate = (item: GerminationDetails) => {
  const total = item.germinatedSeeds + item.discardedSeeds;
  if (total <= 0) return 0;
  return (item.germinatedSeeds / total) * 100;
};

const getGerminationStatus = (item: GerminationDetails) => {
  const rate = getSuccessRate(item);
  if (rate >= 80) return { label: "Excellent", color: Colors.success };
  if (rate >= 60) return { label: "Good", color: "#4CAF50" };
  if (rate >= 40) return { label: "Average", color: Colors.warning };
  if (rate > 0) return { label: "Low", color: Colors.error };
  return { label: "No Data", color: Colors.textTertiary };
};

const getRoleVisual = (role: string) => {
  const normalizedRole = String(role || "").toUpperCase();
  if (normalizedRole === "NURSERY_ADMIN" || normalizedRole === "SUPER_ADMIN") {
    return {
      label: normalizedRole === "SUPER_ADMIN" ? "Super Admin" : "Nursery Admin",
      icon: "verified-user" as const,
      color: "#7C3AED",
      bg: "#F3E8FF",
    };
  }
  return {
    label: "Staff",
    icon: "person" as const,
    color: Colors.primary,
    bg: "#E8F2FF",
  };
};

const GerminationFilterModal = ({
  visible,
  filters,
  onApply,
  onClear,
  onClose,
}: {
  visible: boolean;
  filters: GerminationFilters;
  onApply: (next: GerminationFilters) => void;
  onClear: () => void;
  onClose: () => void;
}) => {
  const [local, setLocal] = useState<GerminationFilters>(filters);

  const setField = <K extends keyof GerminationFilters>(
    key: K,
    value: GerminationFilters[K],
  ) => setLocal((prev) => ({ ...prev, [key]: value }));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <Pressable style={styles.modalBackdrop} onPress={onClose} />
        <View style={styles.filterModalSheet}>
          <View style={styles.filterModalHeader}>
            <Text style={styles.filterModalTitle}>Filter Germination</Text>
            <Pressable onPress={onClose} style={styles.filterModalClose}>
              <MaterialIcons
                name="close"
                size={18}
                color={Colors.textSecondary}
              />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.filterModalBody}
          >
            <View style={styles.filterSectionHeader}>
              <MaterialIcons
                name="calendar-today"
                size={14}
                color={Colors.textSecondary}
              />
              <Text style={styles.filterSectionTitle}>Date Range</Text>
            </View>
            <View style={styles.filterChipsRow}>
              {[
                { id: "ALL", label: "All", icon: "date-range" },
                { id: "TODAY", label: "Today", icon: "today" },
                { id: "LAST_7_DAYS", label: "Last 7 Days", icon: "view-week" },
                {
                  id: "LAST_30_DAYS",
                  label: "Last 30 Days",
                  icon: "event-note",
                },
              ].map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => setField("dateRange", item.id as DateFilter)}
                  style={[
                    styles.filterChip,
                    local.dateRange === item.id && styles.filterChipActive,
                  ]}
                >
                  <MaterialIcons
                    name={item.icon as any}
                    size={14}
                    color={
                      local.dateRange === item.id
                        ? Colors.primary
                        : Colors.textSecondary
                    }
                  />
                  <Text
                    style={[
                      styles.filterChipText,
                      local.dateRange === item.id &&
                        styles.filterChipTextActive,
                    ]}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.filterSectionHeader}>
              <MaterialIcons
                name="inventory"
                size={14}
                color={Colors.textSecondary}
              />
              <Text style={styles.filterSectionTitle}>Inventory</Text>
            </View>
            <View style={styles.filterChipsRow}>
              {[
                { id: "ALL", label: "All", icon: "apps" },
                { id: "CREATED", label: "Created", icon: "check-circle" },
                {
                  id: "NOT_CREATED",
                  label: "Not Created",
                  icon: "hourglass-empty",
                },
              ].map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() =>
                    setField("inventory", item.id as InventoryFilter)
                  }
                  style={[
                    styles.filterChip,
                    local.inventory === item.id && styles.filterChipActive,
                  ]}
                >
                  <MaterialIcons
                    name={item.icon as any}
                    size={14}
                    color={
                      local.inventory === item.id
                        ? Colors.primary
                        : Colors.textSecondary
                    }
                  />
                  <Text
                    style={[
                      styles.filterChipText,
                      local.inventory === item.id &&
                        styles.filterChipTextActive,
                    ]}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.filterSectionHeader}>
              <MaterialIcons
                name="analytics"
                size={14}
                color={Colors.textSecondary}
              />
              <Text style={styles.filterSectionTitle}>Performance</Text>
            </View>
            <View style={styles.filterChipsRow}>
              {[
                { id: "ALL", label: "All", icon: "equalizer" },
                { id: "HIGH", label: "High", icon: "trending-up" },
                { id: "MEDIUM", label: "Medium", icon: "trending-flat" },
                { id: "LOW", label: "Low", icon: "trending-down" },
              ].map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() =>
                    setField("performance", item.id as PerformanceFilter)
                  }
                  style={[
                    styles.filterChip,
                    local.performance === item.id && styles.filterChipActive,
                  ]}
                >
                  <MaterialIcons
                    name={item.icon as any}
                    size={14}
                    color={
                      local.performance === item.id
                        ? Colors.primary
                        : Colors.textSecondary
                    }
                  />
                  <Text
                    style={[
                      styles.filterChipText,
                      local.performance === item.id &&
                        styles.filterChipTextActive,
                    ]}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>

          <View style={styles.filterActionsRow}>
            <Pressable
              onPress={() => {
                onClear();
                onClose();
              }}
              style={styles.filterClearBtn}
            >
              <Text style={styles.filterClearBtnText}>Clear</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                onApply(local);
                onClose();
              }}
              style={styles.filterApplyBtn}
            >
              <Text style={styles.filterApplyBtnText}>Apply Filters</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export function GerminationReadScreen({
  title,
  canCreate = false,
  onCreatePress,
}: GerminationReadScreenProps) {
  const role = useAuthStore((state) => state.user?.role);
  const showSourcingDetails = canViewSourcingDetails(role);
  const [selectedRecord, setSelectedRecord] =
    useState<GerminationDetails | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isFilterVisible, setIsFilterVisible] = useState(false);
  const [filters, setFilters] = useState<GerminationFilters>({
    dateRange: "ALL",
    inventory: "ALL",
    performance: "ALL",
  });

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ["germination"],
    queryFn: GerminationService.getAll,
    staleTime: 60_000,
    retry: 2,
  });

  const records = useMemo(() => (Array.isArray(data) ? data : []), [data]);
  const details = useMemo(
    () => records.map((record: any) => extractRecordDetails(record)),
    [records],
  );
  const mergedDetails = useMemo(
    () => mergeGerminationDetails(details),
    [details],
  );

  const filtered = useMemo(() => {
    const term = searchQuery.trim().toLowerCase();
    return mergedDetails.filter((item) => {
      const matchesSearch =
        !term ||
        [
          item.plantName,
          item.variety,
          item.category,
          item.seedName,
          showSourcingDetails ? item.supplierName : "",
          item.performedBy,
          item.inventoryStatus,
        ]
          .join(" ")
          .toLowerCase()
          .includes(term);

      const matchesDate = isInDateRange(
        item.germinationDate,
        filters.dateRange,
      );

      const hasInventory = item.inventoryInitialQuantity > 0;
      const matchesInventory =
        filters.inventory === "ALL" ||
        (filters.inventory === "CREATED" && hasInventory) ||
        (filters.inventory === "NOT_CREATED" && !hasInventory);

      const rate = getSuccessRate(item);
      const matchesPerformance =
        filters.performance === "ALL" ||
        (filters.performance === "HIGH" && rate >= 80) ||
        (filters.performance === "MEDIUM" && rate >= 50 && rate < 80) ||
        (filters.performance === "LOW" && rate < 50);

      return (
        matchesSearch && matchesDate && matchesInventory && matchesPerformance
      );
    });
  }, [mergedDetails, searchQuery, filters, showSourcingDetails]);

  const stats = useMemo(() => {
    const totalGerminated = mergedDetails.reduce(
      (sum, item) => sum + item.germinatedSeeds,
      0,
    );
    const totalDiscarded = mergedDetails.reduce(
      (sum, item) => sum + item.discardedSeeds,
      0,
    );
    const totalProcessed = totalGerminated + totalDiscarded;
    const successRate =
      totalProcessed > 0
        ? ((totalGerminated / totalProcessed) * 100).toFixed(1)
        : "0";
    return {
      totalRecords: mergedDetails.length,
      totalGerminated,
      totalDiscarded,
      successRate,
    };
  }, [mergedDetails]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.dateRange !== "ALL") count += 1;
    if (filters.inventory !== "ALL") count += 1;
    if (filters.performance !== "ALL") count += 1;
    return count;
  }, [filters]);

  const selectedSuccessRate = useMemo(() => {
    if (!selectedRecord) return "0.0";
    return getSuccessRate(selectedRecord).toFixed(1);
  }, [selectedRecord]);

  const selectedProcessingRate = useMemo(() => {
    if (!selectedRecord || selectedRecord.sownQuantity <= 0) return 0;
    return (
      ((selectedRecord.germinatedSeeds + selectedRecord.discardedSeeds) /
        selectedRecord.sownQuantity) *
      100
    );
  }, [selectedRecord]);

  const selectedDiscardRate = useMemo(() => {
    if (!selectedRecord || selectedRecord.sownQuantity <= 0) return 0;
    return (selectedRecord.discardedSeeds / selectedRecord.sownQuantity) * 100;
  }, [selectedRecord]);

  const selectedStatus = useMemo(() => {
    if (!selectedRecord)
      return { label: "No Data", color: Colors.textTertiary };
    return getGerminationStatus(selectedRecord);
  }, [selectedRecord]);

  const clearFilters = () => {
    setFilters({ dateRange: "ALL", inventory: "ALL", performance: "ALL" });
  };

  const handleRecordPress = (record: GerminationDetails) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedRecord(record);
    setShowDetails(true);
  };

  const handleRefresh = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    refetch();
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.center} edges={["left", "right"]}>
        <View style={styles.loadingCard}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading germination records...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.center} edges={["left", "right"]}>
        <View style={styles.errorCard}>
          <MaterialIcons name="error-outline" size={48} color={Colors.error} />
          <Text style={styles.errorTitle}>Failed to Load</Text>
          <Text style={styles.errorMessage}>
            {(error as any)?.message || "Failed to load records"}
          </Text>
          <Pressable
            onPress={handleRefresh}
            style={({ pressed }) => [
              styles.retryButton,
              pressed && styles.retryButtonPressed,
            ]}
          >
            <MaterialIcons name="refresh" size={20} color={Colors.white} />
            <Text style={styles.retryButtonText}>Try Again</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[Colors.primary, Colors.primaryLight || Colors.primary]}
        style={styles.headerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <SafeAreaView edges={[ "left", "right"]}>
          <View style={styles.headerContent}>
            <View style={styles.headerLeft}>
              <MaterialIcons name="grass" size={24} color={Colors.white} />
              <Text style={styles.headerTitle}>{title}</Text>
            </View>
            <View style={styles.headerActions}>
              {canCreate && onCreatePress && (
                <Pressable
                  onPress={onCreatePress}
                  style={({ pressed }) => [
                    styles.createButton,
                    pressed && styles.createButtonPressed,
                  ]}
                >
                  <MaterialIcons name="add" size={18} color={Colors.primary} />
                  <Text style={styles.createButtonText}>Record</Text>
                </Pressable>
              )}
              <Pressable
                onPress={handleRefresh}
                style={({ pressed }) => [
                  styles.refreshButton,
                  pressed && styles.refreshButtonPressed,
                ]}
              >
                <MaterialIcons name="refresh" size={20} color={Colors.white} />
              </Pressable>
            </View>
          </View>
        </SafeAreaView>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={styles.statLabelRow}>
              <MaterialIcons
                name="format-list-bulleted"
                size={14}
                color="rgba(255,255,255,0.9)"
              />
              <Text style={styles.statLabel}>Records</Text>
            </View>
            <Text style={styles.statValue}>
              {formatNumber(stats.totalRecords)}
            </Text>
          </View>
          <View style={styles.statCard}>
            <View style={styles.statLabelRow}>
              <MaterialIcons
                name="spa"
                size={14}
                color="rgba(255,255,255,0.9)"
              />
              <Text style={styles.statLabel}>Germinated</Text>
            </View>
            <Text style={styles.statValue}>
              {formatNumber(stats.totalGerminated)}
            </Text>
          </View>
          <View style={styles.statCard}>
            <View style={styles.statLabelRow}>
              <MaterialIcons
                name="delete-outline"
                size={14}
                color="rgba(255,255,255,0.9)"
              />
              <Text style={styles.statLabel}>Discarded</Text>
            </View>
            <Text style={styles.statValue}>
              {formatNumber(stats.totalDiscarded)}
            </Text>
          </View>
          <View style={styles.statCard}>
            <View style={styles.statLabelRow}>
              <MaterialIcons
                name="insights"
                size={14}
                color="rgba(255,255,255,0.9)"
              />
              <Text style={styles.statLabel}>Success</Text>
            </View>
            <Text style={styles.statValue}>{stats.successRate}%</Text>
          </View>
        </View>
        <View style={styles.searchWrap}>
          <View style={styles.searchRow}>
            <View style={styles.searchBox}>
              <MaterialIcons
                name="search"
                size={18}
                color="rgba(255,255,255,0.8)"
              />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder={
                  showSourcingDetails
                    ? "Search plant, seed, supplier, staff..."
                    : "Search plant, seed, staff..."
                }
                placeholderTextColor="rgba(255,255,255,0.6)"
                style={styles.searchInput}
                returnKeyType="search"
              />
              {searchQuery ? (
                <Pressable
                  onPress={() => setSearchQuery("")}
                  style={styles.searchClear}
                >
                  <MaterialIcons
                    name="close"
                    size={16}
                    color="rgba(255,255,255,0.8)"
                  />
                </Pressable>
              ) : null}
            </View>
            <Pressable
              onPress={() => setIsFilterVisible(true)}
              style={({ pressed }) => [
                styles.filterButton,
                activeFilterCount > 0 && styles.filterButtonActive,
                pressed && styles.filterButtonPressed,
              ]}
            >
              <MaterialIcons
                name="tune"
                size={18}
                color={activeFilterCount > 0 ? Colors.primary : Colors.white}
              />
              {activeFilterCount > 0 && (
                <View style={styles.filterBadge}>
                  <Text style={styles.filterBadgeText}>
                    {activeFilterCount}
                  </Text>
                </View>
              )}
            </Pressable>
          </View>
        </View>
      </LinearGradient>

      {activeFilterCount > 0 && (
        <View style={styles.activeFilterRow}>
          <Text style={styles.activeFilterText}>
            Filters active: {activeFilterCount}
          </Text>
          <Pressable onPress={clearFilters} style={styles.activeFilterClear}>
            <Text style={styles.activeFilterClearText}>Clear</Text>
          </Pressable>
        </View>
      )}

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={handleRefresh}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialIcons name="grass" size={56} color={Colors.textTertiary} />
            <Text style={styles.emptyTitle}>No Germination Records</Text>
            <Text style={styles.emptyText}>
              {searchQuery || activeFilterCount > 0
                ? "Try a different keyword or adjust filters."
                : "No germination records have been added yet."}
            </Text>
            {canCreate &&
              onCreatePress &&
              !searchQuery &&
              activeFilterCount === 0 && (
                <Pressable
                  onPress={onCreatePress}
                  style={({ pressed }) => [
                    styles.emptyCreateButton,
                    pressed && styles.createButtonPressed,
                  ]}
                >
                  <MaterialIcons name="add" size={18} color={Colors.white} />
                  <Text style={styles.emptyCreateButtonText}>
                    Record First Batch
                  </Text>
                </Pressable>
              )}
          </View>
        }
        renderItem={({ item }) => {
          const status = getGerminationStatus(item);
          return (
            <Pressable
              onPress={() => handleRecordPress(item)}
              style={({ pressed }) => [
                styles.recordCard,
                pressed && styles.recordCardPressed,
              ]}
            >
              <BannerCardImage
                uri={item.thumbnail}
                label={item.plantName}
                iconName="eco"
                containerStyle={styles.recordImageBanner}
              >
                <View
                  style={[
                    styles.statusBadge,
                    styles.bannerStatusBadge,
                    { backgroundColor: `${status.color}18` },
                  ]}
                >
                  <Text style={[styles.statusText, { color: status.color }]}>
                    {status.label}
                  </Text>
                </View>
              </BannerCardImage>

              <View style={styles.recordCardContent}>
                <View style={styles.recordTitleRow}>
                  <View style={styles.recordTitleBlock}>
                    <Text style={styles.recordTitle} numberOfLines={1}>
                      {item.plantName}
                      {item.variety ? ` (${item.variety})` : ""}
                    </Text>
                    <Text style={styles.recordSubTitle} numberOfLines={1}>
                      Seed: {item.seedName}
                      {showSourcingDetails && item.supplierName
                        ? ` • ${item.supplierName}`
                        : ""}
                    </Text>
                    {item.category ? (
                      <View style={styles.categoryChip}>
                        <MaterialIcons
                          name="category"
                          size={11}
                          color={Colors.primary}
                        />
                        <Text style={styles.categoryChipText}>
                          {item.category}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>

                <View style={styles.metricsRow}>
                  <View style={styles.metricItem}>
                    <View style={styles.metricLabelRow}>
                      <MaterialIcons
                        name="scatter-plot"
                        size={12}
                        color={Colors.textSecondary}
                      />
                      <Text style={styles.metricLabel}>Sown</Text>
                    </View>
                    <Text style={styles.metricValue}>
                      {formatNumber(item.sownQuantity)}
                    </Text>
                  </View>
                  <View style={styles.metricItem}>
                    <View style={styles.metricLabelRow}>
                      <MaterialIcons
                        name="eco"
                        size={12}
                        color={Colors.success}
                      />
                      <Text style={styles.metricLabel}>Germinated</Text>
                    </View>
                    <Text style={styles.metricValue}>
                      {formatNumber(item.germinatedSeeds)}
                    </Text>
                  </View>
                  <View style={styles.metricItem}>
                    <View style={styles.metricLabelRow}>
                      <MaterialIcons
                        name="delete-outline"
                        size={12}
                        color={Colors.error}
                      />
                      <Text style={styles.metricLabel}>Discarded</Text>
                    </View>
                    <Text style={styles.metricValue}>
                      {formatNumber(item.discardedSeeds)}
                    </Text>
                  </View>
                  <View style={styles.metricItem}>
                    <View style={styles.metricLabelRow}>
                      <MaterialIcons
                        name="schedule"
                        size={12}
                        color={Colors.warning}
                      />
                      <Text style={styles.metricLabel}>Pending</Text>
                    </View>
                    <Text style={styles.metricValue}>
                      {formatNumber(item.pendingSeeds)}
                    </Text>
                  </View>
                </View>

                <View style={styles.recordFooter}>
                  {item.sourceCount > 1 && (
                    <View style={styles.footerItem}>
                      <MaterialIcons
                        name="merge-type"
                        size={12}
                        color={Colors.primary}
                      />
                      <Text style={[styles.footerText, { color: Colors.primary }]}>
                        Merged {item.sourceCount} entries
                      </Text>
                    </View>
                  )}
                  <View style={styles.footerItem}>
                    <MaterialIcons
                      name="person"
                      size={12}
                      color={Colors.textSecondary}
                    />
                    <Text style={styles.footerText}>{item.performedBy}</Text>
                  </View>
                  <View style={styles.footerItem}>
                    <MaterialIcons
                      name="calendar-today"
                      size={12}
                      color={Colors.textSecondary}
                    />
                    <Text style={styles.footerText}>
                      {formatDate(item.germinationDate)}
                    </Text>
                  </View>
                  <View style={styles.footerItem}>
                    <MaterialIcons
                      name="inventory"
                      size={12}
                      color={Colors.textSecondary}
                    />
                    <Text style={styles.footerText}>
                      {item.inventoryInitialQuantity > 0
                        ? `${formatNumber(item.inventoryInStockQuantity)} in stock`
                        : "Inventory not created"}
                    </Text>
                  </View>
                </View>
              </View>
            </Pressable>
          );
        }}
      />

      <GerminationFilterModal
        visible={isFilterVisible}
        filters={filters}
        onApply={setFilters}
        onClear={clearFilters}
        onClose={() => setIsFilterVisible(false)}
      />

      {showDetails && selectedRecord && (
        <View style={styles.detailsOverlay}>
          <Pressable
            style={styles.detailsBackdrop}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowDetails(false);
              setSelectedRecord(null);
            }}
          />
          <View style={styles.detailsSheet}>
            <View style={styles.detailsHandle} />
            <View style={styles.detailsHeader}>
              <View>
                <Text style={styles.detailsTitle}>Germination Details</Text>
                <Text style={styles.detailsSubtitle}>
                  Simple batch summary for field use
                </Text>
              </View>
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowDetails(false);
                  setSelectedRecord(null);
                }}
                style={styles.detailsClose}
              >
                <MaterialIcons
                  name="close"
                  size={20}
                  color={Colors.textSecondary}
                />
              </Pressable>
            </View>

            <ScrollView
              style={styles.detailsScroll}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.detailsBody}
            >
              <BannerCardImage
                uri={selectedRecord.thumbnail}
                label={selectedRecord.plantName}
                iconName="eco"
                containerStyle={styles.detailsHeroBanner}
                imageStyle={styles.detailsHeroImage}
                minHeight={120}
              />
              <View style={styles.detailsHeroMeta}>
                <Text style={styles.detailsHeroTitle} numberOfLines={1}>
                  {selectedRecord.plantName}
                  {selectedRecord.variety ? ` (${selectedRecord.variety})` : ""}
                </Text>
                <Text style={styles.detailsHeroSubtitle} numberOfLines={1}>
                  {selectedRecord.seedName}
                  {showSourcingDetails && selectedRecord.supplierName
                    ? ` • ${selectedRecord.supplierName}`
                    : ""}
                </Text>
              </View>

              <View style={styles.detailsTopCards}>
                <View style={styles.detailsTopCard}>
                  <MaterialIcons
                    name="check-circle"
                    size={16}
                    color={selectedStatus.color}
                  />
                  <Text style={styles.detailsTopCardLabel}>Status</Text>
                  <Text
                    style={[
                      styles.detailsTopCardValue,
                      { color: selectedStatus.color },
                    ]}
                  >
                    {selectedStatus.label}
                  </Text>
                </View>
                <View style={styles.detailsTopCard}>
                  <MaterialIcons
                    name="insights"
                    size={16}
                    color={Colors.primary}
                  />
                  <Text style={styles.detailsTopCardLabel}>Success</Text>
                  <Text style={styles.detailsTopCardValue}>
                    {selectedSuccessRate}%
                  </Text>
                </View>
                <View style={styles.detailsTopCard}>
                  <MaterialIcons
                    name="done-all"
                    size={16}
                    color={Colors.primary}
                  />
                  <Text style={styles.detailsTopCardLabel}>Processed</Text>
                  <Text style={styles.detailsTopCardValue}>
                    {formatPercent(selectedProcessingRate)}
                  </Text>
                </View>
              </View>

              <View style={styles.progressWrap}>
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${Math.max(
                          0,
                          Math.min(100, Number(selectedSuccessRate)),
                        )}%`,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.progressText}>Germination efficiency</Text>
              </View>

              <View style={styles.detailsSection}>
                <Text style={styles.detailsSectionTitle}>Germination Snapshot</Text>
                <View style={styles.detailRow}>
                  <View style={styles.detailLabelWrap}>
                    <MaterialIcons
                      name="scatter-plot"
                      size={14}
                      color={Colors.textSecondary}
                    />
                    <Text style={styles.detailLabel}>Sown Quantity</Text>
                  </View>
                  <Text style={styles.detailValue}>
                    {formatNumber(selectedRecord.sownQuantity)}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <View style={styles.detailLabelWrap}>
                    <MaterialIcons
                      name="spa"
                      size={14}
                      color={Colors.success}
                    />
                    <Text style={styles.detailLabel}>Germinated</Text>
                  </View>
                  <Text style={styles.detailValue}>
                    {formatNumber(selectedRecord.germinatedSeeds)}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <View style={styles.detailLabelWrap}>
                    <MaterialIcons
                      name="delete-outline"
                      size={14}
                      color={Colors.error}
                    />
                    <Text style={styles.detailLabel}>Discarded</Text>
                  </View>
                  <Text style={styles.detailValue}>
                    {formatNumber(selectedRecord.discardedSeeds)}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <View style={styles.detailLabelWrap}>
                    <MaterialIcons
                      name="schedule"
                      size={14}
                      color={Colors.warning}
                    />
                    <Text style={styles.detailLabel}>Pending</Text>
                  </View>
                  <Text style={styles.detailValue}>
                    {formatNumber(selectedRecord.pendingSeeds)}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <View style={styles.detailLabelWrap}>
                    <MaterialIcons
                      name="percent"
                      size={14}
                      color={Colors.textSecondary}
                    />
                    <Text style={styles.detailLabel}>Discard Rate</Text>
                  </View>
                  <Text style={styles.detailValue}>
                    {formatPercent(selectedDiscardRate)}
                  </Text>
                </View>
              </View>

              <View style={styles.detailsSection}>
                <Text style={styles.detailsSectionTitle}>Plant & Seed Source</Text>
                <View style={styles.detailRow}>
                  <View style={styles.detailLabelWrap}>
                    <MaterialIcons
                      name="grass"
                      size={14}
                      color={Colors.textSecondary}
                    />
                    <Text style={styles.detailLabel}>Plant</Text>
                  </View>
                  <Text style={styles.detailValue}>
                    {selectedRecord.plantName}
                    {selectedRecord.variety
                      ? ` (${selectedRecord.variety})`
                      : ""}
                  </Text>
                </View>
                {selectedRecord.category ? (
                  <View style={styles.detailRow}>
                    <View style={styles.detailLabelWrap}>
                      <MaterialIcons
                        name="category"
                        size={14}
                        color={Colors.textSecondary}
                      />
                      <Text style={styles.detailLabel}>Category</Text>
                    </View>
                    <Text style={styles.detailValue}>
                      {selectedRecord.category}
                    </Text>
                  </View>
                ) : null}
                {showSourcingDetails && selectedRecord.expectedSeedQtyPerBatch ? (
                  <View style={styles.detailRow}>
                    <View style={styles.detailLabelWrap}>
                      <MaterialIcons
                        name="straighten"
                        size={14}
                        color={Colors.textSecondary}
                      />
                      <Text style={styles.detailLabel}>Expected Seeds / Batch</Text>
                    </View>
                    <Text style={styles.detailValue}>
                      {formatNumber(selectedRecord.expectedSeedQtyPerBatch)}
                    </Text>
                  </View>
                ) : null}
                <View style={styles.detailRow}>
                  <View style={styles.detailLabelWrap}>
                    <MaterialIcons
                      name="eco"
                      size={14}
                      color={Colors.textSecondary}
                    />
                    <Text style={styles.detailLabel}>Seed</Text>
                  </View>
                  <Text style={styles.detailValue}>
                    {selectedRecord.seedName}
                  </Text>
                </View>
                {showSourcingDetails && selectedRecord.supplierName ? (
                  <View style={styles.detailRow}>
                    <View style={styles.detailLabelWrap}>
                      <MaterialIcons
                        name="storefront"
                        size={14}
                        color={Colors.textSecondary}
                      />
                      <Text style={styles.detailLabel}>Supplier</Text>
                    </View>
                    <Text style={styles.detailValue}>
                      {selectedRecord.supplierName}
                    </Text>
                  </View>
                ) : null}
                {selectedRecord.seedExpiryDate ? (
                  <View style={styles.detailRow}>
                    <View style={styles.detailLabelWrap}>
                      <MaterialIcons
                        name="event-busy"
                        size={14}
                        color={Colors.textSecondary}
                      />
                      <Text style={styles.detailLabel}>Seed Expiry</Text>
                    </View>
                    <Text style={styles.detailValue}>
                      {formatDate(selectedRecord.seedExpiryDate)}
                    </Text>
                  </View>
                ) : null}
              </View>

              <View style={styles.detailsSection}>
                <Text style={styles.detailsSectionTitle}>Schedule</Text>
                <View style={styles.detailRow}>
                  <View style={styles.detailLabelWrap}>
                    <MaterialIcons
                      name="scatter-plot"
                      size={14}
                      color={Colors.textSecondary}
                    />
                    <Text style={styles.detailLabel}>Sown / Germinated / Pending</Text>
                  </View>
                  <Text style={styles.detailValue}>
                    {formatNumber(selectedRecord.sownQuantity)} /{" "}
                    {formatNumber(selectedRecord.sowingGerminated)} /{" "}
                    {formatNumber(selectedRecord.sowingPending)}
                  </Text>
                </View>
                {selectedRecord.sowingDate ? (
                  <View style={styles.detailRow}>
                    <View style={styles.detailLabelWrap}>
                      <MaterialIcons
                        name="event"
                        size={14}
                        color={Colors.textSecondary}
                      />
                      <Text style={styles.detailLabel}>Sowing Date</Text>
                    </View>
                    <Text style={styles.detailValue}>
                      {formatDate(selectedRecord.sowingDate)}
                    </Text>
                  </View>
                ) : null}
                {selectedRecord.germinationDate ? (
                  <View style={styles.detailRow}>
                    <View style={styles.detailLabelWrap}>
                      <MaterialIcons
                        name="event-available"
                        size={14}
                        color={Colors.textSecondary}
                      />
                      <Text style={styles.detailLabel}>Germination Date</Text>
                    </View>
                    <Text style={styles.detailValue}>
                      {formatDate(selectedRecord.germinationDate)}
                    </Text>
                  </View>
                ) : null}
              </View>

              <View style={styles.detailsSection}>
                <Text style={styles.detailsSectionTitle}>Inventory Outcome</Text>
                <View style={styles.detailRow}>
                  <View style={styles.detailLabelWrap}>
                    <MaterialIcons
                      name="flag"
                      size={14}
                      color={Colors.textSecondary}
                    />
                    <Text style={styles.detailLabel}>Status</Text>
                  </View>
                  <Text style={styles.detailValue}>
                    {selectedRecord.inventoryStatus}
                  </Text>
                </View>
                {selectedRecord.inventoryGrowthStage &&
                selectedRecord.inventoryGrowthStage !== "-" ? (
                  <View style={styles.detailRow}>
                    <View style={styles.detailLabelWrap}>
                      <MaterialIcons
                        name="timeline"
                        size={14}
                        color={Colors.textSecondary}
                      />
                      <Text style={styles.detailLabel}>Growth Stage</Text>
                    </View>
                    <Text style={styles.detailValue}>
                      {selectedRecord.inventoryGrowthStage}
                    </Text>
                  </View>
                ) : null}
                <View style={styles.detailRow}>
                  <View style={styles.detailLabelWrap}>
                    <MaterialIcons
                      name="inventory"
                      size={14}
                      color={Colors.textSecondary}
                    />
                    <Text style={styles.detailLabel}>Initial / In Stock</Text>
                  </View>
                  <Text style={styles.detailValue}>
                    {formatNumber(selectedRecord.inventoryInitialQuantity)} /{" "}
                    {formatNumber(selectedRecord.inventoryInStockQuantity)}
                  </Text>
                </View>
              </View>

              <View style={styles.detailsSection}>
                <Text style={styles.detailsSectionTitle}>Recorded By</Text>
                <View style={styles.detailRow}>
                  <View style={styles.detailLabelWrap}>
                    <MaterialIcons
                      name={getRoleVisual(selectedRecord.roleAtTime).icon}
                      size={14}
                      color={getRoleVisual(selectedRecord.roleAtTime).color}
                    />
                    <Text style={styles.detailLabel}>Performed By</Text>
                  </View>
                  <View
                    style={[
                      styles.rolePill,
                      {
                        backgroundColor: getRoleVisual(
                          selectedRecord.roleAtTime,
                        ).bg,
                      },
                    ]}
                  >
                    <Text style={styles.detailValueRole}>
                      {selectedRecord.performedBy} (
                      {getRoleVisual(selectedRecord.roleAtTime).label})
                    </Text>
                  </View>
                </View>
                {selectedRecord.germinationDate ? (
                  <View style={styles.detailRow}>
                    <View style={styles.detailLabelWrap}>
                      <MaterialIcons
                        name="event-available"
                        size={14}
                        color={Colors.textSecondary}
                      />
                      <Text style={styles.detailLabel}>Recorded On</Text>
                    </View>
                    <Text style={styles.detailValue}>
                      {formatDate(selectedRecord.germinationDate)}
                    </Text>
                  </View>
                ) : null}
                {selectedRecord.recordUpdatedAt ? (
                  <View style={styles.detailRow}>
                    <View style={styles.detailLabelWrap}>
                      <MaterialIcons
                        name="update"
                        size={14}
                        color={Colors.textSecondary}
                      />
                      <Text style={styles.detailLabel}>Last Updated</Text>
                    </View>
                    <Text style={styles.detailValue}>
                      {formatDateTime(selectedRecord.recordUpdatedAt)}
                    </Text>
                  </View>
                ) : null}
                {selectedRecord.recordCreatedAt ? (
                  <View style={styles.detailRow}>
                  <View style={styles.detailLabelWrap}>
                    <MaterialIcons
                      name="event-available"
                      size={14}
                      color={Colors.textSecondary}
                    />
                    <Text style={styles.detailLabel}>Created</Text>
                  </View>
                  <Text style={styles.detailValue}>
                    {formatDateTime(selectedRecord.recordCreatedAt)}
                  </Text>
                </View>
                ) : null}
              </View>
            </ScrollView>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = {
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  center: {
    flex: 1,
    justifyContent: "center" as const,
    alignItems: "center" as const,
    backgroundColor: Colors.background,
  },
  headerGradient: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    marginBottom: 12,
  },
  headerActions: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
  },
  headerLeft: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700" as const,
    color: Colors.white,
  },
  refreshButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  refreshButtonPressed: {
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    transform: [{ scale: 0.95 }],
  },
  createButton: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
    backgroundColor: Colors.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.75)",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  createButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
  createButtonText: {
    fontSize: 12,
    fontWeight: "700" as const,
    color: Colors.primary,
  },
  statsGrid: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: 8,
  },
  statCard: {
    flex: 1,
    minWidth: 110,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  statLabel: {
    fontSize: 11,
    color: "rgba(255,255,255,0.8)",
    marginBottom: 2,
  },
  statLabelRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: Colors.white,
  },
  searchWrap: {
    marginTop: 12,
  },
  searchRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
  },
  searchBox: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 12,
    minHeight: 44,
    paddingHorizontal: 12,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.white,
    paddingVertical: 10,
  },
  searchClear: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  filterButtonActive: {
    borderColor: "rgba(255,255,255,0.9)",
    backgroundColor: Colors.white,
  },
  filterButtonPressed: {
    transform: [{ scale: 0.96 }],
  },
  filterBadge: {
    position: "absolute" as const,
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 10,
    backgroundColor: Colors.error,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: Colors.white,
  },
  filterBadgeText: {
    color: Colors.white,
    fontSize: 10,
    fontWeight: "700" as const,
  },
  activeFilterRow: {
    marginHorizontal: 20,
    marginBottom: 8,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
  },
  activeFilterText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  activeFilterClear: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: `${Colors.primary}10`,
  },
  activeFilterClearText: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: Colors.primary,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: BOTTOM_NAV_HEIGHT + 24,
  },
  loadingCard: {
    backgroundColor: Colors.white,
    padding: 24,
    borderRadius: 20,
    alignItems: "center" as const,
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.textSecondary,
    fontWeight: "500" as const,
  },
  errorCard: {
    backgroundColor: Colors.white,
    padding: 24,
    borderRadius: 20,
    alignItems: "center" as const,
    gap: 12,
    maxWidth: 320,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: Colors.error,
    marginTop: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center" as const,
    marginBottom: 8,
  },
  retryButton: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
  },
  retryButtonPressed: {
    backgroundColor: Colors.primaryDark,
    transform: [{ scale: 0.98 }],
  },
  retryButtonText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: "600" as const,
  },
  emptyContainer: {
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingVertical: 56,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600" as const,
    color: Colors.text,
    marginTop: 8,
  },
  emptyText: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: "center" as const,
    paddingHorizontal: 20,
  },
  emptyCreateButton: {
    marginTop: 8,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  emptyCreateButtonText: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: "600" as const,
  },
  recordCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    marginBottom: Spacing.md,
    overflow: "hidden" as const,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  recordCardPressed: {
    backgroundColor: Colors.surface,
    transform: [{ scale: 0.98 }],
  },
  recordImageBanner: {
    width: "100%" as const,
    minHeight: 140,
    borderRadius: 0,
    marginBottom: 0,
  },
  recordCardContent: {
    padding: Spacing.lg,
  },
  recordTitleRow: {
    flexDirection: "row" as const,
    justifyContent: "flex-start" as const,
    alignItems: "flex-start" as const,
    marginBottom: 10,
    gap: 8,
  },
  recordTitleBlock: {
    flex: 1,
  },
  recordTitle: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: Colors.text,
    marginBottom: 2,
  },
  recordSubTitle: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  categoryChip: {
    marginTop: 6,
    alignSelf: "flex-start" as const,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: `${Colors.primary}10`,
    borderWidth: 1,
    borderColor: `${Colors.primary}22`,
  },
  categoryChipText: {
    fontSize: 10,
    fontWeight: "600" as const,
    color: Colors.primary,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  bannerStatusBadge: {
    position: "absolute" as const,
    top: 8,
    right: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700" as const,
  },
  metricsRow: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    rowGap: 8,
    columnGap: 8,
    marginBottom: 10,
  },
  metricItem: {
    width: "48%" as const,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#F3F4F6",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  metricLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginBottom: 3,
  },
  metricLabelRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
    marginBottom: 3,
  },
  metricValue: {
    fontSize: 13,
    fontWeight: "700" as const,
    color: Colors.text,
  },
  recordFooter: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  footerItem: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
  },
  footerText: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.28)",
    justifyContent: "flex-end" as const,
  },
  modalBackdrop: {
    ...({
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    } as const),
  },
  filterModalSheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 22,
    maxHeight: "72%",
  },
  filterModalHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    marginBottom: 10,
  },
  filterModalTitle: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: Colors.text,
  },
  filterModalClose: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: "#F3F4F6",
  },
  filterModalBody: {
    gap: 12,
    paddingBottom: 8,
  },
  filterSectionTitle: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: Colors.textSecondary,
  },
  filterSectionHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
  },
  filterChipsRow: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: 8,
    marginTop: 6,
  },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: Colors.white,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
  },
  filterChipActive: {
    borderColor: Colors.primary,
    backgroundColor: `${Colors.primary}12`,
  },
  filterChipText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  filterChipTextActive: {
    color: Colors.primary,
    fontWeight: "600" as const,
  },
  filterActionsRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 10,
    marginTop: 12,
  },
  filterClearBtn: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingVertical: 11,
  },
  filterClearBtnText: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: Colors.textSecondary,
  },
  filterApplyBtn: {
    flex: 1.3,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    paddingVertical: 11,
  },
  filterApplyBtnText: {
    fontSize: 13,
    fontWeight: "700" as const,
    color: Colors.white,
  },
  detailsOverlay: {
    position: "absolute" as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  detailsBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  detailsSheet: {
    position: "absolute" as const,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "80%",
  },
  detailsHandle: {
    alignSelf: "center" as const,
    width: 44,
    height: 5,
    borderRadius: 99,
    backgroundColor: "#D1D5DB",
    marginTop: 10,
  },
  detailsHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  detailsTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: Colors.text,
  },
  detailsSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  detailsClose: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: "#F3F4F6",
  },
  detailsScroll: {
    flexGrow: 0,
  },
  detailsBody: {
    padding: 16,
    gap: 12,
    paddingBottom: 28,
  },
  detailsHero: {
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingVertical: 12,
    backgroundColor: "#F6F8FC",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E8EDF5",
  },
  detailsHeroBanner: {
    width: "100%",
  },
  detailsHeroMeta: {
    width: "100%",
    alignItems: "center" as const,
    paddingTop: 10,
  },
  detailsHeroImage: {
    borderRadius: 14,
  },
  detailsHeroTitle: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: Colors.text,
    paddingHorizontal: 12,
  },
  detailsHeroSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: Colors.textSecondary,
    paddingHorizontal: 12,
  },
  detailsTopCards: {
    flexDirection: "row" as const,
    gap: 10,
  },
  detailsTopCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 10,
    gap: 2,
  },
  detailsTopCardLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  detailsTopCardValue: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: Colors.text,
  },
  progressWrap: {
    gap: 6,
  },
  progressTrack: {
    height: 8,
    borderRadius: 99,
    backgroundColor: "#E5E7EB",
    overflow: "hidden" as const,
  },
  progressFill: {
    height: "100%",
    borderRadius: 99,
    backgroundColor: Colors.primary,
  },
  progressText: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  detailsSection: {
    borderWidth: 1,
    borderColor: "#F1F5F9",
    borderRadius: 12,
    backgroundColor: Colors.white,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 6,
  },
  detailsSectionTitle: {
    fontSize: 12,
    fontWeight: "700" as const,
    color: Colors.text,
    marginBottom: 2,
  },
  detailRow: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "flex-start" as const,
    paddingVertical: 5,
    gap: 8,
  },
  detailLabelWrap: {
    flex: 1,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
  },
  detailLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  detailValue: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600" as const,
    color: Colors.text,
    textAlign: "right" as const,
    flexShrink: 1,
  },
  detailValueMono: {
    flex: 1,
    fontSize: 11,
    fontWeight: "600" as const,
    color: Colors.text,
    textAlign: "right" as const,
    fontFamily: "monospace",
    flexShrink: 1,
  },
  rolePill: {
    maxWidth: "58%" as const,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  detailValueRole: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: Colors.text,
    textAlign: "right" as const,
  },
} as const;
