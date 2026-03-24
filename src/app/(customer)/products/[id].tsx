import { MaterialIcons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";

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
import { SalesService } from "@/src/services/sales.service";
import { useAuthStore } from "@/src/stores/auth.store";
import { Colors, CustomerColors, Spacing } from "@/src/theme";
import { toImageUrl } from "@/src/utils/image";

interface ProductSaleRow {
  saleId: string;
  soldAt: string;
  quantity: number;
  amount: number;
  paidShare: number;
  dueShare: number;
}

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

export default function CustomerProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["customer-product-detail", id, user?.id, user?.phoneNumber, user?.nurseryId],
    enabled: !!id && !!user,
    queryFn: async () => {
      if (!user) throw new Error("User not authenticated");

      const sales = await SalesService.getAll({
        nurseryId: user?.nurseryId,
        customerId: user?.id,
        customerPhone: user?.phoneNumber,
      }).catch(() => []);

      let productName = "Product";
      let imageUri: string | undefined;
      let totalQty = 0;
      let totalAmount = 0;
      let totalPaid = 0;
      let expectedSeedQtyPerBatch: number | undefined;
      const rows: ProductSaleRow[] = [];

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
        const dueRatio = saleFinancials.net > 0 ? clamp(saleFinancials.due / saleFinancials.net, 0, 1) : 0;

        for (const item of items) {
          const itemId = String(item?.inventory?._id || item?.inventoryId || item?._id || "");
          if (itemId !== id) continue;

          productName = item?.inventory?.plantType?.name || item?.plantType?.name || item?.name || productName;
          const expectedSeeds = toNumber(item?.inventory?.plantType?.expectedSeedQtyPerBatch);
          if (expectedSeeds > 0) expectedSeedQtyPerBatch = expectedSeeds;
          if (!imageUri) {
            imageUri =
              resolveEntityImage(item?.inventory?.plantType) ||
              resolveEntityImage(item?.plantType) ||
              resolveEntityImage(item?.inventory) ||
              resolveEntityImage(item);
          }

          const qty = toNumber(item?.quantity);
          const unitPrice = toNumber(item?.priceAtSale ?? item?.unitPrice ?? item?.price);
          const lineGross = Math.max(0, qty * unitPrice);
          const discountShare = Math.min(lineGross, lineGross * discountRatio);
          const lineNet = Math.max(0, lineGross - discountShare);
          const paidShare = Math.min(lineNet, lineNet * paidRatio);
          const dueShare = Math.min(lineNet, Math.max(0, lineNet * dueRatio));

          totalQty += qty;
          totalAmount += lineNet;
          totalPaid += paidShare;

          rows.push({
            saleId: String((sale as any)?._id || ""),
            soldAt: String((sale as any)?.createdAt || (sale as any)?.saleDate || new Date().toISOString()),
            quantity: qty,
            amount: lineNet,
            paidShare,
            dueShare,
          });
        }
      }

      return {
        id,
        productName,
        imageUri,
        totalQty,
        totalAmount,
        totalPaid,
        totalDue: Math.max(0, totalAmount - totalPaid),
        expectedSeedQtyPerBatch,
        rows: rows.sort((a, b) => b.soldAt.localeCompare(a.soldAt)),
      };
    },
  });

  if (!id) {
    return null;
  }

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  if (isLoading) {
    return (
      <CustomerScreen title="Product Details" subtitle="Loading product information..." onBackPress={() => router.back()}>
        <CustomerCard style={styles.centerCard}>
          <Text style={styles.helperText}>Loading product details...</Text>
        </CustomerCard>
      </CustomerScreen>
    );
  }

  if (error || !data) {
    return (
      <CustomerScreen title="Product Details" subtitle="Unable to load this product." onBackPress={() => router.back()}>
        <CustomerEmptyState
          title="Failed to load"
          message="Please try again or return to the products list."
          icon={<MaterialIcons name="error-outline" size={44} color={CustomerColors.danger} />}
          action={<CustomerActionButton label="Try Again" onPress={handleRefresh} />}
        />
      </CustomerScreen>
    );
  }

  const fullyPaid = data.totalDue <= 0;

  return (
    <CustomerScreen
      title="Product Details"
      subtitle={data.productName}
      onBackPress={() => router.back()}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          colors={[CustomerColors.primary]}
          tintColor={CustomerColors.primary}
        />
      }
      footer={
        <View style={styles.footerActions}>
          <CustomerActionButton
            label="Back to Products"
            variant="secondary"
            onPress={() => router.back()}
          />
        </View>
      }
    >
      <View style={styles.heroCard}>
        <BannerCardImage
          uri={data.imageUri}
          iconName="local-florist"
          minHeight={220}
          containerStyle={styles.heroImage}
        />
        <View style={styles.heroBody}>
          <SectionHeader
            title={data.productName}
            subtitle="Purchase summary across all linked sales."
            trailing={<StatusChip label={fullyPaid ? "Fully Paid" : "Pending"} tone={fullyPaid ? "success" : "warning"} />}
          />
          <View style={styles.statsGrid}>
            <StatPill label="Quantity" value={`${data.totalQty}`} />
            <StatPill label="Paid" value={formatMoney(data.totalPaid)} />
            <StatPill label="Due" value={formatMoney(data.totalDue)} />
          </View>
        </View>
      </View>

      <CustomerCard>
        <SectionHeader title="Product specifics" subtitle="Derived from your purchase and product records." />
        <View style={styles.specGrid}>
          <View style={styles.specTile}>
            <Text style={styles.specLabel}>Total value</Text>
            <Text style={styles.specValue}>{formatMoney(data.totalAmount)}</Text>
          </View>
          <View style={styles.specTile}>
            <Text style={styles.specLabel}>Unit average</Text>
            <Text style={styles.specValue}>
              {data.totalQty > 0 ? formatMoney(data.totalAmount / data.totalQty) : formatMoney(0)}
            </Text>
          </View>
          {data.expectedSeedQtyPerBatch ? (
            <View style={styles.specTile}>
              <Text style={styles.specLabel}>Expected seeds / batch</Text>
              <Text style={styles.specValue}>{data.expectedSeedQtyPerBatch}</Text>
            </View>
          ) : null}
        </View>
      </CustomerCard>

      <CustomerCard>
        <SectionHeader
          title="Purchase history"
          subtitle="Open a sale from here to review payment details or generate the bill."
          trailing={<StatusChip label={`${data.rows.length} entries`} tone="default" />}
        />
        {data.rows.length === 0 ? (
          <CustomerEmptyState
            title="No purchase history"
            message="No purchase entries were found for this product."
            icon={<MaterialIcons name="history" size={44} color={CustomerColors.textMuted} />}
          />
        ) : (
          <View style={styles.timeline}>
            {data.rows.map((row, index) => {
              const fullySettled = row.dueShare <= 0;
              const isLast = index === data.rows.length - 1;

              return (
                <View key={`${row.saleId}_${row.soldAt}`} style={styles.timelineRow}>
                  <View style={styles.timelineRail}>
                    <View style={[styles.timelineDot, fullySettled ? styles.timelineDotDone : styles.timelineDotPending]}>
                      <MaterialIcons
                        name={fullySettled ? "check" : "schedule"}
                        size={12}
                        color={fullySettled ? CustomerColors.white : CustomerColors.textMuted}
                      />
                    </View>
                    {!isLast ? <View style={styles.timelineLine} /> : null}
                  </View>
                  <View style={styles.timelineCardWrap}>
                    <CustomerCard style={styles.timelineCard}>
                      <View style={styles.timelineHeader}>
                        <View>
                          <Text style={styles.timelineTitle}>{formatDate(row.soldAt)}</Text>
                          <Text style={styles.timelineMeta}>{row.quantity} units</Text>
                        </View>
                        <StatusChip label={fullySettled ? "Paid" : "Partial"} tone={fullySettled ? "success" : "warning"} />
                      </View>
                      <View style={styles.timelineAmounts}>
                        <View style={styles.timelineAmountBlock}>
                          <Text style={styles.timelineAmountLabel}>Total</Text>
                          <Text style={styles.timelineAmountValue}>{formatMoney(row.amount)}</Text>
                        </View>
                        <View style={styles.timelineAmountBlock}>
                          <Text style={styles.timelineAmountLabel}>Paid</Text>
                          <Text style={[styles.timelineAmountValue, styles.successText]}>{formatMoney(row.paidShare)}</Text>
                        </View>
                        <View style={styles.timelineAmountBlock}>
                          <Text style={styles.timelineAmountLabel}>Due</Text>
                          <Text style={[styles.timelineAmountValue, !fullySettled && styles.errorText]}>
                            {formatMoney(row.dueShare)}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.rowActions}>
                        <CustomerActionButton
                          label="View Payment"
                          onPress={() => router.push(`/(customer)/dues/${row.saleId}` as any)}
                          style={styles.flexAction}
                        />
                        <CustomerActionButton
                          label="View Bill"
                          variant="secondary"
                          onPress={() => router.push(`/(customer)/sales/bill/${row.saleId}` as any)}
                          style={styles.flexAction}
                        />
                      </View>
                    </CustomerCard>
                  </View>
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
  centerCard: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
  },
  helperText: {
    color: CustomerColors.textMuted,
  },
  footerActions: {
    gap: Spacing.sm,
  },
  heroCard: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 0,
    overflow: "hidden",
    borderWidth:1,
    borderColor: CustomerColors.border,
    shadowColor: CustomerColors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  heroImage: {
    borderRadius: 0,
    minHeight: 220,
  },
  heroBody: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  statsGrid: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  specGrid: {
    marginTop: Spacing.md,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  specTile: {
    minWidth: "47%",
    flexGrow: 1,
    padding: Spacing.md,
    borderRadius: 18,
    backgroundColor: "rgba(15,189,73,0.06)",
    borderWidth: 1,
    borderColor: CustomerColors.borderStrong,
    gap: 4,
  },
  specLabel: {
    fontSize: 12,
    color: CustomerColors.textMuted,
  },
  specValue: {
    fontSize: 15,
    fontWeight: "700",
    color: CustomerColors.text,
  },
  timeline: {
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  timelineRow: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  timelineRail: {
    width: 22,
    alignItems: "center",
  },
  timelineDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  timelineDotDone: {
    backgroundColor: CustomerColors.success,
  },
  timelineDotPending: {
    backgroundColor: CustomerColors.border,
    borderWidth: 1,
    borderColor: CustomerColors.borderStrong,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    marginVertical: 6,
    backgroundColor: CustomerColors.borderStrong,
  },
  timelineCardWrap: {
    flex: 1,
    paddingBottom: Spacing.md,
  },
  timelineCard: {
    gap: Spacing.md,
  },
  timelineHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  timelineTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: CustomerColors.text,
  },
  timelineMeta: {
    marginTop: 4,
    fontSize: 12,
    color: CustomerColors.textMuted,
  },
  timelineAmounts: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  timelineAmountBlock: {
    flex: 1,
    padding: Spacing.sm,
    borderRadius: 14,
    backgroundColor: CustomerColors.surface,
    gap: 2,
    borderWidth: 1,
    borderColor: CustomerColors.border,
  },
  timelineAmountLabel: {
    fontSize: 11,
    color: CustomerColors.textMuted,
  },
  timelineAmountValue: {
    fontSize: 13,
    fontWeight: "700",
    color: CustomerColors.text,
  },
  successText: {
    color: CustomerColors.success,
  },
  errorText: {
    color: CustomerColors.danger,
  },
  rowActions: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  flexAction: {
    flex: 1,
  },
});
