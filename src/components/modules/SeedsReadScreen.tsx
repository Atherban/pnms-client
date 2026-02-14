import { useQuery } from "@tanstack/react-query";
import { ActivityIndicator, FlatList, Text, TextInput, View } from "react-native";
import { SeedService } from "../../services/seed.service";
import { Colors, Spacing } from "../../theme";
import { useMemo, useState } from "react";

export function SeedsReadScreen({ title }: { title: string }) {
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
      const supplier = (seed.supplierName ?? "").toLowerCase();
      return name.includes(term) || plantType.includes(term) || supplier.includes(term);
    });
  }, [data, search]);

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
          placeholder="Search seeds..."
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
            <Text style={styles.name}>{item.name || "Unknown Seed"}</Text>
            <Text style={styles.meta}>Plant: {item.plantType?.name || item.category || "—"}</Text>
            <Text style={styles.meta}>In Stock: {Number(item.quantityInStock ?? item.availableStock ?? 0)}</Text>
            {item.supplierName ? <Text style={styles.meta}>Supplier: {item.supplierName}</Text> : null}
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
  name: { color: Colors.text, fontSize: 16, fontWeight: "700" as const },
  meta: { color: Colors.textSecondary, marginTop: 2 },
  error: { color: Colors.error, textAlign: "center" as const },
};
