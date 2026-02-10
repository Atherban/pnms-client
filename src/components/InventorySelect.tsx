import { Pressable, Text } from "react-native";
import { Colors, Spacing } from "../theme";

export default function InventorySelect({
  item,
  onSelect,
}: {
  item: any;
  onSelect: () => void;
}) {
  return (
    <Pressable
      onPress={onSelect}
      disabled={item.quantity <= 0}
      style={{
        backgroundColor: Colors.surface,
        borderRadius: 12,
        padding: Spacing.md,
        marginBottom: Spacing.sm,
        borderWidth: 1,
        borderColor: item.quantity <= 0 ? Colors.borderLight : Colors.border,
        opacity: item.quantity <= 0 ? 0.5 : 1,
      }}
    >
      <Text style={{ fontWeight: "700" }}>{item.plantType?.name}</Text>
      <Text style={{ fontSize: 12, color: Colors.textSecondary }}>
        Available: {item.quantity}
      </Text>
    </Pressable>
  );
}
