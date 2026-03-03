import { MaterialIcons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useMemo, useCallback, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  RefreshControl,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import Animated, {
  FadeInDown,
  FadeInUp,
  Layout,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  interpolate,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";

import FixedHeader from "../../../components/common/FixedHeader";
import BannerCardImage from "../../../components/ui/BannerCardImage";
import { SalesService } from "../../../services/sales.service";
import { useAuthStore } from "../../../stores/auth.store";
import { Colors, Spacing } from "../../../theme";
import { toImageUrl } from "../../../utils/image";

const BOTTOM_NAV_HEIGHT = 80;
const { width: SCREEN_WIDTH } = Dimensions.get("window");

// ==================== UTILITIES ====================

const toNumber = (value: unknown) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const clamp = (value: number, min = 0, max = Number.POSITIVE_INFINITY) =>
  Math.min(Math.max(value, min), max);

const computeSaleFinancials = (sale: any, fallbackGrossTotal: number) => {
  const gross = Math.max(
    0,
    toNumber(sale?.grossAmount) || toNumber(sale?.totalAmount) || fallbackGrossTotal,
  );
  const discount = clamp(toNumber(sale?.discountAmount), 0, gross);
  const net = Math.max(0, toNumber(sale?.netAmount) || gross - discount);
  const paidRaw = Math.max(0, toNumber(sale?.paidAmount) || toNumber(sale?.amountPaid));
  const dueRaw = Math.max(0, toNumber(sale?.dueAmount));

  let paid = clamp(paidRaw, 0, net);
  let due = dueRaw > 0 ? clamp(dueRaw, 0, net) : clamp(net - paid, 0, net);
  if (paid + due > net) {
    due = clamp(net - paid, 0, net);
  } else if (paid + due < net) {
    paid = clamp(net - due, 0, net);
  }

  return { gross, discount, net, paid, due };
};

const formatMoney = (amount: number) => `₹${Math.round(amount).toLocaleString("en-IN")}`;

const resolveEntityImage = (entity: any): string | undefined => {
  if (!entity || typeof entity !== "object") return undefined;
  const direct = toImageUrl(
    entity.imageUrl ??
      entity.image ??
      entity.fileUrl ??
      entity.url ??
      entity.path ??
      entity.fileName,
  );
  if (direct) return direct;
  const images = Array.isArray(entity.images) ? entity.images : [];
  for (const img of images) {
    const uri = toImageUrl(
      img?.imageUrl ?? img?.fileUrl ?? img?.url ?? img?.path ?? img?.fileName,
    );
    if (uri) return uri;
  }
  return undefined;
};

// ==================== STATS CARD ====================

interface StatsCardProps {
  totalProducts: number;
  totalAmount: number;
  totalDue: number;
}

const StatsCard = ({ totalProducts, totalAmount, totalDue }: StatsCardProps) => {
  const paidPercentage = totalAmount > 0 ? ((totalAmount - totalDue) / totalAmount) * 100 : 0;

  return (
    <Animated.View entering={FadeInDown.springify().damping(35)} style={styles.statsCard}>
      <View style={styles.statsHeader}>
        <Text style={styles.statsTitle}>Purchase Summary</Text>
        <View style={styles.statsBadge}>
          <Text style={styles.statsBadgeText}>{totalProducts} Products</Text>
        </View>
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Total Spent</Text>
          <Text style={styles.statValue}>{formatMoney(totalAmount)}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Pending</Text>
          <Text style={[styles.statValue, { color: Colors.error }]}>{formatMoney(totalDue)}</Text>
        </View>
      </View>

      <View style={styles.progressContainer}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressLabel}>Payment Progress</Text>
          <Text style={styles.progressPercentage}>{paidPercentage.toFixed(0)}%</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${paidPercentage}%` }]} />
        </View>
      </View>
    </Animated.View>
  );
};

// ==================== PRODUCT CARD ====================

interface ProductCardProps {
  item: ProductSummary;
  index: number;
  onOpen: (id: string) => void;
}

const ProductCard = ({ item, index, onOpen }: ProductCardProps) => {
  const paid = Math.min(item.lineAmount, item.paidAmount);
  const due = Math.max(0, item.lineAmount - paid);
  const paidPct = item.lineAmount > 0 ? (paid / item.lineAmount) * 100 : 0;
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.98, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  return (
    <Animated.View
      entering={FadeInUp.delay(index * 80).springify().damping(35)}
      layout={Layout.springify().damping(35)}
      style={styles.cardWrapper}
    >
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={() => onOpen(item.id)}
        style={({ pressed }) => [
          styles.card,
          pressed && styles.cardPressed,
        ]}
      >
        <Animated.View style={[styles.cardInner, animatedStyle]}>
          <LinearGradient colors={[Colors.white, Colors.surface]} style={styles.cardGradient}>
            {/* Image Banner */}
            <View style={styles.imageContainer}>
              <BannerCardImage
                uri={item.imageUri}
                iconName="inventory"
                minHeight={140}
                containerStyle={styles.cardImageBanner}
              />
              <View style={[styles.statusBadge, due > 0 ? styles.statusDue : styles.statusPaid]}>
                <MaterialIcons
                  name={due > 0 ? "pending" : "check-circle"}
                  size={12}
                  color={due > 0 ? Colors.error : Colors.success}
                />
                <Text style={[styles.statusText, due > 0 ? styles.statusDueText : styles.statusPaidText]}>
                  {due > 0 ? "Pending" : "Paid"}
                </Text>
              </View>
            </View>

            <View style={styles.cardContent}>
              {/* Header */}
              <View style={styles.cardHeader}>
                <Text style={styles.productName} numberOfLines={1}>
                  {item.name}
                </Text>
              </View>

              {/* Quantity Info */}
              <View style={styles.infoRow}>
                <View style={styles.infoItem}>
                  <MaterialIcons name="shopping-bag" size={14} color={Colors.textSecondary} />
                  <Text style={styles.infoLabel}>Purchased</Text>
                  <Text style={styles.infoValue}>{item.quantity} units</Text>
                </View>
                {item.expectedSeedQtyPerBatch ? (
                  <View style={styles.infoItem}>
                    <MaterialIcons name="grass" size={14} color={Colors.textSecondary} />
                    <Text style={styles.infoLabel}>Seeds/Batch</Text>
                    <Text style={styles.infoValue}>{item.expectedSeedQtyPerBatch}</Text>
                  </View>
                ) : null}
              </View>

              {/* Progress Bar */}
              <View style={styles.progressContainer}>
                <View style={styles.progressHeader}>
                  <Text style={styles.progressLabel}>Payment Progress</Text>
                  <Text style={styles.progressPercentage}>{paidPct.toFixed(0)}%</Text>
                </View>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${paidPct}%` }]} />
                </View>
              </View>

              {/* Financial Summary */}
              <View style={styles.financialGrid}>
                <View style={styles.financialItem}>
                  <Text style={styles.financialLabel}>Total</Text>
                  <Text style={styles.financialValue}>{formatMoney(item.lineAmount)}</Text>
                </View>
                <View style={styles.financialDivider} />
                <View style={styles.financialItem}>
                  <Text style={styles.financialLabel}>Paid</Text>
                  <Text style={[styles.financialValue, { color: Colors.success }]}>{formatMoney(paid)}</Text>
                </View>
                <View style={styles.financialDivider} />
                <View style={styles.financialItem}>
                  <Text style={styles.financialLabel}>Balance</Text>
                  <Text style={[styles.financialValue, due > 0 ? { color: Colors.error } : { color: Colors.success }]}>
                    {formatMoney(due)}
                  </Text>
                </View>
              </View>

              {/* View Details Button */}
              <View style={styles.buttonContainer}>
                <LinearGradient
                  colors={[Colors.primary + "10", Colors.primary + "05"]}
                  style={styles.buttonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Pressable
                    onPress={() => onOpen(item.id)}
                    style={({ pressed }) => [
                      styles.detailsButton,
                      pressed && styles.detailsButtonPressed,
                    ]}
                  >
                    <MaterialIcons name="visibility" size={16} color={Colors.primary} />
                    <Text style={styles.detailsButtonText}>View Details</Text>
                  </Pressable>
                </LinearGradient>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
};

// ==================== EMPTY STATE ====================

const EmptyState = () => (
  <Animated.View entering={FadeInUp.springify().damping(35)} style={styles.emptyContainer}>
    <View style={styles.emptyIconContainer}>
      <LinearGradient
        colors={[Colors.surface, Colors.background]}
        style={styles.emptyIconGradient}
      >
        <MaterialIcons name="inventory" size={48} color={Colors.textTertiary} />
      </LinearGradient>
    </View>
    <Text style={styles.emptyTitle}>No Products Yet</Text>
    <Text style={styles.emptyMessage}>
      Your purchased products will appear here once you make your first purchase.
    </Text>
  </Animated.View>
);

// ==================== LOADING STATE ====================

const LoadingState = () => (
  <View style={styles.centerContainer}>
    <View style={styles.loadingCard}>
      <ActivityIndicator size="large" color={Colors.primary} />
      <Text style={styles.loadingText}>Loading your products...</Text>
    </View>
  </View>
);

// ==================== MAIN COMPONENT ====================

interface ProductSummary {
  id: string;
  name: string;
  imageUri?: string;
  quantity: number;
  lineAmount: number;
  paidAmount: number;
  expectedSeedQtyPerBatch?: number;
}

export default function CustomerProductsIndexScreen() {
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["customer-products", user?.id, user?.phoneNumber, user?.nurseryId],
    queryFn: async (): Promise<ProductSummary[]> => {
      const sales = await SalesService.getAll({
        nurseryId: user?.nurseryId,
        customerId: user?.id,
        customerPhone: user?.phoneNumber,
      }).catch(() => []);

      const byProduct = new Map<string, ProductSummary>();

      for (const sale of Array.isArray(sales) ? sales : []) {
        const items = Array.isArray((sale as any)?.items) ? (sale as any).items : [];
        const saleGrossFromItems = items.reduce((sum: number, row: any) => {
          const qty = toNumber(row?.quantity);
          const price = toNumber(row?.priceAtSale ?? row?.unitPrice ?? row?.price);
          return sum + qty * price;
        }, 0);
        const saleFinancials = computeSaleFinancials(sale, saleGrossFromItems);
        const discountRatio =
          saleFinancials.gross > 0
            ? clamp(saleFinancials.discount / saleFinancials.gross, 0, 1)
            : 0;
        const paidRatio =
          saleFinancials.net > 0
            ? clamp(saleFinancials.paid / saleFinancials.net, 0, 1)
            : 0;

        for (const row of items) {
          const productId = String(
            row?.inventory?._id || row?.inventoryId || row?._id || `item_${Math.random()}`,
          );
          if (!byProduct.has(productId)) {
            byProduct.set(productId, {
              id: productId,
              name:
                row?.inventory?.plantType?.name || row?.plantType?.name || row?.name || "Product",
              imageUri: undefined,
              quantity: 0,
              lineAmount: 0,
              paidAmount: 0,
              expectedSeedQtyPerBatch: undefined,
            });
          }

          const product = byProduct.get(productId)!;
          const qty = toNumber(row?.quantity);
          const unitPrice = toNumber(row?.priceAtSale ?? row?.unitPrice ?? row?.price);
          const lineGross = Math.max(0, qty * unitPrice);
          const discountShare = Math.min(lineGross, lineGross * discountRatio);
          const lineNet = Math.max(0, lineGross - discountShare);

          product.quantity += qty;
          product.lineAmount += lineNet;
          product.paidAmount += Math.min(lineNet, lineNet * paidRatio);
          if (!product.imageUri) {
            const imageUri =
              resolveEntityImage(row?.inventory?.plantType) ||
              resolveEntityImage(row?.plantType) ||
              resolveEntityImage(row?.inventory) ||
              resolveEntityImage(row);
            if (imageUri) product.imageUri = imageUri;
          }

          const expectedSeeds = toNumber(row?.inventory?.plantType?.expectedSeedQtyPerBatch);
          if (expectedSeeds > 0) product.expectedSeedQtyPerBatch = expectedSeeds;
        }
      }

      return Array.from(byProduct.values()).sort((a, b) => b.quantity - a.quantity);
    },
  });

  const products = useMemo(() => (Array.isArray(data) ? data : []), [data]);
  
  const stats = useMemo(() => {
    const totalProducts = products.length;
    const totalAmount = products.reduce((sum, item) => sum + item.lineAmount, 0);
    const totalPaid = products.reduce((sum, item) => sum + Math.min(item.lineAmount, item.paidAmount), 0);
    const totalDue = Math.max(0, totalAmount - totalPaid);
    return { totalProducts, totalAmount, totalDue };
  }, [products]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleProductPress = useCallback((productId: string) => {
    router.push(`/(customer)/products/${productId}` as any);
  }, [router]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <FixedHeader title="My Products" subtitle="All product-wise purchase details" />
        <LoadingState />
      </SafeAreaView>
    );
  }

  const hasProducts = products.length > 0;

  return (
    <View style={styles.container}>
      <FixedHeader title="My Products" subtitle="All product-wise purchase details" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
      >
        {hasProducts && (
          <StatsCard
            totalProducts={stats.totalProducts}
            totalAmount={stats.totalAmount}
            totalDue={stats.totalDue}
          />
        )}

        {!hasProducts ? (
          <EmptyState />
        ) : (
          products.map((item, index) => (
            <ProductCard
              key={item.id}
              item={item}
              index={index}
              onOpen={handleProductPress}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

// ==================== STYLES ====================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: BOTTOM_NAV_HEIGHT + 20,
    gap: 16,
  },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },

  // Stats Card
  statsCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  statsTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  statsBadge: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statsBadgeText: {
    fontSize: 11,
    fontWeight: "500",
    color: "#6B7280",
  },
  statsGrid: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statLabel: {
    fontSize: 11,
    color: "#6B7280",
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: "#E5E7EB",
    marginHorizontal: 12,
  },
  progressContainer: {
    gap: 6,
  },
  progressHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  progressLabel: {
    fontSize: 11,
    color: "#6B7280",
  },
  progressPercentage: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.primary,
  },
  progressTrack: {
    height: 6,
    backgroundColor: "#F3F4F6",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: Colors.primary,
    borderRadius: 3,
  },

  // Card
  cardWrapper: {
    marginBottom: 12,
  },
  card: {
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: Colors.white,
  },
  cardPressed: {
    opacity: 0.98,
  },
  cardInner: {
    width: "100%",
  },
  cardGradient: {
    padding: 0,
  },
  imageContainer: {
    position: "relative",
  },
  cardImageBanner: {
    width: "100%",
    minHeight: 140,
    borderRadius: 0,
  },
  statusBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  statusPaid: {
    backgroundColor: Colors.success + "10",
    borderColor: Colors.success + "30",
  },
  statusDue: {
    backgroundColor: Colors.error + "10",
    borderColor: Colors.error + "30",
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
  },
  statusPaidText: {
    color: Colors.success,
  },
  statusDueText: {
    color: Colors.error,
  },
  cardContent: {
    padding: 16,
    gap: 12,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  productName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    flex: 1,
  },
  infoRow: {
    flexDirection: "row",
    gap: 16,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  infoLabel: {
    fontSize: 11,
    color: "#6B7280",
  },
  infoValue: {
    fontSize: 12,
    fontWeight: "600",
    color: "#111827",
  },
  financialGrid: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 10,
    marginTop: 4,
  },
  financialItem: {
    flex: 1,
    alignItems: "center",
  },
  financialLabel: {
    fontSize: 10,
    color: "#9CA3AF",
    marginBottom: 2,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  financialValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
  },
  financialDivider: {
    width: 1,
    height: 24,
    backgroundColor: "#E5E7EB",
    marginHorizontal: 8,
  },
  buttonContainer: {
    marginTop: 4,
    borderRadius: 12,
    overflow: "hidden",
  },
  buttonGradient: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primary + "20",
  },
  detailsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 10,
  },
  detailsButtonPressed: {
    opacity: 0.7,
  },
  detailsButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.primary,
  },

  // Empty State
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 20,
    overflow: "hidden",
  },
  emptyIconGradient: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    paddingHorizontal: 20,
    lineHeight: 20,
  },

  // Loading State
  loadingCard: {
    backgroundColor: Colors.white,
    padding: 24,
    borderRadius: 20,
    alignItems: "center",
    gap: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  loadingText: {
    fontSize: 15,
    color: "#6B7280",
    fontWeight: "500",
  },
});