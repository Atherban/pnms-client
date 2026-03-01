import { MaterialIcons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import { useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import FixedHeader from "../../../components/common/FixedHeader";
import { PaymentService } from "../../../services/payment.service";
import { useAuthStore } from "../../../stores/auth.store";
import { Colors, Spacing } from "../../../theme";

const formatMoney = (amount: number) => `₹${Math.round(amount).toLocaleString("en-IN")}`;
const shortSaleId = (value?: string) => {
  const raw = String(value || "");
  return raw ? raw.slice(-6).toUpperCase() : "N/A";
};

export default function AdminPaymentVerificationScreen() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [selectedProofId, setSelectedProofId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const { data, refetch, isRefetching } = useQuery({
    queryKey: ["payment-proofs"],
    queryFn: () => PaymentService.listPaymentProofs(),
  });

  const selected = useMemo(
    () => (data || []).find((item) => item.id === selectedProofId),
    [data, selectedProofId],
  );

  const reviewMutation = useMutation({
    mutationFn: async (approve: boolean) => {
      if (!selected) return;
      if (!approve && !rejectReason.trim()) {
        throw new Error("Rejection reason is required");
      }
      await PaymentService.reviewPaymentProof({
        id: selected.id,
        approve,
        reviewerName: user?.name,
        rejectionReason: approve ? undefined : rejectReason.trim(),
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["payment-proofs"] });
      setSelectedProofId(null);
      setRejectReason("");
    },
    onError: (err: any) => Alert.alert("Unable to review", err?.message || "Try again"),
  });

  return (
    <SafeAreaView style={styles.container} edges={["left", "right"]}>
      <FixedHeader
        title="Payment Verification"
        subtitle="Approve or reject payment screenshots"
        titleStyle={styles.headerTitle}
        actions={
          <Pressable style={styles.headerIconBtn} onPress={() => refetch()}>
            <MaterialIcons
              name={isRefetching ? "sync" : "refresh"}
              size={20}
              color={Colors.white}
            />
          </Pressable>
        }
      />

      <ScrollView contentContainerStyle={styles.content}>
        {(data || []).length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No payment proofs to review.</Text>
          </View>
        ) : null}

        {(data || []).map((proof) => (
          <Pressable
            key={proof.id}
            style={styles.card}
            onPress={() => setSelectedProofId(proof.id)}
          >
            <View style={styles.cardTop}>
              <Text style={styles.customer}>{proof.customerName}</Text>
              <Text style={[styles.status, styles[`status_${proof.status}` as keyof typeof styles]]}>
                {proof.status}
              </Text>
            </View>
            <Text style={styles.amount}>{formatMoney(proof.amount)}</Text>
            <Text style={styles.meta}>Sale: #{shortSaleId(proof.saleId)}</Text>
            {proof.mode ? <Text style={styles.meta}>Mode: {proof.mode}</Text> : null}
            {proof.utrNumber ? <Text style={styles.meta}>UTR: {proof.utrNumber}</Text> : null}
            {proof.paymentAt ? (
              <Text style={styles.meta}>Paid at: {new Date(proof.paymentAt).toLocaleString("en-IN")}</Text>
            ) : null}
            <Text style={styles.meta}>Submitted: {new Date(proof.submittedAt).toLocaleString("en-IN")}</Text>
            {proof.screenshotUri ? (
              <View style={styles.proofWrap}>
                <Image source={{ uri: proof.screenshotUri }} style={styles.proofImage} contentFit="contain" />
              </View>
            ) : (
              <Text style={styles.warn}>No screenshot attached</Text>
            )}
            {proof.rejectionReason ? <Text style={styles.warn}>Reason: {proof.rejectionReason}</Text> : null}
          </Pressable>
        ))}
      </ScrollView>

      <Modal visible={Boolean(selected)} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Review Payment Proof</Text>
            <Text style={styles.modalMeta}>{selected?.customerName}</Text>
            <Text style={styles.modalAmount}>{formatMoney(selected?.amount || 0)}</Text>
            <Text style={styles.modalMeta}>Sale #{shortSaleId(selected?.saleId)}</Text>
            {selected?.mode ? <Text style={styles.modalMeta}>Mode: {selected.mode}</Text> : null}
            {selected?.utrNumber ? <Text style={styles.modalMeta}>UTR: {selected.utrNumber}</Text> : null}
            {selected?.paymentAt ? (
              <Text style={styles.modalMeta}>
                Paid at: {new Date(selected.paymentAt).toLocaleString("en-IN")}
              </Text>
            ) : null}
            {selected?.screenshotUri ? (
              <View style={styles.proofWrap}>
                <Image source={{ uri: selected.screenshotUri }} style={styles.proofImageLarge} contentFit="contain" />
              </View>
            ) : (
              <Text style={styles.warn}>No screenshot provided.</Text>
            )}

            <TextInput
              value={rejectReason}
              onChangeText={setRejectReason}
              placeholder="Rejection reason (required for reject)"
              style={styles.input}
              placeholderTextColor={Colors.textTertiary}
            />

            <View style={styles.modalActions}>
              <Pressable style={styles.cancelBtn} onPress={() => setSelectedProofId(null)}>
                <Text style={styles.cancelBtnText}>Close</Text>
              </Pressable>
              <Pressable style={styles.rejectBtn} onPress={() => reviewMutation.mutate(false)}>
                <Text style={styles.actionText}>Reject</Text>
              </Pressable>
              <Pressable style={styles.approveBtn} onPress={() => reviewMutation.mutate(true)}>
                <Text style={styles.actionText}>Approve</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  headerTitle: { fontSize: 24 },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.34)",
    alignItems: "center",
    justifyContent: "center",
  },
  content: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, gap: Spacing.md, paddingBottom: 110 },
  emptyCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    padding: Spacing.lg,
  },
  emptyText: { color: Colors.textSecondary, textAlign: "center" },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    padding: Spacing.md,
    gap: 4,
  },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  customer: { color: Colors.text, fontWeight: "700" },
  status: { fontWeight: "700", fontSize: 12 },
  status_PENDING: { color: Colors.warning },
  status_PENDING_VERIFICATION: { color: Colors.warning },
  status_VERIFIED: { color: Colors.success },
  status_APPROVED: { color: Colors.success },
  status_REJECTED: { color: Colors.error },
  status_CANCELLED: { color: Colors.textTertiary },
  status_SYNC_QUEUED: { color: Colors.textTertiary },
  amount: { color: Colors.text, fontSize: 20, fontWeight: "700", marginTop: 4 },
  meta: { color: Colors.textSecondary, fontSize: 12 },
  proofWrap: { gap: 6, marginTop: 6 },
  proofImage: { width: "100%", height: 110, borderRadius: 8, backgroundColor: Colors.surfaceDark },
  proofImageLarge: { width: "100%", height: 170, borderRadius: 10, backgroundColor: Colors.surfaceDark },
  warn: { color: Colors.warning, fontSize: 12 },
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.35)" },
  modalCard: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  modalTitle: { color: Colors.text, fontSize: 18, fontWeight: "700" },
  modalMeta: { color: Colors.textSecondary },
  modalAmount: { color: Colors.text, fontSize: 28, fontWeight: "700" },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surfaceDark,
    color: Colors.text,
  },
  modalActions: { flexDirection: "row", gap: Spacing.sm },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    alignItems: "center",
    paddingVertical: Spacing.md,
  },
  cancelBtnText: { color: Colors.textSecondary, fontWeight: "700" },
  rejectBtn: {
    flex: 1,
    backgroundColor: Colors.error,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  approveBtn: {
    flex: 1,
    backgroundColor: Colors.success,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  actionText: { color: Colors.white, fontWeight: "700" },
});
