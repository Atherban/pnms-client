import { MaterialIcons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  RefreshControl,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Seed, SeedService } from "../../services/seed.service";
import { Colors } from "../../theme";

const BOTTOM_NAV_HEIGHT = 80;
type RoleGroup = "staff" | "admin" | "viewer";

interface SeedsListScreenProps {
  title?: string;
  routeGroup: RoleGroup;
  canWrite?: boolean;
}

// ==================== UTILITIES ====================

const formatDate = (date: string) => {
  const d = new Date(date);
  if (isNaN(d.getTime())) return "—";

  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (d.toDateString() === today.toDateString()) {
    return `Today`;
  } else if (d.toDateString() === yesterday.toDateString()) {
    return `Yesterday`;
  }

  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatNumber = (num: number): string => {
  return num.toLocaleString("en-IN");
};

const getSeedStock = (seed: Seed) => {
  return Number((seed.totalPurchased ?? 0) - (seed.seedsUsed ?? 0));
};

const getMinStock = (seed: Seed) => Number(seed.plantType.minStockLevel ?? 10);

const getExpiryStatus = (expiryDate: string) => {
  const expiry = new Date(expiryDate);
  if (isNaN(expiry.getTime())) {
    return {
      status: "Unknown",
      color: "#6B7280",
      icon: "help",
      bg: "#F3F4F6",
    };
  }

  const today = new Date();
  const diffTime = expiry.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0)
    return {
      status: "Expired",
      color: "#DC2626",
      icon: "error",
      bg: "#FEF2F2",
    };
  if (diffDays <= 30)
    return {
      status: "Expiring Soon",
      color: "#D97706",
      icon: "warning",
      bg: "#FFFBEB",
    };
  return {
    status: "Valid",
    color: "#059669",
    icon: "check-circle",
    bg: "#ECFDF5",
  };
};

// ==================== SEARCH BAR ====================

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onClear: () => void;
  resultCount: number;
}

const SearchBar = ({
  value,
  onChangeText,
  onClear,
  resultCount,
}: SearchBarProps) => (
  <View style={styles.searchWrapper}>
    <View style={styles.searchContainer}>
      <View style={styles.searchInputContainer}>
        <MaterialIcons name="search" size={20} color={Colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, supplier, or category..."
          placeholderTextColor={Colors.textTertiary}
          value={value}
          onChangeText={onChangeText}
          returnKeyType="search"
        />
        {value.length > 0 && (
          <TouchableOpacity
            onPress={onClear}
            style={styles.searchClearButton}
            activeOpacity={0.7}
          >
            <MaterialIcons
              name="close"
              size={18}
              color={Colors.textSecondary}
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
    {value.length > 0 && (
      <Text style={styles.searchResults}>
        Found {resultCount} {resultCount === 1 ? "result" : "results"}
      </Text>
    )}
  </View>
);

// ==================== SEED CARD ====================

interface SeedCardProps {
  seed: Seed;
  onEdit: (id: string) => void;
  onDelete: (seed: Seed) => void;
  canWrite: boolean;
}

const SeedCard = ({ seed, onEdit, onDelete, canWrite }: SeedCardProps) => {
  const expiryStatus = getExpiryStatus(seed.expiryDate ?? "");
  const totalStock = seed.totalPurchased ?? 0;
  const availableStock = (seed.totalPurchased ?? 0) - (seed.seedsUsed ?? 0);
  const minStock = getMinStock(seed);
  const isLowStock = availableStock < minStock;
  const stockPercentage = Math.min(
    (availableStock / (totalStock || 1)) * 100,
    100,
  );

  return (
    <View style={styles.seedCard}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <View
            style={[
              styles.seedIcon,
              { backgroundColor: `${Colors.primary}10` },
            ]}
          >
            <MaterialIcons name="grass" size={20} color={Colors.primary} />
          </View>
          <View style={styles.seedInfo}>
            <Text style={styles.seedName} numberOfLines={1}>
              {seed.name}
            </Text>
            {(seed.category || seed.plantType?.name) && (
              <View
                style={[
                  styles.categoryBadge,
                  { backgroundColor: `${Colors.info}10` },
                ]}
              >
                <Text style={[styles.categoryText, { color: Colors.info }]}>
                  {seed.category || seed.plantType?.name}
                </Text>
              </View>
            )}
          </View>
        </View>
        <View
          style={[styles.statusBadge, { backgroundColor: expiryStatus.bg }]}
        >
          <MaterialIcons
            name={expiryStatus.icon as any}
            size={12}
            color={expiryStatus.color}
          />
          <Text style={[styles.statusText, { color: expiryStatus.color }]}>
            {expiryStatus.status}
          </Text>
        </View>
      </View>

      {/* Supplier */}
      {seed.supplierName && (
        <View style={styles.supplierRow}>
          <MaterialIcons
            name="business"
            size={14}
            color={Colors.textSecondary}
          />
          <Text style={styles.supplierText} numberOfLines={1}>
            {seed.supplierName}
          </Text>
        </View>
      )}

      {/* Stock Info */}
      <View style={styles.stockSection}>
        <View style={styles.stockHeader}>
          <View style={styles.stockLabelContainer}>
            <MaterialIcons
              name="inventory"
              size={14}
              color={Colors.textSecondary}
            />
            <Text style={styles.stockLabel}>Stock Level</Text>
          </View>
          {isLowStock && (
            <View
              style={[
                styles.lowStockBadge,
                { backgroundColor: `${Colors.warning}10` },
              ]}
            >
              <MaterialIcons name="warning" size={12} color={Colors.warning} />
              <Text style={[styles.lowStockText, { color: Colors.warning }]}>
                Low Stock
              </Text>
            </View>
          )}
        </View>
        <View style={styles.stockBarContainer}>
          <View style={styles.stockBarBackground}>
            <View
              style={[
                styles.stockBarFill,
                {
                  width: `${stockPercentage}%`,
                  backgroundColor: isLowStock ? Colors.warning : Colors.success,
                },
              ]}
            />
          </View>
          <Text style={styles.stockValue}>
            {formatNumber(availableStock)} / {formatNumber(totalStock)}
          </Text>
        </View>
      </View>

      {/* Details Grid */}
      <View style={styles.detailsGrid}>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Purchased</Text>
          <View style={styles.detailValueContainer}>
            <MaterialIcons
              name="shopping-cart"
              size={14}
              color={Colors.textSecondary}
            />
            <Text style={styles.detailValue}>
              {formatNumber(seed.totalPurchased ?? 0)}
            </Text>
          </View>
        </View>

        <View style={styles.detailDivider} />

        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Expiry</Text>
          <View style={styles.detailValueContainer}>
            <MaterialIcons
              name="event"
              size={14}
              color={Colors.textSecondary}
            />
            <Text style={styles.detailValue}>
              {formatDate(seed.expiryDate)}
            </Text>
          </View>
        </View>
      </View>

      {canWrite && (
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            onPress={() => onEdit(seed._id)}
            style={[styles.actionButton, styles.editButton]}
            activeOpacity={0.7}
          >
            <MaterialIcons name="edit" size={16} color={Colors.primary} />
            <Text style={styles.actionButtonText}>Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => onDelete(seed)}
            style={[styles.actionButton, styles.deleteButton]}
            activeOpacity={0.7}
          >
            <MaterialIcons
              name="delete-outline"
              size={16}
              color={Colors.error}
            />
            <Text style={[styles.actionButtonText, { color: Colors.error }]}>
              Delete
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

// ==================== EMPTY STATE ====================

interface EmptyStateProps {
  hasSearch: boolean;
  onClearSearch: () => void;
}

const EmptyState = ({ hasSearch, onClearSearch }: EmptyStateProps) => (
  <View style={styles.emptyContainer}>
    <View style={styles.emptyIconContainer}>
      <LinearGradient
        colors={[Colors.surface, Colors.background]}
        style={styles.emptyIconGradient}
      >
        <MaterialIcons
          name={hasSearch ? "search-off" : "grass"}
          size={48}
          color={Colors.textTertiary}
        />
      </LinearGradient>
    </View>

    <Text style={styles.emptyTitle}>
      {hasSearch ? "No Results Found" : "No Seeds Found"}
    </Text>

    <Text style={styles.emptyMessage}>
      {hasSearch
        ? "Try adjusting your search terms to find what you're looking for."
        : "No seeds have been added to the inventory yet."}
    </Text>

    {hasSearch && (
      <TouchableOpacity
        onPress={onClearSearch}
        style={styles.emptyButton}
        activeOpacity={0.7}
      >
        <LinearGradient
          colors={[Colors.primary, Colors.primaryLight || Colors.primary]}
          style={styles.emptyButtonGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <MaterialIcons name="clear-all" size={18} color={Colors.white} />
          <Text style={styles.emptyButtonText}>Clear Search</Text>
        </LinearGradient>
      </TouchableOpacity>
    )}
  </View>
);

// ==================== LOADING STATE ====================

const LoadingState = () => (
  <View style={styles.centerContainer}>
    <ActivityIndicator size="large" color={Colors.primary} />
    <Text style={styles.loadingText}>Loading seeds...</Text>
  </View>
);

// ==================== MAIN COMPONENT ====================

export function SeedsListScreen({
  title = "Seed Inventory",
  routeGroup,
  canWrite = false,
}: SeedsListScreenProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["seeds"],
    queryFn: SeedService.getAll,
  });

  const seeds = useMemo<Seed[]>(() => {
    if (!data) return [];
    return Array.isArray(data) ? data : (data.data ?? []);
  }, [data]);

  const filteredSeeds = useMemo(() => {
    if (!searchQuery.trim()) return seeds;

    const term = searchQuery.toLowerCase().trim();
    return seeds.filter(
      (s) =>
        s.name.toLowerCase().includes(term) ||
        s.supplierName?.toLowerCase().includes(term) ||
        s.category?.toLowerCase().includes(term) ||
        s.plantType?.name?.toLowerCase().includes(term),
    );
  }, [seeds, searchQuery]);

  const stats = useMemo(() => {
    const totalSeeds = seeds.length;
    const expiredSeeds = seeds.filter((s) => {
      const d = new Date(s.expiryDate);
      return !isNaN(d.getTime()) && d < new Date();
    }).length;
    const lowStockSeeds = seeds.filter(
      (s) => getSeedStock(s) < getMinStock(s),
    ).length;
    const validSeeds = totalSeeds - expiredSeeds;

    return { totalSeeds, expiredSeeds, lowStockSeeds, validSeeds };
  }, [seeds]);

  const handleDelete = useCallback(
    (seed: Seed) => {
      if (!canWrite) return;
      Alert.alert(
        "Delete Seed",
        `Are you sure you want to delete "${seed.name}"?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              try {
                await SeedService.delete(seed._id);
                await queryClient.invalidateQueries({ queryKey: ["seeds"] });
                Haptics.notificationAsync(
                  Haptics.NotificationFeedbackType.Success,
                );
              } catch (e: any) {
                Haptics.notificationAsync(
                  Haptics.NotificationFeedbackType.Error,
                );
                Alert.alert("Error", e?.message || "Failed to delete seed");
              }
            },
          },
        ],
      );
    },
    [canWrite, queryClient],
  );

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await refetch();
    } finally {
      setIsRefreshing(false);
    }
  }, [refetch]);

  const handleSearchChange = useCallback((text: string) => {
    setSearchQuery(text);
  }, []);

  const handleSearchClear = useCallback(() => {
    setSearchQuery("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const handleCreatePress = useCallback(() => {
    if (!canWrite) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push(`/${`(${routeGroup})`}/seeds/create`);
  }, [canWrite, routeGroup, router]);

  const handleEditPress = useCallback(
    (id: string) => {
      if (!canWrite) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.push({ pathname: `/${`(${routeGroup})`}/seeds/edit`, params: { id } });
    },
    [canWrite, routeGroup, router],
  );

  const renderItem = useCallback(
    ({ item }: { item: Seed }) => (
      <SeedCard
        seed={item}
        onEdit={handleEditPress}
        onDelete={handleDelete}
        canWrite={canWrite}
      />
    ),
    [canWrite, handleEditPress, handleDelete],
  );

  const keyExtractor = useCallback((item: Seed) => item._id, []);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <LoadingState />
      </SafeAreaView>
    );
  }

  const hasActiveSearch = searchQuery.length > 0;
  const hasRecords = seeds.length > 0;

  return (
    <View style={styles.container}>
      {/* Fixed Blue Header */}
      <LinearGradient
        colors={[Colors.primary, Colors.primaryLight || Colors.primary]}
        style={styles.headerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <SafeAreaView edges={["top"]} style={styles.headerContent}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.headerTitle}>{title}</Text>
              <Text style={styles.headerSubtitle}>
                {filteredSeeds.length}{" "}
                {filteredSeeds.length === 1 ? "seed" : "seeds"}
              </Text>
            </View>

            {canWrite && (
              <TouchableOpacity
                onPress={handleCreatePress}
                style={styles.createButton}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={[Colors.success, "#059669"]}
                  style={styles.createGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <MaterialIcons name="add" size={20} color={Colors.white} />
                  <Text style={styles.createButtonText}>Add Seed</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>

          {/* Stats Grid in Header */}
          {hasRecords && (
            <View style={styles.headerStatsContainer}>
              <View style={styles.statsRow}>
                <View style={styles.statCompactItem}>
                  <MaterialIcons name="grass" size={16} color={Colors.white} />
                  <Text style={styles.statCompactValue}>
                    {stats.totalSeeds}
                  </Text>
                  <Text style={styles.statCompactLabel}>Total</Text>
                </View>

                <View style={styles.statDivider} />

                <View style={styles.statCompactItem}>
                  <MaterialIcons
                    name="check-circle"
                    size={16}
                    color={Colors.white}
                  />
                  <Text style={styles.statCompactValue}>
                    {stats.validSeeds}
                  </Text>
                  <Text style={styles.statCompactLabel}>Valid</Text>
                </View>

                <View style={styles.statDivider} />

                <View style={styles.statCompactItem}>
                  <MaterialIcons
                    name="warning"
                    size={16}
                    color={Colors.white}
                  />
                  <Text style={styles.statCompactValue}>
                    {stats.lowStockSeeds}
                  </Text>
                  <Text style={styles.statCompactLabel}>Low</Text>
                </View>

                <View style={styles.statDivider} />

                <View style={styles.statCompactItem}>
                  <MaterialIcons name="error" size={16} color={Colors.white} />
                  <Text style={styles.statCompactValue}>
                    {stats.expiredSeeds}
                  </Text>
                  <Text style={styles.statCompactLabel}>Expired</Text>
                </View>
              </View>
            </View>
          )}
        </SafeAreaView>
      </LinearGradient>

      {/* Search Bar - Below Header */}
      <SearchBar
        value={searchQuery}
        onChangeText={handleSearchChange}
        onClear={handleSearchClear}
        resultCount={filteredSeeds.length}
      />

      {/* Content Area */}
      {hasRecords ? (
        <FlatList
          data={filteredSeeds}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              colors={[Colors.primary]}
              tintColor={Colors.primary}
              progressViewOffset={20}
            />
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <EmptyState
              hasSearch={hasActiveSearch}
              onClearSearch={handleSearchClear}
            />
          }
        />
      ) : (
        <View style={styles.emptyContainer}>
          <EmptyState hasSearch={false} onClearSearch={handleSearchClear} />
        </View>
      )}
    </View>
  );
}

// ==================== STYLES ====================

const styles = {
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },

  // Header Styles
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
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700" as const,
    color: Colors.white,
    marginBottom: 2,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.9)",
    fontWeight: "500" as const,
  },
  createButton: {
    borderRadius: 20,
    overflow: "hidden" as const,
  },
  createGradient: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 6,
    minWidth: 100,
  },
  createButtonText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: "600" as const,
  },
  headerStatsContainer: {
    marginTop: 4,
  },
  statsRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-around" as const,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  statCompactItem: {
    alignItems: "center" as const,
    flex: 1,
  },
  statCompactValue: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: Colors.white,
    marginTop: 2,
  },
  statCompactLabel: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.8)",
    fontWeight: "500" as const,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    marginHorizontal: 8,
  },

  // Stat Card Styles (for potential future use)
  statCard: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 12,
  },
  statIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: "#111827",
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500" as const,
  },

  // Search Bar Styles
  searchWrapper: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: "#F9FAFB",
  },
  searchContainer: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: Colors.white,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 12 : 0,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    height: 48,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#111827",
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginLeft: 4,
  },
  searchClearButton: {
    padding: 6,
  },
  searchResults: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 8,
    marginLeft: 4,
  },

  // List Content
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: BOTTOM_NAV_HEIGHT + 20,
  },

  // Center Container
  centerContainer: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: "#6B7280",
    fontWeight: "500" as const,
  },

  // Empty State
  emptyContainer: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingHorizontal: 24,
    paddingBottom: BOTTOM_NAV_HEIGHT + 24,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 20,
    overflow: "hidden" as const,
  },
  emptyIconGradient: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600" as const,
    color: "#111827",
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center" as const,
    marginBottom: 24,
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  emptyButton: {
    borderRadius: 12,
    overflow: "hidden" as const,
  },
  emptyButtonGradient: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingHorizontal: 24,
    paddingVertical: 12,
    gap: 8,
  },
  emptyButtonText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: "600" as const,
  },

  // Seed Card
  seedCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  cardHeader: {
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
    justifyContent: "space-between" as const,
    marginBottom: 12,
  },
  cardHeaderLeft: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 12,
    flex: 1,
  },
  seedIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  seedInfo: {
    flex: 1,
  },
  seedName: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: "#111827",
    marginBottom: 4,
  },
  categoryBadge: {
    alignSelf: "flex-start" as const,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: "600" as const,
  },
  statusBadge: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    gap: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600" as const,
  },
  supplierRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    marginBottom: 16,
    gap: 6,
  },
  supplierText: {
    fontSize: 13,
    color: "#6B7280",
    flex: 1,
  },

  // Stock Section
  stockSection: {
    marginBottom: 16,
  },
  stockHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    marginBottom: 8,
  },
  stockLabelContainer: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
  },
  stockLabel: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500" as const,
  },
  lowStockBadge: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    gap: 4,
  },
  lowStockText: {
    fontSize: 10,
    fontWeight: "600" as const,
  },
  stockBarContainer: {
    gap: 6,
  },
  stockBarBackground: {
    height: 8,
    backgroundColor: "#F3F4F6",
    borderRadius: 4,
    overflow: "hidden" as const,
  },
  stockBarFill: {
    height: "100%" as const,
    borderRadius: 4,
  },
  stockValue: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "right" as const,
  },

  // Details Grid
  detailsGrid: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 11,
    color: "#6B7280",
    marginBottom: 4,
  },
  detailValueContainer: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: "#111827",
  },
  detailDivider: {
    width: 1,
    height: 24,
    backgroundColor: "#E5E7EB",
    marginHorizontal: 12,
  },

  // Actions
  actionsContainer: {
    flexDirection: "row" as const,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 8,
  },
  editButton: {
    backgroundColor: `${Colors.primary}10`,
    borderWidth: 1,
    borderColor: `${Colors.primary}30`,
  },
  deleteButton: {
    backgroundColor: `${Colors.error}10`,
    borderWidth: 1,
    borderColor: `${Colors.error}30`,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: Colors.primary,
  },
} as const;
