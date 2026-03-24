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

import { SeedService } from "../../services/seed.service";
import { useAuthStore } from "../../stores/auth.store";
import { resolveEntityImage } from "../../utils/image";
import { canViewSourcingDetails } from "../../utils/rbac";
import { formatQuantityUnit } from "../../utils/units";
import EntityThumbnail from "../ui/EntityThumbnail";
import { AdminTheme } from "../admin/theme";
import StitchHeader from "../common/StitchHeader";
import ModuleSearchBar from "../common/ModuleSearchBar";
import StitchCard from "../common/StitchCard";
import {
  moduleBadge,
  moduleSearchContainer,
} from "../common/moduleStyles";

const getDiscardedSeeds = (seed: any) =>
  Number(
    seed?.discardedSeeds ??
      seed?.discarded ??
      seed?.discardedQuantity ??
      seed?.wastedSeeds ??
      0,
  ) || 0;

const getAvailableStock = (seed: any) => {
  if (seed?.quantityInStock != null) return Number(seed.quantityInStock) || 0;
  if (seed?.availableStock != null) return Number(seed.availableStock) || 0;
  const totalPurchased = Number(seed?.totalPurchased ?? 0) || 0;
  const seedsUsed = Number(seed?.seedsUsed ?? 0) || 0;
  return Math.max(0, totalPurchased - seedsUsed - getDiscardedSeeds(seed));
};

const getStockTone = (count: number) => {
  if (count <= 0) {
    return {
      label: "Out of Stock",
      color: AdminTheme.colors.danger,
      backgroundColor: `${AdminTheme.colors.danger}12`,
      icon: "block",
    };
  }
  if (count <= 25) {
    return {
      label: "Low Stock",
      color: AdminTheme.colors.warning,
      backgroundColor: `${AdminTheme.colors.warning}12`,
      icon: "warning",
    };
  }
  return {
    label: "Healthy Stock",
    color: AdminTheme.colors.success,
    backgroundColor: `${AdminTheme.colors.success}12`,
    icon: "check-circle",
  };
};

export function SeedsReadScreen({ title }: { title: string }) {
  const router = useRouter();
  const role = useAuthStore((state) => state.user?.role);
  const showSourcingDetails = canViewSourcingDetails(role);
  const [search, setSearch] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["seeds"],
    queryFn: SeedService.getAll,
  });

  const seeds = useMemo(() => {
    return Array.isArray(data) ? data : (data as any)?.data ?? [];
  }, [data]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return seeds;

    return seeds.filter((seed: any) => {
      const name = String(seed.name ?? "").toLowerCase();
      const plantType = String(seed.plantType?.name ?? seed.category ?? "").toLowerCase();
      const supplier = showSourcingDetails
        ? String(seed.supplierName ?? "").toLowerCase()
        : "";
      return name.includes(term) || plantType.includes(term) || supplier.includes(term);
    });
  }, [seeds, search, showSourcingDetails]);

  const stockSummary = useMemo(() => {
    return filtered.reduce(
      (acc, seed: any) => {
        const available = getAvailableStock(seed);
        acc.total += available;
        if (available <= 0) acc.out += 1;
        else if (available <= 25) acc.low += 1;
        return acc;
      },
      { total: 0, low: 0, out: 0 },
    );
  }, [filtered]);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={AdminTheme.colors.primary} />
        <Text style={styles.feedbackText}>Loading seeds...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <MaterialIcons name="error-outline" size={36} color={AdminTheme.colors.danger} />
        <Text style={styles.errorText}>
          {(error as any)?.message || "Failed to load seeds"}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StitchHeader
        title={title}
        subtitle={`${filtered.length} seed lots available`}
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
        placeholder={
          showSourcingDetails
            ? "Search seeds, plants, suppliers..."
            : "Search seeds and plant types..."
        }
      />

      <View style={styles.statsRow}>
        <StitchCard style={styles.statCard}>
          <Text style={styles.statValue}>{stockSummary.total}</Text>
          <Text style={styles.statLabel}>Seeds in stock</Text>
        </StitchCard>
        <StitchCard style={styles.statCard}>
          <Text style={styles.statValue}>{stockSummary.low}</Text>
          <Text style={styles.statLabel}>Low stock lots</Text>
        </StitchCard>
        <StitchCard style={styles.statCard}>
          <Text style={styles.statValue}>{stockSummary.out}</Text>
          <Text style={styles.statLabel}>Out of stock</Text>
        </StitchCard>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item: any, index) => item?._id || item?.id || `seed-${index}`}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <StitchCard style={styles.emptyState}>
            <MaterialIcons name="inventory-2" size={28} color={AdminTheme.colors.textMuted} />
            <Text style={styles.emptyTitle}>No seeds found</Text>
            <Text style={styles.emptyText}>
              Try adjusting the search to view more seed inventory records.
            </Text>
          </StitchCard>
        }
        renderItem={({ item }: { item: any }) => {
          const available = getAvailableStock(item);
          const stockTone = getStockTone(available);
          const quantityUnit = formatQuantityUnit(
            item?.quantityUnit ?? item?.plantType?.expectedSeedUnit,
            "SEEDS",
          );

          return (
            <StitchCard style={styles.card}>
              <View style={styles.cardHeader}>
                <EntityThumbnail
                  uri={resolveEntityImage(item) || resolveEntityImage(item?.plantType)}
                  label={item.name || item.plantType?.name}
                  size={48}
                  iconName="grass"
                  style={styles.thumbnail}
                />
                <View style={styles.cardInfo}>
                  <Text style={styles.name}>{item.name || "Unknown Seed"}</Text>
                  <Text style={styles.meta}>
                    Plant Type: {item.plantType?.name || item.category || "—"}
                  </Text>
                  {showSourcingDetails && item.supplierName ? (
                    <Text style={styles.meta}>Supplier: {item.supplierName}</Text>
                  ) : null}
                </View>
                <View
                  style={[
                    styles.stockBadge,
                    moduleBadge,
                    { backgroundColor: stockTone.backgroundColor, borderColor: "transparent" },
                  ]}
                >
                  <MaterialIcons
                    name={stockTone.icon as any}
                    size={14}
                    color={stockTone.color}
                  />
                  <Text style={[styles.stockBadgeText, { color: stockTone.color }]}>
                    {stockTone.label}
                  </Text>
                </View>
              </View>

              <View style={styles.metricsRow}>
                <View style={styles.metricBlock}>
                  <Text style={styles.metricLabel}>Available</Text>
                  <Text style={styles.metricValue}>
                    {available} {quantityUnit}
                  </Text>
                </View>
                <View style={styles.metricBlock}>
                  <Text style={styles.metricLabel}>Purchased</Text>
                  <Text style={styles.metricValue}>{Number(item?.totalPurchased ?? 0) || 0}</Text>
                </View>
                <View style={styles.metricBlock}>
                  <Text style={styles.metricLabel}>Used</Text>
                  <Text style={styles.metricValue}>{Number(item?.seedsUsed ?? 0) || 0}</Text>
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
    fontSize: 20,
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
  stockBadge: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
  },
  stockBadgeText: {
    fontSize: 12,
    fontWeight: "700" as const,
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
