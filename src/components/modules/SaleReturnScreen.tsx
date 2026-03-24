import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { SalesService } from "../../services/sales.service";
import { useAuthStore } from "../../stores/auth.store";
import { AdminTheme } from "../admin/theme";
import StitchHeader from "../common/StitchHeader";
import StitchCard from "../common/StitchCard";
import StitchSectionHeader from "../common/StitchSectionHeader";

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
      <StitchHeader
        title="Sales Returns"
        subtitle="Request, approve and complete sale returns"
        variant="gradient"
        showBackButton
        onBackPress={() => router.back()}
      />

      <ScrollView contentContainerStyle={styles.content}>
        <StitchCard style={styles.card}>
          <Text style={styles.meta}>Sale: {sale?.saleNumber || saleId}</Text>
          <Text style={styles.meta}>Sale Status: {sale?.status || "COMPLETED"}</Text>
          <Text style={styles.meta}>Paid: {formatCurrency(Number(sale?.paidAmount || 0))}</Text>
          <Text style={styles.meta}>Due: {formatCurrency(Number(sale?.dueAmount || 0))}</Text>
          <StitchSectionHeader title="Select Item" />
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
            placeholderTextColor={AdminTheme.colors.textSoft}
          />
          <TextInput
            value={reason}
            onChangeText={setReason}
            style={[styles.input, styles.reason]}
            multiline
            placeholder="Return reason"
            placeholderTextColor={AdminTheme.colors.textSoft}
          />

          <Pressable style={styles.button} onPress={() => createMutation.mutate()}>
            <Text style={styles.buttonText}>{createMutation.isPending ? "Submitting..." : "Submit Return Request"}</Text>
          </Pressable>
        </StitchCard>

        <StitchCard style={styles.card}>
          <StitchSectionHeader title="Return History" />
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
        </StitchCard>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: AdminTheme.colors.background },
  content: { paddingHorizontal: AdminTheme.spacing.lg, paddingBottom: 100, gap: AdminTheme.spacing.md },
  card: {
    borderWidth: 1,
    borderColor: AdminTheme.colors.borderSoft,
    backgroundColor: AdminTheme.colors.surface,
    borderRadius: 14,
    padding: AdminTheme.spacing.md,
    gap: AdminTheme.spacing.sm,
  },
  meta: { color: AdminTheme.colors.textMuted },
  empty: { color: AdminTheme.colors.textMuted },
  input: {
    borderWidth: 1,
    borderColor: AdminTheme.colors.border,
    borderRadius: 10,
    paddingHorizontal: AdminTheme.spacing.md,
    paddingVertical: AdminTheme.spacing.sm,
    color: AdminTheme.colors.text,
    backgroundColor: AdminTheme.colors.surface,
  },
  reason: { minHeight: 80, textAlignVertical: "top" },
  button: {
    backgroundColor: AdminTheme.colors.primary,
    borderRadius: 10,
    alignItems: "center",
    paddingVertical: AdminTheme.spacing.md,
  },
  secondaryButton: {
    backgroundColor: AdminTheme.colors.primaryDark,
  },
  buttonText: { color: AdminTheme.colors.surface, fontWeight: "700" },
  returnItem: {
    borderWidth: 1,
    borderColor: AdminTheme.colors.borderSoft,
    borderRadius: 10,
    padding: AdminTheme.spacing.sm,
    gap: 4,
  },
  returnTitle: { color: AdminTheme.colors.text, fontWeight: "700" },
  returnMeta: { color: AdminTheme.colors.textMuted },
  rowActions: { flexDirection: "row", gap: AdminTheme.spacing.sm, marginTop: AdminTheme.spacing.xs },
  smallButton: {
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: "center",
  },
  smallButtonText: { color: AdminTheme.colors.surface, fontWeight: "700" },
  approve: { backgroundColor: AdminTheme.colors.primary },
  reject: { backgroundColor: AdminTheme.colors.danger },
  complete: { backgroundColor: AdminTheme.colors.success },
});
