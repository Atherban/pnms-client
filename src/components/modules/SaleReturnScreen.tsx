import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { SalesService } from "../../services/sales.service";
import { Colors, Spacing } from "../../theme";

interface SaleReturnScreenProps {
  saleId: string;
  routeGroup: "admin" | "staff";
}

export function SaleReturnScreen({ saleId, routeGroup }: SaleReturnScreenProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [quantity, setQuantity] = useState("");
  const [refundAmount, setRefundAmount] = useState("");
  const [reason, setReason] = useState("");

  const { data } = useQuery({
    queryKey: ["sale", saleId],
    queryFn: () => SalesService.getById(saleId),
    enabled: Boolean(saleId),
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const q = Number(quantity);
      const refund = Number(refundAmount || 0);
      if (!Number.isFinite(q) || q <= 0) throw new Error("Enter valid quantity");
      if (q > (Array.isArray(data?.items) ? data.items.reduce((s, i) => s + Number(i?.quantity || 0), 0) : 0)) {
        throw new Error("Returned quantity cannot exceed sold quantity");
      }
      const firstSaleItemId = String(data?.items?.[0]?._id || "");
      if (!firstSaleItemId) {
        throw new Error("Sale item id missing for return request");
      }

      return SalesService.createReturn(saleId, {
        items: [
          {
            saleItemId: firstSaleItemId,
            quantityReturned: q,
            inventoryAction: "RESTOCK",
          },
        ],
        reason:
          reason.trim() ||
          (Number.isFinite(refund) && refund > 0 ? `Refund ₹${refund}` : undefined),
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["sale", saleId] });
      await queryClient.invalidateQueries({ queryKey: ["sales"] });
      Alert.alert("Return saved", "Return entry has been recorded.", [
        {
          text: "OK",
          onPress: () => router.replace(`/(${routeGroup})/sales/${saleId}` as any),
        },
      ]);
    },
    onError: (err: any) => Alert.alert("Unable to save return", err?.message || "Try again"),
  });

  const soldQty = Array.isArray(data?.items)
    ? data.items.reduce((sum, item: any) => sum + Number(item?.quantity || 0), 0)
    : 0;

  return (
    <SafeAreaView style={styles.container} edges={["left", "right"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Sale Return</Text>
        <Text style={styles.subtitle}>Record returned quantity and refund impact</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.meta}>Sale #{saleId.slice(-6).toUpperCase()}</Text>
          <Text style={styles.meta}>Sold quantity: {soldQty}</Text>

          <TextInput
            value={quantity}
            onChangeText={setQuantity}
            style={styles.input}
            keyboardType="numeric"
            placeholder="Returned quantity"
            placeholderTextColor={Colors.textTertiary}
          />
          <TextInput
            value={refundAmount}
            onChangeText={setRefundAmount}
            style={styles.input}
            keyboardType="numeric"
            placeholder="Refund amount"
            placeholderTextColor={Colors.textTertiary}
          />
          <TextInput
            value={reason}
            onChangeText={setReason}
            style={[styles.input, styles.reason]}
            multiline
            placeholder="Return reason"
            placeholderTextColor={Colors.textTertiary}
          />

          <Pressable style={styles.button} onPress={() => mutation.mutate()}>
            <Text style={styles.buttonText}>Submit Return</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.lg },
  title: { color: Colors.text, fontWeight: "700", fontSize: 22 },
  subtitle: { color: Colors.textSecondary, marginTop: 4 },
  content: { paddingHorizontal: Spacing.lg, paddingBottom: 100 },
  card: {
    borderWidth: 1,
    borderColor: Colors.borderLight,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  meta: { color: Colors.textSecondary },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    color: Colors.text,
    backgroundColor: Colors.surfaceDark,
  },
  reason: { minHeight: 80, textAlignVertical: "top" },
  button: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    alignItems: "center",
    paddingVertical: Spacing.md,
  },
  buttonText: { color: Colors.white, fontWeight: "700" },
});
