import { MaterialIcons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo } from "react";
import { RefreshControl, StyleSheet, Text, View } from "react-native";

import { CustomerActionButton } from "@/src/components/customer/CustomerActionButton";
import {
  CustomerCard,
  CustomerEmptyState,
  CustomerScreen,
  SectionHeader,
  StatPill,
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

const toNumber = (value: unknown) => {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
};

const formatCategoryLabel = (value?: string) => {
  const key = String(value || "").trim().toUpperCase();
  if (!key) return "-";
  if (key === "VEGETABLE") return "Vegetables";
  if (key === "FLOWER") return "Flowers";
  if (key === "FRUIT") return "Fruits";
  if (key === "HERB") return "Herbs";
  return key.charAt(0) + key.slice(1).toLowerCase();
};

const formatDate = (value?: string) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export default function CustomerShopProductDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const id = String(params.id || "");

  const { data, isLoading, refetch, isRefetching, error } = useQuery<
    MarketplaceProduct[]
  >({
    queryKey: ["customer-marketplace-products"],
    queryFn: () => CustomerMarketplaceService.listAvailableProducts(),
  });

  const product = useMemo(() => {
    const list = Array.isArray(data) ? data : [];
    return list.find((p) => String(p.plantTypeId) === id);
  }, [data, id]);

  if (!id) {
    return null;
  }

  if (!isLoading && (error || !product)) {
    return (
      <CustomerScreen
        title="Product Details"
        subtitle="Unable to load this product."
        onBackPress={() => router.back()}
      >
        <CustomerEmptyState
          title="Not found"
          message="This product is not available in the nursery inventory right now."
          icon={
            <MaterialIcons
              name="inventory-2"
              size={44}
              color={CustomerColors.textMuted}
            />
          }
          action={<CustomerActionButton label="Go Back" onPress={() => router.back()} />}
        />
      </CustomerScreen>
    );
  }

  const unit = String(product?.quantityUnit || "UNITS").replace(/_/g, " ");
  const inStock = toNumber(product?.availableQuantity) > 0;
  const totalQty = toNumber(product?.totalQuantity ?? product?.availableQuantity);
  const inventoryItems = Array.isArray(product?.inventoryItems)
    ? product.inventoryItems
    : [];
  const stageCounts = product?.growthStageCounts || {};

  return (
    <CustomerScreen
      title="Product Details"
      subtitle={product?.name || "Product"}
      onBackPress={() => router.back()}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={refetch}
          colors={[CustomerColors.primary]}
          tintColor={CustomerColors.primary}
        />
      }
      footer={
        <View style={styles.footer}>
          <CustomerActionButton
            label={inStock ? "Add to Cart" : "Out of Stock"}
            onPress={() => {}}
            disabled={!inStock}
            icon={<MaterialIcons name="add-shopping-cart" size={18} color={CustomerColors.white} />}
          />
        </View>
      }
    >
      <CustomerCard style={styles.heroCard}>
        <BannerCardImage
          uri={resolveEntityImage(product)}
          iconName="local-florist"
          minHeight={240}
          containerStyle={styles.heroImage}
        />
        <View style={styles.heroBody}>
          <SectionHeader
            title={product?.name || "Product"}
            subtitle={[
              product?.variety ? String(product.variety) : "",
              formatCategoryLabel(product?.category),
            ]
              .filter(Boolean)
              .join(" • ")}
            trailing={
              <StatusChip
                label={inStock ? "In stock" : "Out of stock"}
                tone={inStock ? "success" : "default"}
              />
            }
          />

          <View style={styles.statsGrid}>
            <StatPill label="Price" value={formatMoney(toNumber(product?.sellingPrice))} />
            <StatPill label="Available" value={`${toNumber(product?.availableQuantity)} ${unit}`} />
            <StatPill label="Total" value={`${totalQty} ${unit}`} />
          </View>
        </View>
      </CustomerCard>

      <CustomerCard>
        <SectionHeader
          title="Inventory breakdown"
          subtitle="Counts by growth stage and stock state."
        />
        <View style={styles.breakdownGrid}>
          <View style={styles.breakdownTile}>
            <Text style={styles.breakdownValue}>
              {toNumber(stageCounts.READY_FOR_SALE)}
            </Text>
            <Text style={styles.breakdownLabel}>Ready for sale</Text>
          </View>
          <View style={styles.breakdownTile}>
            <Text style={styles.breakdownValue}>
              {toNumber(stageCounts.GERMINATED)}
            </Text>
            <Text style={styles.breakdownLabel}>Growing</Text>
          </View>
          <View style={styles.breakdownTile}>
            <Text style={styles.breakdownValue}>
              {toNumber(stageCounts.SOLD_OUT)}
            </Text>
            <Text style={styles.breakdownLabel}>Sold out</Text>
          </View>
        </View>

        {product?.expectedSeedQtyPerBatch ? (
          <Text style={styles.helperLine}>
            Expected seeds per batch: {product.expectedSeedQtyPerBatch}{" "}
            {product.expectedSeedUnit || ""}
          </Text>
        ) : null}
      </CustomerCard>

      <CustomerCard>
        <SectionHeader
          title="Inventory items"
          subtitle="Individual inventory rows available in this nursery."
          trailing={
            <StatusChip
              label={`${inventoryItems.length} items`}
              tone="info"
            />
          }
        />

        {inventoryItems.length === 0 ? (
          <CustomerEmptyState
            title="No inventory rows"
            message="No inventory entries were returned for this product."
            icon={<MaterialIcons name="storage" size={44} color={CustomerColors.textMuted} />}
          />
        ) : (
          <View style={styles.inventoryList}>
            {inventoryItems
              .slice()
              .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")))
              .map((row) => {
                const qty = toNumber(row.quantity);
                const status = String(row.status || "-").replace(/_/g, " ");
                const stage = String(row.growthStage || "-").replace(/_/g, " ");
                const rowInStock = String(row.status || "").toUpperCase() === "AVAILABLE" && qty > 0;

                return (
                  <View key={row.id} style={styles.inventoryRow}>
                    <View style={styles.inventoryRowHeader}>
                      <Text style={styles.inventoryRowTitle} numberOfLines={1}>
                        {stage}
                      </Text>
                      <StatusChip
                        label={rowInStock ? "Available" : "Out of stock"}
                        tone={rowInStock ? "success" : "default"}
                      />
                    </View>
                    <Text style={styles.inventoryRowMeta} numberOfLines={2}>
                      Qty {qty} {String(row.quantityUnit || unit).replace(/_/g, " ")} • {status}
                    </Text>
                    <Text style={styles.inventoryRowMeta}>
                      Received {formatDate(row.receivedAt)} • Added {formatDate(row.createdAt)}
                    </Text>
                  </View>
                );
              })}
          </View>
        )}
      </CustomerCard>
    </CustomerScreen>
  );
}

const styles = StyleSheet.create({
  footer: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
  },
  heroCard: {
    overflow: "hidden",
  },
  heroImage: {
    borderRadius: 20,
  },
  heroBody: {
    paddingTop: Spacing.md,
    gap: Spacing.md,
  },
  statsGrid: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  breakdownGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  breakdownTile: {
    flexGrow: 1,
    flexBasis: "30%",
    padding: Spacing.sm,
    borderRadius: 16,
    backgroundColor: CustomerColors.surface,
    alignItems: "center",
    gap: 2,
    borderWidth: 1,
    borderColor: CustomerColors.border,
  },
  breakdownValue: {
    fontSize: 16,
    fontWeight: "900",
    color: CustomerColors.text,
  },
  breakdownLabel: {
    fontSize: 12,
    color: CustomerColors.textMuted,
    fontWeight: "600",
    textAlign: "center",
  },
  helperLine: {
    marginTop: Spacing.md,
    fontSize: 12,
    color: CustomerColors.textMuted,
    fontWeight: "600",
  },
  inventoryList: {
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  inventoryRow: {
    padding: Spacing.md,
    borderRadius: 20,
    backgroundColor: "rgba(15,189,73,0.05)",
    borderWidth: 1,
    borderColor: CustomerColors.borderStrong,
    gap: 6,
  },
  inventoryRowHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  inventoryRowTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: "900",
    color: CustomerColors.text,
    textTransform: "capitalize",
  },
  inventoryRowMeta: {
    fontSize: 12,
    color: CustomerColors.textMuted,
    fontWeight: "600",
  },
});

