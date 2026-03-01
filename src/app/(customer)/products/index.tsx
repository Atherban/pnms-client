import { MaterialIcons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown, FadeInUp, Layout } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import FixedHeader from "../../../components/common/FixedHeader";
import { SalesService } from "../../../services/sales.service";
import { useAuthStore } from "../../../stores/auth.store";
import { Colors, Spacing } from "../../../theme";

const toNumber = (value: unknown) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatMoney = (amount: number) => `₹${Math.round(amount).toLocaleString("en-IN")}`;

interface ProductSummary {
  id: string;
  name: string;
  quantity: number;
  lineAmount: number;
  paidAmount: number;
  expectedSeedQtyPerBatch?: number;
}

interface ProductCardProps {
  item: ProductSummary;
  index: number;
  onOpen: (id: string) => void;
}

const ProductCard = ({ item, index, onOpen }: ProductCardProps) => {
  const paid = Math.min(item.lineAmount, item.paidAmount);
  const due = Math.max(0, item.lineAmount - paid);
  const paidPct = item.lineAmount > 0 ? (paid / item.lineAmount) * 100 : 0;

  return (
    <Animated.View
      entering={FadeInUp.delay(index * 80).springify().damping(35)}
      layout={Layout.springify().damping(35)}
      style={styles.card}
    >
      <LinearGradient colors={[Colors.white, Colors.surface]} style={styles.cardGradient}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <View style={styles.cardIcon}>
              <MaterialIcons name="inventory" size={16} color={Colors.primary} />
            </View>
            <Text style={styles.productName} numberOfLines={1}>
              {item.name}
            </Text>
          </View>
          <Text style={[styles.statusTag, due > 0 ? styles.statusDue : styles.statusPaid]}>
            {due > 0 ? "Pending" : "Paid"}
          </Text>
        </View>

        <View style={styles.qtyRow}>
          <Text style={styles.qtyLabel}>Purchased</Text>
          <Text style={styles.qtyValue}>{item.quantity} units</Text>
        </View>
        {item.expectedSeedQtyPerBatch ? (
          <View style={styles.qtyRow}>
            <Text style={styles.qtyLabel}>Expected Seeds / Batch</Text>
            <Text style={styles.qtyValue}>{item.expectedSeedQtyPerBatch}</Text>
          </View>
        ) : null}

        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${Math.min(100, Math.max(0, paidPct))}%` }]} />
        </View>

        <View style={styles.amountRow}>
          <Text style={styles.amountLabel}>Total</Text>
          <Text style={styles.amountValue}>{formatMoney(item.lineAmount)}</Text>
        </View>
        <View style={styles.amountRow}>
          <Text style={styles.amountLabel}>Paid</Text>
          <Text style={[styles.amountValue, { color: Colors.success }]}>{formatMoney(paid)}</Text>
        </View>
        <View style={styles.amountRow}>
          <Text style={styles.amountLabel}>Balance</Text>
          <Text style={[styles.amountValue, due > 0 ? { color: Colors.error } : { color: Colors.success }]}>
            {formatMoney(due)}
          </Text>
        </View>

        <Pressable onPress={() => onOpen(item.id)} style={({ pressed }) => [styles.openBtn, pressed && styles.openBtnPressed]}>
          <MaterialIcons name="fact-check" size={16} color={Colors.primary} />
          <Text style={styles.openBtnText}>View Details</Text>
        </Pressable>
      </LinearGradient>
    </Animated.View>
  );
};

export default function CustomerProductsIndexScreen() {
  const user = useAuthStore((s) => s.user);
  const router = useRouter();

  const { data, isLoading } = useQuery({
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
        const saleTotal = items.reduce((sum: number, row: any) => {
          const qty = toNumber(row?.quantity);
          const price = toNumber(row?.priceAtSale ?? row?.unitPrice ?? row?.price);
          return sum + qty * price;
        }, 0);
        const salePaid = toNumber((sale as any)?.paidAmount ?? (sale as any)?.amountPaid);
        const paidRatio = saleTotal > 0 ? Math.min(1, salePaid / saleTotal) : 0;

        for (const row of items) {
          const productId = String(
            row?.inventory?._id || row?.inventoryId || row?._id || `item_${Math.random()}`,
          );
          if (!byProduct.has(productId)) {
            byProduct.set(productId, {
              id: productId,
              name:
                row?.inventory?.plantType?.name || row?.plantType?.name || row?.name || "Product",
              quantity: 0,
              lineAmount: 0,
              paidAmount: 0,
              expectedSeedQtyPerBatch: undefined,
            });
          }

          const product = byProduct.get(productId)!;
          const qty = toNumber(row?.quantity);
          const unitPrice = toNumber(row?.priceAtSale ?? row?.unitPrice ?? row?.price);
          const lineAmount = qty * unitPrice;

          product.quantity += qty;
          product.lineAmount += lineAmount;
          product.paidAmount += lineAmount * paidRatio;

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

  return (
    <SafeAreaView style={styles.container} edges={["left", "right"]}>
      <FixedHeader title="My Products" subtitle="All product-wise purchase details" titleStyle={styles.headerTitle} />

      {isLoading ? (
        <View style={styles.loadingWrap}>
          <Text style={styles.loadingText}>Loading products...</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <Animated.View entering={FadeInDown.springify().damping(35)} style={styles.statsCard}>
            <Text style={styles.statsText}>Products: {stats.totalProducts}</Text>
            <Text style={styles.statsText}>Total: {formatMoney(stats.totalAmount)}</Text>
            <Text style={styles.statsText}>Pending: {formatMoney(stats.totalDue)}</Text>
          </Animated.View>

          {products.length === 0 ? (
            <View style={styles.emptyCard}>
              <MaterialIcons name="inventory" size={44} color={Colors.textTertiary} />
              <Text style={styles.emptyTitle}>No products yet</Text>
            </View>
          ) : (
            products.map((item, index) => (
              <ProductCard
                key={item.id}
                item={item}
                index={index}
                onOpen={(productId) => router.push(`/(customer)/products/${productId}` as any)}
              />
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  headerTitle: { fontSize: 24 },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  loadingText: { fontSize: 14, color: "#6B7280" },
  content: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: 110, gap: Spacing.md },
  statsCard: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 16,
    padding: Spacing.md,
    gap: 4,
  },
  statsText: { color: "#374151", fontSize: 13, fontWeight: "600" },
  emptyCard: {
    paddingVertical: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 8,
  },
  emptyTitle: { fontSize: 16, fontWeight: "600", color: "#111827" },
  card: {
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: Colors.white,
  },
  cardGradient: { padding: Spacing.lg, gap: Spacing.sm },
  cardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cardHeaderLeft: { flexDirection: "row", alignItems: "center", flex: 1, gap: Spacing.sm },
  cardIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary + "12",
  },
  productName: { flex: 1, fontSize: 15, fontWeight: "600", color: "#111827" },
  statusTag: { fontSize: 11, fontWeight: "700", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  statusPaid: { color: Colors.success, backgroundColor: Colors.success + "14" },
  statusDue: { color: Colors.error, backgroundColor: Colors.error + "12" },
  qtyRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  qtyLabel: { color: "#6B7280", fontSize: 12 },
  qtyValue: { color: "#111827", fontSize: 13, fontWeight: "600" },
  progressTrack: { height: 4, borderRadius: 999, backgroundColor: "#E5E7EB", overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: Colors.primary },
  amountRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  amountLabel: { color: "#6B7280", fontSize: 12 },
  amountValue: { color: "#111827", fontSize: 13, fontWeight: "700" },
  openBtn: {
    marginTop: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.primary + "30",
    backgroundColor: Colors.primary + "08",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
  },
  openBtnPressed: { opacity: 0.85 },
  openBtnText: { fontSize: 13, fontWeight: "600", color: Colors.primary },
});
