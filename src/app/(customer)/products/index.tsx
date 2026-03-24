import { MaterialIcons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
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
  CustomerEmptyState,
  CustomerScreen,
  SectionHeader,
  StatPill,
  StatusChip,
} from "@/src/components/common/StitchScreen";
import { CustomerFilterChip } from "@/src/components/customer/CustomerFilterChip";
import { CustomerSurfaceCard } from "@/src/components/customer/CustomerSurfaceCard";
import BannerCardImage from "@/src/components/ui/BannerCardImage";
import { SalesService } from "@/src/services/sales.service";
import { useAuthStore } from "@/src/stores/auth.store";
import { CustomerColors, Spacing } from "@/src/theme";
import { toImageUrl } from "@/src/utils/image";

interface ProductSummary {
  id: string;
  name: string;
  imageUri?: string;
  quantity: number;
  lineAmount: number;
  paidAmount: number;
  expectedSeedQtyPerBatch?: number;
  latestSoldAt?: string;
}

type FilterMode = "RECENT" | "VALUE" | "PENDING";

const FILTERS: FilterMode[] = ["RECENT", "VALUE", "PENDING"];

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

const formatMoney = (amount: number) => `₹${Math.round(amount).toLocaleString("en-IN")}`;

const formatDate = (value?: string) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export default function CustomerProductsIndexScreen() {
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [filterMode, setFilterMode] = useState<FilterMode>("RECENT");

  const { data, isLoading, refetch, isRefetching } = useQuery({
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
          saleFinancials.gross > 0 ? clamp(saleFinancials.discount / saleFinancials.gross, 0, 1) : 0;
        const paidRatio = saleFinancials.net > 0 ? clamp(saleFinancials.paid / saleFinancials.net, 0, 1) : 0;

        for (const row of items) {
          const productId = String(
            row?.inventory?._id || row?.inventoryId || row?._id || `item_${Math.random()}`,
          );
          if (!byProduct.has(productId)) {
            byProduct.set(productId, {
              id: productId,
              name: row?.inventory?.plantType?.name || row?.plantType?.name || row?.name || "Product",
              imageUri: undefined,
              quantity: 0,
              lineAmount: 0,
              paidAmount: 0,
              expectedSeedQtyPerBatch: undefined,
              latestSoldAt: String((sale as any)?.createdAt || (sale as any)?.saleDate || ""),
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
          product.latestSoldAt = [product.latestSoldAt, String((sale as any)?.createdAt || (sale as any)?.saleDate || "")]
            .filter(Boolean)
            .sort()
            .pop();

          if (!product.imageUri) {
            const imageUri =
              resolveEntityImage(row?.inventory?.plantType) ||
              resolveEntityImage(row?.plantType) ||
              resolveEntityImage(row?.inventory) ||
              resolveEntityImage(row);
            if (imageUri) {
              product.imageUri = imageUri;
            }
          }

          const expectedSeeds = toNumber(row?.inventory?.plantType?.expectedSeedQtyPerBatch);
          if (expectedSeeds > 0) {
            product.expectedSeedQtyPerBatch = expectedSeeds;
          }
        }
      }

      return Array.from(byProduct.values());
    },
  });

  const products = useMemo(() => (Array.isArray(data) ? data : []), [data]);
  const visibleProducts = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const filtered = products.filter((item) =>
      !normalizedSearch ? true : item.name.toLowerCase().includes(normalizedSearch),
    );

    const sorted = [...filtered];
    if (filterMode === "VALUE") {
      sorted.sort((a, b) => b.lineAmount - a.lineAmount);
    } else if (filterMode === "PENDING") {
      sorted.sort(
        (a, b) => b.lineAmount - b.paidAmount - (a.lineAmount - a.paidAmount),
      );
    } else {
      sorted.sort((a, b) => String(b.latestSoldAt || "").localeCompare(String(a.latestSoldAt || "")));
    }
    return sorted;
  }, [filterMode, products, search]);

  const totalAmount = products.reduce((sum, item) => sum + item.lineAmount, 0);
  const totalPaid = products.reduce((sum, item) => sum + Math.min(item.lineAmount, item.paidAmount), 0);
  const totalDue = Math.max(0, totalAmount - totalPaid);

  return (
    <CustomerScreen
      title="My Products"
      subtitle="Product-wise purchase history from the nursery."
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={refetch}
          colors={[CustomerColors.primary]}
          tintColor={CustomerColors.primary}
        />
      }
    >
      <CustomerSurfaceCard style={styles.searchCard}>
        <View style={styles.searchRow}>
          <MaterialIcons name="search" size={20} color={CustomerColors.textMuted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search your products"
            placeholderTextColor={CustomerColors.textMuted}
            style={styles.searchInput}
          />
        </View>
        <View style={styles.filterRow}>
          {FILTERS.map((item) => {
            return (
              <CustomerFilterChip
                key={item}
                label={item === "RECENT" ? "Recent" : item === "VALUE" ? "Value" : "Pending"}
                active={filterMode === item}
                onPress={() => setFilterMode(item)}
              />
            );
          })}
        </View>
      </CustomerSurfaceCard>

      <View style={styles.statsGrid}>
        <StatPill label="Products" value={String(products.length)} />
        <StatPill label="Spent" value={formatMoney(totalAmount)} />
        <StatPill label="Due" value={formatMoney(totalDue)} />
      </View>

      <View>
        <SectionHeader
          title="Purchased products"
        />

        {isLoading ? (
          <View style={styles.loadingState}>
            <Text style={styles.loadingText}>Loading your products...</Text>
          </View>
        ) : null}

        {!isLoading && visibleProducts.length === 0 ? (
          <CustomerEmptyState
            title={products.length === 0 ? "No purchased products yet" : "No matching products"}
            message={
              products.length === 0
                ? "Products purchased through nursery sales will appear here."
                : "Try a different search or filter to find your products."
            }
            icon={<MaterialIcons name="inventory-2" size={44} color={CustomerColors.textMuted} />}
          />
        ) : null}

        {!isLoading ? (
          <View style={styles.list}>
            {visibleProducts.map((item) => {
              const paid = Math.min(item.lineAmount, item.paidAmount);
              const due = Math.max(0, item.lineAmount - paid);
              const fullyPaid = due <= 0;

              return (
                <Pressable
                  key={item.id}
                  onPress={() => router.push(`/(customer)/products/${item.id}` as any)}
                  style={({ pressed }) => [styles.productCard, pressed && styles.productPressed]}
                >
                  <BannerCardImage
                    uri={item.imageUri}
                    iconName="local-florist"
                    minHeight={96}
                    containerStyle={styles.productImage}
                  />
                  <View style={styles.productBody}>
                    <View style={styles.productHeader}>
                      <View style={styles.productTitleWrap}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, justifyContent:"space-between" }}>
                          <Text style={styles.productName}>{item.name}</Text>
                        <StatusChip label={fullyPaid ? "Fully Paid" : "Pending"} tone={fullyPaid ? "success" : "warning"} />
                        </View>
                        <Text style={styles.productMeta}>
                          {item.quantity} units
                          {item.latestSoldAt ? ` • Purchased ${formatDate(item.latestSoldAt)}` : ""}
                        </Text>
                      </View>
                      
                    </View>

                    <View style={styles.amountRow}>
                      <View style={styles.amountBlock}>
                        <Text style={styles.amountLabel}>Total</Text>
                        <Text style={styles.amountValue}>{formatMoney(item.lineAmount)}</Text>
                      </View>
                      <View style={styles.amountBlock}>
                        <Text style={styles.amountLabel}>Paid</Text>
                        <Text style={[styles.amountValue, styles.successText]}>{formatMoney(paid)}</Text>
                      </View>
                      <View style={styles.amountBlock}>
                        <Text style={styles.amountLabel}>Due</Text>
                        <Text style={[styles.amountValue, !fullyPaid && styles.errorText]}>
                          {formatMoney(due)}
                        </Text>
                      </View>
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        ) : null}
      </View>
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
    height: 50,
    borderRadius: 16,
    backgroundColor: CustomerColors.white,
    borderWidth: 1,
    borderColor: CustomerColors.border,
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
  statsGrid: {
    flexDirection: "row",
    gap: Spacing.sm,
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
    gap: Spacing.md,
  },
  productCard: {
    gap: Spacing.md,
    borderRadius: 18,
    backgroundColor: "rgba(15,189,73,0.04)",
    borderWidth: 1,
    borderColor: CustomerColors.border,
  },
  productPressed: {
    opacity: 0.94,
  },
  productImage: {
    width: "100%",
    minHeight: 144,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  productBody: {
    paddingHorizontal:Spacing.md,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
  },
  productHeader: {
    gap: 10,
  },
  productTitleWrap: {
    gap: 6,
  },
  productName: {
    fontSize: 18,
    fontWeight: "800",
    color: CustomerColors.text,
  },
  productMeta: {
    fontSize: 13,
    color: CustomerColors.textMuted,
    lineHeight: 20,
  },
  amountRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  amountBlock: {
    flex: 1,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: CustomerColors.white,
    gap: 4,
    borderWidth: 1,
    borderColor: CustomerColors.border,
  },
  amountLabel: {
    fontSize: 11,
    color: CustomerColors.textMuted,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  amountValue: {
    fontSize: 15,
    fontWeight: "800",
    color: CustomerColors.text,
  },
  successText: {
    color: CustomerColors.success,
  },
  errorText: {
    color: CustomerColors.danger,
  },
  helperLine: {
    fontSize: 13,
    color: CustomerColors.textMuted,
  },
});
