import { MaterialIcons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  View,
} from "react-native";
import { Plant, PlantService } from "../../../services/plant.service";
import { Colors, Spacing } from "../../../theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const STAT_CARD_WIDTH = (SCREEN_WIDTH - Spacing.lg * 2 - Spacing.md * 2) / 3;
const BOTTOM_NAV_HEIGHT = 80; // Adjust based on your bottom nav height
const HEADER_HEIGHT = 280; // Total height of fixed header section

export default function AdminPlants() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [stockFilter, setStockFilter] = useState<
    "ALL" | "IN_STOCK" | "OUT_OF_STOCK"
  >("ALL");
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["plants"],
    queryFn: PlantService.getAll,
  });

  /* Refresh when screen gains focus */
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  const plants = data ?? [];

  const filteredPlants = useMemo(() => {
    return plants.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.category?.toLowerCase().includes(search.toLowerCase());

      const matchesStock =
        stockFilter === "ALL" ||
        (stockFilter === "IN_STOCK" && p.quantityAvailable > 0) ||
        (stockFilter === "OUT_OF_STOCK" && p.quantityAvailable === 0);

      return matchesSearch && matchesStock;
    });
  }, [plants, search, stockFilter]);

  const handleDelete = (plant: Plant) => {
    Alert.alert(
      "Delete Plant",
      `Are you sure you want to delete "${plant.name}"? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await PlantService.delete(plant._id);
            queryClient.invalidateQueries({ queryKey: ["plants"] });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ],
    );
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await refetch();
    setRefreshing(false);
  }, []);

  // Calculate statistics
  const stats = useMemo(() => {
    const totalPlants = plants.length;
    const inStockPlants = plants.filter((p) => p.quantityAvailable > 0).length;
    const outOfStockPlants = plants.filter(
      (p) => p.quantityAvailable === 0,
    ).length;

    return { totalPlants, inStockPlants, outOfStockPlants };
  }, [plants]);

  const handleFilterReset = () => {
    setSearch("");
    setStockFilter("ALL");
  };

  // Main render
  const renderContent = () => {
    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading plants...</Text>
        </View>
      );
    }

    if (filteredPlants.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <MaterialIcons name="spa" size={64} color={Colors.border} />
          <Text style={styles.emptyTitle}>No plants found</Text>
          <Text style={styles.emptyMessage}>
            {search.length > 0 || stockFilter !== "ALL"
              ? "Try adjusting your filters"
              : "No plants have been added yet"}
          </Text>
          <Pressable
            onPress={() => router.push("/(admin)/plants/create")}
            style={({ pressed }) => [
              styles.emptyButton,
              pressed && styles.emptyButtonPressed,
            ]}
          >
            <Text style={styles.emptyButtonText}>Add First Plant</Text>
          </Pressable>
        </View>
      );
    }

    return (
      <FlatList
        data={filteredPlants}
        keyExtractor={(p) => p._id}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={<View style={styles.listHeader} />}
        renderItem={({ item }) => {
          const isOutOfStock = item.quantityAvailable === 0;

          return (
            <View style={styles.plantCard}>
              {/* Header with Name & Category */}
              <View style={styles.cardHeader}>
                <View style={styles.titleContainer}>
                  <MaterialIcons name="spa" size={20} color={Colors.primary} />
                  <Text style={styles.plantName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  {item.category && (
                    <View
                      style={[
                        styles.categoryBadge,
                        { backgroundColor: Colors.info + "15" },
                      ]}
                    >
                      <Text
                        style={[styles.categoryText, { color: Colors.info }]}
                      >
                        {item.category}
                      </Text>
                    </View>
                  )}
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor: isOutOfStock
                        ? Colors.error + "15"
                        : Colors.success + "15",
                    },
                  ]}
                >
                  <MaterialIcons
                    name={isOutOfStock ? "error" : "check-circle"}
                    size={12}
                    color={isOutOfStock ? Colors.error : Colors.success}
                  />
                  <Text
                    style={[
                      styles.statusText,
                      { color: isOutOfStock ? Colors.error : Colors.success },
                    ]}
                  >
                    {isOutOfStock ? "Out of Stock" : "In Stock"}
                  </Text>
                </View>
              </View>

              {/* Price & Stock Info */}
              <View style={styles.infoGrid}>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Price</Text>
                  <Text style={styles.infoValue}>₹{item.price || 0}</Text>
                </View>

                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Stock</Text>
                  <View style={styles.infoValueRow}>
                    <Text
                      style={[
                        styles.infoValue,
                        isOutOfStock && styles.outOfStockValue,
                      ]}
                    >
                      {item.quantityAvailable || 0}
                    </Text>
                    {isOutOfStock && (
                      <MaterialIcons
                        name="error"
                        size={14}
                        color={Colors.error}
                      />
                    )}
                  </View>
                </View>
              </View>
            </View>
          );
        }}
      />
    );
  };

  return (
    <View style={styles.container}>
      {/* Fixed Header Section */}
      <View style={styles.fixedHeader}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Plant Inventory</Text>
            <Text style={styles.subtitle}>
              {stats.totalPlants} total plants • {filteredPlants.length}{" "}
              filtered
            </Text>
          </View>
        </View>

        {/* Stats Cards - Fixed Grid */}
        <View style={styles.statsGrid}>
          <View
            style={[
              styles.statCard,
              { backgroundColor: Colors.primary + "10" },
            ]}
          >
            <MaterialIcons name="spa" size={24} color={Colors.primary} />
            <Text style={styles.statValue}>{stats.totalPlants}</Text>
            <Text style={styles.statLabel}>Total Plants</Text>
          </View>

          <View
            style={[
              styles.statCard,
              { backgroundColor: Colors.success + "10" },
            ]}
          >
            <MaterialIcons
              name="check-circle"
              size={24}
              color={Colors.success}
            />
            <Text style={styles.statValue}>{stats.inStockPlants}</Text>
            <Text style={styles.statLabel}>In Stock</Text>
          </View>

          <View
            style={[styles.statCard, { backgroundColor: Colors.error + "10" }]}
          >
            <MaterialIcons name="error" size={24} color={Colors.error} />
            <Text style={styles.statValue}>{stats.outOfStockPlants}</Text>
            <Text style={styles.statLabel}>Out of Stock</Text>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <MaterialIcons
            name="search"
            size={20}
            color={Colors.textSecondary}
            style={styles.searchIcon}
          />
          <TextInput
            placeholder="Search plants or categories..."
            placeholderTextColor={Colors.textTertiary}
            value={search}
            onChangeText={setSearch}
            style={styles.searchInput}
            clearButtonMode="while-editing"
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")} style={styles.clearButton}>
              <MaterialIcons
                name="close"
                size={16}
                color={Colors.textSecondary}
              />
            </Pressable>
          )}
        </View>

        {/* Filter Chips - Fixed Row */}
        <View style={styles.filterRow}>
          <Pressable
            onPress={() =>
              setStockFilter((prev) =>
                prev === "ALL"
                  ? "IN_STOCK"
                  : prev === "IN_STOCK"
                    ? "OUT_OF_STOCK"
                    : "ALL",
              )
            }
            style={({ pressed }) => [
              styles.filterChip,
              stockFilter !== "ALL" && styles.filterChipActive,
              pressed && styles.filterChipPressed,
            ]}
          >
            <Text
              style={[
                styles.filterChipText,
                stockFilter !== "ALL" && styles.filterChipTextActive,
              ]}
            >
              {stockFilter === "ALL"
                ? "All Stock"
                : stockFilter === "IN_STOCK"
                  ? "In Stock"
                  : "Out of Stock"}
            </Text>
            {stockFilter !== "ALL" && (
              <MaterialIcons
                name={stockFilter === "IN_STOCK" ? "check-circle" : "block"}
                size={14}
                color={
                  stockFilter === "IN_STOCK" ? Colors.success : Colors.error
                }
                style={styles.filterIcon}
              />
            )}
          </Pressable>

          {(search.length > 0 || stockFilter !== "ALL") && (
            <Pressable
              onPress={handleFilterReset}
              style={({ pressed }) => [
                styles.filterChip,
                pressed && styles.filterChipPressed,
              ]}
            >
              <MaterialIcons
                name="filter-alt-off"
                size={14}
                color={Colors.textSecondary}
              />
              <Text style={[styles.filterChipText, { marginLeft: 4 }]}>
                Clear Filters
              </Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* Scrollable Content Area */}
      <View style={styles.contentArea}>{renderContent()}</View>
    </View>
  );
}

const styles = {
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  fixedHeader: {
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg, // Reduced from xl
  },
  header: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    marginBottom: Spacing.md, // Reduced from lg
  },
  title: {
    fontSize: 24,
    fontWeight: "700" as const,
    color: Colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  addButton: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 10,
    gap: Spacing.xs,
  },
  addButtonPressed: {
    backgroundColor: Colors.primaryDark,
    transform: [{ scale: 0.98 }],
  },
  addButtonText: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: "600" as const,
  },
  statsGrid: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    marginBottom: Spacing.md, // Reduced from lg
  },
  statCard: {
    width: STAT_CARD_WIDTH,
    padding: Spacing.sm, // Reduced from md
    borderRadius: 12,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  statValue: {
    fontSize: 18, // Reduced from 20
    fontWeight: "700" as const,
    color: Colors.text,
    marginTop: Spacing.xs, // Reduced from sm
  },
  statLabel: {
    fontSize: 10, // Reduced from 11
    color: Colors.textSecondary,
    fontWeight: "500" as const,
    marginTop: Spacing.xs,
    textAlign: "center" as const,
  },
  searchContainer: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: Colors.surface,
    marginBottom: Spacing.sm, // Reduced from md
    paddingHorizontal: Spacing.md,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    height: 44, // Reduced from 48
  },
  searchIcon: {
    marginRight: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    padding: 0,
  },
  clearButton: {
    padding: Spacing.xs,
  },
  filterRow: {
    flexDirection: "row" as const,
    gap: Spacing.xs, // Reduced from sm
    flexWrap: "wrap" as const,
  },
  filterChip: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    height: 32, // Reduced from 36
  },
  filterChipActive: {
    backgroundColor: Colors.primary + "10",
    borderColor: Colors.primary,
  },
  filterChipPressed: {
    backgroundColor: Colors.surfaceDark,
    transform: [{ scale: 0.98 }],
  },
  filterChipText: {
    fontSize: 12, // Reduced from 13
    color: Colors.textSecondary,
    fontWeight: "500" as const,
  },
  filterChipTextActive: {
    color: Colors.primary,
    fontWeight: "600" as const,
  },
  filterIcon: {
    marginLeft: Spacing.xs,
  },
  contentArea: {
    flex: 1,
  },
  listHeader: {
    height: Spacing.md, // Small spacer between header and list
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: BOTTOM_NAV_HEIGHT + Spacing.lg, // Space for bottom nav
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingBottom: BOTTOM_NAV_HEIGHT, // Account for bottom nav
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: 16,
    color: Colors.textSecondary,
    fontWeight: "500" as const,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    padding: Spacing.xl,
    paddingBottom: BOTTOM_NAV_HEIGHT + Spacing.xl, // Account for bottom nav
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600" as const,
    color: Colors.text,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  emptyMessage: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center" as const,
    marginBottom: Spacing.lg,
    lineHeight: 20,
  },
  emptyButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: 12,
  },
  emptyButtonPressed: {
    backgroundColor: Colors.primaryDark,
    transform: [{ scale: 0.98 }],
  },
  emptyButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: "600" as const,
  },
  plantCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: Spacing.md, // Reduced from lg
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "flex-start" as const,
    marginBottom: Spacing.xs, // Reduced from sm
  },
  titleContainer: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    flex: 1,
    gap: Spacing.sm,
  },
  plantName: {
    fontSize: 16, // Reduced from 18
    fontWeight: "600" as const,
    color: Colors.text,
    flex: 1,
  },
  categoryBadge: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: 6,
  },
  categoryText: {
    fontSize: 10, // Reduced from 11
    fontWeight: "600" as const,
  },
  statusBadge: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 4,
  },
  statusText: {
    fontSize: 11, // Reduced from 12
    fontWeight: "600" as const,
  },
  infoGrid: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    marginBottom: Spacing.xs, // Reduced from md
    paddingTop: Spacing.xs, // Reduced from md
    borderTopWidth: 1,
    // borderBottomWidth: 1,
    borderColor: Colors.borderLight,
  },
  infoItem: {
    alignItems: "center" as const,
    flex: 1,
  },
  infoLabel: {
    fontSize: 11, // Reduced from 12
    color: Colors.textTertiary,
    marginBottom: Spacing.xs,
    fontWeight: "500" as const,
  },
  infoValueRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: Spacing.xs,
  },
  infoValue: {
    fontSize: 15, // Reduced from 16
    fontWeight: "600" as const,
    color: Colors.text,
  },
  outOfStockValue: {
    color: Colors.error,
  },
  actionsContainer: {
    flexDirection: "row" as const,
    gap: Spacing.xs, // Reduced from sm
  },
  actionButton: {
    flex: 1,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingVertical: Spacing.xs, // Reduced from sm
    borderRadius: 8,
    gap: 4, // Reduced from xs
  },
  editButton: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  imageButton: {
    backgroundColor: Colors.info + "10",
    borderWidth: 1,
    borderColor: Colors.info + "30",
  },
  quantityButton: {
    backgroundColor: Colors.warning + "10",
    borderWidth: 1,
    borderColor: Colors.warning + "30",
  },
  deleteButton: {
    backgroundColor: Colors.error + "10",
    borderWidth: 1,
    borderColor: Colors.error + "30",
  },
  actionButtonPressed: {
    transform: [{ scale: 0.98 }],
  },
  actionButtonText: {
    fontSize: 12, // Reduced from 14
    fontWeight: "600" as const,
    color: Colors.primary,
  },
};
