import { MaterialIcons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { SowingService } from "../../services/sowing.service";
import { Colors } from "../../theme";

const BOTTOM_NAV_HEIGHT = 80;

type DateFilter = "ALL" | "TODAY" | "LAST_7_DAYS" | "LAST_30_DAYS";
type RoleFilter = "ALL" | "ADMIN" | "STAFF";

type SowingFilters = {
  dateRange: DateFilter;
  role: RoleFilter;
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
  quantityPendingGermination: number;
  performedBy: string;
  performerRole: "ADMIN" | "STAFF";
  sowingDate?: string;
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

const extractSowingDetails = (item: any): SowingDetails => {
  const seedObj =
    (typeof item?.seedId === "object" && item.seedId) ||
    (typeof item?.seed === "object" && item.seed) ||
    null;

  const plantObj =
    seedObj?.plantType ?? item?.plantType ?? item?.plantTypeId ?? null;

  const quantitySown = Number(item?.quantitySown ?? item?.quantity ?? 0) || 0;
  const quantityGerminated = Number(item?.quantityGerminated ?? 0) || 0;
  const quantityPendingGermination = Number(
    item?.quantityPendingGermination ??
      Math.max(0, quantitySown - quantityGerminated),
  );

  return {
    id: String(item?._id ?? item?.id ?? ""),
    seedName: seedObj?.name ?? item?.seedName ?? "Unknown Seed",
    supplierName: seedObj?.supplierName ?? item?.supplierName ?? "",
    plantName: plantObj?.name ?? item?.plantTypeName ?? "Unknown Plant",
    variety: plantObj?.variety ?? item?.variety ?? "",
    category: plantObj?.category ?? item?.category ?? "",
    quantitySown,
    quantityGerminated,
    quantityPendingGermination,
    performedBy: item?.performedBy?.name ?? "Unknown Staff",
    performerRole: item?.roleAtTime === "ADMIN" ? "ADMIN" : "STAFF",
    sowingDate: item?.sowingDate ?? item?.createdAt,
  };
};

interface StatsCardProps {
  totalSowings: number;
  totalSeeds: number;
  uniquePlants: number;
}

const StatsCard = ({
  totalSowings,
  totalSeeds,
  uniquePlants,
}: StatsCardProps) => (
  <View style={styles.statsCard}>
    <View style={styles.statsRow}>
      <View style={styles.statItem}>
        <MaterialIcons name="format-list-bulleted" size={16} color={Colors.white} />
        <Text style={styles.statNumber}>{formatNumber(totalSowings)}</Text>
        <Text style={styles.statLabel}>Records</Text>
      </View>
      <View style={styles.statDivider} />
      <View style={styles.statItem}>
        <MaterialIcons name="spa" size={16} color={Colors.white} />
        <Text style={styles.statNumber}>{formatNumber(totalSeeds)}</Text>
        <Text style={styles.statLabel}>Seeds Sown</Text>
      </View>
      <View style={styles.statDivider} />
      <View style={styles.statItem}>
        <MaterialIcons name="eco" size={16} color={Colors.white} />
        <Text style={styles.statNumber}>{formatNumber(uniquePlants)}</Text>
        <Text style={styles.statLabel}>Plant Types</Text>
      </View>
    </View>
  </View>
);

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onClear: () => void;
  resultCount: number;
  onFilterPress: () => void;
  activeFilterCount: number;
}

const SearchBar = ({
  value,
  onChangeText,
  onClear,
  resultCount,
  onFilterPress,
  activeFilterCount,
}: SearchBarProps) => (
  <View style={styles.searchWrapper}>
    <View style={styles.searchRow}>
      <View style={styles.searchContainer}>
        <MaterialIcons name="search" size={18} color="rgba(255,255,255,0.8)" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search seed, plant, supplier, staff..."
          placeholderTextColor="rgba(255,255,255,0.6)"
          value={value}
          onChangeText={onChangeText}
          returnKeyType="search"
        />
        {value.length > 0 && (
          <TouchableOpacity onPress={onClear} style={styles.searchClearButton}>
            <MaterialIcons name="close" size={16} color="rgba(255,255,255,0.8)" />
          </TouchableOpacity>
        )}
      </View>
      <Pressable
        onPress={onFilterPress}
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
            <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
          </View>
        )}
      </Pressable>
    </View>
    {value.length > 0 && (
      <Text style={styles.searchResults}>
        Found {resultCount} {resultCount === 1 ? "record" : "records"}
      </Text>
    )}
  </View>
);

const SowingCard = ({ details }: { details: SowingDetails }) => {
  const roleColor =
    details.performerRole === "ADMIN" ? "#8B5CF6" : Colors.primary;
  const roleBg = details.performerRole === "ADMIN" ? "#F5F3FF" : "#EFF6FF";

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <View style={styles.plantIcon}>
            <MaterialIcons name="spa" size={20} color={Colors.primary} />
          </View>
          <View style={styles.titleBlock}>
            <Text style={styles.plantName} numberOfLines={1}>
              {details.plantName}
              {details.variety ? ` (${details.variety})` : ""}
            </Text>
            <Text style={styles.seedName} numberOfLines={1}>
              {details.seedName}
              {details.supplierName ? ` • ${details.supplierName}` : ""}
            </Text>
          </View>
        </View>
        <View style={[styles.roleBadge, { backgroundColor: roleBg }]}>
          <MaterialIcons
            name={
              details.performerRole === "ADMIN" ? "verified-user" : "person"
            }
            size={12}
            color={roleColor}
          />
          <Text style={[styles.roleText, { color: roleColor }]}>
            {details.performerRole}
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
            color={Colors.textTertiary}
          />
          <Text style={styles.footerText}>
            {details.category || "Uncategorized"}
          </Text>
        </View>
        <View style={styles.footerItem}>
          <MaterialIcons name="person" size={12} color={Colors.textTertiary} />
          <Text style={styles.footerText}>{details.performedBy}</Text>
        </View>
        <View style={styles.footerItem}>
          <MaterialIcons
            name="calendar-today"
            size={12}
            color={Colors.textTertiary}
          />
          <Text style={styles.footerText}>
            {formatDate(details.sowingDate)}
          </Text>
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
      color={Colors.textTertiary}
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
                color={Colors.textSecondary}
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

            <Text style={styles.filterSectionTitle}>Role</Text>
            <View style={styles.filterChipsRow}>
              {["ALL", "ADMIN", "STAFF"].map((role) => (
                <Pressable
                  key={role}
                  onPress={() => setField("role", role as RoleFilter)}
                  style={[
                    styles.filterChip,
                    local.role === role && styles.filterChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      local.role === role && styles.filterChipTextActive,
                    ]}
                  >
                    {role === "ALL" ? "All Roles" : role}
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
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [isFilterVisible, setIsFilterVisible] = useState(false);
  const [filters, setFilters] = useState<SowingFilters>({
    dateRange: "ALL",
    role: "ALL",
    category: "ALL",
  });

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["sowings"],
    queryFn: SowingService.getAll,
    staleTime: 60_000,
    retry: 2,
  });

  const sowings = useMemo(() => (Array.isArray(data) ? data : []), [data]);

  const detailedRecords = useMemo(
    () => sowings.map((item: any) => extractSowingDetails(item)),
    [sowings],
  );

  const categories = useMemo(
    () =>
      Array.from(
        new Set(
          detailedRecords
            .map((item) => item.category)
            .filter((item) => Boolean(item)),
        ),
      ).sort(),
    [detailedRecords],
  );

  const filtered = useMemo(() => {
    const term = searchQuery.trim().toLowerCase();
    return detailedRecords.filter((item) => {
      const matchesSearch =
        !term ||
        [
          item.seedName,
          item.supplierName,
          item.plantName,
          item.variety,
          item.category,
          item.performedBy,
        ]
          .join(" ")
          .toLowerCase()
          .includes(term);

      const matchesDate = isInDateRange(item.sowingDate, filters.dateRange);
      const matchesRole =
        filters.role === "ALL" || item.performerRole === filters.role;
      const matchesCategory =
        filters.category === "ALL" || item.category === filters.category;

      return matchesSearch && matchesDate && matchesRole && matchesCategory;
    });
  }, [detailedRecords, searchQuery, filters]);

  const stats = useMemo(() => {
    const totalSowings = detailedRecords.length;
    const totalSeeds = detailedRecords.reduce(
      (sum, item) => sum + item.quantitySown,
      0,
    );
    const uniquePlants = new Set(
      detailedRecords.map((item) => item.plantName).filter(Boolean),
    ).size;
    return { totalSowings, totalSeeds, uniquePlants };
  }, [detailedRecords]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.dateRange !== "ALL") count += 1;
    if (filters.role !== "ALL") count += 1;
    if (filters.category !== "ALL") count += 1;
    return count;
  }, [filters]);

  const clearFilters = useCallback(() => {
    setFilters({ dateRange: "ALL", role: "ALL", category: "ALL" });
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleClearSearch = useCallback(() => {
    setSearchQuery("");
  }, []);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading sowing records...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <View style={styles.centerContainer}>
          <MaterialIcons name="error-outline" size={48} color={Colors.error} />
          <Text style={styles.errorTitle}>Failed to Load Records</Text>
          <Text style={styles.errorMessage}>
            {(error as any)?.message || "Please try again"}
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
      <LinearGradient
        colors={[Colors.primary, Colors.primaryLight || Colors.primary]}
        style={styles.headerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <SafeAreaView edges={["top"]} style={styles.headerContent}>
          <View style={styles.headerRow}>
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>{title}</Text>
              <Text style={styles.headerSubtitle}>
                {filtered.length} {filtered.length === 1 ? "record" : "records"}
              </Text>
            </View>
            {canCreate && onCreatePress && (
              <TouchableOpacity
                onPress={onCreatePress}
                style={styles.headerCreateButton}
              >
                <MaterialIcons name="add" size={18} color={Colors.primary} />
                <Text style={styles.headerCreateText}>Record</Text>
              </TouchableOpacity>
            )}
          </View>
          <SearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            onClear={handleClearSearch}
            resultCount={filtered.length}
            onFilterPress={() => setIsFilterVisible(true)}
            activeFilterCount={activeFilterCount}
          />

          {activeFilterCount > 0 && (
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
          )}
          {detailedRecords.length > 0 && (
            <StatsCard
              totalSowings={stats.totalSowings}
              totalSeeds={stats.totalSeeds}
              uniquePlants={stats.uniquePlants}
            />
          )}
        </SafeAreaView>
      </LinearGradient>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <SowingCard details={item} />}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
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

const styles = {
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  headerGradient: {
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  headerContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700" as const,
    color: Colors.white,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.9)",
    fontWeight: "500" as const,
  },
  headerCreateButton: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
    backgroundColor: Colors.white,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.7)",
  },
  headerCreateText: {
    fontSize: 12,
    fontWeight: "700" as const,
    color: Colors.primary,
  },
  statsCard: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  statsRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
  },
  statItem: {
    flex: 1,
    alignItems: "center" as const,
  },
  statNumber: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: Colors.white,
    marginTop: 4,
  },
  statLabel: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.8)",
    fontWeight: "500" as const,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    marginHorizontal: 8,
  },
  searchWrapper: {
    marginTop: 12,
    marginBottom: 4,
  },
  searchRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
  },
  searchContainer: {
    flex: 1,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    height: 46,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.white,
    padding: 0,
  },
  searchClearButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
  },
  filterButton: {
    width: 46,
    height: 46,
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
  searchResults: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.85)",
    marginTop: 6,
    marginLeft: 4,
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
    paddingTop: 4,
    paddingBottom: BOTTOM_NAV_HEIGHT + 28,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  cardHeader: {
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
    justifyContent: "space-between" as const,
    marginBottom: 10,
    gap: 8,
  },
  cardHeaderLeft: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    flex: 1,
    gap: 10,
  },
  plantIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: `${Colors.primary}10`,
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
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingVertical: 48,
    paddingHorizontal: 20,
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
    backgroundColor: Colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  emptyButtonText: {
    color: Colors.white,
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
    color: Colors.error,
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
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  retryButtonText: {
    color: Colors.white,
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
} as const;
