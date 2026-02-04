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

  return (
    <View style={{ padding: Spacing.lg }}>
      <Text style={{ fontSize: 16, fontWeight: "600" }}>Sale Details</Text>

      <Text>Total Amount: ₹ {data.totalAmount}</Text>
      <Text>Payment Mode: {data.paymentMode}</Text>
      <Text>Performed By: {data.roleAtTime}</Text>
      <Text>Date: {new Date(data.createdAt).toDateString()}</Text>

      <Text style={{ marginTop: Spacing.md, fontWeight: "600" }}>Items</Text>

      {data.items.map((item, index) => (
        <View key={index} style={{ marginTop: Spacing.sm }}>
          <Text>Plant ID: {item.plantId}</Text>
          <Text>Quantity: {item.quantity}</Text>
          <Text>Price: ₹ {item.priceAtSale}</Text>
        </View>
      ))}
    </View>
  );
}
