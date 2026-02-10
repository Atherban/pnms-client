import { FlatList, Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { InventoryService } from "../../services/inventory.service";
import { Colors, Spacing } from "../../theme";

export default function ViewerInventory() {
  const router = useRouter();
  const { data } = useQuery({
    queryKey: ["viewer-inventory"],
    queryFn: InventoryService.getAll,
  });

  const inventory = Array.isArray(data) ? data : (data?.data ?? []);

  return (
    <FlatList
      contentContainerStyle={{ padding: Spacing.lg }}
      data={inventory}
      keyExtractor={(item) => item._id}
      renderItem={({ item }) => (
        <Pressable
          onPress={() => router.push(`/(viewer)/inventory/${item._id}`)}
          style={{
            padding: Spacing.md,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: Colors.borderLight,
            backgroundColor: Colors.surface,
            marginBottom: Spacing.sm,
          }}
        >
          <Text style={{ fontWeight: "700", color: Colors.text }}>
            {item.plantType?.name || "Unknown Plant"}
          </Text>
          <Text style={{ color: Colors.textSecondary }}>
            Available: {item.quantity ?? 0}
          </Text>
        </Pressable>
      )}
      ListEmptyComponent={
        <View style={{ padding: Spacing.lg }}>
          <Text style={{ color: Colors.textSecondary }}>
            No inventory available.
          </Text>
        </View>
      }
    />
  );
}
