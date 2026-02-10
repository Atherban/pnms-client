// app/(admin)/more/inventory.tsx
import { useQuery } from "@tanstack/react-query";
import { FlatList, Text, View } from "react-native";
import { InventoryService } from "../../../services/inventory.service";
import { Colors, Spacing } from "../../../theme";

export default function AdminInventory() {
  const { data } = useQuery({
    queryKey: ["inventory"],
    queryFn: InventoryService.getAll,
  });

  const inventory = Array.isArray(data) ? data : (data?.data ?? []);

  return (
    <FlatList
      data={inventory}
      keyExtractor={(i) => i._id}
      contentContainerStyle={{
        padding: Spacing.lg,
        backgroundColor: Colors.background,
      }}
      renderItem={({ item }) => {
        const lowStock = item.quantity <= (item.minStock || 5);

        return (
          <View style={styles.card}>
            <View style={styles.header}>
              <Text style={styles.name}>
                {item.plantType?.name || "Unknown"}
              </Text>
              {lowStock && <Text style={styles.lowStock}>LOW STOCK</Text>}
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Quantity</Text>
              <Text style={[styles.value, lowStock && styles.danger]}>
                {item.quantity}
              </Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Minimum Stock</Text>
              <Text style={styles.value}>{item.minStock || 5}</Text>
            </View>
          </View>
        );
      }}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No inventory available</Text>
        </View>
      }
    />
  );
}

const styles = {
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: Spacing.sm,
  },
  name: {
    fontSize: 17,
    fontWeight: "700",
    color: Colors.text,
  },
  lowStock: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.error,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: Spacing.sm,
  },
  label: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  value: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.text,
  },
  danger: {
    color: Colors.error,
  },
  empty: {
    padding: Spacing.xl,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 15,
    color: Colors.textSecondary,
  },
};
