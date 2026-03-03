import { useQuery } from "@tanstack/react-query";
import { ActivityIndicator, FlatList, Text, TextInput, View } from "react-native";
import { SeedService } from "../../services/seed.service";
import { useAuthStore } from "../../stores/auth.store";
import { Colors, Spacing } from "../../theme";
import { useMemo, useState } from "react";
import { resolveEntityImage } from "../../utils/image";
import { canViewSourcingDetails } from "../../utils/rbac";
import { formatQuantityUnit } from "../../utils/units";
import EntityThumbnail from "../ui/EntityThumbnail";

export function SeedsReadScreen({ title }: { title: string }) {
  const role = useAuthStore((state) => state.user?.role);
  const showSourcingDetails = canViewSourcingDetails(role);
  const [search, setSearch] = useState("");
  const { data, isLoading, error } = useQuery({
    queryKey: ["seeds"],
    queryFn: SeedService.getAll,
  });

  const filtered = useMemo(() => {
    const seeds = Array.isArray(data) ? data : (data as any)?.data ?? [];
    const term = search.trim().toLowerCase();
    if (!term) return seeds;
    return seeds.filter((seed: any) => {
      const name = (seed.name ?? "").toLowerCase();
      const plantType = (seed.plantType?.name ?? seed.category ?? "").toLowerCase();
      const supplier = showSourcingDetails ? (seed.supplierName ?? "").toLowerCase() : "";
      return name.includes(term) || plantType.includes(term) || supplier.includes(term);
    });
  }, [data, search, showSourcingDetails]);

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

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.meta}>Loading seeds...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{(error as any)?.message || "Failed to load seeds"}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
      </View>
      <View style={styles.searchWrap}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder={
            showSourcingDetails ? "Search seeds, plants, suppliers..." : "Search seeds, plants..."
          }
          placeholderTextColor={Colors.textTertiary}
          style={styles.search}
        />
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(item: any) => item._id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.meta}>No seeds found.</Text>}
        renderItem={({ item }: { item: any }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <EntityThumbnail
                uri={resolveEntityImage(item) || resolveEntityImage(item?.plantType)}
                label={item.name || item.plantType?.name}
                size={42}
                iconName="grass"
                style={styles.thumbnail}
              />
              <View style={styles.cardInfo}>
                <Text style={styles.name}>{item.name || "Unknown Seed"}</Text>
                <Text style={styles.meta}>
                  Plant: {item.plantType?.name || item.category || "—"}
                </Text>
                <Text style={styles.meta}>
                  In Stock: {getAvailableStock(item)}{" "}
                  {formatQuantityUnit(
                    item?.quantityUnit ?? item?.plantType?.expectedSeedUnit,
                    "SEEDS",
                  )}
                </Text>
                {showSourcingDetails && item.supplierName ? (
                  <Text style={styles.meta}>Supplier: {item.supplierName}</Text>
                ) : null}
              </View>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = {
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: "center" as const, justifyContent: "center" as const, padding: Spacing.lg },
  header: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: Spacing.sm },
  title: { color: Colors.text, fontSize: 24, fontWeight: "700" as const },
  searchWrap: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.sm },
  search: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    color: Colors.text,
    backgroundColor: Colors.surface,
  },
  list: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xl },
  card: {
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: 14,
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    marginBottom: Spacing.sm,
  },
  cardHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: Spacing.sm,
  },
  thumbnail: {
    borderRadius: 10,
  },
  cardInfo: {
    flex: 1,
  },
  name: { color: Colors.text, fontSize: 16, fontWeight: "700" as const },
  meta: { color: Colors.textSecondary, marginTop: 2 },
  error: { color: Colors.error, textAlign: "center" as const },
};
