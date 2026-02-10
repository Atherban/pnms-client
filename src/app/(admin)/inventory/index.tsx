// app/(admin)/inventory/index.tsx
import { MaterialIcons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  View,
} from "react-native";
import { InventoryService } from "../../../services/inventory.service";
import { PlantTypeService } from "../../../services/plant-type.service";
import { Colors, Spacing } from "../../../theme";

const BOTTOM_NAV_HEIGHT = 80;
const { width: SCREEN_WIDTH } = Dimensions.get("window");
const STAT_CARD_WIDTH = (SCREEN_WIDTH - Spacing.lg * 2 - Spacing.md * 2) / 4;
const priceRegex = /^\d+(\.\d{1,2})?$/;

export default function AdminInventory() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [priceModalOpen, setPriceModalOpen] = useState(false);
  const [priceInput, setPriceInput] = useState("");
  const [priceTarget, setPriceTarget] = useState<any>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["inventory"],
    queryFn: InventoryService.getAll,
  });

  const priceMutation = useMutation({
    mutationFn: async () => {
      if (!priceTarget) throw new Error("No plant type selected");
      const value = Number(priceInput.trim());
      if (!priceRegex.test(priceInput.trim()) || !value || value <= 0) {
        throw new Error("Enter a valid selling price");
      }
      const plantTypeId = priceTarget?._id || priceTarget?.id;
      if (!plantTypeId) throw new Error("Invalid plant type");
      return PlantTypeService.update(plantTypeId, { sellingPrice: value });
    },
    onSuccess: () => {
      setPriceModalOpen(false);
      setPriceInput("");
      setPriceTarget(null);
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["plant-types"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (err: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Error", err?.message || "Failed to update selling price");
    },
  });

  /* Normalize API response safely */
  const inventory = useMemo(() => {
    if (!data) return [];
    return Array.isArray(data) ? data : (data.data ?? []);
  }, [data]);

  const filteredInventory = useMemo(() => {
    const term = search.toLowerCase();
    return inventory.filter(
      (item) =>
        item.plantType?.name?.toLowerCase().includes(term) ||
        item.plantType?.category?.toLowerCase().includes(term) ||
        item._id?.toLowerCase().includes(term),
    );
  }, [inventory, search]);

  const handleDelete = (item: any) => {
    Alert.alert(
      "Delete Inventory Item",
      `Are you sure you want to delete "${item.plantType?.name || "this item"}"? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await InventoryService.delete(item._id);
              queryClient.invalidateQueries({ queryKey: ["inventory"] });
              Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success,
              );
            } catch {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              Alert.alert("Error", "Failed to delete item. Please try again.");
            }
          },
        },
      ],
    );
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const getQuantityStatus = (quantity: number) => {
    if (quantity === 0)
      return {
        status: "Out of Stock",
        color: Colors.error,
        icon: "error" as const,
      };
    if (quantity <= 10)
      return {
        status: "Low Stock",
        color: Colors.warning,
        icon: "warning" as const,
      };
    return {
      status: "In Stock",
      color: Colors.success,
      icon: "check-circle" as const,
    };
  };

  const getCategoryIcon = (category: string) => {
    if (!category) return "yard";

    switch (category.toUpperCase()) {
      case "FLOWER":
        return "local-florist";
      case "FRUIT":
        return "cake";
      case "INDOOR":
        return "house";
      case "OUTDOOR":
        return "park";
      case "VEGETABLE":
        return "grass";
      case "MEDICINAL":
        return "medical-services";
      case "ORNAMENTAL":
        return "spa";
      default:
        return "yard";
    }
  };

  const formatCurrency = (amount: number | undefined) => {
    if (amount === undefined || amount === null || isNaN(amount)) {
      return "₹0";
    }
    return `₹${amount.toLocaleString("en-IN")}`;
  };

  const openPriceModal = (plantType: any) => {
    setPriceTarget(plantType);
    const current = plantType?.sellingPrice;
    setPriceInput(current ? String(current) : "");
    setPriceModalOpen(true);
  };

  const stats = useMemo(() => {
    const totalItems = inventory.length;

    const outOfStock = inventory.filter((item) => item.quantity === 0).length;

    const lowStock = inventory.filter(
      (item) => item.quantity > 0 && item.quantity <= 10,
    ).length;

    const inStock = totalItems - outOfStock;

    const totalValue = inventory.reduce((sum, item) => {
      const price = item.plantType?.sellingPrice || 0;
      const quantity = item.quantity || 0;
      return sum + price * quantity;
    }, 0);

    return { totalItems, outOfStock, lowStock, inStock, totalValue };
  }, [inventory]);

  const renderContent = () => {
    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading inventory...</Text>
        </View>
      );
    }

    if (filteredInventory.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <MaterialIcons name="inventory" size={64} color={Colors.border} />
          <Text style={styles.emptyTitle}>No inventory items found</Text>
          <Text style={styles.emptyMessage}>
            {search.length > 0
              ? "Try adjusting your search terms"
              : "No inventory items have been added yet"}
          </Text>
          <Pressable
            onPress={() => router.push("/(admin)/inventory/create")}
            style={({ pressed }) => [
              styles.emptyButton,
              pressed && styles.emptyButtonPressed,
            ]}
          >
            <Text style={styles.emptyButtonText}>Add First Item</Text>
          </Pressable>
        </View>
      );
    }

    return (
      <FlatList
        data={filteredInventory}
        keyExtractor={(item) => item._id}
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
          const quantityStatus = getQuantityStatus(item.quantity || 0);
          const hasPlantInfo = item.plantType;
          const price = item.plantType?.sellingPrice || 0;
          const quantity = item.quantity || 0;
          const totalValue = price * quantity;
          const hasPrice = price > 0;

          return (
            <View style={styles.inventoryCard}>
              {/* Header */}
              <View style={styles.cardHeader}>
                <View style={styles.titleContainer}>
                  <MaterialIcons
                    name={getCategoryIcon(item.plantType?.category)}
                    size={20}
                    color={Colors.primary}
                  />
                  <Text style={styles.itemName} numberOfLines={1}>
                    {hasPlantInfo ? item.plantType.name : "Unnamed Item"}
                  </Text>
                  {item.plantType?.category && (
                    <View
                      style={[
                        styles.categoryBadge,
                        { backgroundColor: Colors.info + "15" },
                      ]}
                    >
                      <Text
                        style={[styles.categoryText, { color: Colors.info }]}
                      >
                        {item.plantType.category}
                      </Text>
                    </View>
                  )}
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: quantityStatus.color + "15" },
                  ]}
                >
                  <MaterialIcons
                    name={quantityStatus.icon}
                    size={12}
                    color={quantityStatus.color}
                  />
                  <Text
                    style={[styles.statusText, { color: quantityStatus.color }]}
                  >
                    {quantityStatus.status}
                  </Text>
                </View>
              </View>

              {hasPlantInfo && hasPrice && (
                <View style={styles.infoRow}>
                  <MaterialIcons
                    name="attach-money"
                    size={16}
                    color={Colors.textSecondary}
                  />
                  <Text style={styles.infoText} numberOfLines={1}>
                    Price: {formatCurrency(price)}
                  </Text>
                </View>
              )}
              {hasPlantInfo && !hasPrice && (
                <View style={styles.infoRow}>
                  <MaterialIcons
                    name="error-outline"
                    size={16}
                    color={Colors.warning}
                  />
                  <Text style={[styles.infoText, { color: Colors.warning }]}>
                    Selling price not set
                  </Text>
                  <Pressable
                    onPress={() => openPriceModal(item.plantType)}
                    style={({ pressed }) => [
                      styles.priceFixButton,
                      pressed && styles.priceFixButtonPressed,
                    ]}
                  >
                    <Text style={styles.priceFixButtonText}>Set Price</Text>
                  </Pressable>
                </View>
              )}

              <View style={styles.infoGrid}>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Quantity</Text>
                  <View style={styles.infoValueRow}>
                    <Text
                      style={[
                        styles.infoValue,
                        quantityStatus.status === "Low Stock" &&
                          styles.lowStockValue,
                        quantityStatus.status === "Out of Stock" &&
                          styles.outOfStockValue,
                      ]}
                    >
                      {quantity}
                    </Text>
                    {quantity <= 10 && quantity > 0 && (
                      <MaterialIcons
                        name="warning"
                        size={14}
                        color={Colors.warning}
                      />
                    )}
                    {quantity === 0 && (
                      <MaterialIcons
                        name="block"
                        size={14}
                        color={Colors.error}
                      />
                    )}
                  </View>
                </View>

                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Value</Text>
                  <Text style={styles.infoValue}>
                    {formatCurrency(totalValue)}
                  </Text>
                </View>

                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Last Updated</Text>
                  <Text style={styles.infoValue}>
                    {item.updatedAt
                      ? new Date(item.updatedAt).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                        })
                      : "—"}
                  </Text>
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
              {stats.totalItems} total items • {filteredInventory.length}{" "}
              filtered
            </Text>
          </View>
          <Pressable
            onPress={() => router.push("/(admin)/inventory/create")}
            style={({ pressed }) => [
              styles.addButton,
              pressed && styles.addButtonPressed,
            ]}
          >
            <MaterialIcons name="add" size={20} color={Colors.white} />
            <Text style={styles.addButtonText}>Add Item</Text>
          </Pressable>
        </View>

        {/* Stats Cards - Fixed Grid */}
        <View style={styles.statsGrid}>
          <View
            style={[
              styles.statCard,
              { backgroundColor: Colors.primary + "10" },
            ]}
          >
            <MaterialIcons name="inventory" size={20} color={Colors.primary} />
            <Text style={styles.statValue}>{stats.totalItems}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>

          <View
            style={[
              styles.statCard,
              { backgroundColor: Colors.success + "10" },
            ]}
          >
            <MaterialIcons
              name="check-circle"
              size={20}
              color={Colors.success}
            />
            <Text style={styles.statValue}>{stats.inStock}</Text>
            <Text style={styles.statLabel}>In Stock</Text>
          </View>

          <View
            style={[
              styles.statCard,
              { backgroundColor: Colors.warning + "10" },
            ]}
          >
            <MaterialIcons name="warning" size={20} color={Colors.warning} />
            <Text style={styles.statValue}>{stats.lowStock}</Text>
            <Text style={styles.statLabel}>Low Stock</Text>
          </View>

          <View
            style={[styles.statCard, { backgroundColor: Colors.error + "10" }]}
          >
            <MaterialIcons name="block" size={20} color={Colors.error} />
            <Text style={styles.statValue}>{stats.outOfStock}</Text>
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
            placeholder="Search plants, categories, or IDs..."
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
      </View>

      {/* Scrollable Content Area */}
      <View style={styles.contentArea}>{renderContent()}</View>

      <Modal visible={priceModalOpen} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Set Selling Price</Text>
            <Text style={styles.modalSubtitle}>
              {priceTarget?.name || "Plant type"}
            </Text>

            <TextInput
              value={priceInput}
              onChangeText={setPriceInput}
              keyboardType="numeric"
              placeholder="e.g. 120"
              placeholderTextColor={Colors.textTertiary}
              style={styles.modalInput}
            />

            <View style={styles.modalActions}>
              <Pressable
                onPress={() => {
                  setPriceModalOpen(false);
                  setPriceInput("");
                  setPriceTarget(null);
                }}
              >
                <Text style={styles.modalCancel}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => priceMutation.mutate()}
                disabled={priceMutation.isLoading}
              >
                <Text style={styles.modalSave}>
                  {priceMutation.isLoading ? "Saving..." : "Save"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
    paddingTop: Spacing.lg,
  },
  header: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    marginBottom: Spacing.md,
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
    marginBottom: Spacing.md,
  },
  statCard: {
    width: STAT_CARD_WIDTH,
    padding: Spacing.sm,
    borderRadius: 12,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: Colors.text,
    marginTop: Spacing.xs,
  },
  statLabel: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontWeight: "500" as const,
    marginTop: Spacing.xs,
    textAlign: "center" as const,
  },
  searchContainer: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    height: 44,
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
  contentArea: {
    flex: 1,
  },
  listHeader: {
    height: Spacing.md,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: BOTTOM_NAV_HEIGHT + Spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingBottom: BOTTOM_NAV_HEIGHT,
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
    paddingBottom: BOTTOM_NAV_HEIGHT + Spacing.xl,
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
  inventoryCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: Spacing.md,
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
    marginBottom: Spacing.xs,
  },
  titleContainer: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    flex: 1,
    gap: Spacing.sm,
  },
  itemName: {
    fontSize: 16,
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
    fontSize: 10,
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
    fontSize: 11,
    fontWeight: "600" as const,
  },
  infoRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    marginBottom: Spacing.sm,
    gap: Spacing.xs,
  },
  infoText: {
    fontSize: 14,
    color: Colors.textSecondary,
    flex: 1,
  },
  priceFixButton: {
    marginLeft: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.warning,
  },
  priceFixButtonPressed: {
    opacity: 0.8,
  },
  priceFixButtonText: {
    color: Colors.warning,
    fontSize: 12,
    fontWeight: "600" as const,
  },
  infoGrid: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    marginBottom: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.borderLight,
  },
  infoItem: {
    alignItems: "center" as const,
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
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
    fontSize: 15,
    fontWeight: "600" as const,
    color: Colors.text,
  },
  lowStockValue: {
    color: Colors.warning,
  },
  outOfStockValue: {
    color: Colors.error,
  },
  actionsContainer: {
    flexDirection: "row" as const,
    gap: Spacing.xs,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingVertical: Spacing.xs,
    borderRadius: 8,
    gap: 4,
  },
  editButton: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  transferButton: {
    backgroundColor: Colors.info + "10",
    borderWidth: 1,
    borderColor: Colors.info + "30",
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
    fontSize: 12,
    fontWeight: "600" as const,
    color: Colors.primary,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    padding: Spacing.lg,
  },
  modalCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: Spacing.lg,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  modalSubtitle: {
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
  },
  modalActions: {
    flexDirection: "row" as const,
    justifyContent: "flex-end" as const,
    gap: Spacing.md,
  },
  modalCancel: {
    color: Colors.textSecondary,
  },
  modalSave: {
    color: Colors.primary,
    fontWeight: "600" as const,
  },
};
