// components/PlantTypesViewScreen.tsx
import { MaterialIcons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { PlantTypeService } from "../../services/plant-type.service";
import { Colors, Spacing } from "../../theme";
import EntityThumbnail from "../ui/EntityThumbnail";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
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

const FILTER_TYPES = {
  LIFECYCLE: "lifecycle",
  PRICE: "price",
  CATEGORY: "category",
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
type FilterType = keyof typeof FILTER_TYPES;
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

const formatNumber = (value: number) => {
  return value.toLocaleString("en-IN");
};

// ==================== FILTER CHIP COMPONENT ====================

interface FilterChipProps {
  label: string;
  icon: string;
  isSelected: boolean;
  onPress: () => void;
  count?: number;
  color: string;
}

const FilterChip = ({
  label,
  icon,
  isSelected,
  onPress,
  count,
  color,
}: FilterChipProps) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => [
      styles.filterChip,
      isSelected && [styles.filterChipSelected, { borderColor: color }],
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
        <View
          style={[styles.filterChipBadge, { backgroundColor: `${color}20` }]}
        >
          <Text style={[styles.filterChipBadgeText, { color }]}>{count}</Text>
        </View>
      )}
    </View>
  </Pressable>
);

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
        <MaterialIcons name={icon as any} size={20} color={Colors.primary} />
        <Text style={styles.filterSectionTitle}>{title}</Text>
      </View>
      <MaterialIcons
        name={isExpanded ? "expand-less" : "expand-more"}
        size={20}
        color={Colors.textSecondary}
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
          <LinearGradient
            colors={[Colors.primary, Colors.primaryLight || Colors.primary]}
            style={styles.modalHeader}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <View style={styles.modalHeaderContent}>
              <Text style={styles.modalHeaderTitle}>Filters</Text>
              <Pressable onPress={onClose} style={styles.modalCloseButton}>
                <MaterialIcons name="close" size={24} color={Colors.white} />
              </Pressable>
            </View>
          </LinearGradient>

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
                          { borderColor: Colors.primary },
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
                          { backgroundColor: `${Colors.primary}10` },
                        ]}
                      >
                        <MaterialIcons
                          name="category"
                          size={20}
                          color={Colors.primary}
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
                          color={Colors.primary}
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
              <LinearGradient
                colors={[Colors.primary, Colors.primaryLight || Colors.primary]}
                style={styles.modalApplyGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.modalApplyButtonText}>Apply Filters</Text>
              </LinearGradient>
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
        <MaterialIcons name="sort" size={20} color={Colors.textSecondary} />
        <Text style={styles.sortButtonText} numberOfLines={1}>
          {selectedOption.label}
        </Text>
        <MaterialIcons
          name={isOpen ? "arrow-drop-up" : "arrow-drop-down"}
          size={20}
          color={Colors.textSecondary}
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
                color={Colors.textSecondary}
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
                      ? Colors.primary
                      : Colors.textSecondary
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
                <MaterialIcons name="check" size={18} color={Colors.primary} />
              )}
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
};

// ==================== SEARCH BAR COMPONENT ====================

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onClear: () => void;
  onFilterPress: () => void;
  activeFilterCount: number;
}

const SearchBar = ({
  value,
  onChangeText,
  onClear,
  onFilterPress,
  activeFilterCount,
}: SearchBarProps) => (
  <View style={styles.searchContainer}>
    <View style={styles.searchInputContainer}>
      <MaterialIcons name="search" size={20} color={Colors.textSecondary} />
      <TextInput
        style={styles.searchInput}
        placeholder="Search by name, category, or variety..."
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
        size={22}
        color={activeFilterCount > 0 ? Colors.primary : Colors.textSecondary}
      />
      {activeFilterCount > 0 && (
        <View style={styles.filterBadge}>
          <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
        </View>
      )}
    </Pressable>
  </View>
);

// ==================== STATS ROW COMPONENT ====================

interface StatsRowProps {
  stats: {
    totalTypes: number;
    totalCategories: number;
    avgLifecycle: number | string;
    avgPrice: string;
  };
}

const StatsRow = ({ stats }: StatsRowProps) => (
  <View style={styles.statsRow}>
    <View style={styles.statCompactItem}>
      <MaterialIcons name="eco" size={16} color={Colors.white} />
      <Text style={styles.statCompactValue}>{stats.totalTypes}</Text>
      <Text style={styles.statCompactLabel}>Types</Text>
    </View>

    <View style={styles.statDivider} />

    <View style={styles.statCompactItem}>
      <MaterialIcons name="category" size={16} color={Colors.white} />
      <Text style={styles.statCompactValue}>{stats.totalCategories}</Text>
      <Text style={styles.statCompactLabel}>Categories</Text>
    </View>

    <View style={styles.statDivider} />

    <View style={styles.statCompactItem}>
      <MaterialIcons name="timer" size={16} color={Colors.white} />
      <Text style={styles.statCompactValue}>{stats.avgLifecycle}</Text>
      <Text style={styles.statCompactLabel}>Avg Days</Text>
    </View>

    <View style={styles.statDivider} />

    <View style={styles.statCompactItem}>
      <MaterialIcons name="attach-money" size={16} color={Colors.white} />
      <Text style={styles.statCompactValue}>{stats.avgPrice}</Text>
      <Text style={styles.statCompactLabel}>Avg Price</Text>
    </View>
  </View>
);

// ==================== HEADER COMPONENT ====================

interface HeaderProps {
  title: string;
  subtitle: string;
  searchQuery: string;
  onSearchChange: (text: string) => void;
  onSearchClear: () => void;
  onFilterPress: () => void;
  activeFilterCount: number;
  stats?: StatsRowProps["stats"];
  showStats?: boolean;
  canWrite?: boolean;
  onCreate?: () => void;
}

const Header = ({
  title,
  subtitle,
  searchQuery,
  onSearchChange,
  onSearchClear,
  onFilterPress,
  activeFilterCount,
  stats,
  showStats,
  canWrite,
  onCreate,
}: HeaderProps) => (
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
      {canWrite && onCreate && (
        <Pressable
          onPress={onCreate}
          style={({ pressed }) => [
            styles.headerCreateButton,
            pressed && styles.headerCreateButtonPressed,
          ]}
        >
          <MaterialIcons name="add" size={20} color={Colors.primary} />
          <Text style={styles.headerCreateButtonText}>Add</Text>
        </Pressable>
      )}
    </View>

    {/* Search Bar in Header */}
    <View style={styles.headerSearchContainer}>
      <View style={styles.headerSearchInputContainer}>
        <MaterialIcons name="search" size={18} color="rgba(255,255,255,0.8)" />
        <TextInput
          style={styles.headerSearchInput}
          placeholder="Search plant types..."
          placeholderTextColor="rgba(255,255,255,0.6)"
          value={searchQuery}
          onChangeText={onSearchChange}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <Pressable
            onPress={onSearchClear}
            style={styles.headerSearchClearButton}
          >
            <MaterialIcons
              name="close"
              size={16}
              color="rgba(255,255,255,0.8)"
            />
          </Pressable>
        )}
      </View>
      <Pressable
        onPress={onFilterPress}
        style={({ pressed }) => [
          styles.headerFilterButton,
          activeFilterCount > 0 && styles.headerFilterButtonActive,
          pressed && styles.headerFilterButtonPressed,
        ]}
      >
        <MaterialIcons
          name="tune"
          size={20}
          color={activeFilterCount > 0 ? Colors.primary : Colors.white}
        />
        {activeFilterCount > 0 && (
          <View style={styles.headerFilterBadge}>
            <Text style={styles.headerFilterBadgeText}>
              {activeFilterCount}
            </Text>
          </View>
        )}
      </Pressable>
    </View>

    {/* Stats in Header */}
    {showStats && stats && (
      <View style={styles.headerStatsContainer}>
        <StatsRow stats={stats} />
      </View>
    )}
  </LinearGradient>
);

// ==================== PLANT TYPE CARD COMPONENT ====================

interface PlantTypeCardProps {
  item: any;
  onPress: () => void;
  canWrite?: boolean;
  onEdit?: () => void;
  onUploadImage?: () => void;
  onDelete?: () => void;
  isDeletePending?: boolean;
}

const PlantTypeCard = ({
  item,
  onPress,
  canWrite,
  onEdit,
  onUploadImage,
  onDelete,
  isDeletePending,
}: PlantTypeCardProps) => {
  const price = Number(item.sellingPrice ?? 0);
  const lifecycleDays = Number(item.lifecycleDays ?? 0);
  const lifecycleCategory = getLifecycleCategory(lifecycleDays);
  const priceRange = getPriceRange(price);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <LinearGradient
        colors={[Colors.white, Colors.surface]}
        style={styles.cardGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      >
        <View style={styles.cardHeader}>
          <EntityThumbnail
            uri={item.imageUrl}
            label={item.name}
            size={56}
            iconName="local-florist"
            style={styles.thumbnail}
          />

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

            <View style={styles.detailsGrid}>
              <View style={styles.detailItem}>
                <MaterialIcons
                  name="category"
                  size={14}
                  color={Colors.textSecondary}
                />
                <Text style={styles.detailText} numberOfLines={1}>
                  {item.category || "Uncategorized"}
                </Text>
              </View>

              {item.variety && (
                <View style={styles.detailItem}>
                  <MaterialIcons
                    name="grass"
                    size={14}
                    color={Colors.textSecondary}
                  />
                  <Text style={styles.detailText} numberOfLines={1}>
                    {item.variety}
                  </Text>
                </View>
              )}
            </View>

            {priceRange && (
              <View style={styles.priceRangeIndicator}>
                <MaterialIcons
                  name={PRICE_RANGES[priceRange].icon as any}
                  size={12}
                  color={PRICE_RANGES[priceRange].color}
                />
                <Text
                  style={[
                    styles.priceRangeText,
                    { color: PRICE_RANGES[priceRange].color },
                  ]}
                >
                  {PRICE_RANGES[priceRange].label}
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.cardDivider} />

        <View style={styles.cardFooter}>
          <View style={styles.lifecycleContainer}>
            <Text style={styles.lifecycleLabel}>Lifecycle</Text>
            <View style={styles.lifecycleValueContainer}>
              <MaterialIcons name="timer" size={16} color={Colors.primary} />
              <Text style={styles.lifecycleValue}>
                {lifecycleDays > 0 ? `${lifecycleDays} days` : "—"}
              </Text>
            </View>
          </View>

          <View style={styles.priceContainer}>
            <Text style={styles.priceLabel}>Selling Price</Text>
            <Text style={styles.priceValue}>
              {price > 0 ? formatCurrency(price) : "—"}
            </Text>
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
              <MaterialIcons name="edit" size={16} color={Colors.primary} />
              <Text style={styles.cardActionButtonText}>Edit</Text>
            </Pressable>
            <Pressable
              onPress={onUploadImage}
              style={({ pressed }) => [
                styles.cardActionButton,
                pressed && styles.cardActionButtonPressed,
              ]}
            >
              <MaterialIcons name="image" size={16} color={Colors.primary} />
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
              <MaterialIcons name="delete" size={16} color={Colors.error} />
              <Text style={styles.cardActionButtonDangerText}>
                {isDeletePending ? "Deleting..." : "Delete"}
              </Text>
            </Pressable>
          </View>
        )}
      </LinearGradient>
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
        color={Colors.textTertiary}
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
    )}
  </View>
);

// ==================== LOADING STATE COMPONENT ====================

const LoadingState = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color={Colors.primary} />
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
      <MaterialIcons name="error-outline" size={64} color={Colors.error} />
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
        deleteError?.message || "Unable to delete plant type. Please try again.",
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    },
  });

  // Extract unique categories
  const categories = useMemo(() => {
    const cats = new Set(plantTypes.map((p) => p.category).filter(Boolean));
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

        return (
          name.includes(query) ||
          category.includes(query) ||
          variety.includes(query) ||
          description.includes(query)
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
  }, [plantTypes, filters]);

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

  const handleItemPress = useCallback((itemId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!canWrite) return;
    router.push({
      pathname: `/(${routeGroup})/plants/quantity`,
      params: { id: itemId },
    });
  }, [canWrite, routeGroup, router]);

  const handleCreatePress = useCallback(() => {
    router.push(`/${`(${routeGroup})`}/plants/create`);
  }, [routeGroup, router]);

  const handleEditPress = useCallback(
    (itemId: string) => {
      router.push({
        pathname: `/${`(${routeGroup})`}/plants/edit`,
        params: { id: itemId },
      });
    },
    [routeGroup, router],
  );

  const handleUploadImagePress = useCallback(
    (itemId: string) => {
      router.push({
        pathname: `/${`(${routeGroup})`}/plants/upload-image`,
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
    ],
  );

  const keyExtractor = useCallback(
    (item: any) => String(item._id ?? item.id ?? item.name),
    [],
  );

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
        <ErrorState error={error} onRetry={handleRefresh} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title={title}
        subtitle={`${filteredPlantTypes.length} ${
          filteredPlantTypes.length === 1 ? "type" : "types"
        }`}
        searchQuery={filters.search}
        onSearchChange={handleSearchChange}
        onSearchClear={handleSearchClear}
        onFilterPress={() => setIsFilterModalVisible(true)}
        activeFilterCount={activeFilterCount}
        stats={stats}
        showStats={plantTypes.length > 0}
        canWrite={canWrite}
        onCreate={handleCreatePress}
      />

      {/* Sort Bar */}
      {plantTypes.length > 0 && (
        <View style={styles.sortBar}>
          <SortDropdown
            selectedSort={filters.sort}
            onSortChange={handleSortChange}
          />
          <View style={styles.activeFiltersPreview}>
            {filters.lifecycle && (
              <View style={styles.activeFilterPreview}>
                <Text style={styles.activeFilterPreviewText}>
                  {LIFECYCLE_CATEGORIES[filters.lifecycle].label}
                </Text>
                <Pressable
                  onPress={() =>
                    setFilters((prev) => ({ ...prev, lifecycle: null }))
                  }
                  style={styles.activeFilterPreviewRemove}
                >
                  <MaterialIcons
                    name="close"
                    size={14}
                    color={Colors.textSecondary}
                  />
                </Pressable>
              </View>
            )}
            {filters.price && (
              <View style={styles.activeFilterPreview}>
                <Text style={styles.activeFilterPreviewText}>
                  {PRICE_RANGES[filters.price].label}
                </Text>
                <Pressable
                  onPress={() =>
                    setFilters((prev) => ({ ...prev, price: null }))
                  }
                  style={styles.activeFilterPreviewRemove}
                >
                  <MaterialIcons
                    name="close"
                    size={14}
                    color={Colors.textSecondary}
                  />
                </Pressable>
              </View>
            )}
            {filters.category && (
              <View style={styles.activeFilterPreview}>
                <Text style={styles.activeFilterPreviewText} numberOfLines={1}>
                  {filters.category}
                </Text>
                <Pressable
                  onPress={() =>
                    setFilters((prev) => ({ ...prev, category: null }))
                  }
                  style={styles.activeFilterPreviewRemove}
                >
                  <MaterialIcons
                    name="close"
                    size={14}
                    color={Colors.textSecondary}
                  />
                </Pressable>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Plant Types List */}
      <FlatList
        data={filteredPlantTypes}
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
  headerCreateButton: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.75)",
  },
  headerCreateButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  headerCreateButtonText: {
    fontSize: 13,
    fontWeight: "700" as const,
    color: Colors.primary,
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
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  headerSearchInputContainer: {
    flex: 1,
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
  headerFilterButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    position: "relative" as const,
  },
  headerFilterButtonActive: {
    backgroundColor: Colors.white,
  },
  headerFilterButtonPressed: {
    transform: [{ scale: 0.95 }],
  },
  headerFilterBadge: {
    position: "absolute" as const,
    top: -4,
    right: -4,
    backgroundColor: Colors.error,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: Colors.white,
  },
  headerFilterBadgeText: {
    color: Colors.white,
    fontSize: 10,
    fontWeight: "700" as const,
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
  sortBar: {
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
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
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    height: 40,
    gap: 4,
  },
  sortButtonText: {
    fontSize: 13,
    color: Colors.text,
    fontWeight: "500" as const,
    maxWidth: 120,
  },
  sortDropdown: {
    position: "absolute" as const,
    top: 44,
    left: 0,
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    shadowColor: Colors.shadow,
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
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  sortDropdownTitle: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.text,
  },
  sortOption: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  sortOptionContent: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: Spacing.sm,
  },
  sortOptionSelected: {
    backgroundColor: Colors.primary + "10",
  },
  sortOptionText: {
    fontSize: 14,
    color: Colors.text,
  },
  sortOptionTextSelected: {
    color: Colors.primary,
    fontWeight: "600" as const,
  },
  activeFiltersPreview: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: Spacing.xs,
    flex: 1,
    marginLeft: Spacing.sm,
  },
  activeFilterPreview: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: Colors.primary + "10",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 16,
    gap: 2,
    maxWidth: 120,
  },
  activeFilterPreviewText: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: "500" as const,
  },
  activeFilterPreviewRemove: {
    padding: 2,
  },
  searchContainer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: Spacing.sm,
  },
  searchInputContainer: {
    flex: 1,
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
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    position: "relative" as const,
  },
  filterButtonActive: {
    backgroundColor: Colors.white,
    borderColor: Colors.primary,
  },
  filterButtonPressed: {
    transform: [{ scale: 0.95 }],
  },
  filterBadge: {
    position: "absolute" as const,
    top: -4,
    right: -4,
    backgroundColor: Colors.error,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end" as const,
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: "80%",
    overflow: "hidden" as const,
  },
  modalHeader: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
  },
  modalHeaderContent: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
  },
  modalHeaderTitle: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: Colors.white,
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
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  filterSectionContainer: {
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: 12,
    backgroundColor: Colors.white,
    overflow: "hidden" as const,
  },
  filterSectionHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
  },
  filterSectionTitleContainer: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: Spacing.sm,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: Colors.text,
  },
  filterSectionContent: {
    padding: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  filterGrid: {
    gap: Spacing.sm,
  },
  filterOption: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: 12,
    backgroundColor: Colors.white,
    gap: Spacing.md,
  },
  filterOptionSelected: {
    borderWidth: 2,
    backgroundColor: Colors.white,
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
    color: Colors.text,
    marginBottom: 2,
  },
  filterOptionCount: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  modalFooter: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    backgroundColor: Colors.white,
    gap: Spacing.md,
  },
  modalClearButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: Colors.white,
  },
  modalClearButtonPressed: {
    transform: [{ scale: 0.98 }],
    backgroundColor: Colors.surface,
  },
  modalClearButtonText: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: Colors.textSecondary,
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
    color: Colors.white,
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
  card: {
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
  cardPressed: {
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
  name: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: Colors.text,
    flex: 1,
    marginRight: Spacing.sm,
  },
  lifecycleBadge: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  lifecycleBadgeText: {
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
    flex: 1,
  },
  detailText: {
    fontSize: 12,
    color: Colors.textSecondary,
    flex: 1,
  },
  priceRangeIndicator: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
    marginTop: 4,
  },
  priceRangeText: {
    fontSize: 11,
    fontWeight: "600" as const,
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
  lifecycleContainer: {
    flex: 1,
  },
  lifecycleLabel: {
    fontSize: 11,
    color: Colors.textTertiary,
    marginBottom: 2,
  },
  lifecycleValueContainer: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
  },
  lifecycleValue: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.primary,
  },
  priceContainer: {
    flex: 1,
    alignItems: "flex-end" as const,
  },
  priceLabel: {
    fontSize: 11,
    color: Colors.textTertiary,
    marginBottom: 2,
  },
  priceValue: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: Colors.success,
  },
  descriptionContainer: {
    marginTop: Spacing.sm,
    padding: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: 8,
  },
  descriptionText: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  cardActionsRow: {
    marginTop: Spacing.md,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: Spacing.sm,
  },
  cardActionButton: {
    flex: 1,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 4,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: 10,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface,
  },
  cardActionButtonPressed: {
    opacity: 0.85,
  },
  cardActionButtonText: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: Colors.primary,
  },
  cardActionButtonDanger: {
    borderColor: Colors.error + "40",
    backgroundColor: Colors.error + "08",
  },
  cardActionButtonDangerText: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: Colors.error,
  },
  cardActionButtonDisabled: {
    opacity: 0.6,
  },
} as const;
