import { MaterialIcons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { InventoryService } from "../../services/inventory.service";
import { Colors, Spacing } from "../../theme";
import { resolveInventoryPricing } from "../../utils/inventory-pricing";
import { resolveEntityImage } from "../../utils/image";
import EntityThumbnail from "../ui/EntityThumbnail";

const BOTTOM_NAV_HEIGHT = 80;

interface InventoryDetailScreenProps {
  id?: string;
  title?: string;
}

export function InventoryDetailScreen({
  id,
  title = "Inventory Details",
}: InventoryDetailScreenProps) {
  const router = useRouter();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["inventory", id],
    queryFn: () => InventoryService.getById(id),
    enabled: !!id,
  });

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const handleRefresh = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    refetch();
  };

  const getStockStatus = (quantity: number) => {
    if (quantity <= 0)
      return { label: "Out of Stock", color: Colors.error, icon: "block" };
    if (quantity <= 10)
      return { label: "Low Stock", color: Colors.warning, icon: "warning" };
    return { label: "In Stock", color: Colors.success, icon: "check-circle" };
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatCurrency = (value?: number) => {
    if (value === undefined || value === null) return "—";
    return `₹${value.toLocaleString("en-IN")}`;
  };

  const formatSourceType = (sourceType?: string) => {
    if (!sourceType) return "Unknown";
    return sourceType
      .toLowerCase()
      .split("_")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={["left", "right"]}>
        <LinearGradient
          colors={[Colors.primary, Colors.primaryLight || Colors.primary]}
          style={styles.headerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <Pressable
            onPress={handleBack}
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.backButtonPressed,
            ]}
          >
            <MaterialIcons name="arrow-back" size={20} color={Colors.white} />
          </Pressable>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>{title}</Text>
            <Text style={styles.headerSubtitle}>
              Loading item information...
            </Text>
          </View>
          <View style={styles.headerSpacer} />
        </LinearGradient>

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading inventory details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !data) {
    return (
      <SafeAreaView style={styles.container} edges={["left", "right"]}>
        <LinearGradient
          colors={[Colors.primary, Colors.primaryLight || Colors.primary]}
          style={styles.headerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <Pressable
            onPress={handleBack}
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.backButtonPressed,
            ]}
          >
            <MaterialIcons name="arrow-back" size={20} color={Colors.white} />
          </Pressable>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>{title}</Text>
            <Text style={styles.headerSubtitle}>Unable to load data</Text>
          </View>
          <View style={styles.headerSpacer} />
        </LinearGradient>

        <View style={styles.errorContainer}>
          <View style={styles.errorIconContainer}>
            <MaterialIcons name="inventory" size={64} color={Colors.error} />
          </View>
          <Text style={styles.errorTitle}>Failed to Load Item</Text>
          <Text style={styles.errorMessage}>
            {(error as any)?.message ||
              "Unable to fetch inventory details. Please try again."}
          </Text>
          <Pressable
            onPress={handleRefresh}
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
      </SafeAreaView>
    );
  }

  const stockStatus = getStockStatus(data.quantity || 0);
  const pricing = resolveInventoryPricing(data);
  const thumbnailUri = resolveEntityImage(data?.plantType ?? data);

  return (
    <SafeAreaView style={styles.container} edges={["left", "right"]}>
      {/* Header */}
      <LinearGradient
        colors={[Colors.primary, Colors.primaryLight || Colors.primary]}
        style={styles.headerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <Pressable
          onPress={handleBack}
          style={({ pressed }) => [
            styles.backButton,
            pressed && styles.backButtonPressed,
          ]}
        >
          <MaterialIcons name="arrow-back" size={20} color={Colors.white} />
        </Pressable>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>{title}</Text>
          <Text style={styles.headerSubtitle}>View item information</Text>
        </View>
        <Pressable
          onPress={handleRefresh}
          style={({ pressed }) => [
            styles.refreshButton,
            pressed && styles.refreshButtonPressed,
          ]}
        >
          <MaterialIcons name="refresh" size={20} color={Colors.white} />
        </Pressable>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Hero Section */}
        <View style={styles.heroCard}>
          <View style={styles.heroContent}>
            <EntityThumbnail
              uri={thumbnailUri}
              label={data.plantType?.name}
              size={80}
              iconName="local-florist"
              style={styles.heroThumbnail}
            />
            <View style={styles.heroInfo}>
              <Text style={styles.plantName}>
                {data.plantType?.name || "Unknown Plant"}
              </Text>
              <View style={styles.categoryBadge}>
                <MaterialIcons
                  name="category"
                  size={14}
                  color={Colors.primary}
                />
                <Text style={styles.categoryText}>
                  {data.plantType?.category || "Uncategorized"}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.stockStatusContainer}>
            <View
              style={[
                styles.stockStatusBadge,
                { backgroundColor: stockStatus.color + "20" },
              ]}
            >
              <MaterialIcons
                name={stockStatus.icon as any}
                size={20}
                color={stockStatus.color}
              />
              <Text
                style={[styles.stockStatusText, { color: stockStatus.color }]}
              >
                {stockStatus.label}
              </Text>
            </View>
          </View>
        </View>

        {/* Stock Overview Card */}
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Current Stock</Text>
            <Text
              style={[
                styles.statValue,
                data.quantity <= 0 && styles.statValueZero,
                data.quantity > 0 && data.quantity <= 10 && styles.statValueLow,
              ]}
            >
              {data.quantity ?? 0}
            </Text>
            <Text style={styles.statUnit}>units</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Initial Stock</Text>
            <Text style={styles.statValue}>{data.initialQuantity ?? 0}</Text>
            <Text style={styles.statUnit}>units</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Inventory Value</Text>
            <Text style={[styles.statValue, styles.statValueSuccess]}>
              {formatCurrency(pricing.inventoryValue ?? undefined)}
            </Text>
            <Text style={styles.statUnit}>estimated</Text>
          </View>
        </View>

        {/* Pricing Information Card */}
        <View style={styles.infoCard}>
          <View style={styles.cardHeader}>
            <MaterialIcons
              name="attach-money"
              size={20}
              color={Colors.primary}
            />
            <Text style={styles.cardTitle}>Pricing Information</Text>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoLabelContainer}>
              <MaterialIcons
                name="price-change"
                size={16}
                color={Colors.textSecondary}
              />
              <Text style={styles.infoLabel}>Unit Cost</Text>
            </View>
            <Text style={styles.infoValue}>
              {formatCurrency(pricing.unitCost ?? undefined)}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoLabelContainer}>
              <MaterialIcons
                name="sell"
                size={16}
                color={Colors.textSecondary}
              />
              <Text style={styles.infoLabel}>Selling Price</Text>
            </View>
            <Text style={styles.infoValue}>
              {formatCurrency(pricing.sellingPrice ?? undefined)}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoLabelContainer}>
              <MaterialIcons
                name="account-balance-wallet"
                size={16}
                color={Colors.textSecondary}
              />
              <Text style={styles.infoLabel}>Potential Revenue</Text>
            </View>
            <Text style={styles.infoValueHighlight}>
              {formatCurrency(pricing.potentialRevenue ?? undefined)}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoLabelContainer}>
              <MaterialIcons
                name="calculate"
                size={16}
                color={Colors.textSecondary}
              />
              <Text style={styles.infoLabel}>Potential Gross Profit</Text>
            </View>
            <Text
              style={[
                styles.infoValueHighlight,
                pricing.grossProfit !== null && pricing.grossProfit < 0
                  ? styles.infoValueNegative
                  : null,
              ]}
            >
              {formatCurrency(pricing.grossProfit ?? undefined)}
            </Text>
          </View>
        </View>

        {/* Source Information Card */}
        <View style={styles.infoCard}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="inventory" size={20} color={Colors.primary} />
            <Text style={styles.cardTitle}>Source Information</Text>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoLabelContainer}>
              <MaterialIcons
                name="category"
                size={16}
                color={Colors.textSecondary}
              />
              <Text style={styles.infoLabel}>Source Type</Text>
            </View>
            <View style={styles.sourceBadge}>
              <MaterialIcons
                name="inventory"
                size={14}
                color={Colors.primary}
              />
              <Text style={styles.sourceBadgeText}>
                {formatSourceType(data.sourceType)}
              </Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoLabelContainer}>
              <MaterialIcons
                name="calendar-month"
                size={16}
                color={Colors.textSecondary}
              />
              <Text style={styles.infoLabel}>Received Date</Text>
            </View>
            <View style={styles.dateContainer}>
              <MaterialIcons
                name="event"
                size={14}
                color={Colors.textSecondary}
              />
              <Text style={styles.dateText}>{formatDate(data.receivedAt)}</Text>
            </View>
          </View>
        </View>

        {/* Metadata Card */}
        <View style={styles.metadataCard}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="info" size={20} color={Colors.textSecondary} />
            <Text style={styles.metadataTitle}>System Information</Text>
          </View>

          <View style={styles.metadataRow}>
            <Text style={styles.metadataLabel}>Created</Text>
            <Text style={styles.metadataValue}>
              {formatDate(data.createdAt)}
            </Text>
          </View>

          <View style={styles.metadataRow}>
            <Text style={styles.metadataLabel}>Last Updated</Text>
            <Text style={styles.metadataValue}>
              {formatDate(data.updatedAt)}
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
/* -------------------- Styles -------------------- */

const styles = {
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerGradient: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.lg,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  backButtonPressed: {
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    transform: [{ scale: 0.95 }],
  },
  refreshButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginLeft: Spacing.sm,
  },
  refreshButtonPressed: {
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    transform: [{ scale: 0.95 }],
  },
  headerContent: {
    flex: 1,
    marginLeft: Spacing.md,
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
  headerSpacer: {
    width: 44,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: BOTTOM_NAV_HEIGHT + Spacing.lg,
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
  heroCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  heroContent: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: Spacing.md,
  },
  heroThumbnail: {
    borderRadius: 16,
  },
  heroInfo: {
    flex: 1,
  },
  plantName: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  categoryBadge: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
  },
  categoryText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: "600" as const,
  },
  stockStatusContainer: {
    marginTop: Spacing.md,
    alignItems: "flex-start" as const,
  },
  stockStatusBadge: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 30,
    gap: Spacing.sm,
  },
  stockStatusText: {
    fontSize: 16,
    fontWeight: "700" as const,
  },
  statsCard: {
    flexDirection: "row" as const,
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statItem: {
    flex: 1,
    alignItems: "center" as const,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "700" as const,
    color: Colors.text,
  },
  statValueZero: {
    color: Colors.error,
  },
  statValueLow: {
    color: Colors.warning,
  },
  statValueSuccess: {
    color: Colors.success,
  },
  statUnit: {
    fontSize: 11,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.borderLight,
    marginHorizontal: Spacing.md,
  },
  infoCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  cardHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: Colors.text,
  },
  infoRow: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  infoLabelContainer: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: Spacing.sm,
  },
  infoLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  infoValue: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: "500" as const,
  },
  infoValueHighlight: {
    fontSize: 16,
    color: Colors.success,
    fontWeight: "700" as const,
  },
  infoValueNegative: {
    color: Colors.error,
  },
  sourceBadge: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: Colors.primary + "10",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  sourceBadgeText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: "600" as const,
  },
  dateContainer: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
  },
  dateText: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: "500" as const,
  },
  metadataCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  metadataTitle: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.textSecondary,
  },
  metadataRow: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    paddingVertical: Spacing.xs,
  },
  metadataLabel: {
    fontSize: 12,
    color: Colors.textTertiary,
  },
  metadataValue: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: "500" as const,
    maxWidth: "60%" as const,
  },
  actionsContainer: {
    marginTop: Spacing.md,
    marginBottom: Spacing.xl,
  },
  editButton: {
    borderRadius: 16,
    overflow: "hidden" as const,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  editButtonPressed: {
    transform: [{ scale: 0.98 }],
  },
  editGradient: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  editButtonText: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: Colors.white,
  },
};
