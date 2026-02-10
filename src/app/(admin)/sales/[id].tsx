import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";
import { SalesService } from "../../../services/sales.service";
import { Spacing } from "../../../theme";

export default function SaleDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data } = useQuery({
    queryKey: ["sale", id],
    queryFn: () => SalesService.getById(id),
    enabled: !!id,
  });

  if (!data) return null;

  const totalAmount =
    data.totalAmount ??
    data.items?.reduce(
      (sum: number, item: any) =>
        sum +
        (Number(item.priceAtSale ?? item.unitPrice ?? item.price ?? 0) || 0) *
          (Number(item.quantity) || 0),
      0,
    ) ??
    0;

  return (
    <View style={{ padding: Spacing.lg }}>
      <Text style={{ fontSize: 16, fontWeight: "600" }}>Sale Details</Text>

      <Text>Total Amount: ₹ {totalAmount}</Text>
      <Text>Payment Mode: {data.paymentMode}</Text>
      <Text>Performed By: {data.roleAtTime}</Text>
      <Text>Date: {new Date(data.createdAt).toDateString()}</Text>

      <Text style={{ marginTop: Spacing.md, fontWeight: "600" }}>Items</Text>

      {data.items.map((item, index) => (
        <View key={index} style={{ marginTop: Spacing.sm }}>
          <Text>
            Inventory:{" "}
            {item.inventory?.plantType?.name || item.inventoryId || "Unknown"}
          </Text>
          <Text>Quantity: {item.quantity}</Text>
          <Text>
            Price: ₹ {item.priceAtSale ?? item.unitPrice ?? item.price ?? 0}
          </Text>
        </View>
      ))}
    </View>
  );
}
