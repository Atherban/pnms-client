import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { SalesService } from "../../services/sales.service";
import { useAuthStore } from "../../stores/auth.store";
import { Colors, Spacing } from "../../theme";

interface SaleReturnScreenProps {
  saleId: string;
  routeGroup: "admin" | "staff";
}

const formatCurrency = (value: number) => `Rs. ${Number(value || 0).toFixed(2)}`;

export function SaleReturnScreen({ saleId, routeGroup }: SaleReturnScreenProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const [selectedItemIndex, setSelectedItemIndex] = useState(0);
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");

  const isAdminRole = user?.role === "NURSERY_ADMIN" || user?.role === "SUPER_ADMIN";

  const { data: sale } = useQuery({
    queryKey: ["sale", saleId],
    queryFn: () => SalesService.getById(saleId),
    enabled: Boolean(saleId),
  });

  const { data: returns } = useQuery({
    queryKey: ["sale-returns", saleId],
    queryFn: () => SalesService.getReturns({ saleId }),
    enabled: Boolean(saleId),
  });

  const saleItems = Array.isArray(sale?.items) ? sale.items : [];
  const selectedItem = saleItems[selectedItemIndex] || saleItems[0];
  const effectiveSaleItemId = String(selectedItem?._id || "");

  const selectedSoldQty = useMemo(() => {
    return Number(selectedItem?.quantity || 0);
  }, [selectedItem]);

  const createMutation = useMutation({
    mutationFn: async () => {
      const q = Number(quantity);
      if (!effectiveSaleItemId) throw new Error("Sale item id missing for return request");
      if (!Number.isFinite(q) || q <= 0) throw new Error("Enter valid quantity");
      if (q > selectedSoldQty) throw new Error("Return quantity cannot exceed sold quantity");

      return SalesService.createReturn(saleId, {
        items: [
          {
            saleItemId: effectiveSaleItemId,
            quantityReturned: q,
            inventoryAction: "RESTOCK",
          },
        ],
        reason: reason.trim() || "Return requested",
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["sale", saleId] });
      await queryClient.invalidateQueries({ queryKey: ["sale-returns", saleId] });
      await queryClient.invalidateQueries({ queryKey: ["sales"] });
      setQuantity("");
      setReason("");
      Alert.alert("Return requested", "Return request has been submitted for admin approval.");
    },
    onError: (err: any) => Alert.alert("Unable to process return request.", err?.message || "Please try again."),
  });

  const approveMutation = useMutation({
    mutationFn: (returnId: string) => SalesService.approveReturn(returnId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["sale-returns", saleId] });
      Alert.alert("Return approved", "The return request is now approved and ready to complete.");
    },
    onError: () => Alert.alert("Unable to process return request.", "Please try again."),
  });

  const rejectMutation = useMutation({
    mutationFn: (returnId: string) => SalesService.rejectReturn(returnId, "Rejected by admin"),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["sale-returns", saleId] });
      Alert.alert("Return rejected", "The return request has been rejected.");
    },
    onError: () => Alert.alert("Unable to process return request.", "Please try again."),
  });

  const completeMutation = useMutation({
    mutationFn: (returnId: string) => SalesService.completeReturn(returnId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["sale", saleId] });
      await queryClient.invalidateQueries({ queryKey: ["sale-returns", saleId] });
      await queryClient.invalidateQueries({ queryKey: ["sales"] });
      Alert.alert("Return completed", "Inventory and financial adjustments have been applied.");
    },
    onError: () => Alert.alert("Unable to process return request.", "Please try again."),
  });

  return (
    <SafeAreaView style={styles.container} edges={["left", "right"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Sales Returns</Text>
        <Text style={styles.subtitle}>Request, approve and complete sale returns</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.meta}>Sale: {sale?.saleNumber || saleId}</Text>
          <Text style={styles.meta}>Sale Status: {sale?.status || "COMPLETED"}</Text>
          <Text style={styles.meta}>Paid: {formatCurrency(Number(sale?.paidAmount || 0))}</Text>
          <Text style={styles.meta}>Due: {formatCurrency(Number(sale?.dueAmount || 0))}</Text>
          <Text style={styles.sectionTitle}>Select Item</Text>
          <View style={styles.rowActions}>
            {saleItems.map((item: any, index: number) => {
              const label = item?.inventory?.plantType?.name || `Item ${index + 1}`;
              return (
                <Pressable
                  key={String(item?._id || index)}
                  style={[
                    styles.smallButton,
                    index === selectedItemIndex ? styles.approve : styles.secondaryButton,
                  ]}
                  onPress={() => setSelectedItemIndex(index)}
                >
                  <Text style={styles.smallButtonText}>{label}</Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.meta}>Selected sold quantity: {selectedSoldQty}</Text>

          <TextInput
            value={quantity}
            onChangeText={setQuantity}
            style={styles.input}
            keyboardType="numeric"
            placeholder={`Returned quantity (max ${selectedSoldQty})`}
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

          <Pressable style={styles.button} onPress={() => createMutation.mutate()}>
            <Text style={styles.buttonText}>{createMutation.isPending ? "Submitting..." : "Submit Return Request"}</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Return History</Text>
          {!Array.isArray(returns) || returns.length === 0 ? (
            <Text style={styles.empty}>No return requests found.</Text>
          ) : (
            returns.map((entry: any) => (
              <View key={String(entry?._id || Math.random())} style={styles.returnItem}>
                <Text style={styles.returnTitle}>#{String(entry?._id || "").slice(-6)} • {entry?.status || "REQUESTED"}</Text>
                <Text style={styles.returnMeta}>Qty: {Number(entry?.quantity || 0)}</Text>
                <Text style={styles.returnMeta}>Refund: {formatCurrency(Number(entry?.refundAmount || 0))}</Text>
                <Text style={styles.returnMeta}>Reason: {entry?.reason || "-"}</Text>

                {isAdminRole && entry?.status === "REQUESTED" ? (
                  <View style={styles.rowActions}>
                    <Pressable style={[styles.smallButton, styles.approve]} onPress={() => approveMutation.mutate(String(entry._id))}>
                      <Text style={styles.smallButtonText}>{approveMutation.isPending ? "..." : "Approve"}</Text>
                    </Pressable>
                    <Pressable style={[styles.smallButton, styles.reject]} onPress={() => rejectMutation.mutate(String(entry._id))}>
                      <Text style={styles.smallButtonText}>{rejectMutation.isPending ? "..." : "Reject"}</Text>
                    </Pressable>
                  </View>
                ) : null}

                {isAdminRole && entry?.status === "APPROVED" ? (
                  <Pressable style={[styles.smallButton, styles.complete]} onPress={() => completeMutation.mutate(String(entry._id))}>
                    <Text style={styles.smallButtonText}>{completeMutation.isPending ? "..." : "Complete Return"}</Text>
                  </Pressable>
                ) : null}
              </View>
            ))
          )}

          <Pressable
            style={[styles.button, styles.secondaryButton]}
            onPress={() => router.replace(`/(${routeGroup})/sales/${saleId}` as any)}
          >
            <Text style={styles.buttonText}>Back to Sale</Text>
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
  content: { paddingHorizontal: Spacing.lg, paddingBottom: 100, gap: Spacing.md },
  card: {
    borderWidth: 1,
    borderColor: Colors.borderLight,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  meta: { color: Colors.textSecondary },
  sectionTitle: { color: Colors.text, fontWeight: "700", fontSize: 16 },
  empty: { color: Colors.textSecondary },
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
  secondaryButton: {
    backgroundColor: Colors.primaryLight,
  },
  buttonText: { color: Colors.white, fontWeight: "700" },
  returnItem: {
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: 10,
    padding: Spacing.sm,
    gap: 4,
  },
  returnTitle: { color: Colors.text, fontWeight: "700" },
  returnMeta: { color: Colors.textSecondary },
  rowActions: { flexDirection: "row", gap: Spacing.sm, marginTop: Spacing.xs },
  smallButton: {
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: "center",
  },
  smallButtonText: { color: Colors.white, fontWeight: "700" },
  approve: { backgroundColor: Colors.primary },
  reject: { backgroundColor: Colors.error },
  complete: { backgroundColor: Colors.success },
});
