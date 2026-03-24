import { MaterialIcons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  ActivityIndicator,
  Animated,
  Pressable,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { InventoryService } from "../../services/inventory.service";
import { useAuthStore } from "../../stores/auth.store";
import { resolveEntityImage } from "../../utils/image";
import { resolveInventoryPricing } from "../../utils/inventory-pricing";
import { formatQuantityUnit } from "../../utils/units";
import BannerCardImage from "../ui/BannerCardImage";
import { AdminTheme } from "../admin/theme";
import { moduleBadge } from "../common/moduleStyles";
import StitchHeader from "../common/StitchHeader";

const BOTTOM_NAV_HEIGHT = 80;

interface InventoryDetailScreenProps {
  id?: string;
  title?: string;
}

// Animation constants
const SPRING_CONFIG = {
  tension: 300,
  friction: 25,
  useNativeDriver: true,
};

// Utility functions
const formatDate = (dateString?: string) => {
  if (!dateString) return "—";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "—";

  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return `Today`;
  } else if (date.toDateString() === yesterday.toDateString()) {
    return `Yesterday`;
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatCurrency = (value?: number) => {
  if (value === undefined || value === null) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const formatNumber = (value?: number) => {
  if (value === undefined || value === null) return "—";
  return value.toLocaleString("en-IN");
};

const getStockStatus = (quantity: number) => {
  if (quantity <= 0)
    return {
      label: "Out of Stock",
      color: "#EF4444",
      icon: "block",
      bg: "#FEF2F2",
    };
  if (quantity <= 10)
    return {
      label: "Low Stock",
      color: "#F59E0B",
      icon: "warning",
      bg: "#FFFBEB",
    };
  return {
    label: "In Stock",
    color: "#10B981",
    icon: "check-circle",
    bg: "#ECFDF5",
  };
};

const formatSourceType = (value?: string) => {
  if (!value) return "Unknown";
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

// Stat Card Component
const StatCard = ({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: string | number;
  color: string;
  icon: string;
}) => {
  return (
    <View style={styles.statItem}>
      <View
        style={[styles.statIconContainer, { backgroundColor: color + "10" }]}
      >
        <MaterialIcons name={icon as any} size={20} color={color} />
      </View>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
};

// Loading State
const LoadingState = () => (
  <View style={styles.centerContainer}>
    <View style={styles.loadingCard}>
      <ActivityIndicator size="large" color={AdminTheme.colors.primary} />
      <Text style={styles.loadingText}>Loading inventory details...</Text>
    </View>
  </View>
);

// Error State
const ErrorState = ({
  error,
  onRetry,
  onBack,
}: {
  error: any;
  onRetry: () => void;
  onBack: () => void;
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      ...SPRING_CONFIG,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      ...SPRING_CONFIG,
    }).start();
  };

  return (
    <SafeAreaView style={styles.container} edges={["left", "right"]}>
      <StitchHeader
        title="Inventory Details"
        subtitle="Unable to load data"
        variant="gradient"
        showBackButton
        onBackPress={onBack}
      />

      <View style={styles.errorContainer}>
        <View style={styles.errorIconContainer}>
          <MaterialIcons name="inventory" size={48} color="#EF4444" />
        </View>
        <Text style={styles.errorTitle}>Failed to Load Item</Text>
        <Text style={styles.errorMessage}>
          {error?.message || "Unable to fetch inventory details"}
        </Text>
        <Pressable
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onPress={onRetry}
        >
          <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <View
              style={[
                styles.retryGradient,
                { backgroundColor: AdminTheme.colors.primary },
              ]}
            >
              <MaterialIcons name="refresh" size={18} color={AdminTheme.colors.surface} />
              <Text style={styles.retryButtonText}>Try Again</Text>
            </View>
          </Animated.View>
        </Pressable>
      </View>
    </SafeAreaView>
  );
};

// Main Component
export function InventoryDetailScreen({
  id,
  title = "Inventory Details",
}: InventoryDetailScreenProps) {
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const refreshButtonScale = useRef(new Animated.Value(1)).current;
  const role = useAuthStore((state) => state.user?.role);
  const isAdmin = role === "NURSERY_ADMIN" || role === "SUPER_ADMIN";

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["inventory", id],
    queryFn: () => InventoryService.getById(id as string),
    enabled: !!id,
  });

  // Fade in animation
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const handleBack = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  }, [router]);

  const handleRefresh = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    refetch();
  }, [refetch]);

  const handlePressIn = useCallback((anim: Animated.Value) => {
    Animated.spring(anim, {
      toValue: 0.98,
      ...SPRING_CONFIG,
    }).start();
  }, []);

  const handlePressOut = useCallback((anim: Animated.Value) => {
    Animated.spring(anim, {
      toValue: 1,
      ...SPRING_CONFIG,
    }).start();
  }, []);

  // Memoized values
  const stockStatus = useMemo(
    () => getStockStatus(data?.quantity || 0),
    [data?.quantity],
  );

  const pricing = useMemo(() => resolveInventoryPricing(data), [data]);

  const thumbnailUri = useMemo(
    () => resolveEntityImage(data?.plantType ?? data),
    [data],
  );

  const quantityUnit = useMemo(
    () =>
      formatQuantityUnit(
        data?.quantityUnit ?? data?.plantType?.expectedSeedUnit,
        "UNITS",
      ),
    [data],
  );

  const sourceLabel = useMemo(
    () => formatSourceType(data?.sourceType),
    [data?.sourceType],
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={["left", "right"]}>
        <LoadingState />
      </SafeAreaView>
    );
  }

  if (error || !data) {
    return (
      <ErrorState error={error} onRetry={handleRefresh} onBack={handleBack} />
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["left", "right"]}>
      <StitchHeader
        title={title}
        subtitle={`${data.plantType?.name || "Inventory item"} overview`}
        variant="gradient"
        showBackButton
        onBackPress={handleBack}
        actions={
          <Pressable
            onPress={handleRefresh}
            onPressIn={() => handlePressIn(refreshButtonScale)}
            onPressOut={() => handlePressOut(refreshButtonScale)}
          >
            <Animated.View
              style={[
                styles.refreshButton,
                { transform: [{ scale: refreshButtonScale }] },
              ]}
            >
              <MaterialIcons name="refresh" size={20} color={AdminTheme.colors.surface} />
            </Animated.View>
          </Pressable>
        }
      />

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        style={{ opacity: fadeAnim }}
      >
        {/* Hero Section */}
        <View style={styles.heroCard}>
          <BannerCardImage
            uri={thumbnailUri}
            label={data.plantType?.name}
            iconName="local-florist"
            minHeight={140}
            containerStyle={styles.heroBanner}
          >
            <View
              style={[
                styles.stockStatusBadge,
                { backgroundColor: stockStatus.bg },
              ]}
            >
              <MaterialIcons
                name={stockStatus.icon as any}
                size={16}
                color={stockStatus.color}
              />
              <Text
                style={[styles.stockStatusText, { color: stockStatus.color }]}
              >
                {stockStatus.label}
              </Text>
            </View>
          </BannerCardImage>

          <View style={styles.heroInfo}>
            <Text style={styles.plantName}>
              {data.plantType?.name || "Unknown Plant"}
            </Text>
            <View style={styles.heroMetaRow}>
              <View style={styles.metaChip}>
                <MaterialIcons
                  name="category"
                  size={13}
                  color={AdminTheme.colors.textMuted}
                />
                <Text style={styles.metaChipText}>
                  {data.plantType?.category || "Uncategorized"}
                </Text>
              </View>
              <View style={styles.metaChip}>
                <MaterialIcons name="inventory" size={13} color={AdminTheme.colors.textMuted} />
                <Text style={styles.metaChipText}>
                  {sourceLabel}
                </Text>
              </View>
              <View style={styles.metaChip}>
                <MaterialIcons name="sell" size={13} color={AdminTheme.colors.textMuted} />
                <Text style={styles.metaChipText}>
                  Sell:{" "}
                  {pricing.sellingPrice !== null
                    ? formatCurrency(pricing.sellingPrice)
                    : "—"}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Stock Overview Stats - Removed unit price for staff */}
        <View style={styles.statsGrid}>
          <StatCard
            label="Current Stock"
            value={`${formatNumber(data.quantity)} ${quantityUnit}`}
            icon="inventory"
            color="#2563EB"
          />
          <StatCard
            label="Initial Stock"
            value={`${formatNumber(data.initialQuantity)} ${quantityUnit}`}
            icon="storage"
            color="#10B981"
          />
          {isAdmin && (
            <StatCard
              label="Inventory Value"
              value={formatCurrency(pricing.inventoryValue ?? undefined)}
              icon="account-balance-wallet"
              color="#8B5CF6"
            />
          )}
        </View>

        {/* Source Information - Only essential info */}
        <View style={styles.infoCard}>
          <View style={styles.cardHeader}>
            <View
              style={[
                styles.cardIcon,
                { backgroundColor: `${AdminTheme.colors.primary}10` },
              ]}
            >
              <MaterialIcons
                name="inventory"
                size={18}
                color={AdminTheme.colors.primary}
              />
            </View>
              <Text style={styles.cardTitle}>Source Information</Text>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoLabelContainer}>
              <MaterialIcons name="inventory-2" size={16} color="#6B7280" />
              <Text style={styles.infoLabel}>Available Stock</Text>
            </View>
            <Text style={styles.infoValue}>
              {formatNumber(data.quantity)} {quantityUnit}
            </Text>
          </View>

          <View style={styles.sourceRow}>
            <View style={styles.infoLabelContainer}>
              <MaterialIcons name="category" size={16} color="#6B7280" />
              <Text style={styles.infoLabel}>Source</Text>
            </View>
            <View
              style={[
                styles.sourceBadge,
                { backgroundColor: `${AdminTheme.colors.primary}10` },
              ]}
            >
              <MaterialIcons
                name="inventory"
                size={12}
                color={AdminTheme.colors.primary}
              />
              <Text style={styles.sourceBadgeText}>
                {sourceLabel}
              </Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoLabelContainer}>
              <MaterialIcons name="sync-alt" size={16} color="#6B7280" />
              <Text style={styles.infoLabel}>Initial Stock</Text>
            </View>
            <Text style={styles.infoValue}>
              {formatNumber(data.initialQuantity)} {quantityUnit}
            </Text>
          </View>

          <View style={styles.dateRow}>
            <View style={styles.infoLabelContainer}>
              <MaterialIcons name="calendar-month" size={16} color="#6B7280" />
              <Text style={styles.infoLabel}>Received</Text>
            </View>
            <View style={styles.dateContainer}>
              <MaterialIcons name="event" size={14} color="#6B7280" />
              <Text style={styles.dateText}>{formatDate(data.receivedAt)}</Text>
            </View>
          </View>
        </View>

        {/* Bottom Spacing */}
        <View style={{ height: AdminTheme.spacing.xl }} />
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

/* -------------------- Styles -------------------- */

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
    backgroundColor: "#F9FAFB",
  },
  centerContainer: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    padding: AdminTheme.spacing.xl,
    backgroundColor: "#F9FAFB",
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
  },
  refreshButtonPressed: {
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    transform: [{ scale: 0.95 }],
  },
  

  // Scroll Content
  scrollContent: {
    paddingHorizontal: AdminTheme.spacing.lg,
    paddingTop: AdminTheme.spacing.lg,
    paddingBottom: BOTTOM_NAV_HEIGHT + AdminTheme.spacing.xl,
  },

  // Hero Card
  heroCard: {
    ...cardSurface,
    backgroundColor: AdminTheme.colors.surface,
    borderRadius: 24,
    marginBottom: AdminTheme.spacing.md,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    overflow: "hidden" as const,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  heroBanner: {
    width: "100%",
    minHeight: 148,
    borderRadius: 0,
  },
  heroInfo: {
    paddingHorizontal: AdminTheme.spacing.md,
    paddingTop: AdminTheme.spacing.md,
    paddingBottom: AdminTheme.spacing.md,
  },
  plantName: {
    fontSize: 22,
    fontWeight: "700" as const,
    color: "#111827",
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  heroMetaRow: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingTop: AdminTheme.spacing.sm,
  },
  metaChip: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
  },
  metaChipText: {
    fontSize: 12,
    color: AdminTheme.colors.textMuted,
    fontWeight: "500" as const,
  },
  stockStatusBadge: {
    ...moduleBadge,
    position: "absolute" as const,
    top: AdminTheme.spacing.md,
    right: AdminTheme.spacing.md,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingHorizontal: AdminTheme.spacing.md,
    paddingVertical: 6,
    borderRadius: 30,
    gap: AdminTheme.spacing.xs,
  },
  stockStatusText: {
    fontSize: 14,
    fontWeight: "600" as const,
  },

  // Stats Grid - Simplified
  statsGrid: {
    flexDirection: "row" as const,
    gap: AdminTheme.spacing.sm,
    marginBottom: AdminTheme.spacing.md,
  },
  statItem: {
    flex: 1,
    backgroundColor: AdminTheme.colors.surface,
    borderRadius: 20,
    padding: AdminTheme.spacing.md,
    alignItems: "center" as const,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  statIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginBottom: AdminTheme.spacing.sm,
  },
  statLabel: {
    fontSize: 11,
    color: "#6B7280",
    marginBottom: 4,
    textTransform: "uppercase" as const,
    letterSpacing: 0.3,
    textAlign: "center",
  },
  statValue: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: "#111827",
    textAlign: "center" as const,
  },

  // Info Card
  infoCard: {
    ...cardSurface,
    backgroundColor: AdminTheme.colors.surface,
    borderRadius: 20,
    padding: AdminTheme.spacing.lg,
    marginBottom: AdminTheme.spacing.md,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: AdminTheme.spacing.sm,
    marginBottom: AdminTheme.spacing.md,
  },
  cardIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: "#111827",
  },
  infoRow: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    paddingVertical: AdminTheme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  sourceRow: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    paddingVertical: AdminTheme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  dateRow: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    paddingVertical: AdminTheme.spacing.sm,
  },
  infoLabelContainer: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: AdminTheme.spacing.sm,
  },
  infoLabel: {
    fontSize: 13,
    color: "#6B7280",
  },
  infoValue: {
    fontSize: 14,
    color: "#111827",
    fontWeight: "500" as const,
  },
  sourceBadge: {
    ...moduleBadge,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingHorizontal: AdminTheme.spacing.sm,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 4,
  },
  sourceBadgeText: {
    fontSize: 12,
    color: AdminTheme.colors.primary,
    fontWeight: "600" as const,
  },
  dateContainer: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
  },
  dateText: {
    fontSize: 13,
    color: "#111827",
    fontWeight: "500" as const,
  },

  // Metadata Card
  metadataCard: {
    ...cardSurface,
    backgroundColor: "#F9FAFB",
    borderRadius: 20,
    padding: AdminTheme.spacing.lg,
    marginBottom: AdminTheme.spacing.md,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  metadataTitle: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: "#374151",
  },
  metadataRow: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    paddingVertical: AdminTheme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  metadataLabel: {
    fontSize: 12,
    color: "#6B7280",
  },
  metadataValue: {
    fontSize: 12,
    color: "#111827",
    fontWeight: "500" as const,
  },

  // Loading State
  loadingCard: {
    ...cardSurface,
    backgroundColor: AdminTheme.colors.surface,
    padding: AdminTheme.spacing.xl,
    borderRadius: 24,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 4,
  },
  loadingText: {
    marginTop: AdminTheme.spacing.md,
    fontSize: 15,
    color: "#6B7280",
    fontWeight: "500" as const,
  },

  // Error State
  errorContainer: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    padding: AdminTheme.spacing.xl,
  },
  errorIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#FEF2F2",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginBottom: AdminTheme.spacing.lg,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: "#EF4444",
    marginBottom: AdminTheme.spacing.sm,
    letterSpacing: -0.5,
  },
  errorMessage: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center" as const,
    marginBottom: AdminTheme.spacing.xl,
    lineHeight: 20,
    paddingHorizontal: AdminTheme.spacing.xl,
  },
  retryGradient: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingHorizontal: AdminTheme.spacing.xl,
    paddingVertical: AdminTheme.spacing.md,
    gap: AdminTheme.spacing.sm,
    borderRadius: 16,
  },
  retryButtonText: {
    color: AdminTheme.colors.surface,
    fontSize: 15,
    fontWeight: "600" as const,
  },
} as const;
