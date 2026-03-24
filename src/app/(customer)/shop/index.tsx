import { MaterialIcons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  CustomerCard,
  CustomerEmptyState,
  CustomerScreen,
  SectionHeader,
  StatusChip,
} from "@/src/components/common/StitchScreen";
import BannerCardImage from "@/src/components/ui/BannerCardImage";
import {
  CustomerMarketplaceService,
  MarketplaceProduct,
} from "@/src/services/customer-marketplace.service";
import { CustomerColors, Spacing } from "@/src/theme";
import { resolveEntityImage } from "@/src/utils/image";

const formatMoney = (amount: number) =>
  `₹${Math.round(amount || 0).toLocaleString("en-IN")}`;

const normalizeCategory = (value?: string) =>
  String(value || "").trim().toUpperCase();

const formatCategoryLabel = (value?: string) => {
  const key = normalizeCategory(value);
  if (!key) return "All products";
  if (key === "VEGETABLE") return "Vegetables";
  if (key === "FLOWER") return "Flowers";
  if (key === "FRUIT") return "Fruits";
  if (key === "HERB") return "Herbs";
  return key.charAt(0) + key.slice(1).toLowerCase();
};

type StockFilter = "ALL" | "IN_STOCK" | "READY_FOR_SALE" | "GROWING" | "OUT_OF_STOCK";
const STOCK_FILTERS: StockFilter[] = [
  "ALL",
  "IN_STOCK",
  "READY_FOR_SALE",
  "GROWING",
  "OUT_OF_STOCK",
];

const labelStockFilter = (value: StockFilter) => {
  if (value === "IN_STOCK") return "In stock";
  if (value === "READY_FOR_SALE") return "Ready";
  if (value === "GROWING") return "Growing";
  if (value === "OUT_OF_STOCK") return "Out of stock";
  return "All";
};

const toNumber = (value: unknown) => {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
};

export default function CustomerShopIndexScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ category?: string; highlight?: string }>();
  const [search, setSearch] = useState("");
  const initialCategory = normalizeCategory(params.category);
  const [activeCategory, setActiveCategory] = useState(initialCategory);
  const [stockFilter, setStockFilter] = useState<StockFilter>("ALL");

  const { data, isLoading, refetch, isRefetching } = useQuery<
    MarketplaceProduct[]
  >({
    queryKey: ["customer-marketplace-products"],
    queryFn: () => CustomerMarketplaceService.listAvailableProducts(),
  });

  const products = useMemo(() => (Array.isArray(data) ? data : []), [data]);
  const categories = useMemo(() => {
    const set = new Set(products.map((p) => normalizeCategory(p.category)).filter(Boolean));
    return Array.from(set.values()).sort((a, b) => a.localeCompare(b));
  }, [products]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products
      .filter((p) => (activeCategory ? normalizeCategory(p.category) === activeCategory : true))
      .filter((p) => {
        if (stockFilter === "ALL") return true;
        const available = toNumber(p.availableQuantity);
        const total = toNumber(p.totalQuantity ?? p.availableQuantity);
        const isOutOfStock = total <= 0 || available <= 0;
        const ready = toNumber(p.growthStageCounts?.READY_FOR_SALE) > 0;
        const growing =
          toNumber(p.growthStageCounts?.GERMINATED) > 0 ||
          toNumber(p.growthStageCounts?.SOWN) > 0;

        if (stockFilter === "IN_STOCK") return available > 0;
        if (stockFilter === "OUT_OF_STOCK") return isOutOfStock;
        if (stockFilter === "READY_FOR_SALE") return ready;
        if (stockFilter === "GROWING") return growing;
        return true;
      })
      .filter((p) => (!q ? true : String(p.name || "").toLowerCase().includes(q)))
      .sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
  }, [activeCategory, products, search, stockFilter]);

  return (
    <CustomerScreen
      title="Shop"
      subtitle="Available products from your enrolled nursery."
      onBackPress={() => router.back()}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={refetch}
          colors={[CustomerColors.primary]}
          tintColor={CustomerColors.primary}
        />
      }
    >
      <CustomerCard style={styles.searchCard}>
        <View style={styles.searchRow}>
          <MaterialIcons
            name="search"
            size={20}
            color={CustomerColors.textMuted}
          />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search products in this nursery"
            placeholderTextColor={CustomerColors.textMuted}
            style={styles.searchInput}
          />
          {search.trim().length > 0 ? (
            <Pressable onPress={() => setSearch("")} hitSlop={8}>
              <MaterialIcons name="close" size={18} color={CustomerColors.textMuted} />
            </Pressable>
          ) : null}
        </View>

        <View style={styles.filterRow}>
          {STOCK_FILTERS.map((item) => {
            const selected = item === stockFilter;
            return (
              <Pressable
                key={item}
                onPress={() => setStockFilter(item)}
                style={[styles.filterChip, selected && styles.filterChipActive]}
              >
                <Text style={[styles.filterChipText, selected && styles.filterChipTextActive]}>
                  {labelStockFilter(item)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.filterRow}>
          <Pressable
            onPress={() => setActiveCategory("")}
            style={[styles.filterChip, !activeCategory && styles.filterChipActive]}
          >
            <Text style={[styles.filterChipText, !activeCategory && styles.filterChipTextActive]}>
              All
            </Text>
          </Pressable>
          {categories.map((cat) => {
            const selected = cat === activeCategory;
            return (
              <Pressable
                key={cat}
                onPress={() => setActiveCategory(cat)}
                style={[styles.filterChip, selected && styles.filterChipActive]}
              >
                <Text style={[styles.filterChipText, selected && styles.filterChipTextActive]}>
                  {formatCategoryLabel(cat)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </CustomerCard>

      <CustomerCard>
        <SectionHeader
          title={activeCategory ? formatCategoryLabel(activeCategory) : "All products"}
          subtitle="Tap an item to proceed (ordering flow can be wired next)."
          trailing={<StatusChip label={`${visible.length} items`} tone="info" />}
        />

        {isLoading ? (
          <View style={styles.loadingState}>
            <Text style={styles.loadingText}>Loading products...</Text>
          </View>
        ) : visible.length === 0 ? (
          <CustomerEmptyState
            title="No matching products"
            message="Try clearing search or selecting a different category."
            icon={<MaterialIcons name="inventory-2" size={44} color={CustomerColors.textMuted} />}
          />
        ) : (
          <View style={styles.list}>
            {visible.map((product) => {
              const unit = String(product.quantityUnit || "UNITS").replace(/_/g, " ");
              const inStock = toNumber(product.availableQuantity) > 0;
              const isHighlighted = params.highlight && params.highlight === product.plantTypeId;

              return (
                <Pressable
                  key={product.plantTypeId}
                  onPress={() =>
                    router.push({
                      pathname: "/(customer)/shop/[id]",
                      params: { id: product.plantTypeId },
                    } as any)
                  }
                  style={({ pressed }) => [
                    styles.productCard,
                    isHighlighted && styles.productCardHighlighted,
                    pressed && styles.productPressed,
                  ]}
                >
                  <BannerCardImage
                    uri={resolveEntityImage(product)}
                    iconName="local-florist"
                    minHeight={96}
                    containerStyle={styles.productImage}
                  />
                  <View style={styles.productBody}>
                    <View style={styles.productHeader}>
                      <Text style={styles.productName} numberOfLines={2}>
                        {product.name}
                      </Text>
                      <StatusChip
                        label={inStock ? `${product.availableQuantity} ${unit}` : "Out of stock"}
                        tone={inStock ? "success" : "default"}
                      />
                    </View>
                    <Text style={styles.productMeta} numberOfLines={1}>
                      {product.variety ? `${product.variety} • ` : ""}
                      {formatCategoryLabel(product.category)}
                    </Text>
                    <View style={styles.productFooter}>
                      <Text style={styles.productPrice}>
                        {formatMoney(Number(product.sellingPrice || 0))}
                      </Text>
                      <MaterialIcons
                        name="arrow-forward"
                        size={18}
                        color={CustomerColors.primary}
                      />
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </CustomerCard>
    </CustomerScreen>
  );
}

const styles = StyleSheet.create({
  searchCard: {
    gap: Spacing.md,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    height: 52,
    borderRadius: 18,
    backgroundColor: "rgba(15,189,73,0.06)",
    borderWidth: 1,
    borderColor: CustomerColors.borderStrong,
  },
  searchInput: {
    flex: 1,
    color: CustomerColors.text,
    fontSize: 15,
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: CustomerColors.border,
    borderWidth: 1,
    borderColor: CustomerColors.borderStrong,
  },
  filterChipActive: {
    backgroundColor: CustomerColors.primary,
    borderColor: CustomerColors.primary,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: "700",
    color: CustomerColors.textMuted,
  },
  filterChipTextActive: {
    color: CustomerColors.white,
  },
  loadingState: {
    paddingVertical: Spacing.xl,
    alignItems: "center",
  },
  loadingText: {
    color: CustomerColors.textMuted,
  },
  list: {
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  productCard: {
    flexDirection: "row",
    gap: Spacing.md,
    padding: Spacing.sm,
    borderRadius: 22,
    backgroundColor: "rgba(15,189,73,0.05)",
    borderWidth: 1,
    borderColor: CustomerColors.borderStrong,
  },
  productCardHighlighted: {
    borderColor: CustomerColors.primary,
  },
  productPressed: {
    opacity: 0.94,
  },
  productImage: {
    width: 92,
    minHeight: 92,
    borderRadius: 18,
  },
  productBody: {
    flex: 1,
    gap: Spacing.sm,
  },
  productHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  productName: {
    flex: 1,
    fontSize: 15,
    fontWeight: "800",
    color: CustomerColors.text,
  },
  productMeta: {
    fontSize: 12,
    color: CustomerColors.textMuted,
    fontWeight: "600",
  },
  productFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  productPrice: {
    fontSize: 15,
    fontWeight: "900",
    color: CustomerColors.text,
  },
});
