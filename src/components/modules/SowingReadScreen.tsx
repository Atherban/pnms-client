import { MaterialIcons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { GerminationService } from "../../services/germination.service";
import { SowingService } from "../../services/sowing.service";
import { useAuthStore } from "../../stores/auth.store";
import { toImageUrl } from "../../utils/image";
import { canViewSourcingDetails } from "../../utils/rbac";
import BannerCardImage from "../ui/BannerCardImage";
import { AdminTheme } from "../admin/theme";
import ModuleScreenHeader from "../common/ModuleScreenHeader";
import ModuleScreenIntro from "../common/ModuleScreenIntro";
import { moduleBadge } from "../common/moduleStyles";
import { Colors } from "@/src/theme";

const BOTTOM_NAV_HEIGHT = 80;

type DateFilter = "ALL" | "TODAY" | "LAST_7_DAYS" | "LAST_30_DAYS";

type SowingFilters = {
  dateRange: DateFilter;
  category: string;
};

type SowingDetails = {
  id: string;
  seedName: string;
  supplierName: string;
  plantName: string;
  variety: string;
  category: string;
  quantitySown: number;
  quantityGerminated: number;
  quantityDiscarded: number;
  quantityPendingGermination: number;
  performedBy: string;
  performerRole: "NURSERY_ADMIN" | "SUPER_ADMIN" | "STAFF";
  performerRoles: ("NURSERY_ADMIN" | "SUPER_ADMIN" | "STAFF")[];
  expectedSeedQtyPerBatch: number | null;
  sowingDate?: string;
  thumbnail?: string;
  sourceCount: number;
};

type GerminationSummary = {
  germinated: number;
  discarded: number;
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

const firstNumber = (...values: unknown[]): number | null => {
  for (const value of values) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
};

const sumFromGerminations = (
  item: any,
  selector: (entry: any) => unknown,
): number => {
  if (!Array.isArray(item?.germinations)) return 0;
  return item.germinations.reduce((sum: number, entry: any) => {
    const parsed = Number(selector(entry));
    return Number.isFinite(parsed) ? sum + parsed : sum;
  }, 0);
};

const getQuantityGerminated = (item: any): number => {
  const direct = firstNumber(
    item?.quantityGerminated,
    item?.germinatedSeeds,
    item?.totalGerminated,
    item?.germinationSummary?.germinatedSeeds,
    item?.summary?.germinatedSeeds,
    item?.latestGermination?.germinatedSeeds,
  );
  if (direct != null) return Math.max(0, direct);
  return Math.max(
    0,
    sumFromGerminations(item, (entry) => entry?.germinatedSeeds),
  );
};

const getQuantityDiscarded = (item: any): number => {
  // console.log(item);

  const direct = firstNumber(
    item?.quantityDiscarded,
    item?.discardedSeeds,
    item?.discarded,
    item?.totalDiscarded,
    item?.germinationSummary?.discardedSeeds,
    item?.summary?.discardedSeeds,
    item?.latestGermination?.discardedSeeds,
  );
  if (direct != null) return Math.max(0, direct);
  return Math.max(
    0,
    sumFromGerminations(item, (entry) => entry?.discardedSeeds),
  );
};

const isInDateRange = (dateString: string | undefined, range: DateFilter) => {
  if (range === "ALL") return true;
  if (!dateString) return false;

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return false;

  const today = new Date();
  const startOfToday = new Date(today);
  startOfToday.setHours(0, 0, 0, 0);

  if (range === "TODAY") {
    return date >= startOfToday;
  }

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

const extractSowingDetails = (
  item: any,
  germinationSummary?: GerminationSummary,
): SowingDetails => {
  const seedObj =
    (typeof item?.seedId === "object" && item.seedId) ||
    (typeof item?.seed === "object" && item.seed) ||
    null;

  const plantObj =
    seedObj?.plantType ?? item?.plantType ?? item?.plantTypeId ?? null;

  const quantitySown = Number(item?.quantitySown ?? item?.quantity ?? 0) || 0;
  const quantityGerminated =
    germinationSummary?.germinated ?? getQuantityGerminated(item);
  const quantityDiscarded =
    germinationSummary?.discarded ?? getQuantityDiscarded(item);
  const quantityPendingGermination = Math.max(
    0,
    quantitySown - quantityGerminated - quantityDiscarded,
  );
  const rawRole = String(item?.roleAtTime || "").toUpperCase();
  const performerRole: SowingDetails["performerRole"] =
    rawRole === "NURSERY_ADMIN" || rawRole === "SUPER_ADMIN"
      ? rawRole
      : "STAFF";

  return {
    id: String(item?._id ?? item?.id ?? ""),
    seedName: seedObj?.name ?? item?.seedName ?? "Unknown Seed",
    supplierName: seedObj?.supplierName ?? item?.supplierName ?? "",
    plantName: plantObj?.name ?? item?.plantTypeName ?? "Unknown Plant",
    variety: plantObj?.variety ?? item?.variety ?? "",
    category: plantObj?.category ?? item?.category ?? "",
    quantitySown,
    quantityGerminated,
    quantityDiscarded,
    quantityPendingGermination,
    expectedSeedQtyPerBatch:
      Number(plantObj?.expectedSeedQtyPerBatch) > 0
        ? Number(plantObj?.expectedSeedQtyPerBatch)
        : null,
    performedBy: item?.performedBy?.name ?? "Unknown Staff",
    performerRole,
    performerRoles: [performerRole],
    sowingDate: item?.sowingDate ?? item?.createdAt,
    thumbnail: toImageUrl(
      plantObj?.imageUrl ??
        (Array.isArray(plantObj?.images)
          ? plantObj.images[0]?.fileName
          : undefined) ??
        seedObj?.imageUrl ??
        (Array.isArray(seedObj?.images)
          ? seedObj.images[0]?.fileName
          : undefined),
    ),
    sourceCount: 1,
  };
};

const getSowingMergeKey = (item: SowingDetails) =>
  [
    item.seedName || "-",
    item.plantName || "-",
    item.variety || "-",
    item.supplierName || "-",
  ].join("|");

const mergeSowingDetails = (rows: SowingDetails[]): SowingDetails[] => {
  const grouped = new Map<string, SowingDetails>();

  for (const row of rows) {
    const key = getSowingMergeKey(row);
    const existing = grouped.get(key);

    if (!existing) {
      grouped.set(key, { ...row });
      continue;
    }

    const mergedRoles = Array.from(
      new Set([...existing.performerRoles, ...row.performerRoles]),
    ) as ("NURSERY_ADMIN" | "SUPER_ADMIN" | "STAFF")[];
    const latestDate = [existing.sowingDate, row.sowingDate]
      .filter(Boolean)
      .sort(
        (a, b) =>
          new Date(b as string).getTime() - new Date(a as string).getTime(),
      )[0];

    existing.quantitySown += row.quantitySown;
    existing.quantityGerminated += row.quantityGerminated;
    existing.quantityDiscarded += row.quantityDiscarded;
    existing.quantityPendingGermination = Math.max(
      0,
      existing.quantitySown -
        existing.quantityGerminated -
        existing.quantityDiscarded,
    );
    existing.sourceCount += row.sourceCount;
    existing.performerRoles = mergedRoles;
    existing.performerRole =
      mergedRoles.length === 1 ? mergedRoles[0] : existing.performerRole;
    existing.performedBy =
      existing.performedBy === row.performedBy
        ? existing.performedBy
        : "Multiple Staff";
    existing.sowingDate = latestDate ?? existing.sowingDate;
    existing.id = key;
  }

  return Array.from(grouped.values()).sort(
    (a, b) =>
      new Date(b.sowingDate ?? 0).getTime() -
      new Date(a.sowingDate ?? 0).getTime(),
  );
};

const SowingCard = ({
  details,
  showSourcingDetails,
}: {
  details: SowingDetails;
  showSourcingDetails: boolean;
}) => {
  return (
    <View style={styles.card}>
      <BannerCardImage
        uri={details.thumbnail}
        label={details.plantName}
        iconName="spa"
        containerStyle={styles.cardImageBanner}
      />

      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <View style={styles.titleBlock}>
            <Text style={styles.plantName} numberOfLines={1}>
              {details.plantName}
              {details.variety ? ` (${details.variety})` : ""}
            </Text>
            <Text style={styles.seedName} numberOfLines={1}>
              {details.seedName}
              {showSourcingDetails && details.supplierName
                ? ` • ${details.supplierName}`
                : ""}
            </Text>
          </View>
        </View>

        <View style={styles.metricsRow}>
          <View style={styles.metricBlock}>
            <Text style={styles.metricLabel}>Sown</Text>
            <Text style={styles.metricValue}>
              {formatNumber(details.quantitySown)}
            </Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricBlock}>
            <Text style={styles.metricLabel}>Germinated</Text>
            <Text style={styles.metricValue}>
              {formatNumber(details.quantityGerminated)}
            </Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricBlock}>
            <Text style={styles.metricLabel}>Discarded</Text>
            <Text style={styles.metricValue}>
              {formatNumber(details.quantityDiscarded)}
            </Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricBlock}>
            <Text style={styles.metricLabel}>Pending</Text>
            <Text style={styles.metricValue}>
              {formatNumber(details.quantityPendingGermination)}
            </Text>
          </View>
        </View>

        <View style={styles.footerRow}>
          <View style={styles.footerItem}>
            <MaterialIcons
              name="category"
              size={12}
              color={AdminTheme.colors.textSoft}
            />
            <Text style={styles.footerText}>
              {details.category || "Uncategorized"}
            </Text>
          </View>
          <View style={styles.footerItem}>
            <MaterialIcons name="person" size={12} color={AdminTheme.colors.textSoft} />
            <Text style={styles.footerText}>{details.performedBy}</Text>
          </View>
          <View style={styles.footerItem}>
            <MaterialIcons
              name="calendar-today"
              size={12}
              color={AdminTheme.colors.textSoft}
            />
            <Text style={styles.footerText}>
              {formatDate(details.sowingDate)}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const EmptyState = ({
  hasSearch,
  onClearSearch,
  canCreate,
  onCreatePress,
}: {
  hasSearch: boolean;
  onClearSearch: () => void;
  canCreate?: boolean;
  onCreatePress?: () => void;
}) => (
  <View style={styles.emptyContainer}>
    <MaterialIcons
      name={hasSearch ? "search-off" : "grass"}
      size={56}
      color={AdminTheme.colors.textSoft}
    />
    <Text style={styles.emptyTitle}>
      {hasSearch ? "No Matching Records" : "No Sowing Records"}
    </Text>
    <Text style={styles.emptyMessage}>
      {hasSearch
        ? "Try different keywords or adjust filters."
        : "Sowing records will appear here once created."}
    </Text>
    {hasSearch ? (
      <TouchableOpacity onPress={onClearSearch} style={styles.emptyButton}>
        <Text style={styles.emptyButtonText}>Clear Search</Text>
      </TouchableOpacity>
    ) : (
      canCreate &&
      onCreatePress && (
        <TouchableOpacity onPress={onCreatePress} style={styles.emptyButton}>
          <Text style={styles.emptyButtonText}>Record Sowing</Text>
        </TouchableOpacity>
      )
    )}
  </View>
);

const SowingFilterModal = ({
  visible,
  filters,
  categories,
  onApply,
  onClear,
  onClose,
}: {
  visible: boolean;
  filters: SowingFilters;
  categories: string[];
  onApply: (next: SowingFilters) => void;
  onClear: () => void;
  onClose: () => void;
}) => {
  const [local, setLocal] = useState<SowingFilters>(filters);

  const setField = <K extends keyof SowingFilters>(
    key: K,
    value: SowingFilters[K],
  ) => {
    setLocal((prev) => ({ ...prev, [key]: value }));
  };

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
            <Text style={styles.filterModalTitle}>Filter Sowing</Text>
            <Pressable onPress={onClose} style={styles.filterModalClose}>
              <MaterialIcons
                name="close"
                size={18}
                color={AdminTheme.colors.textMuted}
              />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.filterModalBody}
          >
            <Text style={styles.filterSectionTitle}>Date Range</Text>
            <View style={styles.filterChipsRow}>
              {[
                { id: "ALL", label: "All" },
                { id: "TODAY", label: "Today" },
                { id: "LAST_7_DAYS", label: "Last 7 Days" },
                { id: "LAST_30_DAYS", label: "Last 30 Days" },
              ].map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => setField("dateRange", item.id as DateFilter)}
                  style={[
                    styles.filterChip,
                    local.dateRange === item.id && styles.filterChipActive,
                  ]}
                >
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

            <Text style={styles.filterSectionTitle}>Category</Text>
            <View style={styles.filterChipsRow}>
              <Pressable
                onPress={() => setField("category", "ALL")}
                style={[
                  styles.filterChip,
                  local.category === "ALL" && styles.filterChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    local.category === "ALL" && styles.filterChipTextActive,
                  ]}
                >
                  All Categories
                </Text>
              </Pressable>
              {categories.map((category) => (
                <Pressable
                  key={category}
                  onPress={() => setField("category", category)}
                  style={[
                    styles.filterChip,
                    local.category === category && styles.filterChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      local.category === category &&
                        styles.filterChipTextActive,
                    ]}
                  >
                    {category}
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

interface SowingReadScreenProps {
  title: string;
  canCreate?: boolean;
  onCreatePress?: () => void;
}

export function SowingReadScreen({
  title,
  canCreate = false,
  onCreatePress,
}: SowingReadScreenProps) {
  const router = useRouter();
  const role = useAuthStore((state) => state.user?.role);
  const showSourcingDetails = canViewSourcingDetails(role);
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [isFilterVisible, setIsFilterVisible] = useState(false);
  const [filters, setFilters] = useState<SowingFilters>({
    dateRange: "ALL",
    category: "ALL",
  });

  const {
    data: sowingData,
    isLoading: isLoadingSowing,
    error: sowingError,
    refetch,
  } = useQuery({
    queryKey: ["sowings"],
    queryFn: SowingService.getAll,
    staleTime: 60_000,
    retry: 2,
  });

  const { data: germinationData } = useQuery({
    queryKey: ["germination"],
    queryFn: GerminationService.getAll,
    staleTime: 60_000,
    retry: 2,
  });

  const sowings = useMemo(
    () => (Array.isArray(sowingData) ? sowingData : []),
    [sowingData],
  );

  const germinationBySowingId = useMemo(() => {
    const map = new Map<string, GerminationSummary>();
    const records = Array.isArray(germinationData) ? germinationData : [];

    for (const record of records as any[]) {
      const sowingId = String(
        record?.sowingId?._id ?? record?.sowingId?.id ?? record?.sowingId ?? "",
      );
      if (!sowingId) continue;

      const germinated = Number(record?.germinatedSeeds ?? 0) || 0;
      const discarded = Number(record?.discardedSeeds ?? 0) || 0;
      const current = map.get(sowingId) ?? { germinated: 0, discarded: 0 };
      current.germinated += germinated;
      current.discarded += discarded;
      map.set(sowingId, current);
    }

    return map;
  }, [germinationData]);

  const detailedRecords = useMemo(
    () =>
      sowings.map((item: any) => {
        const sowingId = String(item?._id ?? item?.id ?? "");
        return extractSowingDetails(item, germinationBySowingId.get(sowingId));
      }),
    [germinationBySowingId, sowings],
  );
  const mergedRecords = useMemo(
    () => mergeSowingDetails(detailedRecords),
    [detailedRecords],
  );

  const categories = useMemo(
    () =>
      Array.from(
        new Set(
          mergedRecords
            .map((item) => item.category)
            .filter((item) => Boolean(item)),
        ),
      ).sort(),
    [mergedRecords],
  );

  const filtered = useMemo(() => {
    const term = searchQuery.trim().toLowerCase();
    return mergedRecords.filter((item) => {
      const matchesSearch =
        !term ||
        [
          item.seedName,
          showSourcingDetails ? item.supplierName : "",
          item.plantName,
          item.variety,
          item.category,
          item.performedBy,
        ]
          .join(" ")
          .toLowerCase()
          .includes(term);

      const matchesDate = isInDateRange(item.sowingDate, filters.dateRange);
      const matchesCategory =
        filters.category === "ALL" || item.category === filters.category;

      return matchesSearch && matchesDate && matchesCategory;
    });
  }, [mergedRecords, searchQuery, filters, showSourcingDetails]);

  const stats = useMemo(() => {
    const totalSowings = mergedRecords.length;
    const totalSeeds = mergedRecords.reduce(
      (sum, item) => sum + item.quantitySown,
      0,
    );
    const totalDiscarded = mergedRecords.reduce(
      (sum, item) => sum + item.quantityDiscarded,
      0,
    );
    const uniquePlants = new Set(
      mergedRecords.map((item) => item.plantName).filter(Boolean),
    ).size;
    return { totalSowings, totalSeeds, totalDiscarded, uniquePlants };
  }, [mergedRecords]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.dateRange !== "ALL") count += 1;
    if (filters.category !== "ALL") count += 1;
    return count;
  }, [filters]);

  const clearFilters = useCallback(() => {
    setFilters({ dateRange: "ALL", category: "ALL" });
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleClearSearch = useCallback(() => {
    setSearchQuery("");
  }, []);

  if (isLoadingSowing) {
    return (
      <SafeAreaView style={styles.container} edges={["left", "right"]}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={AdminTheme.colors.primary} />
          <Text style={styles.loadingText}>Loading sowing records...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (sowingError) {
    return (
      <SafeAreaView style={styles.container} edges={["left", "right"]}>
        <View style={styles.centerContainer}>
          <MaterialIcons name="error-outline" size={48} color={AdminTheme.colors.danger} />
          <Text style={styles.errorTitle}>Failed to Load Records</Text>
          <Text style={styles.errorMessage}>
            {(sowingError as any)?.message || "Please try again"}
          </Text>
          <TouchableOpacity onPress={handleRefresh} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <ModuleScreenHeader
        title={title}
        subtitle={`${filtered.length} ${
          filtered.length === 1 ? "record" : "records"
        }`}
        onBack={() => router.back()}
        actions={
          canCreate && onCreatePress ? (
            <TouchableOpacity
              onPress={onCreatePress}
              style={styles.headerCreateButton}
            >
              <View
                            style={[
                              styles.addGradient,
                            ]}
                          >

              <MaterialIcons name="add" size={20} color={Colors.white}  />
                          </View>
            </TouchableOpacity>
          ) : null
        }
      />
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <SowingCard details={item} showSourcingDetails={showSourcingDetails} />
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[AdminTheme.colors.primary]}
            tintColor={AdminTheme.colors.primary}
          />
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <ModuleScreenIntro
            stats={
              mergedRecords.length > 0
                ? [
                    {
                      label: "Records",
                      value: formatNumber(stats.totalSowings),
                      icon: "format-list-bulleted",
                      tone: "info",
                    },
                    {
                      label: "Seeds Sown",
                      value: formatNumber(stats.totalSeeds),
                      icon: "spa",
                      tone: "success",
                    },
                    {
                      label: "Discarded",
                      value: formatNumber(stats.totalDiscarded),
                      icon: "delete-outline",
                      tone: "danger",
                    },
                    {
                      label: "Plant Types",
                      value: formatNumber(stats.uniquePlants),
                      icon: "eco",
                      tone: "warning",
                    },
                  ]
                : undefined
            }
            search={{
              value: searchQuery,
              onChangeText: setSearchQuery,
              onClear: handleClearSearch,
              placeholder: showSourcingDetails
                ? "Search seed, plant, supplier, staff..."
                : "Search seed, plant, staff...",
              onFilterPress: () => setIsFilterVisible(true),
              activeFilterCount,
              resultText: searchQuery.length
                ? `Found ${filtered.length} ${
                    filtered.length === 1 ? "record" : "records"
                  }`
                : undefined,
            }}
            helperRow={
              activeFilterCount > 0 ? (
                <View style={styles.activeFilterRow}>
                  <Text style={styles.activeFilterText}>
                    Filters active: {activeFilterCount}
                  </Text>
                  <Pressable
                    onPress={clearFilters}
                    style={styles.activeFilterClear}
                  >
                    <Text style={styles.activeFilterClearText}>Clear</Text>
                  </Pressable>
                </View>
              ) : null
            }
          />
        }
        ListEmptyComponent={
          <EmptyState
            hasSearch={searchQuery.length > 0}
            onClearSearch={handleClearSearch}
            canCreate={canCreate}
            onCreatePress={onCreatePress}
          />
        }
      />

      <SowingFilterModal
        visible={isFilterVisible}
        filters={filters}
        categories={categories}
        onApply={setFilters}
        onClear={clearFilters}
        onClose={() => setIsFilterVisible(false)}
      />
    </View>
  );
}

const cardSurface = {
  borderWidth: 1,
  borderColor: AdminTheme.colors.borderSoft,
  borderRadius: AdminTheme.radius.lg,
  backgroundColor: AdminTheme.colors.surface,
  ...AdminTheme.shadow.card,
};

const styles = {
  container: {
    flex: 1,
    backgroundColor: AdminTheme.colors.background,
  },
  headerCreateButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  addGradient: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    width: "100%",
    height: "100%",
  },
  activeFilterRow: {
    marginHorizontal: AdminTheme.spacing.lg,
    marginBottom: 6,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
  },
  activeFilterText: {
    fontSize: 12,
    color: AdminTheme.colors.textMuted,
  },
  activeFilterClear: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: `${AdminTheme.colors.primary}10`,
  },
  activeFilterClearText: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: AdminTheme.colors.primary,
  },
  listContent: {
    paddingHorizontal: AdminTheme.spacing.lg,
    paddingTop: 2,
    paddingBottom: BOTTOM_NAV_HEIGHT + 28,
  },
  card: {
    ...cardSurface,
    backgroundColor: AdminTheme.colors.surface,
    borderRadius: 20,
    marginBottom: AdminTheme.spacing.md,
    overflow: "hidden" as const,
    borderWidth: 1,
    borderColor: AdminTheme.colors.borderSoft,
    shadowColor: AdminTheme.colors.borderSoft,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardContent: {
    padding: AdminTheme.spacing.lg,
  },
  cardHeader: {
    marginBottom: 10,
  },
  cardImageBanner: {
    width: "100%" as const,
    minHeight: 140,
    borderRadius: 0,
    marginBottom: 0,
  },
  bannerRoleBadge: {
    ...moduleBadge,
    position: "absolute" as const,
    top: 8,
    right: 8,
  },
  cardHeaderLeft: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
  },
  plantIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: `${AdminTheme.colors.primary}10`,
  },
  titleBlock: {
    flex: 1,
  },
  plantName: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: "#111827",
    marginBottom: 2,
  },
  seedName: {
    fontSize: 12,
    color: "#6B7280",
  },
  roleBadge: {
    ...moduleBadge,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 14,
    gap: 4,
  },
  roleText: {
    fontSize: 10,
    fontWeight: "600" as const,
  },
  metricsRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    borderRadius: 10,
    backgroundColor: "#F9FAFB",
    paddingVertical: 10,
    marginBottom: 10,
  },
  metricBlock: {
    flex: 1,
    alignItems: "center" as const,
  },
  metricLabel: {
    fontSize: 11,
    color: "#6B7280",
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: "#111827",
  },
  metricDivider: {
    width: 1,
    height: 24,
    backgroundColor: "#E5E7EB",
  },
  footerRow: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: 10,
  },
  footerItem: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
  },
  footerText: {
    fontSize: 11,
    color: "#6B7280",
  },
  emptyContainer: {
    ...cardSurface,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingVertical: 48,
    paddingHorizontal: AdminTheme.spacing.lg,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: "#111827",
    marginTop: 10,
    marginBottom: 4,
  },
  emptyMessage: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center" as const,
    marginBottom: 16,
    lineHeight: 18,
    paddingHorizontal: 20,
  },
  emptyButton: {
    borderRadius: 10,
    backgroundColor: AdminTheme.colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  emptyButtonText: {
    color: AdminTheme.colors.surface,
    fontSize: 13,
    fontWeight: "600" as const,
  },
  centerContainer: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#6B7280",
  },
  errorTitle: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: "600" as const,
    color: AdminTheme.colors.danger,
  },
  errorMessage: {
    marginTop: 6,
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center" as const,
    marginBottom: 14,
  },
  retryButton: {
    borderRadius: 10,
    backgroundColor: AdminTheme.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  retryButtonText: {
    color: AdminTheme.colors.surface,
    fontSize: 13,
    fontWeight: "600" as const,
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
    backgroundColor: AdminTheme.colors.surface,
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
    color: AdminTheme.colors.text,
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
    color: AdminTheme.colors.textMuted,
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
    backgroundColor: AdminTheme.colors.surface,
  },
  filterChipActive: {
    borderColor: AdminTheme.colors.primary,
    backgroundColor: `${AdminTheme.colors.primary}12`,
  },
  filterChipText: {
    fontSize: 12,
    color: AdminTheme.colors.textMuted,
  },
  filterChipTextActive: {
    color: AdminTheme.colors.primary,
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
    color: AdminTheme.colors.textMuted,
  },
  filterApplyBtn: {
    flex: 1.3,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderRadius: 10,
    backgroundColor: AdminTheme.colors.primary,
    paddingVertical: 11,
  },
  filterApplyBtnText: {
    fontSize: 13,
    fontWeight: "700" as const,
    color: AdminTheme.colors.surface,
  },
} as const;
