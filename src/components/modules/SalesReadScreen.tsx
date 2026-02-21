import { useQuery } from "@tanstack/react-query";
import { ActivityIndicator, FlatList, Text, TextInput, View } from "react-native";
import { useMemo, useState } from "react";
import { SalesService } from "../../services/sales.service";
import { Colors, Spacing } from "../../theme";
import { resolveEntityImage } from "../../utils/image";
import EntityThumbnail from "../ui/EntityThumbnail";

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

export function SalesReadScreen({ title }: { title: string }) {
  const [search, setSearch] = useState("");
  const { data, isLoading, error } = useQuery({
    queryKey: ["sales"],
    queryFn: SalesService.getAll,
  });

  const filtered = useMemo(() => {
    const sales = Array.isArray(data) ? data : [];
    const term = search.trim().toLowerCase();
    if (!term) return sales;
    return sales.filter((sale: any) => {
      const id = String(sale._id ?? "").toLowerCase();
      const mode = String(sale.paymentMode ?? "").toLowerCase();
      const amount = String(getAmount(sale));
      return id.includes(term) || mode.includes(term) || amount.includes(term);
    });
  }, [data, search]);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.meta}>Loading sales...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{(error as any)?.message || "Failed to load sales"}</Text>
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
          placeholder="Search sales..."
          placeholderTextColor={Colors.textTertiary}
          style={styles.search}
        />
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(item: any) => item._id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.meta}>No sales found.</Text>}
        renderItem={({ item }: { item: any }) => {
          const amount = getAmount(item);
          const profit = Number(item.totalProfit ?? 0);
          const firstItem = Array.isArray(item?.items) ? item.items[0] : null;
          const plantObj =
            (typeof firstItem?.inventory?.plantType === "object" &&
              firstItem.inventory.plantType) ||
            (typeof firstItem?.inventoryId?.plantType === "object" &&
              firstItem.inventoryId.plantType) ||
            (typeof firstItem?.plantType === "object" && firstItem.plantType) ||
            null;
          const thumbnail =
            resolveEntityImage(plantObj) ??
            resolveEntityImage(firstItem?.inventory) ??
            resolveEntityImage(firstItem?.inventoryId) ??
            resolveEntityImage(firstItem) ??
            resolveEntityImage(item);
          return (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <EntityThumbnail
                  uri={thumbnail}
                  label={plantObj?.name}
                  size={42}
                  iconName="local-florist"
                  style={styles.thumbnail}
                />
                <View style={styles.cardInfo}>
                  <Text style={styles.name}>Sale #{String(item._id ?? "").slice(-6) || "—"}</Text>
                  <Text style={styles.meta}>Amount: ₹ {amount.toLocaleString("en-IN")}</Text>
                  <Text style={[styles.meta, { color: profit >= 0 ? Colors.success : Colors.error }]}>
                    Profit: ₹ {profit.toLocaleString("en-IN")}
                  </Text>
                  <Text style={styles.meta}>Mode: {item.paymentMode || "—"}</Text>
                  <Text style={styles.meta}>Date: {item.createdAt ? String(item.createdAt).slice(0, 10) : "—"}</Text>
                </View>
              </View>
            </View>
          );
        }}
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
