import { MaterialIcons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Text,
  View,
} from "react-native";

import { SalesService } from "../../services/sales.service";
import { useAuthStore } from "../../stores/auth.store";
import { resolveEntityImage } from "../../utils/image";
import { canViewSensitivePricing } from "../../utils/rbac";
import EntityThumbnail from "../ui/EntityThumbnail";
import { AdminTheme } from "../admin/theme";
import StitchHeader from "../common/StitchHeader";
import ModuleSearchBar from "../common/ModuleSearchBar";
import StitchCard from "../common/StitchCard";
import StitchStatusBadge from "../common/StitchStatusBadge";
import { moduleSearchContainer } from "../common/moduleStyles";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value || 0);

const formatDate = (value?: string) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getAmount = (sale: any) =>
  Number(
    sale?.totalAmount ??
      (Array.isArray(sale?.items)
        ? sale.items.reduce(
            (sum: number, item: any) =>
              sum +
              (Number(item.priceAtSale ?? item.unitPrice ?? item.price ?? 0) || 0) *
                (Number(item.quantity ?? 0) || 0),
            0,
          )
        : 0),
  ) || 0;

const getStatusTone = (status?: string) => {
  const normalized = String(status || "PENDING").trim().toUpperCase();
  if (normalized === "COMPLETED" || normalized === "PAID") return "success";
  if (normalized === "CANCELLED" || normalized === "FAILED") return "danger";
  return "warning";
};

export function SalesReadScreen({ title }: { title: string }) {
  const router = useRouter();
  const role = useAuthStore((state) => state.user?.role);
  const showSensitivePricing = canViewSensitivePricing(role);
  const [search, setSearch] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["sales"],
    queryFn: SalesService.getAll,
  });

  const sales = useMemo(() => {
    return Array.isArray(data) ? data : (data as any)?.data ?? [];
  }, [data]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return sales;

    return sales.filter((sale: any) => {
      const id = String(sale._id ?? sale.saleNumber ?? "").toLowerCase();
      const mode = String(sale.paymentMode ?? "").toLowerCase();
      const customer = String(sale.customerName ?? sale.customer?.name ?? "").toLowerCase();
      const amount = String(getAmount(sale));
      return (
        id.includes(term) ||
        mode.includes(term) ||
        customer.includes(term) ||
        amount.includes(term)
      );
    });
  }, [sales, search]);

  const summary = useMemo(() => {
    return filtered.reduce(
      (acc, sale: any) => {
        const amount = getAmount(sale);
        acc.totalAmount += amount;
        if (String(sale?.status || "").toUpperCase() === "COMPLETED") acc.completed += 1;
        if (String(sale?.status || "").toUpperCase() === "PENDING") acc.pending += 1;
        return acc;
      },
      { totalAmount: 0, completed: 0, pending: 0 },
    );
  }, [filtered]);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={AdminTheme.colors.primary} />
        <Text style={styles.feedbackText}>Loading sales...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <MaterialIcons name="error-outline" size={36} color={AdminTheme.colors.danger} />
        <Text style={styles.errorText}>
          {(error as any)?.message || "Failed to load sales"}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StitchHeader
        title={title}
        subtitle={`${filtered.length} recorded sales`}
        variant="gradient"
        showBackButton
        onBackPress={() => router.back()}
      />

      <ModuleSearchBar
        containerStyle={styles.searchWrap}
        inputContainerStyle={styles.searchInputWrap}
        value={search}
        onChangeText={setSearch}
        onClear={() => setSearch("")}
        placeholder="Search sales, customers, or payment modes..."
      />

      <View style={styles.statsRow}>
        <StitchCard style={styles.statCard}>
          <Text style={styles.statValue}>{formatCurrency(summary.totalAmount)}</Text>
          <Text style={styles.statLabel}>Visible revenue</Text>
        </StitchCard>
        <StitchCard style={styles.statCard}>
          <Text style={styles.statValue}>{summary.completed}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </StitchCard>
        <StitchCard style={styles.statCard}>
          <Text style={styles.statValue}>{summary.pending}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </StitchCard>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item: any, index) => item?._id || item?.id || `sale-${index}`}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <StitchCard style={styles.emptyState}>
            <MaterialIcons name="receipt-long" size={28} color={AdminTheme.colors.textMuted} />
            <Text style={styles.emptyTitle}>No sales found</Text>
            <Text style={styles.emptyText}>
              Update the search terms to explore matching sale records.
            </Text>
          </StitchCard>
        }
        renderItem={({ item }: { item: any }) => {
          const amount = getAmount(item);
          const profit = Number(item.totalProfit ?? 0);
          const firstItem = Array.isArray(item?.items) ? item.items[0] : null;
          const snapshotName =
            firstItem?.plantTypeName ||
            firstItem?.inventoryLabel ||
            undefined;
          const plantObj =
            (typeof firstItem?.inventory?.plantType === "object" &&
              firstItem.inventory.plantType) ||
            (typeof firstItem?.inventoryId?.plantType === "object" &&
              firstItem.inventoryId.plantType) ||
            (typeof firstItem?.plantType === "object" && firstItem.plantType) ||
            null;
          const thumbnail =
            resolveEntityImage(
              firstItem?.plantImage ? { imageUrl: firstItem.plantImage } : null,
            ) ??
            resolveEntityImage(plantObj) ??
            resolveEntityImage(firstItem?.inventory) ??
            resolveEntityImage(firstItem?.inventoryId) ??
            resolveEntityImage(firstItem) ??
            resolveEntityImage(item);

          return (
            <StitchCard style={styles.card}>
              <View style={styles.cardHeader}>
                <EntityThumbnail
                  uri={thumbnail}
                  label={snapshotName || plantObj?.name || item?.saleNumber}
                  size={48}
                  iconName="local-florist"
                  style={styles.thumbnail}
                />
                <View style={styles.cardInfo}>
                  <Text style={styles.name}>{item.saleNumber || "Sale"}</Text>
                  <Text style={styles.meta}>
                    Customer: {item.customerName || item.customer?.name || "Walk-in Customer"}
                  </Text>
                  <Text style={styles.meta}>
                    Payment: {item.paymentMode || "—"} • {formatDate(item.createdAt)}
                  </Text>
                </View>
                <StitchStatusBadge
                  label={String(item.status || "Pending").replace(/_/g, " ")}
                  tone={getStatusTone(item.status) as any}
                />
              </View>

              <View style={styles.metricsRow}>
                <View style={styles.metricBlock}>
                  <Text style={styles.metricLabel}>Amount</Text>
                  <Text style={styles.metricValue}>{formatCurrency(amount)}</Text>
                </View>
                {showSensitivePricing ? (
                  <View style={styles.metricBlock}>
                    <Text style={styles.metricLabel}>Profit</Text>
                    <Text
                      style={[
                        styles.metricValue,
                        {
                          color:
                            profit >= 0
                              ? AdminTheme.colors.success
                              : AdminTheme.colors.danger,
                        },
                      ]}
                    >
                      {formatCurrency(profit)}
                    </Text>
                  </View>
                ) : null}
                <View style={styles.metricBlock}>
                  <Text style={styles.metricLabel}>Items</Text>
                  <Text style={styles.metricValue}>
                    {Array.isArray(item?.items) ? item.items.length : 0}
                  </Text>
                </View>
              </View>
            </StitchCard>
          );
        }}
      />
    </View>
  );
}

const styles = {
  container: {
    flex: 1,
    backgroundColor: AdminTheme.colors.background,
  },
  center: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    padding: AdminTheme.spacing.lg,
    backgroundColor: AdminTheme.colors.background,
  },
  feedbackText: {
    marginTop: AdminTheme.spacing.sm,
    color: AdminTheme.colors.textMuted,
  },
  errorText: {
    marginTop: AdminTheme.spacing.sm,
    color: AdminTheme.colors.danger,
    textAlign: "center" as const,
  },
  searchWrap: {
    ...moduleSearchContainer,
    marginBottom: AdminTheme.spacing.md,
  },
  searchInputWrap: {
    flex: 1,
  },
  statsRow: {
    flexDirection: "row" as const,
    gap: AdminTheme.spacing.sm,
    paddingHorizontal: AdminTheme.spacing.lg,
    marginBottom: AdminTheme.spacing.md,
  },
  statCard: {
    flex: 1,
    paddingVertical: AdminTheme.spacing.md,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: AdminTheme.colors.text,
  },
  statLabel: {
    marginTop: 4,
    fontSize: 12,
    color: AdminTheme.colors.textMuted,
  },
  list: {
    paddingHorizontal: AdminTheme.spacing.lg,
    paddingBottom: AdminTheme.spacing.xl,
    gap: AdminTheme.spacing.sm,
  },
  emptyState: {
    alignItems: "center" as const,
    paddingVertical: AdminTheme.spacing.xl,
  },
  emptyTitle: {
    marginTop: AdminTheme.spacing.sm,
    fontSize: 16,
    fontWeight: "700" as const,
    color: AdminTheme.colors.text,
  },
  emptyText: {
    marginTop: 4,
    textAlign: "center" as const,
    color: AdminTheme.colors.textMuted,
  },
  card: {
    gap: AdminTheme.spacing.md,
  },
  cardHeader: {
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
    gap: AdminTheme.spacing.sm,
  },
  thumbnail: {
    borderRadius: 12,
  },
  cardInfo: {
    flex: 1,
    gap: 2,
  },
  name: {
    color: AdminTheme.colors.text,
    fontSize: 16,
    fontWeight: "700" as const,
  },
  meta: {
    color: AdminTheme.colors.textMuted,
    fontSize: 13,
  },
  metricsRow: {
    flexDirection: "row" as const,
    gap: AdminTheme.spacing.sm,
  },
  metricBlock: {
    flex: 1,
    borderRadius: AdminTheme.radius.md,
    backgroundColor: AdminTheme.colors.surfaceMuted,
    padding: AdminTheme.spacing.sm,
  },
  metricLabel: {
    fontSize: 11,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
    color: AdminTheme.colors.textMuted,
  },
  metricValue: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: "700" as const,
    color: AdminTheme.colors.text,
  },
};
