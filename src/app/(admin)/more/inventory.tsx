import { MaterialIcons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { PlantService } from "../../../services/plant.service";
import { SeedService } from "../../../services/seed.service";
import { Colors, Spacing } from "../../../theme";

export default function AdminInventory() {
  const {
    data: plantsRes,
    isLoading: isLoadingPlants,
    error: plantsError,
  } = useQuery({
    queryKey: ["plants"],
    queryFn: PlantService.getAll,
  });

  const {
    data: seedsRes,
    isLoading: isLoadingSeeds,
    error: seedsError,
  } = useQuery({
    queryKey: ["seeds"],
    queryFn: SeedService.getAll,
  });

  /* ---------------- Normalize API responses ---------------- */
  const plants = Array.isArray(plantsRes)
    ? plantsRes
    : Array.isArray(plantsRes?.data)
      ? plantsRes.data
      : [];

  const seeds = Array.isArray(seedsRes)
    ? seedsRes
    : Array.isArray(seedsRes?.data)
      ? seedsRes.data
      : [];

  /* ---------------- Helpers ---------------- */
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const getPlantStock = (plant: any) =>
    Number(plant.stock ?? plant.quantityAvailable ?? 0);

  const getSeedExpiryStatus = (expiryDate: string) => {
    const expiry = new Date(expiryDate);
    expiry.setHours(0, 0, 0, 0);

    const diffDays =
      (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);

    if (diffDays < 0) {
      return {
        label: "Expired",
        color: Colors.error,
        icon: "error-outline",
        description: "Immediate attention required",
      };
    }

    if (diffDays <= 7) {
      return {
        label: "Expiring Soon",
        color: Colors.warning,
        icon: "warning",
        description: `Expires in ${Math.ceil(diffDays)} days`,
      };
    }

    if (diffDays <= 30) {
      return {
        label: "Expiring Soon",
        color: Colors.warning,
        icon: "warning",
        description: `Expires in ${Math.ceil(diffDays)} days`,
      };
    }

    return {
      label: "Good",
      color: Colors.success,
      icon: "check-circle",
      description: "Valid",
    };
  };

  /* ---------------- Metrics ---------------- */
  const expiredSeeds = seeds.filter(
    (s) => new Date(s.expiryDate).setHours(0, 0, 0, 0) < today.getTime(),
  );

  const lowStockPlants = plants.filter((p) => getPlantStock(p) <= 5);
  const outOfStockPlants = plants.filter((p) => getPlantStock(p) === 0);
  const seedsExpiringSoon = seeds.filter((s) => {
    const expiry = new Date(s.expiryDate);
    expiry.setHours(0, 0, 0, 0);
    const diffDays =
      (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays > 0 && diffDays <= 30;
  });

  const isLoading = isLoadingPlants || isLoadingSeeds;
  const hasError = plantsError || seedsError;

  /* ---------------- Loading State ---------------- */
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={[Colors.primary, Colors.primaryLight || Colors.primary]}
          style={styles.headerGradient}
        >
          <View style={styles.headerContent}>
            <MaterialIcons name="inventory" size={28} color={Colors.white} />
            <Text style={styles.title}>Inventory Management</Text>
          </View>
        </LinearGradient>

        <View style={styles.loadingContainer}>
          <MaterialIcons name="inventory" size={64} color={Colors.primary} />
          <Text style={styles.loadingTitle}>Loading Inventory</Text>
          <Text style={styles.loadingSubtitle}>
            Fetching plants and seeds data...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  /* ---------------- Error State ---------------- */
  if (hasError) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={[Colors.primary, Colors.primaryLight || Colors.primary]}
          style={styles.headerGradient}
        >
          <View style={styles.headerContent}>
            <MaterialIcons name="inventory" size={28} color={Colors.white} />
            <Text style={styles.title}>Inventory Management</Text>
          </View>
        </LinearGradient>

        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={64} color={Colors.error} />
          <Text style={styles.errorTitle}>Failed to Load Inventory</Text>
          <Text style={styles.errorMessage}>
            Unable to fetch inventory data. Please try again later.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={[Colors.primary, Colors.primaryLight || Colors.primary]}
        style={styles.headerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <View style={styles.headerContent}>
          <MaterialIcons name="inventory" size={28} color={Colors.white} />
          <Text style={styles.title}>Inventory Management</Text>
        </View>
        <Text style={styles.headerSubtitle}>
          Complete overview of plants and seeds stock
        </Text>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary Cards */}
        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <View
              style={[
                styles.summaryCardGradient,
                { backgroundColor: hexToRgba(Colors.success, 0.1) },
              ]}
            >
              <View style={styles.summaryCardHeader}>
                <View
                  style={[
                    styles.summaryIconContainer,
                    { backgroundColor: hexToRgba(Colors.success, 0.3) },
                  ]}
                >
                  <MaterialIcons name="spa" size={20} color={Colors.success} />
                </View>
                <MaterialIcons
                  name="trending-up"
                  size={14}
                  color={Colors.success}
                />
              </View>

              <Text style={styles.summaryValue}>{plants.length}</Text>
              <Text style={styles.summaryLabel}>Total Plants</Text>
              <Text style={styles.summaryDescription}>In stock items</Text>
            </View>
          </View>

          <View style={styles.summaryCard}>
            <View
              style={[
                styles.summaryCardGradient,
                {
                  backgroundColor: hexToRgba(
                    Colors.info || Colors.primary,
                    0.1,
                  ),
                },
              ]}
            >
              <View style={styles.summaryCardHeader}>
                <View
                  style={[
                    styles.summaryIconContainer,
                    {
                      backgroundColor: hexToRgba(
                        Colors.info || Colors.primary,
                        0.3,
                      ),
                    },
                  ]}
                >
                  <MaterialIcons
                    name="grass"
                    size={20}
                    color={Colors.info || Colors.primary}
                  />
                </View>
                <MaterialIcons
                  name="trending-up"
                  size={14}
                  color={Colors.success}
                />
              </View>

              <Text style={styles.summaryValue}>{seeds.length}</Text>
              <Text style={styles.summaryLabel}>Total Seeds</Text>
              <Text style={styles.summaryDescription}>Available varieties</Text>
            </View>
          </View>

          <View style={styles.summaryCard}>
            <View
              style={[
                styles.summaryCardGradient,
                { backgroundColor: hexToRgba(Colors.warning, 0.1) },
              ]}
            >
              <View style={styles.summaryCardHeader}>
                <View
                  style={[
                    styles.summaryIconContainer,
                    { backgroundColor: hexToRgba(Colors.warning, 0.3) },
                  ]}
                >
                  <MaterialIcons
                    name="warning"
                    size={20}
                    color={Colors.warning}
                  />
                </View>
                <MaterialIcons
                  name="trending-down"
                  size={14}
                  color={Colors.warning}
                />
              </View>

              <Text style={styles.summaryValue}>{lowStockPlants.length}</Text>
              <Text style={styles.summaryLabel}>Low Stock</Text>
              <Text style={styles.summaryDescription}>≤ 5 units remaining</Text>
            </View>
          </View>

          <View style={styles.summaryCard}>
            <View
              style={[
                styles.summaryCardGradient,
                { backgroundColor: hexToRgba(Colors.error, 0.1) },
              ]}
            >
              <View style={styles.summaryCardHeader}>
                <View
                  style={[
                    styles.summaryIconContainer,
                    { backgroundColor: hexToRgba(Colors.error, 0.3) },
                  ]}
                >
                  <MaterialIcons name="error" size={20} color={Colors.error} />
                </View>
                <MaterialIcons name="error" size={14} color={Colors.error} />
              </View>

              <Text style={styles.summaryValue}>{expiredSeeds.length}</Text>
              <Text style={styles.summaryLabel}>Expired Seeds</Text>
              <Text style={styles.summaryDescription}>Immediate attention</Text>
            </View>
          </View>
        </View>

        {/* Additional Metrics */}
        <View style={styles.additionalMetrics}>
          <View style={styles.metricChip}>
            <MaterialIcons name="block" size={16} color={Colors.error} />
            <Text style={styles.metricChipText}>
              Out of Stock: {outOfStockPlants.length}
            </Text>
          </View>
          <View style={styles.metricChip}>
            <MaterialIcons name="schedule" size={16} color={Colors.warning} />
            <Text style={styles.metricChipText}>
              Seeds Expiring Soon: {seedsExpiringSoon.length}
            </Text>
          </View>
        </View>

        {/* Seeds Section */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="grass" size={22} color={Colors.text} />
            <Text style={styles.sectionTitle}>Seeds Inventory</Text>
            <View style={styles.sectionBadge}>
              <Text style={styles.sectionBadgeText}>{seeds.length} items</Text>
            </View>
          </View>
          <Text style={styles.sectionDescription}>
            Monitor seed expiry dates and stock status
          </Text>

          {seeds.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialIcons name="grass" size={48} color={Colors.border} />
              <Text style={styles.emptyStateText}>No seeds in inventory</Text>
              <Text style={styles.emptyStateSubtext}>
                Add seeds to track expiry and stock
              </Text>
            </View>
          ) : (
            <View style={styles.itemsGrid}>
              {seeds.map((seed) => {
                const status = getSeedExpiryStatus(seed.expiryDate);
                const isExpired = status.label === "Expired";

                return (
                  <View
                    key={seed._id}
                    style={[
                      styles.seedCard,
                      isExpired && styles.seedCardExpired,
                    ]}
                  >
                    <View
                      style={[
                        styles.seedCardContent,
                        {
                          backgroundColor: isExpired
                            ? hexToRgba(Colors.error, 0.05)
                            : Colors.surface,
                        },
                      ]}
                    >
                      <View style={styles.seedHeader}>
                        <MaterialIcons
                          name="grass"
                          size={18}
                          color={status.color}
                        />
                        <View
                          style={[
                            styles.statusBadge,
                            { backgroundColor: hexToRgba(status.color, 0.2) },
                          ]}
                        >
                          <MaterialIcons
                            name={status.icon}
                            size={12}
                            color={status.color}
                          />
                          <Text
                            style={[
                              styles.statusBadgeText,
                              { color: status.color },
                            ]}
                          >
                            {status.label}
                          </Text>
                        </View>
                      </View>

                      <Text style={styles.seedName} numberOfLines={2}>
                        {seed.name}
                      </Text>

                      <View style={styles.seedDetails}>
                        <View style={styles.detailItem}>
                          <MaterialIcons
                            name="business"
                            size={12}
                            color={Colors.textSecondary}
                          />
                          <Text style={styles.detailText} numberOfLines={1}>
                            {seed.supplierName || "No supplier"}
                          </Text>
                        </View>

                        <View style={styles.detailItem}>
                          <MaterialIcons
                            name="calendar-today"
                            size={12}
                            color={Colors.textSecondary}
                          />
                          <Text style={styles.detailText}>
                            {new Date(seed.expiryDate).toLocaleDateString(
                              "en-IN",
                              {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              },
                            )}
                          </Text>
                        </View>
                      </View>

                      <Text style={styles.statusDescription}>
                        {status.description}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Plants Section */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="spa" size={22} color={Colors.text} />
            <Text style={styles.sectionTitle}>Plants Inventory</Text>
            <View style={styles.sectionBadge}>
              <Text style={styles.sectionBadgeText}>{plants.length} items</Text>
            </View>
          </View>
          <Text style={styles.sectionDescription}>
            Track plant stock levels and availability
          </Text>

          {plants.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialIcons name="spa" size={48} color={Colors.border} />
              <Text style={styles.emptyStateText}>No plants in inventory</Text>
              <Text style={styles.emptyStateSubtext}>
                Add plants to track stock and availability
              </Text>
            </View>
          ) : (
            <View style={styles.plantsList}>
              {plants.map((plant) => {
                const stock = getPlantStock(plant);
                const isLowStock = stock <= 5;
                const isOutOfStock = stock === 0;
                const stockStatus = isOutOfStock
                  ? {
                      color: Colors.error,
                      icon: "block",
                      label: "Out of Stock",
                    }
                  : isLowStock
                    ? {
                        color: Colors.warning,
                        icon: "warning",
                        label: "Low Stock",
                      }
                    : {
                        color: Colors.success,
                        icon: "check-circle",
                        label: "In Stock",
                      };

                return (
                  <View key={plant._id} style={styles.plantCard}>
                    <View style={styles.plantCardContent}>
                      <View style={styles.plantHeader}>
                        <View style={styles.plantIconContainer}>
                          <MaterialIcons
                            name="spa"
                            size={20}
                            color={Colors.primary}
                          />
                        </View>
                        <View
                          style={[
                            styles.stockBadge,
                            {
                              backgroundColor: hexToRgba(
                                stockStatus.color,
                                0.2,
                              ),
                            },
                          ]}
                        >
                          <MaterialIcons
                            name={stockStatus.icon}
                            size={14}
                            color={stockStatus.color}
                          />
                          <Text
                            style={[
                              styles.stockBadgeText,
                              { color: stockStatus.color },
                            ]}
                          >
                            {stockStatus.label}
                          </Text>
                        </View>
                      </View>

                      <Text style={styles.plantName} numberOfLines={2}>
                        {plant.name}
                      </Text>

                      {plant.category && (
                        <View style={styles.categoryChip}>
                          <Text style={styles.categoryChipText}>
                            {plant.category}
                          </Text>
                        </View>
                      )}

                      <View style={styles.stockInfo}>
                        <View style={styles.stockIndicator}>
                          <View
                            style={[
                              styles.stockBar,
                              {
                                width: `${Math.min((stock / 20) * 100, 100)}%`,
                                backgroundColor: stockStatus.color,
                              },
                            ]}
                          />
                        </View>
                        <View style={styles.stockDetails}>
                          <Text style={styles.stockLabel}>Current Stock</Text>
                          <Text
                            style={[
                              styles.stockValue,
                              { color: stockStatus.color },
                            ]}
                          >
                            {stock} units
                          </Text>
                        </View>
                      </View>

                      {plant.price && (
                        <View style={styles.priceTag}>
                          <MaterialIcons
                            name="attach-money"
                            size={12}
                            color={Colors.textSecondary}
                          />
                          <Text style={styles.priceText}>
                            ₹{plant.price?.toLocaleString("en-IN")}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <MaterialIcons name="info" size={14} color={Colors.textTertiary} />
          <Text style={styles.footerText}>
            Last updated:{" "}
            {new Date().toLocaleTimeString("en-IN", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            })}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// Helper function to convert hex color to rgba
const hexToRgba = (hex: string, alpha: number = 1) => {
  // Remove # if present
  hex = hex.replace("#", "");

  // Parse r, g, b values
  let r, g, b;

  if (hex.length === 3) {
    r = parseInt(hex[0] + hex[0], 16);
    g = parseInt(hex[1] + hex[1], 16);
    b = parseInt(hex[2] + hex[2], 16);
  } else if (hex.length === 6) {
    r = parseInt(hex.substring(0, 2), 16);
    g = parseInt(hex.substring(2, 4), 16);
    b = parseInt(hex.substring(4, 6), 16);
  } else {
    // Default fallback color (light gray)
    return `rgba(200, 200, 200, ${alpha})`;
  }

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

/* ---------------- Styles ---------------- */
const styles = {
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerGradient: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xl,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    marginBottom: Spacing.lg,
  },
  headerContent: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  title: {
    fontSize: 24,
    fontWeight: "700" as const,
    color: Colors.white,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.9)",
    fontWeight: "500" as const,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    padding: Spacing.xl,
  },
  loadingTitle: {
    fontSize: 22,
    fontWeight: "700" as const,
    color: Colors.text,
    marginTop: Spacing.lg,
    marginBottom: Spacing.xs,
  },
  loadingSubtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: "center" as const,
  },
  errorContainer: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    padding: Spacing.xl,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: "700" as const,
    color: Colors.error,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  errorMessage: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: "center" as const,
    lineHeight: 22,
  },
  scroll: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  summaryGrid: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  summaryCard: {
    flex: 1,
    minWidth: 160,
    borderRadius: 16,
    overflow: "hidden" as const,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  summaryCardGradient: {
    padding: Spacing.lg,
    borderRadius: 16,
  },
  summaryCardHeader: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    marginBottom: Spacing.md,
  },
  summaryIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: "700" as const,
    color: Colors.text,
    marginBottom: 2,
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.text,
    marginBottom: 4,
  },
  summaryDescription: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  additionalMetrics: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  metricChip: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.xs,
  },
  metricChipText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: "500" as const,
  },
  sectionCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  sectionHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600" as const,
    color: Colors.text,
    flex: 1,
  },
  sectionBadge: {
    backgroundColor: hexToRgba(Colors.primary, 0.2),
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
  },
  sectionBadgeText: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: Colors.primary,
  },
  sectionDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
    lineHeight: 20,
  },
  emptyState: {
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingVertical: Spacing.xl,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
    marginBottom: 4,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: Colors.textTertiary,
    textAlign: "center" as const,
  },
  itemsGrid: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: Spacing.md,
  },
  seedCard: {
    width: "48%",
    borderRadius: 16,
    overflow: "hidden" as const,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  seedCardExpired: {
    borderColor: Colors.error,
  },
  seedCardContent: {
    padding: Spacing.md,
    borderRadius: 16,
  },
  seedHeader: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    marginBottom: Spacing.sm,
  },
  statusBadge: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 2,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "600" as const,
  },
  seedName: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.text,
    marginBottom: Spacing.sm,
    lineHeight: 18,
  },
  seedDetails: {
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  detailItem: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
  },
  detailText: {
    fontSize: 11,
    color: Colors.textSecondary,
    flex: 1,
  },
  statusDescription: {
    fontSize: 10,
    color: Colors.textTertiary,
    fontStyle: "italic" as const,
  },
  plantsList: {
    gap: Spacing.md,
  },
  plantCard: {
    borderRadius: 16,
    overflow: "hidden" as const,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  plantCardContent: {
    padding: Spacing.md,
    backgroundColor: Colors.white,
  },
  plantHeader: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    marginBottom: Spacing.md,
  },
  plantIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: hexToRgba(Colors.primary, 0.2),
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  stockBadge: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  stockBadgeText: {
    fontSize: 11,
    fontWeight: "600" as const,
  },
  plantName: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: Colors.text,
    marginBottom: Spacing.sm,
    lineHeight: 20,
  },
  categoryChip: {
    alignSelf: "flex-start" as const,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: 12,
    marginBottom: Spacing.md,
  },
  categoryChipText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: "500" as const,
  },
  stockInfo: {
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  stockIndicator: {
    height: 6,
    backgroundColor: Colors.border,
    borderRadius: 3,
    overflow: "hidden" as const,
  },
  stockBar: {
    height: "100%",
    borderRadius: 3,
  },
  stockDetails: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
  },
  stockLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  stockValue: {
    fontSize: 14,
    fontWeight: "700" as const,
  },
  priceTag: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
    alignSelf: "flex-end" as const,
  },
  priceText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.text,
  },
  footer: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: Spacing.xs,
    padding: Spacing.lg,
    marginBottom: 3 * Spacing.xl,
  },
  footerText: {
    fontSize: 12,
    color: Colors.textTertiary,
  },
};
