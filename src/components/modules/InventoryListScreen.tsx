import { MaterialIcons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import EntityThumbnail from "../ui/EntityThumbnail";
import { InventoryService } from "../../services/inventory.service";
import { Colors, Spacing } from "../../theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const BOTTOM_NAV_HEIGHT = 80;
type RoleGroup = "staff" | "admin" | "viewer";

interface InventoryListScreenProps {
  title?: string;
  routeGroup: RoleGroup;
  canCreate?: boolean;
}

// Constants
const STOCK_THRESHOLDS = {
  LOW: 10,
  CRITICAL: 0,
} as const;

const SOURCE_TYPES = {
  PURCHASED: { icon: "shopping-cart", label: "Purchased" },
  GERMINATION: { icon: "spa", label: "Germination" },
  TRANSFER: { icon: "swap-horiz", label: "Transfer" },
  DEFAULT: { icon: "inventory", label: "Unknown" },
} as const;

// Filter types
const FILTER_TYPES = {
  ALL: "all",
  IN_STOCK: "in-stock",
  LOW_STOCK: "low-stock",
  OUT_OF_STOCK: "out-of-stock",
} as const;

type FilterType = typeof FILTER_TYPES[keyof typeof FILTER_TYPES];

// Utility functions
const getStockStatus = (quantity: number) => {
  if (quantity <= STOCK_THRESHOLDS.CRITICAL) {
    return {
      label: "Out of Stock",
      color: Colors.error,
      icon: "block",
      severity: "critical",
      filter: FILTER_TYPES.OUT_OF_STOCK,
    };
  }
  if (quantity <= STOCK_THRESHOLDS.LOW) {
    return {
      label: "Low Stock",
      color: Colors.warning,
      icon: "warning",
      severity: "low",
      filter: FILTER_TYPES.LOW_STOCK,
    };
  }
  return {
    label: "In Stock",
    color: Colors.success,
    icon: "check-circle",
    severity: "good",
    filter: FILTER_TYPES.IN_STOCK,
  };
};

const getSourceInfo = (sourceType: string) => {
  const type = sourceType?.toUpperCase();
  switch (type) {
    case "PURCHASED":
      return SOURCE_TYPES.PURCHASED;
    case "GERMINATION":
      return SOURCE_TYPES.GERMINATION;
    case "TRANSFER":
      return SOURCE_TYPES.TRANSFER;
    default:
      return SOURCE_TYPES.DEFAULT;
  }
};

const formatSourceType = (sourceType: string) => {
  if (!sourceType) return "Unknown";
  return sourceType.charAt(0).toUpperCase() + sourceType.slice(1).toLowerCase();
};

const formatCurrency = (value: number) => {
  return `₹${value.toLocaleString("en-IN")}`;
};

const formatNumber = (value: number) => {
  return value.toLocaleString("en-IN");
};

// Filter Chip Component - Fixed dimensions
const FilterChip = ({
  label,
  icon,
  isSelected,
  onPress,
  count,
  color,
}: {
  label: string;
  icon: string;
  isSelected: boolean;
  onPress: () => void;
  count?: number;
  color: string;
}) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => [
      styles.filterChip,
      isSelected && styles.filterChipSelected,
      { borderColor: isSelected ? color : Colors.borderLight },
      pressed && styles.filterChipPressed,
    ]}
  >
    <View style={styles.filterChipContent}>
      <MaterialIcons
        name={icon as any}
        size={18}
        color={isSelected ? color : Colors.textSecondary}
      />
      <Text
        style={[
          styles.filterChipText,
          isSelected && { color, fontWeight: "600" },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
      {count !== undefined && count > 0 && (
        <View style={[styles.filterChipBadge, { backgroundColor: color + "20" }]}>
          <Text style={[styles.filterChipBadgeText, { color }]}>{count}</Text>
        </View>
      )}
    </View>
  </Pressable>
);

// Search Bar Component
const SearchBar = ({
  value,
  onChangeText,
  onClear,
}: {
  value: string;
  onChangeText: (text: string) => void;
  onClear: () => void;
}) => (
  <View style={styles.searchContainer}>
    <View style={styles.searchInputContainer}>
      <MaterialIcons name="search" size={20} color={Colors.textSecondary} />
      <TextInput
        style={styles.searchInput}
        placeholder="Search by plant name or category..."
        placeholderTextColor={Colors.textTertiary}
        value={value}
        onChangeText={onChangeText}
        returnKeyType="search"
        clearButtonMode="while-editing"
      />
      {value.length > 0 && (
        <Pressable onPress={onClear} style={styles.searchClearButton}>
          <MaterialIcons name="close" size={18} color={Colors.textSecondary} />
        </Pressable>
      )}
    </View>
  </View>
);

// Stats Card - Redesigned
const StatCard = ({
  icon,
  value,
  label,
  color,
  trend,
}: {
  icon: string;
  value: number | string;
  label: string;
  color: string;
  trend?: { value: number; label: string };
}) => (
  <View style={styles.statsCard}>
    <View style={[styles.statIconContainer, { backgroundColor: color + "15" }]}>
      <MaterialIcons name={icon as any} size={24} color={color} />
    </View>
    <View style={styles.statInfo}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      {trend && (
        <View style={styles.statTrend}>
          <MaterialIcons 
            name={trend.value > 0 ? "arrow-upward" : "arrow-downward"} 
            size={12} 
            color={trend.value > 0 ? Colors.success : Colors.error} 
          />
          <Text style={[styles.statTrendText, { color: trend.value > 0 ? Colors.success : Colors.error }]}>
            {Math.abs(trend.value)}% {trend.label}
          </Text>
        </View>
      )}
    </View>
  </View>
);

// Compact Stats Row for Header
const StatsRow = ({ stats }: { stats: any }) => (
  <View style={styles.statsRow}>
    <View style={styles.statCompactItem}>
      <MaterialIcons name="inventory" size={16} color={Colors.primary} />
      <Text style={styles.statCompactValue}>{stats.totalItems}</Text>
      <Text style={styles.statCompactLabel}>Items</Text>
    </View>
    
    <View style={styles.statDivider} />
    
    <View style={styles.statCompactItem}>
      <MaterialIcons name="storage" size={16} color={Colors.success} />
      <Text style={styles.statCompactValue}>{stats.totalStock}</Text>
      <Text style={styles.statCompactLabel}>Stock</Text>
    </View>
    
    <View style={styles.statDivider} />
    
    <View style={styles.statCompactItem}>
      <MaterialIcons name="warning" size={16} color={Colors.warning} />
      <Text style={styles.statCompactValue}>{stats.lowStockItems}</Text>
      <Text style={styles.statCompactLabel}>Low</Text>
    </View>
    
    <View style={styles.statDivider} />
    
    <View style={styles.statCompactItem}>
      <MaterialIcons name="block" size={16} color={Colors.error} />
      <Text style={styles.statCompactValue}>{stats.outOfStockItems}</Text>
      <Text style={styles.statCompactLabel}>Out</Text>
    </View>
  </View>
);

// Header Component with Stats and Search
const Header = ({
  title,
  subtitle,
  onAdd,
  searchQuery,
  onSearchChange,
  onSearchClear,
  stats,
  showStats,
}: {
  title: string;
  subtitle: string;
  onAdd?: () => void;
  searchQuery: string;
  onSearchChange: (text: string) => void;
  onSearchClear: () => void;
  stats?: any;
  showStats?: boolean;
}) => (
  <LinearGradient
    colors={[Colors.primary, Colors.primaryLight || Colors.primary]}
    style={styles.headerGradient}
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 0 }}
  >
    <View style={styles.headerTopRow}>
      <View style={styles.headerContent}>
        <Text style={styles.headerTitle}>{title}</Text>
        <Text style={styles.headerSubtitle}>{subtitle}</Text>
      </View>
      {onAdd && (
        <Pressable
          onPress={onAdd}
          style={({ pressed }) => [
            styles.addButton,
            pressed && styles.addButtonPressed,
          ]}
        >
          <LinearGradient
            colors={[Colors.success, "#34D399"]}
            style={styles.addGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <MaterialIcons name="add" size={20} color={Colors.white} />
            <Text style={styles.addButtonText}>Add</Text>
          </LinearGradient>
        </Pressable>
      )}
    </View>

    {/* Search Bar in Header */}
    <View style={styles.headerSearchContainer}>
      <View style={styles.headerSearchInputContainer}>
        <MaterialIcons name="search" size={18} color="rgba(255,255,255,0.8)" />
        <TextInput
          style={styles.headerSearchInput}
          placeholder="Search inventory..."
          placeholderTextColor="rgba(255,255,255,0.6)"
          value={searchQuery}
          onChangeText={onSearchChange}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={onSearchClear} style={styles.headerSearchClearButton}>
            <MaterialIcons name="close" size={16} color="rgba(255,255,255,0.8)" />
          </Pressable>
        )}
      </View>
    </View>

    {/* Stats in Header */}
    {showStats && stats && (
      <View style={styles.headerStatsContainer}>
        <StatsRow stats={stats} />
      </View>
    )}
  </LinearGradient>
);

const ErrorHeader = ({ onBack }: { onBack: () => void }) => (
  <LinearGradient
    colors={[Colors.primary, Colors.primaryLight || Colors.primary]}
    style={styles.headerGradient}
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 0 }}
  >
    <View style={styles.headerTopRow}>
      <Pressable
        onPress={onBack}
        style={({ pressed }) => [
          styles.backButton,
          pressed && styles.backButtonPressed,
        ]}
      >
        <MaterialIcons name="arrow-back" size={20} color={Colors.white} />
      </Pressable>
      <View style={styles.headerContent}>
        <Text style={styles.headerTitle}>Inventory</Text>
        <Text style={styles.headerSubtitle}>Unable to load data</Text>
      </View>
      <View style={styles.headerSpacer} />
    </View>
  </LinearGradient>
);

const InventoryCard = ({
  item,
  onPress,
}: {
  item: any;
  onPress: () => void;
}) => {
  const stockStatus = getStockStatus(item.quantity || 0);
  const sourceInfo = getSourceInfo(item.sourceType);
  const plantName = item.plantType?.name || "Unknown Plant";
  const category = item.plantType?.category || "Uncategorized";
  const sellingPrice = item.plantType?.sellingPrice || 0;
  const totalValue = sellingPrice * (item.quantity || 0);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.inventoryCard,
        pressed && styles.inventoryCardPressed,
      ]}
    >
      <LinearGradient
        colors={[Colors.white, Colors.surface]}
        style={styles.cardGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      >
        <View style={styles.cardHeader}>
          <EntityThumbnail
            uri={item.plantType?.imageUrl}
            label={plantName}
            size={56}
            style={styles.thumbnail}
          />

          <View style={styles.cardInfo}>
            <View style={styles.titleRow}>
              <Text style={styles.plantName} numberOfLines={1}>
                {plantName}
              </Text>
              <View
                style={[
                  styles.stockBadge,
                  { backgroundColor: stockStatus.color + "20" },
                ]}
              >
                <MaterialIcons
                  name={stockStatus.icon as any}
                  size={12}
                  color={stockStatus.color}
                />
                <Text
                  style={[styles.stockBadgeText, { color: stockStatus.color }]}
                >
                  {stockStatus.label}
                </Text>
              </View>
            </View>

            <View style={styles.detailsGrid}>
              <View style={styles.detailItem}>
                <MaterialIcons
                  name="category"
                  size={14}
                  color={Colors.textSecondary}
                />
                <Text style={styles.detailText}>{category}</Text>
              </View>

              <View style={styles.detailItem}>
                <MaterialIcons
                  name={sourceInfo.icon as any}
                  size={14}
                  color={Colors.textSecondary}
                />
                <Text style={styles.detailText}>
                  {formatSourceType(item.sourceType)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.cardDivider} />

        <View style={styles.cardFooter}>
          <View style={styles.quantityContainer}>
            <Text style={styles.quantityLabel}>Available Stock</Text>
            <View style={styles.quantityValueContainer}>
              <Text
                style={[
                  styles.quantityValue,
                  item.quantity <= 0 && styles.quantityZero,
                  item.quantity > 0 &&
                    item.quantity <= STOCK_THRESHOLDS.LOW &&
                    styles.quantityLow,
                ]}
              >
                {item.quantity || 0}
              </Text>
              <Text style={styles.quantityUnit}>units</Text>
            </View>
          </View>

          <View style={styles.priceContainer}>
            <Text style={styles.priceLabel}>Unit Price</Text>
            <Text style={styles.priceValue}>
              {formatCurrency(sellingPrice)}
            </Text>
          </View>

          <View style={styles.totalValueContainer}>
            <Text style={styles.totalValueLabel}>Total Value</Text>
            <Text style={styles.totalValue}>{formatCurrency(totalValue)}</Text>
          </View>
        </View>

        {item.quantity <= STOCK_THRESHOLDS.LOW && item.quantity > 0 && (
          <View style={styles.lowStockAlert}>
            <MaterialIcons name="warning" size={16} color={Colors.warning} />
            <Text style={styles.lowStockText}>
              Only {item.quantity} units left - Reorder soon
            </Text>
          </View>
        )}

        {item.quantity <= STOCK_THRESHOLDS.CRITICAL && (
          <View style={styles.outOfStockAlert}>
            <MaterialIcons name="block" size={16} color={Colors.error} />
            <Text style={styles.outOfStockText}>
              Out of stock - Please restock
            </Text>
          </View>
        )}
      </LinearGradient>
    </Pressable>
  );
};

const EmptyState = ({
  onAdd,
  hasFilters,
  onClearFilters,
}: {
  onAdd?: () => void;
  hasFilters: boolean;
  onClearFilters: () => void;
}) => (
  <View style={styles.emptyContainer}>
    <View style={styles.emptyIconContainer}>
      <MaterialIcons
        name={hasFilters ? "search-off" : "inventory"}
        size={64}
        color={Colors.textTertiary}
      />
    </View>
    <Text style={styles.emptyTitle}>
      {hasFilters ? "No Matching Items" : "No Inventory Items"}
    </Text>
    <Text style={styles.emptyMessage}>
      {hasFilters
        ? "Try adjusting your search or filters."
        : "Stock appears after germination or when you add purchased inventory."}
    </Text>
    {hasFilters ? (
      <Pressable
        onPress={onClearFilters}
        style={({ pressed }) => [
          styles.emptyButton,
          pressed && styles.emptyButtonPressed,
        ]}
      >
        <LinearGradient
          colors={[Colors.primary, Colors.primaryLight || Colors.primary]}
          style={styles.emptyButtonGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <MaterialIcons name="clear-all" size={20} color={Colors.white} />
          <Text style={styles.emptyButtonText}>Clear Filters</Text>
        </LinearGradient>
      </Pressable>
    ) : onAdd ? (
      <Pressable
        onPress={onAdd}
        style={({ pressed }) => [
          styles.emptyButton,
          pressed && styles.emptyButtonPressed,
        ]}
      >
        <LinearGradient
          colors={[Colors.primary, Colors.primaryLight || Colors.primary]}
          style={styles.emptyButtonGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <MaterialIcons name="add-circle" size={20} color={Colors.white} />
          <Text style={styles.emptyButtonText}>Add Purchased Inventory</Text>
        </LinearGradient>
      </Pressable>
    ) : null}
  </View>
);

const LoadingState = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color={Colors.primary} />
    <Text style={styles.loadingText}>Loading inventory...</Text>
  </View>
);

const ErrorState = ({
  error,
  onRetry,
  onBack,
}: {
  error: any;
  onRetry: () => void;
  onBack: () => void;
}) => (
  <View style={styles.container}>
    <ErrorHeader onBack={onBack} />
    <View style={styles.errorContainer}>
      <View style={styles.errorIconContainer}>
        <MaterialIcons name="inventory" size={64} color={Colors.error} />
      </View>
      <Text style={styles.errorTitle}>Failed to Load Inventory</Text>
      <Text style={styles.errorMessage}>
        {error?.message || "Unable to fetch inventory items. Please try again."}
      </Text>
      <Pressable
        onPress={onRetry}
        style={({ pressed }) => [
          styles.retryButton,
          pressed && styles.retryButtonPressed,
        ]}
      >
        <LinearGradient
          colors={[Colors.primary, Colors.primaryLight || Colors.primary]}
          style={styles.retryGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <MaterialIcons name="refresh" size={20} color={Colors.white} />
          <Text style={styles.retryButtonText}>Try Again</Text>
        </LinearGradient>
      </Pressable>
    </View>
  </View>
);

export function InventoryListScreen({
  title = "Inventory",
  routeGroup,
  canCreate = false,
}: InventoryListScreenProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<FilterType>(FILTER_TYPES.ALL);

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ["inventory"],
    queryFn: InventoryService.getAll,
  });

  const inventory = useMemo(() => (Array.isArray(data) ? data : []), [data]);

  // Filter and search logic
  const filteredInventory = useMemo(() => {
    let filtered = [...inventory];

    // Apply stock filter
    if (selectedFilter !== FILTER_TYPES.ALL) {
      filtered = filtered.filter((item) => {
        const status = getStockStatus(item.quantity || 0);
        return status.filter === selectedFilter;
      });
    }

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((item) => {
        const plantName = item.plantType?.name?.toLowerCase() || "";
        const category = item.plantType?.category?.toLowerCase() || "";
        const sourceType = item.sourceType?.toLowerCase() || "";
        
        return (
          plantName.includes(query) ||
          category.includes(query) ||
          sourceType.includes(query)
        );
      });
    }

    return filtered;
  }, [inventory, selectedFilter, searchQuery]);

  // Memoized calculations
  const stats = useMemo(() => {
    const totalItems = inventory.length;
    const totalStock = inventory.reduce(
      (acc, item) => acc + (item.quantity || 0),
      0,
    );
    const lowStockItems = inventory.filter(
      (item) => item.quantity > 0 && item.quantity <= STOCK_THRESHOLDS.LOW,
    ).length;
    const outOfStockItems = inventory.filter(
      (item) => item.quantity <= STOCK_THRESHOLDS.CRITICAL,
    ).length;

    return { totalItems, totalStock, lowStockItems, outOfStockItems };
  }, [inventory]);

  // Filter counts
  const filterCounts = useMemo(() => {
    const lowStock = inventory.filter(
      (item) => item.quantity > 0 && item.quantity <= STOCK_THRESHOLDS.LOW,
    ).length;
    const outOfStock = inventory.filter(
      (item) => item.quantity <= STOCK_THRESHOLDS.CRITICAL,
    ).length;
    const inStock = inventory.filter(
      (item) => item.quantity > STOCK_THRESHOLDS.LOW,
    ).length;

    return { lowStock, outOfStock, inStock };
  }, [inventory]);

  // Callbacks
  const handleRefresh = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    refetch();
  }, [refetch]);

  const handleAddInventory = useCallback(() => {
    if (!canCreate) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push(`/${`(${routeGroup})`}/inventory/create`);
  }, [canCreate, routeGroup, router]);

  const handleBack = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  }, [router]);

  const handleItemPress = useCallback(
    (itemId: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.push(`/${`(${routeGroup})`}/inventory/${itemId}`);
    },
    [routeGroup, router],
  );

  const handleFilterSelect = useCallback((filter: FilterType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedFilter(filter);
  }, []);

  const handleSearchChange = useCallback((text: string) => {
    setSearchQuery(text);
  }, []);

  const handleSearchClear = useCallback(() => {
    setSearchQuery("");
  }, []);

  const handleClearFilters = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedFilter(FILTER_TYPES.ALL);
    setSearchQuery("");
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: any }) => (
      <InventoryCard item={item} onPress={() => handleItemPress(item._id)} />
    ),
    [handleItemPress],
  );

  const keyExtractor = useCallback((item: any) => item._id, []);

  const hasActiveFilters = selectedFilter !== FILTER_TYPES.ALL || searchQuery.length > 0;

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <LoadingState />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <ErrorState error={error} onRetry={handleRefresh} onBack={handleBack} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title={title}
        subtitle={`${filteredInventory.length} ${
          filteredInventory.length === 1 ? "item" : "items"
        }`}
        onAdd={canCreate ? handleAddInventory : undefined}
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        onSearchClear={handleSearchClear}
        stats={stats}
        showStats={inventory.length > 0}
      />

      {/* Filter Chips - Fixed dimensions */}
      {inventory.length > 0 && (
        <View style={styles.filterSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterScroll}
            contentContainerStyle={styles.filterScrollContent}
          >
            <FilterChip
              label="All"
              icon="apps"
              isSelected={selectedFilter === FILTER_TYPES.ALL}
              onPress={() => handleFilterSelect(FILTER_TYPES.ALL)}
              count={inventory.length}
              color={Colors.primary}
            />
            
            <FilterChip
              label="In Stock"
              icon="check-circle"
              isSelected={selectedFilter === FILTER_TYPES.IN_STOCK}
              onPress={() => handleFilterSelect(FILTER_TYPES.IN_STOCK)}
              count={filterCounts.inStock}
              color={Colors.success}
            />
            
            <FilterChip
              label="Low Stock"
              icon="warning"
              isSelected={selectedFilter === FILTER_TYPES.LOW_STOCK}
              onPress={() => handleFilterSelect(FILTER_TYPES.LOW_STOCK)}
              count={filterCounts.lowStock}
              color={Colors.warning}
            />
            
            <FilterChip
              label="Out of Stock"
              icon="block"
              isSelected={selectedFilter === FILTER_TYPES.OUT_OF_STOCK}
              onPress={() => handleFilterSelect(FILTER_TYPES.OUT_OF_STOCK)}
              count={filterCounts.outOfStock}
              color={Colors.error}
            />
          </ScrollView>
        </View>
      )}

      {/* Active Filters Indicator */}
      {hasActiveFilters && (
        <View style={styles.activeFiltersContainer}>
          <Text style={styles.activeFiltersText} numberOfLines={1}>
            {searchQuery && `Search: "${searchQuery}"`}
            {searchQuery && selectedFilter !== FILTER_TYPES.ALL && " • "}
            {selectedFilter !== FILTER_TYPES.ALL && 
              `Filter: ${selectedFilter.split("-").map(word => 
                word.charAt(0).toUpperCase() + word.slice(1)
              ).join(" ")}`
            }
          </Text>
          <Pressable onPress={handleClearFilters} style={styles.clearFiltersButton}>
            <Text style={styles.clearFiltersText}>Clear all</Text>
          </Pressable>
        </View>
      )}

      {/* Inventory List */}
      <FlatList
        data={filteredInventory}
        keyExtractor={keyExtractor}
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
          <EmptyState
            onAdd={canCreate ? handleAddInventory : undefined}
            hasFilters={hasActiveFilters}
            onClearFilters={handleClearFilters}
          />
        }
        renderItem={renderItem}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={true}
      />
    </SafeAreaView>
  );
}

const styles = {
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerGradient: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.lg,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTopRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    marginBottom: Spacing.md,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700" as const,
    color: Colors.white,
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.9)",
    fontWeight: "500" as const,
  },
  headerSearchContainer: {
    marginBottom: Spacing.md,
  },
  headerSearchInputContainer: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 12,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  headerSearchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.white,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    marginLeft: Spacing.xs,
  },
  headerSearchClearButton: {
    padding: Spacing.xs,
  },
  headerStatsContainer: {
    marginTop: Spacing.sm,
  },
  statsRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-around" as const,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 16,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
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
    marginHorizontal: Spacing.sm,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginRight: Spacing.md,
  },
  backButtonPressed: {
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    transform: [{ scale: 0.95 }],
  },
  headerSpacer: {
    width: 44,
  },
  addButton: {
    borderRadius: 30,
    overflow: "hidden" as const,
    shadowColor: Colors.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  addButtonPressed: {
    transform: [{ scale: 0.95 }],
  },
  addGradient: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.xs,
  },
  addButtonText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: "600" as const,
  },
  searchContainer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  searchInputContainer: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    marginLeft: Spacing.xs,
  },
  searchClearButton: {
    padding: Spacing.xs,
  },
  statsCard: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    minWidth: 160,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginRight: Spacing.sm,
  },
  statInfo: {
    flex: 1,
  },
  statValue: {
    fontSize: 22,
    fontWeight: "700" as const,
    color: Colors.text,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: "500" as const,
  },
  statTrend: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    marginTop: 2,
    gap: 2,
  },
  statTrendText: {
    fontSize: 11,
    fontWeight: "600" as const,
  },
  filterSection: {
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    paddingVertical: Spacing.sm,
  },
  filterScroll: {
    maxHeight: 48,
  },
  filterScrollContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    alignItems: "center" as const,
  },
  filterChip: {
    height: 40,
    minWidth: 100,
    backgroundColor: Colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    overflow: "hidden" as const,
  },
  filterChipContent: {
    flex: 1,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingHorizontal: Spacing.md,
    gap: Spacing.xs,
  },
  filterChipSelected: {
    borderWidth: 2,
    backgroundColor: Colors.white,
  },
  filterChipPressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.9,
  },
  filterChipText: {
    fontSize: 13,
    color: Colors.text,
    fontWeight: "500" as const,
    includeFontPadding: false,
  },
  filterChipBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
    minWidth: 24,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  filterChipBadgeText: {
    fontSize: 11,
    fontWeight: "600" as const,
    includeFontPadding: false,
  },
  activeFiltersContainer: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.primary + "05",
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
    borderRadius: 8,
  },
  activeFiltersText: {
    fontSize: 13,
    color: Colors.textSecondary,
    flex: 1,
  },
  clearFiltersButton: {
    padding: Spacing.xs,
  },
  clearFiltersText: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: "600" as const,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: BOTTOM_NAV_HEIGHT + Spacing.xl,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    padding: Spacing.xl,
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: 16,
    color: Colors.textSecondary,
    fontWeight: "500" as const,
  },
  errorContainer: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    padding: Spacing.xl,
  },
  errorIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.error + "10",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginBottom: Spacing.lg,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: Colors.error,
    marginBottom: Spacing.sm,
  },
  errorMessage: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: "center" as const,
    marginBottom: Spacing.xl,
    lineHeight: 22,
    paddingHorizontal: Spacing.xl,
  },
  retryButton: {
    borderRadius: 16,
    overflow: "hidden" as const,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  retryButtonPressed: {
    transform: [{ scale: 0.98 }],
  },
  retryGradient: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    gap: Spacing.sm,
  },
  retryButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: "700" as const,
  },
  emptyContainer: {
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.xl,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.surface,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  emptyMessage: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: "center" as const,
    marginBottom: Spacing.xl,
    lineHeight: 22,
    paddingHorizontal: Spacing.xl,
  },
  emptyButton: {
    borderRadius: 16,
    overflow: "hidden" as const,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyButtonPressed: {
    transform: [{ scale: 0.98 }],
  },
  emptyButtonGradient: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    gap: Spacing.sm,
  },
  emptyButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: "700" as const,
  },
  inventoryCard: {
    borderRadius: 20,
    marginBottom: Spacing.md,
    overflow: "hidden" as const,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    backgroundColor: Colors.white,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  inventoryCardPressed: {
    transform: [{ scale: 0.98 }],
    borderColor: Colors.primary,
  },
  cardGradient: {
    padding: Spacing.lg,
  },
  cardHeader: {
    flexDirection: "row" as const,
    gap: Spacing.md,
  },
  thumbnail: {
    borderRadius: 12,
  },
  cardInfo: {
    flex: 1,
  },
  titleRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    marginBottom: Spacing.xs,
  },
  plantName: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: Colors.text,
    flex: 1,
    marginRight: Spacing.sm,
  },
  stockBadge: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  stockBadgeText: {
    fontSize: 11,
    fontWeight: "600" as const,
  },
  detailsGrid: {
    flexDirection: "row" as const,
    gap: Spacing.md,
    marginTop: 4,
  },
  detailItem: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
  },
  detailText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  cardDivider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: Spacing.md,
  },
  cardFooter: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
  },
  quantityContainer: {
    flex: 1,
  },
  quantityLabel: {
    fontSize: 11,
    color: Colors.textTertiary,
    marginBottom: 2,
  },
  quantityValueContainer: {
    flexDirection: "row" as const,
    alignItems: "baseline" as const,
    gap: 2,
  },
  quantityValue: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: Colors.primary,
  },
  quantityZero: {
    color: Colors.error,
  },
  quantityLow: {
    color: Colors.warning,
  },
  quantityUnit: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  priceContainer: {
    flex: 1,
    alignItems: "center" as const,
  },
  priceLabel: {
    fontSize: 11,
    color: Colors.textTertiary,
    marginBottom: 2,
  },
  priceValue: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.text,
  },
  totalValueContainer: {
    flex: 1,
    alignItems: "flex-end" as const,
  },
  totalValueLabel: {
    fontSize: 11,
    color: Colors.textTertiary,
    marginBottom: 2,
  },
  totalValue: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: Colors.success,
  },
  lowStockAlert: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: Colors.warning + "10",
    padding: Spacing.sm,
    borderRadius: 8,
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  lowStockText: {
    fontSize: 12,
    color: Colors.warning,
    fontWeight: "600" as const,
    flex: 1,
  },
  outOfStockAlert: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: Colors.error + "10",
    padding: Spacing.sm,
    borderRadius: 8,
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  outOfStockText: {
    fontSize: 12,
    color: Colors.error,
    fontWeight: "600" as const,
    flex: 1,
  },
} as const;
