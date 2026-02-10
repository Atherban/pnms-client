import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";
import { InventoryService } from "../../../services/inventory.service";
import { Colors, Spacing } from "../../../theme";

export default function InventoryDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data } = useQuery({
    queryKey: ["inventory", id],
    queryFn: () => InventoryService.getById(id),
    enabled: !!id,
  });

  if (!data) return null;

  return (
    <View style={{ padding: Spacing.lg }}>
      <Text style={{ fontSize: 18, fontWeight: "700", color: Colors.text }}>
        {data.plantType?.name || "Inventory Item"}
      </Text>
      <Text style={{ marginTop: Spacing.sm, color: Colors.textSecondary }}>
        Available: {data.quantity ?? 0}
      </Text>
      {data.plantType?.category && (
        <Text style={{ marginTop: Spacing.sm, color: Colors.textSecondary }}>
          Category: {data.plantType.category}
        </Text>
      )}
      {data.plantType?.variety && (
        <Text style={{ marginTop: Spacing.sm, color: Colors.textSecondary }}>
          Variety: {data.plantType.variety}
        </Text>
      )}
    </View>
  );
}
