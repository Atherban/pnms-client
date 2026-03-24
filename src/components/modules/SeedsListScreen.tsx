import { MaterialIcons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ModuleScreenFrame from "../common/ModuleScreenFrame";
import { SHARED_BOTTOM_NAV_HEIGHT } from "../navigation/SharedBottomNav";
import { Seed, SeedService } from "../../services/seed.service";
import { useAuthStore } from "../../stores/auth.store";
import { formatErrorMessage } from "../../utils/error";
import { canViewSourcingDetails } from "../../utils/rbac";
import { formatQuantityUnit } from "../../utils/units";
import { AdminTheme } from "../admin/theme";
import ModuleScreenIntro from "../common/ModuleScreenIntro";
import { moduleBadge } from "../common/moduleStyles";

type RoleGroup = "staff" | "admin" | "customer";

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

const getDiscardedSeeds = (seed: Seed) => Number(seed.discardedSeeds ?? 0);

const getSeedStock = (seed: Seed) => {
  return Math.max(
    0,
    Number(
      (seed.totalPurchased ?? 0) -
        (seed.seedsUsed ?? 0) -
        getDiscardedSeeds(seed),
    ),
  );
};

const getMinStock = (seed: Seed) => Number(seed.plantType?.minStockLevel ?? 10);

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

// ==================== SEED CARD ====================

interface SeedCardProps {
  seed: Seed;
  onPress: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (seed: Seed) => void;
  canWrite: boolean;
  showSourcingDetails: boolean;
}

const SeedCard = ({
  seed,
  onPress,
  onEdit,
  onDelete,
  canWrite,
  showSourcingDetails,
}: SeedCardProps) => {
  const expiryStatus = getExpiryStatus(seed.expiryDate ?? "");
  const totalStock = seed.totalPurchased ?? 0;
  const availableStock = getSeedStock(seed);
  const minStock = getMinStock(seed);
  const isLowStock = availableStock < minStock;
  const stockPercentage = Math.min(
    (availableStock / (totalStock || 1)) * 100,
    100,
  );
  const imageUri = seed.imageUrl || seed.plantType?.imageUrl;
  const quantityUnit = formatQuantityUnit(
    seed?.quantityUnit ?? seed?.plantType?.expectedSeedUnit,
    "SEEDS",
  );

  return (
    <TouchableOpacity
      style={styles.seedCard}
      activeOpacity={0.92}
      onPress={() => onPress(seed._id)}
    >
      {imageUri ? (
        <Image source={{ uri: imageUri }} style={styles.seedImage} contentFit="cover" />
      ) : (
        <View style={styles.seedImagePlaceholder}>
          <MaterialIcons name="grass" size={26} color="#D1D5DB" />
        </View>
      )}

      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <View style={styles.seedInfo}>
            <View style={styles.titleRow}>
              <Text style={styles.seedName} numberOfLines={1}>
                {seed.name}
              </Text>
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
            {(seed.category || seed.plantType?.name) && (
              <Text style={styles.seedCategory} numberOfLines={1}>
                {seed.category || seed.plantType?.name}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.metaSection}>
          {showSourcingDetails && seed.supplierName && (
            <View style={styles.metaRow}>
              <MaterialIcons
                name="business"
                size={14}
                color={AdminTheme.colors.textMuted}
              />
              <Text style={styles.metaText} numberOfLines={1}>
                Supplier: {seed.supplierName}
              </Text>
            </View>
          )}
          <View style={styles.metaRow}>
            <MaterialIcons name="event" size={14} color={AdminTheme.colors.textMuted} />
            <Text style={styles.metaText}>
              Expiry: {formatDate(seed.expiryDate ?? "")}
            </Text>
          </View>
        </View>

        <View style={styles.stockSection}>
          <View style={styles.stockHeader}>
            <View style={styles.stockLabelContainer}>
              <MaterialIcons
                name="inventory"
                size={14}
                color={AdminTheme.colors.textMuted}
              />
              <Text style={styles.stockLabel}>Stock Level</Text>
            </View>
            {isLowStock && (
              <View
                style={[
                  styles.lowStockBadge,
                  { backgroundColor: `${AdminTheme.colors.warning}10` },
                ]}
              >
                <MaterialIcons
                  name="warning"
                  size={12}
                  color={AdminTheme.colors.warning}
                />
                <Text style={[styles.lowStockText, { color: AdminTheme.colors.warning }]}>
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
                    backgroundColor: isLowStock ? AdminTheme.colors.warning : AdminTheme.colors.success,
                  },
                ]}
              />
            </View>
            <Text style={styles.stockValue}>
              {formatNumber(availableStock)} / {formatNumber(totalStock)}{" "}
              {quantityUnit}
            </Text>
          </View>
        </View>

        <View style={styles.detailsGrid}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Purchased</Text>
            <View style={styles.detailValueContainer}>
              <MaterialIcons
                name="shopping-cart"
                size={14}
                color={AdminTheme.colors.textMuted}
              />
              <Text style={styles.detailValue}>
                {formatNumber(seed.totalPurchased ?? 0)} {quantityUnit}
              </Text>
            </View>
          </View>

          <View style={styles.detailDivider} />

          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Available</Text>
            <View style={styles.detailValueContainer}>
              <MaterialIcons
                name="check-circle"
                size={14}
                color={AdminTheme.colors.success}
              />
              <Text style={styles.detailValue}>
                {formatNumber(availableStock)} {quantityUnit}
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
              <MaterialIcons name="edit" size={16} color={AdminTheme.colors.primary} />
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
                color={AdminTheme.colors.danger}
              />
              <Text style={[styles.actionButtonText, { color: AdminTheme.colors.danger }]}>
                Delete
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </TouchableOpacity>
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
      <View style={[styles.emptyIconGradient, { backgroundColor: AdminTheme.colors.background }]}>
        <MaterialIcons
          name={hasSearch ? "search-off" : "grass"}
          size={48}
          color={AdminTheme.colors.textSoft}
        />
      </View>
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
        <View
          style={[
            styles.emptyButtonGradient,
            { backgroundColor: AdminTheme.colors.primary },
          ]}
        >
          <MaterialIcons name="clear-all" size={18} color={AdminTheme.colors.surface} />
          <Text style={styles.emptyButtonText}>Clear Search</Text>
        </View>
      </TouchableOpacity>
    )}
  </View>
);

// ==================== LOADING STATE ====================

const LoadingState = () => (
  <View style={styles.centerContainer}>
    <ActivityIndicator size="large" color={AdminTheme.colors.primary} />
    <Text style={styles.loadingText}>Loading seeds...</Text>
  </View>
);

// ==================== MAIN COMPONENT ====================

export function SeedsListScreen({
  title = "Seed Inventory",
  routeGroup,
  canWrite = false,
}: SeedsListScreenProps) {
  const role = useAuthStore((state) => state.user?.role);
  const showSourcingDetails = canViewSourcingDetails(role);
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
        (showSourcingDetails && s.supplierName?.toLowerCase().includes(term)) ||
        s.category?.toLowerCase().includes(term) ||
        s.plantType?.name?.toLowerCase().includes(term),
    );
  }, [seeds, searchQuery, showSourcingDetails]);

  const stats = useMemo(() => {
    const totalSeeds = seeds.length;
    const expiredSeeds = seeds.filter((s) => {
      if (!s.expiryDate) return false;
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
                Alert.alert("Error", formatErrorMessage(e));
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
    router.push(`/${`(${routeGroup})`}/seeds/create` as any);
  }, [canWrite, routeGroup, router]);

  const handleBack = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  }, [router]);

  const handleEditPress = useCallback(
    (id: string) => {
      if (!canWrite) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.push({
        pathname: `/${`(${routeGroup})`}/seeds/edit` as any,
        params: { id },
      });
    },
    [canWrite, routeGroup, router],
  );

  const handleDetailPress = useCallback(
    (id: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.push(`/${`(${routeGroup})`}/seeds/${id}` as any);
    },
    [routeGroup, router],
  );

  const renderItem = useCallback(
    ({ item }: { item: Seed }) => (
      <SeedCard
        seed={item}
        onPress={handleDetailPress}
        onEdit={handleEditPress}
        onDelete={handleDelete}
        canWrite={canWrite}
        showSourcingDetails={showSourcingDetails}
      />
    ),
    [canWrite, handleDetailPress, handleEditPress, handleDelete, showSourcingDetails],
  );

  const keyExtractor = useCallback((item: Seed) => item._id, []);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={["left", "right"]}>
        <LoadingState />
      </SafeAreaView>
    );
  }

  const hasActiveSearch = searchQuery.length > 0;
  const hasRecords = seeds.length > 0;

  return (
    <ModuleScreenFrame
      title={title}
      subtitle={`${filteredSeeds.length} ${
        filteredSeeds.length === 1 ? "seed" : "seeds"
      }`}
      onBackPress={handleBack}
      actions={
        canWrite ? (
          <TouchableOpacity
            onPress={handleCreatePress}
            style={styles.createButton}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.createGradient,
            
              ]}
            >
              <MaterialIcons
                name="add"
                size={20}
                color={AdminTheme.colors.surface}
              />
            </View>
          </TouchableOpacity>
        ) : null
      }
    >
      <FlatList
        data={hasRecords ? filteredSeeds : []}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={[AdminTheme.colors.primary]}
            tintColor={AdminTheme.colors.primary}
            progressViewOffset={20}
          />
        }
        contentContainerStyle={[
          styles.listContent,
          !hasRecords && styles.emptyListContent,
        ]}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          hasRecords ? (
            <ModuleScreenIntro
              stats={
                hasRecords
                  ? [
                      {
                        label: "Total Seeds",
                        value: stats.totalSeeds,
                        icon: "grass",
                        tone: "success",
                      },
                      {
                        label: "Valid Stock",
                        value: stats.validSeeds,
                        icon: "check-circle",
                        tone: "info",
                      },
                      {
                        label: "Low Stock",
                        value: stats.lowStockSeeds,
                        icon: "warning",
                        tone: "warning",
                      },
                      {
                        label: "Expired",
                        value: stats.expiredSeeds,
                        icon: "error-outline",
                        tone: "danger",
                      },
                    ]
                  : undefined
              }
              search={{
                value: searchQuery,
                onChangeText: handleSearchChange,
                onClear: handleSearchClear,
                placeholder: showSourcingDetails
                  ? "Search by name, supplier, or category..."
                  : "Search by name or category...",
                resultText: hasActiveSearch
                  ? `Found ${filteredSeeds.length} ${
                      filteredSeeds.length === 1 ? "result" : "results"
                    }`
                  : undefined,
              }}
            />
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <EmptyState
              hasSearch={hasActiveSearch}
              onClearSearch={handleSearchClear}
            />
          </View>
        }
      />
    </ModuleScreenFrame>
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
  createButton: {
    borderRadius: 20,
    overflow: "hidden" as const,
  },
  createGradient: {
    height: 44,
    width:44,
    borderRadius: 24,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: "rgba(166, 212, 168, 0.16)",
    borderWidth: 1,
    borderColor: "rgba(166, 212, 168, 0.3)",
  },
  createButtonText: {
    color: AdminTheme.colors.surface,
    fontSize: 14,
    fontWeight: "600" as const,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: SHARED_BOTTOM_NAV_HEIGHT + 20,
    gap: 12,
    flexGrow: 1,
  },
  emptyListContent: {
    flexGrow: 1,
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
    paddingBottom: SHARED_BOTTOM_NAV_HEIGHT + 24,
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
    color: AdminTheme.colors.surface,
    fontSize: 14,
    fontWeight: "600" as const,
  },

  // Seed Card
  seedCard: {
    ...cardSurface,
    backgroundColor: AdminTheme.colors.surface,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden" as const,
  },
  seedImage: {
    width: "100%" as const,
    height: 140,
  },
  seedImagePlaceholder: {
    width: "100%" as const,
    height: 140,
    backgroundColor: "#F9FAFB",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  cardContent: {
    padding: 14,
    gap: 12,
  },
  cardHeader: {
    gap: 6,
  },
  seedInfo: {
    flex: 1,
  },
  titleRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    gap: 8,
  },
  seedName: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: "#111827",
    flex: 1,
  },
  seedCategory: {
    fontSize: 13,
    color: "#6B7280",
  },
  statusBadge: {
    ...moduleBadge,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "600" as const,
  },
  metaSection: {
    gap: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  metaRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
  },
  metaText: {
    fontSize: 12,
    color: "#6B7280",
    flex: 1,
  },

  // Stock Section
  stockSection: {
    gap: 8,
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
    ...moduleBadge,
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
    marginTop: 4,
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
    backgroundColor: `${AdminTheme.colors.primary}10`,
    borderWidth: 1,
    borderColor: `${AdminTheme.colors.primary}30`,
  },
  deleteButton: {
    backgroundColor: `${AdminTheme.colors.danger}10`,
    borderWidth: 1,
    borderColor: `${AdminTheme.colors.danger}30`,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: AdminTheme.colors.primary,
  },
} as const;
