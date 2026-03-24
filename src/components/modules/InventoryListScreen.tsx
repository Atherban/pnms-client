import { MaterialIcons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ModuleScreenFrame from "../common/ModuleScreenFrame";
import { SHARED_BOTTOM_NAV_HEIGHT } from "../navigation/SharedBottomNav";
import { InventoryService } from "../../services/inventory.service";
import { useAuthStore } from "../../stores/auth.store";
import { resolveEntityImage } from "../../utils/image";
import { resolveInventoryPricing } from "../../utils/inventory-pricing";
import { canViewSensitivePricing } from "../../utils/rbac";
import BannerCardImage from "../ui/BannerCardImage";
import { AdminTheme } from "../admin/theme";
import ModuleScreenIntro from "../common/ModuleScreenIntro";
import StitchHeader from "../common/StitchHeader";
import { ModuleStatItem } from "../common/ModuleStatGrid";
import { moduleBadge } from "../common/moduleStyles";
import { Colors } from "@/src/theme";

type RoleGroup = "staff" | "admin" | "customer";

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

type FilterType = (typeof FILTER_TYPES)[keyof typeof FILTER_TYPES];

// Utility functions
const getStockStatus = (quantity: number) => {
  if (quantity <= STOCK_THRESHOLDS.CRITICAL) {
    return {
      label: "Out of Stock",
      color: AdminTheme.colors.danger,
      icon: "block",
      severity: "critical",
      filter: FILTER_TYPES.OUT_OF_STOCK,
    };
  }
  if (quantity <= STOCK_THRESHOLDS.LOW) {
    return {
      label: "Low Stock",
      color: AdminTheme.colors.warning,
      icon: "warning",
      severity: "low",
      filter: FILTER_TYPES.LOW_STOCK,
    };
  }
  return {
    label: "In Stock",
    color: AdminTheme.colors.success,
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
      { borderColor: isSelected ? color : AdminTheme.colors.borderSoft },
      pressed && styles.filterChipPressed,
    ]}
  >
    <View style={styles.filterChipContent}>
      <MaterialIcons
        name={icon as any}
        size={18}
        color={isSelected ? color : AdminTheme.colors.textMuted}
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
        <View
          style={[styles.filterChipBadge, { backgroundColor: color + "20" }]}
        >
          <Text style={[styles.filterChipBadgeText, { color }]}>{count}</Text>
        </View>
      )}
    </View>
  </Pressable>
);

const ErrorHeader = ({ onBack }: { onBack: () => void }) => (
  <View>
    <StitchHeader
    title="Inventory"
    subtitle="Unable to load data"
    variant="gradient"
    showBackButton
    onBackPress={onBack}
  />
  </View>
);

const InventoryCard = ({
  item,
  onPress,
  showPricing,
}: {
  item: any;
  onPress: () => void;
  showPricing: boolean;
}) => {
  const stockStatus = getStockStatus(item.quantity || 0);
  const sourceInfo = getSourceInfo(item.sourceType);
  const plantName = item.plantType?.name || "Unknown Plant";
  const category = item.plantType?.category || "Uncategorized";
  const pricing = resolveInventoryPricing(item);
  const thumbnailUri = resolveEntityImage(item?.plantType ?? item);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.inventoryCard,
        pressed && styles.inventoryCardPressed,
      ]}
    >
      <View style={styles.cardGradient}>
        <BannerCardImage
          uri={thumbnailUri}
          label={plantName}
          containerStyle={styles.cardImageBanner}
        >
          <View
            style={[styles.stockBadge, { backgroundColor: stockStatus.color + "20" }]}
          >
            <MaterialIcons
              name={stockStatus.icon as any}
              size={12}
              color={stockStatus.color}
            />
            <Text style={[styles.stockBadgeText, { color: stockStatus.color }]}>
              {stockStatus.label}
            </Text>
          </View>
        </BannerCardImage>

        <View style={styles.cardContent}>
          <View style={styles.cardBody}>
            <View style={styles.titleRow}>
              <Text style={styles.plantName} numberOfLines={1}>
                {plantName}
              </Text>
            </View>

            <View style={styles.detailsGrid}>
              <View style={styles.detailItem}>
                <MaterialIcons
                  name="category"
                  size={14}
                  color={AdminTheme.colors.textMuted}
                />
                <Text style={styles.detailText}>{category}</Text>
              </View>

              <View style={styles.detailItem}>
                <MaterialIcons
                  name={sourceInfo.icon as any}
                  size={14}
                  color={AdminTheme.colors.textMuted}
                />
                <Text style={styles.detailText}>
                  {formatSourceType(item.sourceType)}
                </Text>
              </View>

              <View style={styles.detailItem}>
                <MaterialIcons
                  name="sell"
                  size={14}
                  color={AdminTheme.colors.textMuted}
                />
                <Text style={styles.detailText}>
                  Sell:{" "}
                  {pricing.sellingPrice !== null
                    ? formatCurrency(pricing.sellingPrice)
                    : "—"}
                </Text>
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

            {showPricing && (
              <View style={styles.priceContainer}>
                <Text style={styles.priceLabel}>Unit Cost</Text>
                <Text style={styles.priceValue}>
                  {pricing.unitCost !== null
                    ? formatCurrency(pricing.unitCost)
                    : "—"}
                </Text>
              </View>
            )}

            {showPricing && (
              <View style={styles.totalValueContainer}>
                <Text style={styles.totalValueLabel}>Inventory Value</Text>
                <Text style={styles.totalValue}>
                  {pricing.inventoryValue !== null
                    ? formatCurrency(pricing.inventoryValue)
                    : "—"}
                </Text>
              </View>
            )}
          </View>

          {item.quantity <= STOCK_THRESHOLDS.LOW && item.quantity > 0 && (
            <View style={styles.lowStockAlert}>
              <MaterialIcons name="warning" size={16} color={AdminTheme.colors.warning} />
              <Text style={styles.lowStockText}>
                Only {item.quantity} units left - Reorder soon
              </Text>
            </View>
          )}

          {item.quantity <= STOCK_THRESHOLDS.CRITICAL && (
            <View style={styles.outOfStockAlert}>
              <MaterialIcons name="block" size={16} color={AdminTheme.colors.danger} />
              <Text style={styles.outOfStockText}>
                Out of stock - Please restock
              </Text>
            </View>
          )}
        </View>
      </View>
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
        color={AdminTheme.colors.textSoft}
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
        <View
          style={[
            styles.emptyButtonGradient,
            { backgroundColor: AdminTheme.colors.primary },
          ]}
        >
          <MaterialIcons name="clear-all" size={20} color={AdminTheme.colors.surface} />
          <Text style={styles.emptyButtonText}>Clear Filters</Text>
        </View>
      </Pressable>
    ) : onAdd ? (
      <Pressable
        onPress={onAdd}
        style={({ pressed }) => [
          styles.emptyButton,
          pressed && styles.emptyButtonPressed,
        ]}
      >
        <View
          style={[
            styles.emptyButtonGradient,
            { backgroundColor: AdminTheme.colors.primary },
          ]}
        >
          <MaterialIcons name="add-circle" size={20} color={AdminTheme.colors.surface} />
          <Text style={styles.emptyButtonText}>Add Purchased Inventory</Text>
        </View>
      </Pressable>
    ) : null}
  </View>
);

const LoadingState = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color={AdminTheme.colors.primary} />
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
        <MaterialIcons name="inventory" size={64} color={AdminTheme.colors.danger} />
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
        <View
          style={[
            styles.retryGradient,
            { backgroundColor: AdminTheme.colors.primary },
          ]}
        >
          <MaterialIcons name="refresh" size={20} color={AdminTheme.colors.surface} />
          <Text style={styles.retryButtonText}>Try Again</Text>
        </View>
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
  const role = useAuthStore((state) => state.user?.role);
  const showPricing = canViewSensitivePricing(role);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<FilterType>(
    FILTER_TYPES.ALL,
  );

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
        const pricing = resolveInventoryPricing(item);
        const unitCost =
          showPricing && pricing.unitCost !== null ? String(pricing.unitCost) : "";
        const sellingPrice =
          showPricing && pricing.sellingPrice !== null ? String(pricing.sellingPrice) : "";

        return (
          plantName.includes(query) ||
          category.includes(query) ||
          sourceType.includes(query) ||
          unitCost.includes(query) ||
          sellingPrice.includes(query)
        );
      });
    }

    return filtered;
  }, [inventory, selectedFilter, searchQuery, showPricing]);

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
      <InventoryCard
        item={item}
        onPress={() => handleItemPress(item._id)}
        showPricing={showPricing}
      />
    ),
    [handleItemPress, showPricing],
  );

  const keyExtractor = useCallback((item: any) => item._id, []);

  const hasActiveFilters =
    selectedFilter !== FILTER_TYPES.ALL || searchQuery.length > 0;
  const statItems: ModuleStatItem[] = [
    {
      label: "Items",
      value: stats.totalItems,
      icon: "inventory-2",
      tone: "info",
    },
    {
      label: "Stock",
      value: stats.totalStock,
      icon: "storage",
      tone: "success",
    },
    {
      label: "Low Stock",
      value: stats.lowStockItems,
      icon: "warning",
      tone: "warning",
    },
    {
      label: "Out of Stock",
      value: stats.outOfStockItems,
      icon: "block",
      tone: "danger",
    },
  ];

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={["left", "right"]}>
        <LoadingState />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={["left", "right"]}>
        <ErrorState error={error} onRetry={handleRefresh} onBack={handleBack} />
      </SafeAreaView>
    );
  }

  return (
    <ModuleScreenFrame
      title={title}
      subtitle={`${filteredInventory.length} ${
        filteredInventory.length === 1 ? "item" : "items"
      }`}
      onBackPress={handleBack}
      actions={
        canCreate ? (
          <Pressable
            onPress={handleAddInventory}
            style={({ pressed }) => [
              styles.addButton,
              pressed && styles.addButtonPressed,
            ]}
          >
            <View
              style={[
                styles.addGradient,
              ]}
            >
              <MaterialIcons
                name="add"
                size={20}
                color={Colors.white}
              />
            </View>
          </Pressable>
        ) : null
      }
    >
      <FlatList
        data={filteredInventory}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <ModuleScreenIntro
            stats={inventory.length > 0 ? statItems : undefined}
            search={{
              value: searchQuery,
              onChangeText: handleSearchChange,
              onClear: handleSearchClear,
              placeholder: "Search inventory",
            }}
            helperRow={
              <>
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
                        color={AdminTheme.colors.primary}
                      />
                      <FilterChip
                        label="In Stock"
                        icon="check-circle"
                        isSelected={selectedFilter === FILTER_TYPES.IN_STOCK}
                        onPress={() => handleFilterSelect(FILTER_TYPES.IN_STOCK)}
                        count={filterCounts.inStock}
                        color={AdminTheme.colors.success}
                      />
                      <FilterChip
                        label="Low Stock"
                        icon="warning"
                        isSelected={selectedFilter === FILTER_TYPES.LOW_STOCK}
                        onPress={() => handleFilterSelect(FILTER_TYPES.LOW_STOCK)}
                        count={filterCounts.lowStock}
                        color={AdminTheme.colors.warning}
                      />
                      <FilterChip
                        label="Out of Stock"
                        icon="block"
                        isSelected={selectedFilter === FILTER_TYPES.OUT_OF_STOCK}
                        onPress={() => handleFilterSelect(FILTER_TYPES.OUT_OF_STOCK)}
                        count={filterCounts.outOfStock}
                        color={AdminTheme.colors.danger}
                      />
                    </ScrollView>
                  </View>
                )}
                {hasActiveFilters && (
                  <View style={styles.activeFiltersContainer}>
                    <Text style={styles.activeFiltersText} numberOfLines={1}>
                      {searchQuery && `Search: "${searchQuery}"`}
                      {searchQuery &&
                        selectedFilter !== FILTER_TYPES.ALL &&
                        " • "}
                      {selectedFilter !== FILTER_TYPES.ALL &&
                        `Filter: ${selectedFilter
                          .split("-")
                          .map(
                            (word) =>
                              word.charAt(0).toUpperCase() + word.slice(1),
                          )
                          .join(" ")}`}
                    </Text>
                    <Pressable
                      onPress={handleClearFilters}
                      style={styles.clearFiltersButton}
                    >
                      <Text style={styles.clearFiltersText}>Clear all</Text>
                    </Pressable>
                  </View>
                )}
              </>
            }
          />
        }
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={handleRefresh}
            colors={[AdminTheme.colors.primary]}
            tintColor={AdminTheme.colors.primary}
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
    </ModuleScreenFrame>
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
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginRight: AdminTheme.spacing.md,
  },
  backButtonPressed: {
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    transform: [{ scale: 0.95 }],
  },
  headerSpacer: {
    width: 44,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  addButtonPressed: {
    transform: [{ scale: 0.95 }],
  },
  addGradient: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    width: "100%",
    height: "100%",
  },
  statsCard: {
    ...cardSurface,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: AdminTheme.colors.surface,
    paddingHorizontal: AdminTheme.spacing.md,
    paddingVertical: AdminTheme.spacing.sm,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: AdminTheme.colors.borderSoft,
    shadowColor: AdminTheme.colors.shadow,
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
    marginRight: AdminTheme.spacing.sm,
  },
  statInfo: {
    flex: 1,
  },
  statValue: {
    fontSize: 22,
    fontWeight: "700" as const,
    color: AdminTheme.colors.text,
  },
  statLabel: {
    fontSize: 12,
    color: AdminTheme.colors.textMuted,
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
    paddingVertical: 8,
  },
  filterScroll: {
    maxHeight: 48,
  },
  filterScrollContent: {
    gap: AdminTheme.spacing.sm,
    alignItems: "center" as const,
  },
  filterChip: {
    height: 40,
    minWidth: 100,
    backgroundColor: AdminTheme.colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: AdminTheme.colors.borderSoft,
    overflow: "hidden" as const,
  },
  filterChipContent: {
    flex: 1,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingHorizontal: AdminTheme.spacing.md,
    gap: AdminTheme.spacing.xs,
  },
  filterChipSelected: {
    borderWidth: 2,
    backgroundColor: AdminTheme.colors.surface,
  },
  filterChipPressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.9,
  },
  filterChipText: {
    fontSize: 13,
    color: AdminTheme.colors.text,
    fontWeight: "500" as const,
    includeFontPadding: false,
  },
  filterChipBadge: {
    ...moduleBadge,
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
    paddingHorizontal: AdminTheme.spacing.lg,
    paddingVertical: AdminTheme.spacing.sm,
    backgroundColor: AdminTheme.colors.primary + "05",
    marginHorizontal: AdminTheme.spacing.lg,
    marginTop: 6,
    marginBottom: AdminTheme.spacing.xs,
    borderRadius: 8,
  },
  activeFiltersText: {
    fontSize: 13,
    color: AdminTheme.colors.textMuted,
    flex: 1,
  },
  clearFiltersButton: {
    padding: AdminTheme.spacing.xs,
  },
  clearFiltersText: {
    fontSize: 13,
    color: AdminTheme.colors.primary,
    fontWeight: "600" as const,
  },
  listContent: {
    paddingHorizontal: AdminTheme.spacing.lg,
    paddingTop: AdminTheme.spacing.sm,
    paddingBottom: SHARED_BOTTOM_NAV_HEIGHT + AdminTheme.spacing.xl,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    padding: AdminTheme.spacing.xl,
  },
  loadingText: {
    marginTop: AdminTheme.spacing.md,
    fontSize: 16,
    color: AdminTheme.colors.textMuted,
    fontWeight: "500" as const,
  },
  errorContainer: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    padding: AdminTheme.spacing.xl,
  },
  errorIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: AdminTheme.colors.danger + "10",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginBottom: AdminTheme.spacing.lg,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: AdminTheme.colors.danger,
    marginBottom: AdminTheme.spacing.sm,
  },
  errorMessage: {
    fontSize: 15,
    color: AdminTheme.colors.textMuted,
    textAlign: "center" as const,
    marginBottom: AdminTheme.spacing.xl,
    lineHeight: 22,
    paddingHorizontal: AdminTheme.spacing.xl,
  },
  retryButton: {
    borderRadius: 16,
    overflow: "hidden" as const,
    shadowColor: AdminTheme.colors.primary,
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
    paddingHorizontal: AdminTheme.spacing.xl,
    paddingVertical: AdminTheme.spacing.lg,
    gap: AdminTheme.spacing.sm,
  },
  retryButtonText: {
    color: AdminTheme.colors.surface,
    fontSize: 16,
    fontWeight: "700" as const,
  },
  emptyContainer: {
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingVertical: AdminTheme.spacing.xl,
    paddingHorizontal: AdminTheme.spacing.xl,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: AdminTheme.colors.surface,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginBottom: AdminTheme.spacing.lg,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: AdminTheme.colors.text,
    marginBottom: AdminTheme.spacing.sm,
  },
  emptyMessage: {
    fontSize: 15,
    color: AdminTheme.colors.textMuted,
    textAlign: "center" as const,
    marginBottom: AdminTheme.spacing.xl,
    lineHeight: 22,
    paddingHorizontal: AdminTheme.spacing.xl,
  },
  emptyButton: {
    borderRadius: 16,
    overflow: "hidden" as const,
    shadowColor: AdminTheme.colors.primary,
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
    paddingHorizontal: AdminTheme.spacing.xl,
    paddingVertical: AdminTheme.spacing.lg,
    gap: AdminTheme.spacing.sm,
  },
  emptyButtonText: {
    color: AdminTheme.colors.surface,
    fontSize: 16,
    fontWeight: "700" as const,
  },
  inventoryCard: {
    ...cardSurface,
    borderRadius: 20,
    marginBottom: AdminTheme.spacing.md,
    overflow: "hidden" as const,
    borderWidth: 1,
    borderColor: AdminTheme.colors.borderSoft,
    backgroundColor: AdminTheme.colors.surface,
    shadowColor: AdminTheme.colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  inventoryCardPressed: {
    transform: [{ scale: 0.98 }],
    borderColor: AdminTheme.colors.primary,
  },
  cardGradient: {
    padding: 0,
  },
  cardImageBanner: {
    width: "100%" as const,
    minHeight: 140,
    borderRadius: 0,
    marginBottom: 0,
  },
  cardContent: {
    padding: AdminTheme.spacing.lg,
  },
  cardBody: {
    gap: AdminTheme.spacing.xs,
  },
  titleRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "flex-start" as const,
    marginBottom: AdminTheme.spacing.xs,
  },
  plantName: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: AdminTheme.colors.text,
    flex: 1,
    marginRight: AdminTheme.spacing.sm,
  },
  stockBadge: {
    ...moduleBadge,
    position: "absolute" as const,
    top: AdminTheme.spacing.sm,
    right: AdminTheme.spacing.sm,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingHorizontal: AdminTheme.spacing.sm,
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
    flexWrap: "wrap" as const,
    gap: AdminTheme.spacing.md,
    marginTop: 4,
  },
  detailItem: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
  },
  detailText: {
    fontSize: 12,
    color: AdminTheme.colors.textMuted,
  },
  cardDivider: {
    height: 1,
    backgroundColor: AdminTheme.colors.borderSoft,
    marginVertical: AdminTheme.spacing.md,
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
    color: AdminTheme.colors.textSoft,
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
    color: AdminTheme.colors.primary,
  },
  quantityZero: {
    color: AdminTheme.colors.danger,
  },
  quantityLow: {
    color: AdminTheme.colors.warning,
  },
  quantityUnit: {
    fontSize: 11,
    color: AdminTheme.colors.textMuted,
  },
  priceContainer: {
    flex: 1,
    alignItems: "center" as const,
  },
  priceLabel: {
    fontSize: 11,
    color: AdminTheme.colors.textSoft,
    marginBottom: 2,
  },
  priceValue: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: AdminTheme.colors.text,
  },
  totalValueContainer: {
    flex: 1,
    alignItems: "flex-end" as const,
  },
  totalValueLabel: {
    fontSize: 11,
    color: AdminTheme.colors.textSoft,
    marginBottom: 2,
  },
  totalValue: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: AdminTheme.colors.success,
  },
  lowStockAlert: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: AdminTheme.colors.warning + "10",
    padding: AdminTheme.spacing.sm,
    borderRadius: 8,
    marginTop: AdminTheme.spacing.md,
    gap: AdminTheme.spacing.sm,
  },
  lowStockText: {
    fontSize: 12,
    color: AdminTheme.colors.warning,
    fontWeight: "600" as const,
    flex: 1,
  },
  outOfStockAlert: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: AdminTheme.colors.danger + "10",
    padding: AdminTheme.spacing.sm,
    borderRadius: 8,
    marginTop: AdminTheme.spacing.md,
    gap: AdminTheme.spacing.sm,
  },
  outOfStockText: {
    fontSize: 12,
    color: AdminTheme.colors.danger,
    fontWeight: "600" as const,
    flex: 1,
  },
} as const;
