// components/PlantTypesViewScreen.tsx
import { MaterialIcons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { PlantTypeService } from "../../services/plant-type.service";
import { useAuthStore } from "../../stores/auth.store";
import { resolveEntityImage } from "../../utils/image";
import { canViewSensitivePricing } from "../../utils/rbac";
import { AdminTheme } from "../admin/theme";
import StitchHeader from "../common/StitchHeader";
import ModuleStatGrid, { ModuleStatItem } from "../common/ModuleStatGrid";
import { moduleBadge, moduleSearchContainer, moduleSearchInput } from "../common/moduleStyles";
import StitchInput from "../common/StitchInput";

const BOTTOM_NAV_HEIGHT = 80;

// ==================== CONSTANTS & TYPES ====================

const LIFECYCLE_CATEGORIES = {
  SHORT: { max: 30, label: "Short", icon: "timer", color: "#10B981" },
  MEDIUM: { max: 60, label: "Medium", icon: "timelapse", color: "#F59E0B" },
  LONG: { max: 90, label: "Long", icon: "update", color: "#3B82F6" },
  EXTENDED: {
    max: Infinity,
    label: "Extended",
    icon: "calendar-today",
    color: "#8B5CF6",
  },
} as const;

const PRICE_RANGES = {
  BUDGET: { max: 500, label: "Budget", icon: "attach-money", color: "#10B981" },
  STANDARD: {
    max: 1000,
    label: "Standard",
    icon: "attach-money",
    color: "#3B82F6",
  },
  PREMIUM: { max: 2000, label: "Premium", icon: "star", color: "#F59E0B" },
  LUXURY: {
    max: Infinity,
    label: "Luxury",
    icon: "workspace-premium",
    color: "#8B5CF6",
  },
} as const;

const SORT_OPTIONS = [
  {
    id: "name_asc",
    label: "Name (A-Z)",
    icon: "sort-by-alpha",
    field: "name",
    order: "asc",
  },
  {
    id: "name_desc",
    label: "Name (Z-A)",
    icon: "sort-by-alpha",
    field: "name",
    order: "desc",
  },
  {
    id: "price_asc",
    label: "Price (Low-High)",
    icon: "attach-money",
    field: "sellingPrice",
    order: "asc",
  },
  {
    id: "price_desc",
    label: "Price (High-Low)",
    icon: "attach-money",
    field: "sellingPrice",
    order: "desc",
  },
  {
    id: "lifecycle_asc",
    label: "Lifecycle (Short-Long)",
    icon: "timer",
    field: "lifecycleDays",
    order: "asc",
  },
  {
    id: "lifecycle_desc",
    label: "Lifecycle (Long-Short)",
    icon: "timer",
    field: "lifecycleDays",
    order: "desc",
  },
] as const;

type SortOptionId = (typeof SORT_OPTIONS)[number]["id"];
type LifecycleCategory = keyof typeof LIFECYCLE_CATEGORIES;
type PriceRange = keyof typeof PRICE_RANGES;
type RoleGroup = "staff" | "admin" | "viewer";

interface FilterState {
  lifecycle: LifecycleCategory | null;
  price: PriceRange | null;
  category: string | null;
  search: string;
  sort: SortOptionId;
}

// ==================== UTILITY FUNCTIONS ====================

const getLifecycleCategory = (days: number): LifecycleCategory | null => {
  if (!days || days <= 0) return null;
  if (days <= LIFECYCLE_CATEGORIES.SHORT.max) return "SHORT";
  if (days <= LIFECYCLE_CATEGORIES.MEDIUM.max) return "MEDIUM";
  if (days <= LIFECYCLE_CATEGORIES.LONG.max) return "LONG";
  return "EXTENDED";
};

const getPriceRange = (price: number): PriceRange | null => {
  if (!price || price <= 0) return null;
  if (price <= PRICE_RANGES.BUDGET.max) return "BUDGET";
  if (price <= PRICE_RANGES.STANDARD.max) return "STANDARD";
  if (price <= PRICE_RANGES.PREMIUM.max) return "PREMIUM";
  return "LUXURY";
};

const formatCurrency = (value: number) => {
  return `₹${value.toLocaleString("en-IN")}`;
};

const formatEnumLabel = (value?: string) => {
  if (!value) return "—";
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

const getGrowthStageSummary = (growthStages: any) => {
  if (!Array.isArray(growthStages) || growthStages.length === 0) {
    return { count: 0, rangeLabel: "Not configured" };
  }

  const validStages = growthStages.filter(
    (stage: any) =>
      stage &&
      typeof stage.stage === "string" &&
      typeof stage.dayFrom === "number" &&
      typeof stage.dayTo === "number",
  );

  if (validStages.length === 0) {
    return { count: 0, rangeLabel: "Not configured" };
  }

  const minDayFrom = Math.min(...validStages.map((stage: any) => stage.dayFrom));
  const maxDayTo = Math.max(...validStages.map((stage: any) => stage.dayTo));
  return {
    count: validStages.length,
    rangeLabel: `Day ${minDayFrom}-${maxDayTo}`,
  };
};

// ==================== FILTER SECTION COMPONENT ====================

interface FilterSectionProps {
  title: string;
  icon: string;
  children: React.ReactNode;
  isExpanded?: boolean;
  onToggle?: () => void;
}

const FilterSection = ({
  title,
  icon,
  children,
  isExpanded,
  onToggle,
}: FilterSectionProps) => (
  <View style={styles.filterSectionContainer}>
    <Pressable onPress={onToggle} style={styles.filterSectionHeader}>
      <View style={styles.filterSectionTitleContainer}>
        <MaterialIcons name={icon as any} size={20} color={AdminTheme.colors.primary} />
        <Text style={styles.filterSectionTitle}>{title}</Text>
      </View>
      <MaterialIcons
        name={isExpanded ? "expand-less" : "expand-more"}
        size={20}
        color={AdminTheme.colors.textMuted}
      />
    </Pressable>
    {isExpanded && <View style={styles.filterSectionContent}>{children}</View>}
  </View>
);

// ==================== FILTER MODAL COMPONENT ====================

interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  filters: FilterState;
  onApplyFilters: (filters: Partial<FilterState>) => void;
  onClearFilters: () => void;
  categories: string[];
  filterCounts: {
    lifecycle: Record<LifecycleCategory, number>;
    price: Record<PriceRange, number>;
    categories: Record<string, number>;
  };
}

const FilterModal = ({
  visible,
  onClose,
  filters,
  onApplyFilters,
  onClearFilters,
  categories,
  filterCounts,
}: FilterModalProps) => {
  const [localFilters, setLocalFilters] = useState(filters);
  const [expandedSections, setExpandedSections] = useState({
    lifecycle: true,
    price: true,
    category: true,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const handleApply = () => {
    onApplyFilters(localFilters);
    onClose();
  };

  const handleClear = () => {
    const clearedFilters = {
      lifecycle: null,
      price: null,
      category: null,
      search: localFilters.search, // Preserve search
      sort: localFilters.sort, // Preserve sort
    };
    setLocalFilters(clearedFilters);
    onApplyFilters(clearedFilters);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View
            style={[
              styles.modalHeader,
              { backgroundColor: AdminTheme.colors.primary },
            ]}
          >
            <View style={styles.modalHeaderContent}>
              <Text style={styles.modalHeaderTitle}>Filters</Text>
              <Pressable onPress={onClose} style={styles.modalCloseButton}>
                <MaterialIcons name="close" size={24} color={AdminTheme.colors.surface} />
              </Pressable>
            </View>
          </View>

          <ScrollView
            style={styles.modalBody}
            showsVerticalScrollIndicator={false}
          >
            {/* Lifecycle Filter */}
            <FilterSection
              title="Lifecycle Duration"
              icon="timeline"
              isExpanded={expandedSections.lifecycle}
              onToggle={() => toggleSection("lifecycle")}
            >
              <View style={styles.filterGrid}>
                {Object.entries(LIFECYCLE_CATEGORIES).map(([key, category]) => (
                  <Pressable
                    key={key}
                    style={[
                      styles.filterOption,
                      localFilters.lifecycle === key && [
                        styles.filterOptionSelected,
                        { borderColor: category.color },
                      ],
                    ]}
                    onPress={() =>
                      setLocalFilters((prev) => ({
                        ...prev,
                        lifecycle:
                          prev.lifecycle === key
                            ? null
                            : (key as LifecycleCategory),
                      }))
                    }
                  >
                    <View
                      style={[
                        styles.filterOptionIcon,
                        { backgroundColor: `${category.color}10` },
                      ]}
                    >
                      <MaterialIcons
                        name={category.icon as any}
                        size={20}
                        color={category.color}
                      />
                    </View>
                    <View style={styles.filterOptionInfo}>
                      <Text style={styles.filterOptionLabel}>
                        {category.label}
                      </Text>
                      <Text style={styles.filterOptionCount}>
                        {filterCounts.lifecycle[key as LifecycleCategory]} items
                      </Text>
                    </View>
                    {localFilters.lifecycle === key && (
                      <MaterialIcons
                        name="check-circle"
                        size={20}
                        color={category.color}
                      />
                    )}
                  </Pressable>
                ))}
              </View>
            </FilterSection>

            {/* Price Range Filter */}
            <FilterSection
              title="Price Range"
              icon="attach-money"
              isExpanded={expandedSections.price}
              onToggle={() => toggleSection("price")}
            >
              <View style={styles.filterGrid}>
                {Object.entries(PRICE_RANGES).map(([key, range]) => (
                  <Pressable
                    key={key}
                    style={[
                      styles.filterOption,
                      localFilters.price === key && [
                        styles.filterOptionSelected,
                        { borderColor: range.color },
                      ],
                    ]}
                    onPress={() =>
                      setLocalFilters((prev) => ({
                        ...prev,
                        price: prev.price === key ? null : (key as PriceRange),
                      }))
                    }
                  >
                    <View
                      style={[
                        styles.filterOptionIcon,
                        { backgroundColor: `${range.color}10` },
                      ]}
                    >
                      <MaterialIcons
                        name={range.icon as any}
                        size={20}
                        color={range.color}
                      />
                    </View>
                    <View style={styles.filterOptionInfo}>
                      <Text style={styles.filterOptionLabel}>
                        {range.label}
                      </Text>
                      <Text style={styles.filterOptionCount}>
                        {filterCounts.price[key as PriceRange]} items
                      </Text>
                    </View>
                    {localFilters.price === key && (
                      <MaterialIcons
                        name="check-circle"
                        size={20}
                        color={range.color}
                      />
                    )}
                  </Pressable>
                ))}
              </View>
            </FilterSection>

            {/* Category Filter */}
            {categories.length > 0 && (
              <FilterSection
                title="Category"
                icon="category"
                isExpanded={expandedSections.category}
                onToggle={() => toggleSection("category")}
              >
                <View style={styles.filterGrid}>
                  {categories.map((category) => (
                    <Pressable
                      key={category}
                      style={[
                        styles.filterOption,
                        localFilters.category === category && [
                          styles.filterOptionSelected,
                          { borderColor: AdminTheme.colors.primary },
                        ],
                      ]}
                      onPress={() =>
                        setLocalFilters((prev) => ({
                          ...prev,
                          category:
                            prev.category === category ? null : category,
                        }))
                      }
                    >
                      <View
                        style={[
                          styles.filterOptionIcon,
                          { backgroundColor: `${AdminTheme.colors.primary}10` },
                        ]}
                      >
                        <MaterialIcons
                          name="category"
                          size={20}
                          color={AdminTheme.colors.primary}
                        />
                      </View>
                      <View style={styles.filterOptionInfo}>
                        <Text style={styles.filterOptionLabel}>{category}</Text>
                        <Text style={styles.filterOptionCount}>
                          {filterCounts.categories[category] || 0} items
                        </Text>
                      </View>
                      {localFilters.category === category && (
                        <MaterialIcons
                          name="check-circle"
                          size={20}
                          color={AdminTheme.colors.primary}
                        />
                      )}
                    </Pressable>
                  ))}
                </View>
              </FilterSection>
            )}
          </ScrollView>

          <View style={styles.modalFooter}>
            <Pressable
              onPress={handleClear}
              style={({ pressed }) => [
                styles.modalClearButton,
                pressed && styles.modalClearButtonPressed,
              ]}
            >
              <Text style={styles.modalClearButtonText}>Clear All</Text>
            </Pressable>
            <Pressable
              onPress={handleApply}
              style={({ pressed }) => [
                styles.modalApplyButton,
                pressed && styles.modalApplyButtonPressed,
              ]}
            >
              <View
                style={[
                  styles.modalApplyGradient,
                  { backgroundColor: AdminTheme.colors.primary },
                ]}
              >
                <Text style={styles.modalApplyButtonText}>Apply Filters</Text>
              </View>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ==================== SORT DROPDOWN COMPONENT ====================

interface SortDropdownProps {
  selectedSort: SortOptionId;
  onSortChange: (sort: SortOptionId) => void;
}

const SortDropdown = ({ selectedSort, onSortChange }: SortDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const selectedOption =
    SORT_OPTIONS.find((opt) => opt.id === selectedSort) || SORT_OPTIONS[0];

  return (
    <View style={styles.sortContainer}>
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setIsOpen(!isOpen);
        }}
        style={styles.sortButton}
      >
        <MaterialIcons name="sort" size={20} color={AdminTheme.colors.textMuted} />
        <Text style={styles.sortButtonText} numberOfLines={1}>
          {selectedOption.label}
        </Text>
        <MaterialIcons
          name={isOpen ? "arrow-drop-up" : "arrow-drop-down"}
          size={20}
          color={AdminTheme.colors.textMuted}
        />
      </Pressable>

      {isOpen && (
        <View style={styles.sortDropdown}>
          <View style={styles.sortDropdownHeader}>
            <Text style={styles.sortDropdownTitle}>Sort by</Text>
            <Pressable onPress={() => setIsOpen(false)}>
              <MaterialIcons
                name="close"
                size={20}
                color={AdminTheme.colors.textMuted}
              />
            </Pressable>
          </View>
          {SORT_OPTIONS.map((option) => (
            <Pressable
              key={option.id}
              style={[
                styles.sortOption,
                selectedSort === option.id && styles.sortOptionSelected,
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onSortChange(option.id);
                setIsOpen(false);
              }}
            >
              <View style={styles.sortOptionContent}>
                <MaterialIcons
                  name={option.icon as any}
                  size={18}
                  color={
                    selectedSort === option.id
                      ? AdminTheme.colors.primary
                      : AdminTheme.colors.textMuted
                  }
                />
                <Text
                  style={[
                    styles.sortOptionText,
                    selectedSort === option.id && styles.sortOptionTextSelected,
                  ]}
                >
                  {option.label}
                </Text>
              </View>
              {selectedSort === option.id && (
                <MaterialIcons name="check" size={18} color={AdminTheme.colors.primary} />
              )}
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
};

// ==================== STATS ROW COMPONENT ====================

interface StatsRowProps {
  stats: {
    totalTypes: number;
    totalCategories: number;
    avgLifecycle: number | string;
    avgPrice: string;
  };
}

const StatsRow = ({ stats }: StatsRowProps) => {
  const items: ModuleStatItem[] = [
    { label: "Plant Types", value: stats.totalTypes, icon: "eco", tone: "success" },
    {
      label: "Categories",
      value: stats.totalCategories,
      icon: "category",
      tone: "info",
    },
    {
      label: "Average Lifecycle",
      value: stats.avgLifecycle,
      icon: "timer",
      tone: "warning",
      helper: "Days",
    },
    {
      label: "Average Price",
      value: stats.avgPrice,
      icon: "currency-rupee",
      tone: "primary",
    },
  ];

  return <ModuleStatGrid items={items} />;
};

// ==================== HEADER COMPONENT ====================

// ==================== PLANT TYPE CARD COMPONENT ====================

interface PlantTypeCardProps {
  item: any;
  onPress: () => void;
  showSensitivePricing?: boolean;
  canWrite?: boolean;
  onEdit?: () => void;
  onUploadImage?: () => void;
  onDelete?: () => void;
  isDeletePending?: boolean;
}

const PlantTypeCard = ({
  item,
  onPress,
  showSensitivePricing = false,
  canWrite,
  onEdit,
  onUploadImage,
  onDelete,
  isDeletePending,
}: PlantTypeCardProps) => {
  const price = Number(item.sellingPrice ?? 0);
  const defaultCostPrice = Number(item.defaultCostPrice ?? 0);
  const lifecycleDays = Number(item.lifecycleDays ?? 0);
  const minStockLevel = Number(item.minStockLevel ?? 0);
  const lifecycleCategory = getLifecycleCategory(lifecycleDays);
  const growthStages = getGrowthStageSummary(item.growthStages);
  const imageUri = resolveEntityImage(item);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <View style={styles.cardGradient}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.cardImage} contentFit="cover" />
        ) : (
          <View style={styles.cardImagePlaceholder}>
            <MaterialIcons name="local-florist" size={28} color="#D1D5DB" />
          </View>
        )}

        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <View style={styles.cardInfo}>
              <View style={styles.titleRow}>
                <Text style={styles.name} numberOfLines={1}>
                  {item.name || "Unknown Plant Type"}
                </Text>
                {lifecycleCategory && (
                  <View
                    style={[
                      styles.lifecycleBadge,
                      {
                        backgroundColor: `${LIFECYCLE_CATEGORIES[lifecycleCategory].color}20`,
                      },
                    ]}
                  >
                    <MaterialIcons
                      name={LIFECYCLE_CATEGORIES[lifecycleCategory].icon as any}
                      size={12}
                      color={LIFECYCLE_CATEGORIES[lifecycleCategory].color}
                    />
                    <Text
                      style={[
                        styles.lifecycleBadgeText,
                        { color: LIFECYCLE_CATEGORIES[lifecycleCategory].color },
                      ]}
                    >
                      {LIFECYCLE_CATEGORIES[lifecycleCategory].label}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={styles.subtitle} numberOfLines={1}>
                {formatEnumLabel(item.category)}
                {item.variety ? ` • ${item.variety}` : ""}
              </Text>
            </View>
          </View>

          <View style={styles.metaSection}>
            <View style={styles.metaRow}>
              <MaterialIcons
                name="timeline"
                size={14}
                color={AdminTheme.colors.textMuted}
              />
              <Text style={styles.metaText}>
                {growthStages.count > 0
                  ? `${growthStages.count} growth stages`
                  : "Stages not set"}
              </Text>
            </View>
            <View style={styles.metaRow}>
              <MaterialIcons
                name="inventory-2"
                size={14}
                color={AdminTheme.colors.textMuted}
              />
              <Text style={styles.metaText}>
                {minStockLevel > 0 ? `Min stock ${minStockLevel}` : "Min stock —"}
              </Text>
            </View>
          </View>

          <View style={styles.cardFooter}>
            <View style={styles.metricBlock}>
              <Text style={styles.metricLabel}>Selling Price</Text>
              <Text style={styles.metricValueSuccess}>
                {price > 0 ? formatCurrency(price) : "—"}
              </Text>
            </View>
            {showSensitivePricing && (
              <View style={styles.metricBlock}>
                <Text style={styles.metricLabel}>Default Cost</Text>
                <Text style={styles.metricValue}>
                  {defaultCostPrice > 0 ? formatCurrency(defaultCostPrice) : "—"}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.cardFooterSecondary}>
            <View style={styles.infoPill}>
              <MaterialIcons name="timer" size={14} color={AdminTheme.colors.primary} />
              <Text style={styles.infoPillText}>
                {lifecycleDays > 0 ? `${lifecycleDays} days` : "Lifecycle —"}
              </Text>
            </View>
            <View style={styles.infoPill}>
              <MaterialIcons name="timeline" size={14} color={AdminTheme.colors.primary} />
              <Text style={styles.infoPillText}>{growthStages.rangeLabel}</Text>
            </View>
          </View>

          {item.description && (
            <View style={styles.descriptionContainer}>
              <Text style={styles.descriptionText} numberOfLines={2}>
                {item.description}
              </Text>
            </View>
          )}

          {canWrite && (
            <View style={styles.cardActionsRow}>
              <Pressable
                onPress={onEdit}
                style={({ pressed }) => [
                  styles.cardActionButton,
                  pressed && styles.cardActionButtonPressed,
                ]}
              >
                <MaterialIcons name="edit" size={16} color={AdminTheme.colors.primary} />
                <Text style={styles.cardActionButtonText}>Edit</Text>
              </Pressable>
              <Pressable
                onPress={onUploadImage}
                style={({ pressed }) => [
                  styles.cardActionButton,
                  pressed && styles.cardActionButtonPressed,
                ]}
              >
                <MaterialIcons name="image" size={16} color={AdminTheme.colors.primary} />
                <Text style={styles.cardActionButtonText}>Image</Text>
              </Pressable>
              <Pressable
                onPress={onDelete}
                disabled={isDeletePending}
                style={({ pressed }) => [
                  styles.cardActionButton,
                  styles.cardActionButtonDanger,
                  pressed && !isDeletePending && styles.cardActionButtonPressed,
                  isDeletePending && styles.cardActionButtonDisabled,
                ]}
              >
                <MaterialIcons name="delete" size={16} color={AdminTheme.colors.danger} />
                <Text style={styles.cardActionButtonDangerText}>
                  {isDeletePending ? "Deleting..." : "Delete"}
                </Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
};

// ==================== EMPTY STATE COMPONENT ====================

interface EmptyStateProps {
  hasFilters: boolean;
  onClearFilters: () => void;
}

const EmptyState = ({ hasFilters, onClearFilters }: EmptyStateProps) => (
  <View style={styles.emptyContainer}>
    <View style={styles.emptyIconContainer}>
      <MaterialIcons
        name={hasFilters ? "search-off" : "eco"}
        size={64}
        color={AdminTheme.colors.textSoft}
      />
    </View>
    <Text style={styles.emptyTitle}>
      {hasFilters ? "No Matching Plant Types" : "No Plant Types Found"}
    </Text>
    <Text style={styles.emptyMessage}>
      {hasFilters
        ? "Try adjusting your search or filters."
        : "Plant types will appear here once added."}
    </Text>
    {hasFilters && (
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
    )}
  </View>
);

// ==================== LOADING STATE COMPONENT ====================

const LoadingState = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color={AdminTheme.colors.primary} />
    <Text style={styles.loadingText}>Loading plant types...</Text>
  </View>
);

// ==================== ERROR STATE COMPONENT ====================

interface ErrorStateProps {
  error: any;
  onRetry: () => void;
}

const ErrorState = ({ error, onRetry }: ErrorStateProps) => (
  <View style={styles.errorContainer}>
    <View style={styles.errorIconContainer}>
      <MaterialIcons name="error-outline" size={64} color={AdminTheme.colors.danger} />
    </View>
    <Text style={styles.errorTitle}>Failed to Load Plant Types</Text>
    <Text style={styles.errorMessage}>
      {error?.message || "Unable to fetch plant types. Please try again."}
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
);

// ==================== MAIN COMPONENT ====================

export function PlantTypesViewScreen({
  title,
  canWrite = false,
  routeGroup = "staff",
}: {
  title: string;
  canWrite?: boolean;
  routeGroup?: RoleGroup;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const role = useAuthStore((state) => state.user?.role);
  const showSensitivePricing = canViewSensitivePricing(role);

  // Filter state
  const [filters, setFilters] = useState<FilterState>({
    lifecycle: null,
    price: null,
    category: null,
    search: "",
    sort: "name_asc",
  });
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);

  // Data fetching
  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ["plant-types"],
    queryFn: PlantTypeService.getAll,
  });

  const plantTypes = useMemo(() => (Array.isArray(data) ? data : []), [data]);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => PlantTypeService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plant-types"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (deleteError: any) => {
      Alert.alert(
        "Delete failed",
        deleteError?.message ||
          "Unable to delete plant type. Please try again.",
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    },
  });

  // Extract unique categories
  const categories = useMemo(() => {
    const cats = new Set(
      plantTypes
        .map((p) => p.category)
        .filter((category): category is string => Boolean(category)),
    );
    return Array.from(cats).sort();
  }, [plantTypes]);

  // Calculate filter counts
  const filterCounts = useMemo(() => {
    const lifecycle: Record<LifecycleCategory, number> = {
      SHORT: 0,
      MEDIUM: 0,
      LONG: 0,
      EXTENDED: 0,
    };
    const price: Record<PriceRange, number> = {
      BUDGET: 0,
      STANDARD: 0,
      PREMIUM: 0,
      LUXURY: 0,
    };
    const categories: Record<string, number> = {};

    plantTypes.forEach((item) => {
      // Lifecycle counts
      const lifecycleDays = Number(item.lifecycleDays ?? 0);
      const lifecycleCat = getLifecycleCategory(lifecycleDays);
      if (lifecycleCat) lifecycle[lifecycleCat]++;

      // Price range counts
      const priceValue = Number(item.sellingPrice ?? 0);
      const priceRange = getPriceRange(priceValue);
      if (priceRange) price[priceRange]++;

      // Category counts
      if (item.category) {
        categories[item.category] = (categories[item.category] || 0) + 1;
      }
    });

    return { lifecycle, price, categories };
  }, [plantTypes]);

  // Calculate stats
  const stats = useMemo(() => {
    const totalTypes = plantTypes.length;
    const totalCategories = categories.length;

    const lifecycleDays = plantTypes
      .map((p) => Number(p.lifecycleDays ?? 0))
      .filter((d) => d > 0);
    const avgLifecycle =
      lifecycleDays.length > 0
        ? Math.round(
            lifecycleDays.reduce((a, b) => a + b, 0) / lifecycleDays.length,
          )
        : 0;

    const prices = plantTypes
      .map((p) => Number(p.sellingPrice ?? 0))
      .filter((p) => p > 0);
    const avgPrice =
      prices.length > 0
        ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length)
        : 0;

    return {
      totalTypes,
      totalCategories,
      avgLifecycle: avgLifecycle > 0 ? avgLifecycle : "—",
      avgPrice: avgPrice > 0 ? formatCurrency(avgPrice) : "—",
    };
  }, [plantTypes, categories]);

  // Filter and search logic
  const filteredPlantTypes = useMemo(() => {
    let filtered = [...plantTypes];

    // Apply lifecycle filter
    if (filters.lifecycle) {
      filtered = filtered.filter((item) => {
        const days = Number(item.lifecycleDays ?? 0);
        const category = getLifecycleCategory(days);
        return category === filters.lifecycle;
      });
    }

    // Apply price range filter
    if (filters.price) {
      filtered = filtered.filter((item) => {
        const price = Number(item.sellingPrice ?? 0);
        const range = getPriceRange(price);
        return range === filters.price;
      });
    }

    // Apply category filter
    if (filters.category) {
      filtered = filtered.filter((item) => item.category === filters.category);
    }

    // Apply search query
    if (filters.search.trim()) {
      const query = filters.search.toLowerCase().trim();
      filtered = filtered.filter((item) => {
        const name = item.name?.toLowerCase() || "";
        const category = item.category?.toLowerCase() || "";
        const variety = item.variety?.toLowerCase() || "";
        const description = item.description?.toLowerCase() || "";
        const lifecycle = String(item.lifecycleDays ?? "");
        const minStock = String(item.minStockLevel ?? "");
        const sellingPrice = String(item.sellingPrice ?? "");
        const defaultCostPrice = showSensitivePricing
          ? String(item.defaultCostPrice ?? "")
          : "";
        const growthStageText = Array.isArray(item.growthStages)
          ? item.growthStages
              .map((stage: any) => String(stage?.stage ?? ""))
              .join(" ")
              .toLowerCase()
          : "";

        return (
          name.includes(query) ||
          category.includes(query) ||
          variety.includes(query) ||
          description.includes(query) ||
          lifecycle.includes(query) ||
          minStock.includes(query) ||
          sellingPrice.includes(query) ||
          defaultCostPrice.includes(query) ||
          growthStageText.includes(query)
        );
      });
    }

    // Apply sorting
    const sortOption = SORT_OPTIONS.find((opt) => opt.id === filters.sort);
    if (sortOption) {
      filtered.sort((a, b) => {
        const aVal = a[sortOption.field] || 0;
        const bVal = b[sortOption.field] || 0;

        if (sortOption.field === "name") {
          return sortOption.order === "asc"
            ? String(aVal).localeCompare(String(bVal))
            : String(bVal).localeCompare(String(aVal));
        } else {
          return sortOption.order === "asc"
            ? Number(aVal) - Number(bVal)
            : Number(bVal) - Number(aVal);
        }
      });
    }

    return filtered;
  }, [plantTypes, filters, showSensitivePricing]);

  // Calculate active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.lifecycle) count++;
    if (filters.price) count++;
    if (filters.category) count++;
    return count;
  }, [filters]);

  // Callbacks
  const handleRefresh = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    refetch();
  }, [refetch]);

  const handleSearchChange = useCallback((text: string) => {
    setFilters((prev) => ({ ...prev, search: text }));
  }, []);

  const handleSearchClear = useCallback(() => {
    setFilters((prev) => ({ ...prev, search: "" }));
  }, []);

  const handleSortChange = useCallback((sort: SortOptionId) => {
    setFilters((prev) => ({ ...prev, sort }));
  }, []);

  const handleApplyFilters = useCallback((newFilters: Partial<FilterState>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters((prev) => ({
      ...prev,
      lifecycle: null,
      price: null,
      category: null,
      search: "", // Optionally clear search
    }));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  const handleItemPress = useCallback(
    (itemId: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.push(`/${`(${routeGroup})`}/plants/${itemId}` as any);
    },
    [routeGroup, router],
  );

  const handleCreatePress = useCallback(() => {
    router.push(`/${`(${routeGroup})`}/plants/create` as any);
  }, [routeGroup, router]);

  const handleEditPress = useCallback(
    (itemId: string) => {
      router.push({
        pathname: `/${`(${routeGroup})`}/plants/edit` as any,
        params: { id: itemId },
      });
    },
    [routeGroup, router],
  );

  const handleUploadImagePress = useCallback(
    (itemId: string) => {
      router.push({
        pathname: `/${`(${routeGroup})`}/plants/upload-image` as any,
        params: { id: itemId },
      });
    },
    [routeGroup, router],
  );

  const handleDeletePress = useCallback(
    (item: any) => {
      const itemId = String(item?._id ?? item?.id ?? "");
      if (!itemId) {
        Alert.alert("Delete failed", "Plant type id is missing.");
        return;
      }
      Alert.alert(
        "Delete Plant Type",
        `Delete "${item?.name || "this plant type"}"? This cannot be undone.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: () => deleteMutation.mutate(itemId),
          },
        ],
      );
    },
    [deleteMutation],
  );

  const renderItem = useCallback(
    ({ item }: { item: any }) => (
      <PlantTypeCard
        item={item}
        onPress={() => handleItemPress(item._id || item.id)}
        showSensitivePricing={showSensitivePricing}
        canWrite={canWrite}
        onEdit={() => handleEditPress(item._id || item.id)}
        onUploadImage={() => handleUploadImagePress(item._id || item.id)}
        onDelete={() => handleDeletePress(item)}
        isDeletePending={
          deleteMutation.isPending &&
          deleteMutation.variables === String(item._id || item.id)
        }
      />
    ),
    [
      canWrite,
      deleteMutation.isPending,
      deleteMutation.variables,
      handleDeletePress,
      handleEditPress,
      handleItemPress,
      handleUploadImagePress,
      showSensitivePricing,
    ],
  );

  const keyExtractor = useCallback(
    (item: any) => String(item._id ?? item.id ?? item.name),
    [],
  );
  const isRootModuleScreen = routeGroup === "staff" || routeGroup === "admin";

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
        <ErrorState error={error} onRetry={handleRefresh} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["left", "right"]}>
      <StitchHeader
        title={title}
        subtitle={`${filteredPlantTypes.length} ${
          filteredPlantTypes.length === 1 ? "type" : "types"
        }`}
        variant="gradient"
        showBackButton={!isRootModuleScreen}
        onBackPress={!isRootModuleScreen ? () => router.back() : undefined}
        actions={
          canWrite ? (
            <Pressable
              onPress={handleCreatePress}
              style={({ pressed }) => [
                styles.headerCreateButton,
                pressed && styles.headerCreateButtonPressed,
              ]}
            >
              <MaterialIcons name="add" size={20} color={AdminTheme.colors.surfaceMuted} />
             
            </Pressable>
          ) : null
        }
      />

      {/* Plant Types List */}
      <FlatList
        data={filteredPlantTypes}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            <View style={styles.searchContainer}>
              <StitchInput
                containerStyle={styles.searchInputWrapper}
                placeholder="Search plant types"
                value={filters.search}
                onChangeText={handleSearchChange}
                icon={
                  <MaterialIcons
                    name="search"
                    size={18}
                    color={AdminTheme.colors.textMuted}
                  />
                }
                right={
                  filters.search.length > 0 ? (
                    <Pressable
                      onPress={handleSearchClear}
                      style={styles.headerSearchClearButton}
                    >
                      <MaterialIcons
                        name="close"
                        size={16}
                        color={AdminTheme.colors.textMuted}
                      />
                    </Pressable>
                  ) : null
                }
              />
              <Pressable
                onPress={() => setIsFilterModalVisible(true)}
                style={({ pressed }) => [
                  styles.headerFilterButton,
                  activeFilterCount > 0 && styles.headerFilterButtonActive,
                  pressed && styles.headerFilterButtonPressed,
                ]}
              >
                <MaterialIcons
                  name="tune"
                  size={20}
                  color={activeFilterCount > 0 ? AdminTheme.colors.primary : AdminTheme.colors.textMuted}
                />
                {activeFilterCount > 0 && (
                  <View style={styles.headerFilterBadge}>
                    <Text style={styles.headerFilterBadgeText}>{activeFilterCount}</Text>
                  </View>
                )}
              </Pressable>
            </View>

            {plantTypes.length > 0 && stats ? (
              <View style={styles.headerStatsContainer}>
                <StatsRow stats={stats} />
              </View>
            ) : null}

           
          </View>
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
            hasFilters={activeFilterCount > 0 || filters.search.length > 0}
            onClearFilters={handleClearFilters}
          />
        }
        renderItem={renderItem}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={true}
      />

      {/* Filter Modal */}
      <FilterModal
        visible={isFilterModalVisible}
        onClose={() => setIsFilterModalVisible(false)}
        filters={filters}
        onApplyFilters={handleApplyFilters}
        onClearFilters={handleClearFilters}
        categories={categories}
        filterCounts={filterCounts}
      />
    </SafeAreaView>
  );
}

// ==================== STYLES ====================

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
    justifyContent:"center",
    alignItems:"center"
  },
  headerCreateButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  headerCreateButtonText: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: AdminTheme.colors.surface,
  },
  searchContainer: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: AdminTheme.spacing.sm,
    marginBottom: AdminTheme.spacing.sm,
  },
  searchInput: moduleSearchInput,
  searchInputWrapper: {
    flex: 1,
  },
  headerSearchClearButton: {
    padding: AdminTheme.spacing.xs,
  },
  headerFilterButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: AdminTheme.colors.surface,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderWidth: 1,
    borderColor: AdminTheme.colors.borderSoft,
    position: "relative" as const,
  },
  headerFilterButtonActive: {
    borderColor: AdminTheme.colors.primary,
  },
  headerFilterButtonPressed: {
    transform: [{ scale: 0.95 }],
  },
  headerFilterBadge: {
    ...moduleBadge,
    position: "absolute" as const,
    top: -4,
    right: -4,
    backgroundColor: AdminTheme.colors.danger,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: AdminTheme.colors.surface,
  },
  headerFilterBadgeText: {
    color: AdminTheme.colors.surface,
    fontSize: 10,
    fontWeight: "700" as const,
  },
  headerStatsContainer: {
    marginTop: AdminTheme.spacing.sm,
    marginBottom: AdminTheme.spacing.md,
  },
  sortBar: {
    backgroundColor: AdminTheme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: AdminTheme.colors.borderSoft,
    paddingVertical: AdminTheme.spacing.sm,
    paddingHorizontal: AdminTheme.spacing.lg,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
  },
  sortContainer: {
    position: "relative" as const,
    zIndex: 1000,
  },
  sortButton: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: AdminTheme.colors.surface,
    paddingHorizontal: AdminTheme.spacing.sm,
    paddingVertical: AdminTheme.spacing.xs,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: AdminTheme.colors.borderSoft,
    height: 40,
    gap: 4,
  },
  sortButtonText: {
    fontSize: 13,
    color: AdminTheme.colors.text,
    fontWeight: "500" as const,
    maxWidth: 120,
  },
  sortDropdown: {
    position: "absolute" as const,
    top: 44,
    left: 0,
    backgroundColor: AdminTheme.colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: AdminTheme.colors.borderSoft,
    shadowColor: AdminTheme.colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    minWidth: 240,
    zIndex: 1001,
  },
  sortDropdownHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    paddingHorizontal: AdminTheme.spacing.md,
    paddingVertical: AdminTheme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: AdminTheme.colors.borderSoft,
  },
  sortDropdownTitle: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: AdminTheme.colors.text,
  },
  sortOption: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    paddingHorizontal: AdminTheme.spacing.md,
    paddingVertical: AdminTheme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: AdminTheme.colors.borderSoft,
  },
  sortOptionContent: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: AdminTheme.spacing.sm,
  },
  sortOptionSelected: {
    backgroundColor: AdminTheme.colors.primary + "10",
  },
  sortOptionText: {
    fontSize: 14,
    color: AdminTheme.colors.text,
  },
  sortOptionTextSelected: {
    color: AdminTheme.colors.primary,
    fontWeight: "600" as const,
  },
  activeFiltersPreview: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: AdminTheme.spacing.xs,
    flex: 1,
    marginLeft: AdminTheme.spacing.sm,
  },
  activeFilterPreview: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: AdminTheme.colors.surface,
    paddingHorizontal: AdminTheme.spacing.sm,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 2,
    maxWidth: 120,
    borderWidth: 1,
    borderColor: AdminTheme.colors.borderSoft,
  },
  activeFilterPreviewText: {
    fontSize: 11,
    color: AdminTheme.colors.text,
    fontWeight: "600" as const,
  },
  activeFilterPreviewRemove: {
    padding: 2,
  },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: AdminTheme.colors.surface,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderWidth: 1,
    borderColor: AdminTheme.colors.borderSoft,
    position: "relative" as const,
  },
  filterButtonActive: {
    backgroundColor: AdminTheme.colors.surface,
    borderColor: AdminTheme.colors.primary,
  },
  filterButtonPressed: {
    transform: [{ scale: 0.95 }],
  },
  filterBadge: {
    ...moduleBadge,
    position: "absolute" as const,
    top: -4,
    right: -4,
    backgroundColor: AdminTheme.colors.danger,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: AdminTheme.colors.surface,
  },
  filterBadgeText: {
    color: AdminTheme.colors.surface,
    fontSize: 10,
    fontWeight: "700" as const,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end" as const,
  },
  modalContent: {
    backgroundColor: AdminTheme.colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: "80%",
    overflow: "hidden" as const,
  },
  modalHeader: {
    paddingHorizontal: AdminTheme.spacing.lg,
    paddingVertical: AdminTheme.spacing.lg,
  },
  modalHeaderContent: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
  },
  modalHeaderTitle: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: AdminTheme.colors.surface,
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  modalBody: {
    flex: 1,
    paddingHorizontal: AdminTheme.spacing.lg,
    paddingVertical: AdminTheme.spacing.md,
  },
  filterSectionContainer: {
    marginBottom: AdminTheme.spacing.lg,
    borderWidth: 1,
    borderColor: AdminTheme.colors.borderSoft,
    borderRadius: 12,
    backgroundColor: AdminTheme.colors.surface,
    overflow: "hidden" as const,
  },
  filterSectionHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    paddingHorizontal: AdminTheme.spacing.md,
    paddingVertical: AdminTheme.spacing.md,
    backgroundColor: AdminTheme.colors.surface,
  },
  filterSectionTitleContainer: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: AdminTheme.spacing.sm,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: AdminTheme.colors.text,
  },
  filterSectionContent: {
    padding: AdminTheme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: AdminTheme.colors.borderSoft,
  },
  filterGrid: {
    gap: AdminTheme.spacing.sm,
  },
  filterOption: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    padding: AdminTheme.spacing.md,
    borderWidth: 1,
    borderColor: AdminTheme.colors.borderSoft,
    borderRadius: 12,
    backgroundColor: AdminTheme.colors.surface,
    gap: AdminTheme.spacing.md,
  },
  filterOptionSelected: {
    borderWidth: 2,
    backgroundColor: AdminTheme.colors.surface,
  },
  filterOptionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  filterOptionInfo: {
    flex: 1,
  },
  filterOptionLabel: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: AdminTheme.colors.text,
    marginBottom: 2,
  },
  filterOptionCount: {
    fontSize: 12,
    color: AdminTheme.colors.textMuted,
  },
  modalFooter: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    paddingHorizontal: AdminTheme.spacing.lg,
    paddingVertical: AdminTheme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: AdminTheme.colors.borderSoft,
    backgroundColor: AdminTheme.colors.surface,
    gap: AdminTheme.spacing.md,
  },
  modalClearButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: AdminTheme.colors.borderSoft,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: AdminTheme.colors.surface,
  },
  modalClearButtonPressed: {
    transform: [{ scale: 0.98 }],
    backgroundColor: AdminTheme.colors.surface,
  },
  modalClearButtonText: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: AdminTheme.colors.textMuted,
  },
  modalApplyButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    overflow: "hidden" as const,
  },
  modalApplyButtonPressed: {
    transform: [{ scale: 0.98 }],
  },
  modalApplyGradient: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  modalApplyButtonText: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: AdminTheme.colors.surface,
  },
  listContent: {
    paddingHorizontal: AdminTheme.spacing.lg,
    paddingTop: AdminTheme.spacing.md,
    paddingBottom: BOTTOM_NAV_HEIGHT + AdminTheme.spacing.xl,
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
  card: {
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
  cardPressed: {
    transform: [{ scale: 0.98 }],
    borderColor: AdminTheme.colors.primary,
  },
  cardGradient: {
    padding: 0,
  },
  cardImage: {
    width: "100%" as const,
    height: 160,
  },
  cardImagePlaceholder: {
    width: "100%" as const,
    height: 160,
    backgroundColor: "#F9FAFB",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  cardContent: {
    padding: AdminTheme.spacing.xl,
    gap: AdminTheme.spacing.sm,
  },
  cardHeader: {
    gap: AdminTheme.spacing.xs,
  },
  cardInfo: {
    gap: 4,
  },
  titleRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    marginBottom: AdminTheme.spacing.xs,
  },
  name: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: AdminTheme.colors.text,
    flex: 1,
    marginRight: AdminTheme.spacing.sm,
  },
  subtitle: {
    fontSize: 13,
    color: AdminTheme.colors.textMuted,
  },
  lifecycleBadge: {
    ...moduleBadge,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingHorizontal: AdminTheme.spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  lifecycleBadgeText: {
    fontSize: 11,
    fontWeight: "600" as const,
  },
  metaSection: {
    gap: 6,
    paddingTop: AdminTheme.spacing.xs,
    borderTopWidth: 1,
    borderTopColor: AdminTheme.colors.borderSoft,
  },
  metaRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
  },
  metaText: {
    fontSize: 12,
    color: AdminTheme.colors.textMuted,
    flex: 1,
  },
  cardFooter: {
    flexDirection: "row" as const,
    gap: AdminTheme.spacing.md,
    alignItems: "center" as const,
  },
  metricBlock: {
    flex: 1,
  },
  metricLabel: {
    fontSize: 11,
    color: AdminTheme.colors.textSoft,
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: AdminTheme.colors.text,
  },
  metricValueSuccess: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: AdminTheme.colors.success,
  },
  cardFooterSecondary: {
    marginTop: AdminTheme.spacing.sm,
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: AdminTheme.spacing.xs,
  },
  infoPill: {
    ...moduleBadge,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
    paddingHorizontal: AdminTheme.spacing.sm,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: AdminTheme.colors.borderSoft,
    backgroundColor: AdminTheme.colors.surface,
  },
  infoPillText: {
    fontSize: 11,
    color: AdminTheme.colors.textMuted,
    fontWeight: "500" as const,
  },
  descriptionContainer: {
    marginTop: AdminTheme.spacing.sm,
    padding: AdminTheme.spacing.sm,
    backgroundColor: AdminTheme.colors.surface,
    borderRadius: 8,
  },
  descriptionText: {
    fontSize: 12,
    color: AdminTheme.colors.textMuted,
    lineHeight: 18,
  },
  cardActionsRow: {
    marginTop: AdminTheme.spacing.md,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: AdminTheme.spacing.sm,
  },
  cardActionButton: {
    flex: 1,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 4,
    borderWidth: 1,
    borderColor: AdminTheme.colors.borderSoft,
    borderRadius: 10,
    paddingVertical: AdminTheme.spacing.sm,
    backgroundColor: AdminTheme.colors.surface,
  },
  cardActionButtonPressed: {
    opacity: 0.85,
  },
  cardActionButtonText: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: AdminTheme.colors.primary,
  },
  cardActionButtonDanger: {
    borderColor: AdminTheme.colors.danger + "40",
    backgroundColor: AdminTheme.colors.danger + "08",
  },
  cardActionButtonDangerText: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: AdminTheme.colors.danger,
  },
  cardActionButtonDisabled: {
    opacity: 0.6,
  },
} as const;
