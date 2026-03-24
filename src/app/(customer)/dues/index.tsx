import { MaterialIcons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import DateTimePickerModal from "react-native-modal-datetime-picker";

import { CustomerActionButton } from "@/src/components/customer/CustomerActionButton";
import {
  CustomerEmptyState,
  CustomerScreen,
  SectionHeader,
  StatPill,
  StatusChip,
} from "@/src/components/common/StitchScreen";
import { StitchHeaderActionButton } from "@/src/components/common/StitchHeader";
import { CustomerFilterChip } from "@/src/components/customer/CustomerFilterChip";
import { CustomerSurfaceCard } from "@/src/components/customer/CustomerSurfaceCard";
import BannerCardImage from "@/src/components/ui/BannerCardImage";
import { PaymentService } from "@/src/services/payment.service";
import { useAuthStore } from "@/src/stores/auth.store";
import { CustomerColors, Spacing } from "@/src/theme";
import type { DueSale } from "@/src/types/payment.types";

const formatMoney = (amount: number) => `₹${Math.round(amount).toLocaleString("en-IN")}`;

const formatDate = (value?: string) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatDateTimeLabel = (value?: string) => {
  if (!value) return "Select payment date and time";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const PAYMENT_MODES = [
  { id: "UPI", label: "UPI", icon: "qr-code" },
  { id: "ONLINE", label: "Online", icon: "language" },
  { id: "BANK_TRANSFER", label: "Bank", icon: "account-balance" },
  { id: "CASH", label: "Cash", icon: "payments" },
] as const;

type PaymentMode = (typeof PAYMENT_MODES)[number]["id"];
type DueFilter = "ALL" | "UNPAID" | "PENDING" | "PAID";

const getDueTone = (item: DueSale): "success" | "warning" | "info" => {
  const hasPendingVerification = item.transactions.some((tx) =>
    ["PENDING", "PENDING_VERIFICATION", "SYNC_QUEUED"].includes(String(tx.status || "").toUpperCase()),
  );
  if (item.dueAmount <= 0) return "success";
  if (hasPendingVerification) return "info";
  return "warning";
};

const getDueLabel = (item: DueSale) => {
  const hasPendingVerification = item.transactions.some((tx) =>
    ["PENDING", "PENDING_VERIFICATION", "SYNC_QUEUED"].includes(String(tx.status || "").toUpperCase()),
  );
  if (item.dueAmount <= 0) return "Paid";
  if (hasPendingVerification) return "Pending Verification";
  if (item.paidAmount > 0) return "Partially Paid";
  return "Unpaid";
};

interface PaymentModalProps {
  visible: boolean;
  selectedSale?: DueSale;
  onClose: () => void;
  onSubmit: () => void;
  amount: string;
  setAmount: (value: string) => void;
  mode: PaymentMode;
  setMode: (value: PaymentMode) => void;
  utrNumber: string;
  setUtrNumber: (value: string) => void;
  reference: string;
  setReference: (value: string) => void;
  paymentAt: string;
  setPaymentAt: (value: string) => void;
  screenshotFile: { uri: string; name: string; type?: string } | null;
  setScreenshotFile: (file: { uri: string; name: string; type?: string } | null) => void;
  onPickScreenshot: () => void;
  showDatePicker: boolean;
  setShowDatePicker: (show: boolean) => void;
  isSubmitting: boolean;
}

function PaymentModal(props: PaymentModalProps) {
  const {
    visible,
    selectedSale,
    onClose,
    onSubmit,
    amount,
    setAmount,
    mode,
    setMode,
    utrNumber,
    setUtrNumber,
    reference,
    setReference,
    paymentAt,
    setPaymentAt,
    screenshotFile,
    setScreenshotFile,
    onPickScreenshot,
    showDatePicker,
    setShowDatePicker,
    isSubmitting,
  } = props;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <BlurView intensity={24} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Submit payment</Text>
              <Text style={styles.modalSubtitle}>
                {selectedSale?.itemTitle || "Invoice"} • Due {formatMoney(selectedSale?.dueAmount || 0)}
              </Text>
            </View>
            <Pressable onPress={onClose} style={styles.modalCloseButton}>
              <MaterialIcons name="close" size={20} color={CustomerColors.textMuted} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalContent}>
            <View style={styles.inputBlock}>
              <Text style={styles.inputLabel}>Payment mode</Text>
              <View style={styles.modeGrid}>
                {PAYMENT_MODES.map((item) => {
                  const active = mode === item.id;
                  return (
                    <Pressable
                      key={item.id}
                      onPress={() => setMode(item.id)}
                      style={[styles.modeChip, active && styles.modeChipActive]}
                    >
                      <MaterialIcons
                        name={item.icon as any}
                        size={16}
                        color={active ? CustomerColors.white : CustomerColors.textMuted}
                      />
                      <Text style={[styles.modeChipText, active && styles.modeChipTextActive]}>
                        {item.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.inputBlock}>
              <Text style={styles.inputLabel}>Amount</Text>
              <TextInput
                value={amount}
                onChangeText={setAmount}
                placeholder="Enter amount"
                keyboardType="numeric"
                placeholderTextColor={CustomerColors.textMuted}
                style={styles.textInput}
              />
            </View>

            {mode !== "CASH" ? (
              <View style={styles.inputBlock}>
                <Text style={styles.inputLabel}>Transaction ID / UTR</Text>
                <TextInput
                  value={utrNumber}
                  onChangeText={setUtrNumber}
                  placeholder="Enter transaction ID"
                  placeholderTextColor={CustomerColors.textMuted}
                  style={styles.textInput}
                />
              </View>
            ) : null}

            <View style={styles.inputBlock}>
              <Text style={styles.inputLabel}>Payment time</Text>
              <Pressable onPress={() => setShowDatePicker(true)} style={styles.dateField}>
                <MaterialIcons name="calendar-today" size={16} color={CustomerColors.primary} />
                <Text style={paymentAt ? styles.dateValue : styles.datePlaceholder}>
                  {formatDateTimeLabel(paymentAt)}
                </Text>
              </Pressable>
            </View>

            <View style={styles.inputBlock}>
              <Text style={styles.inputLabel}>Payment screenshot</Text>
              {!screenshotFile ? (
                <Pressable onPress={onPickScreenshot} style={styles.uploadField}>
                  <MaterialIcons name="cloud-upload" size={24} color={CustomerColors.primary} />
                  <Text style={styles.uploadTitle}>Upload screenshot</Text>
                  <Text style={styles.uploadCaption}>Optional, but helps verification.</Text>
                </Pressable>
              ) : (
                <View style={styles.previewCard}>
                  <Image source={{ uri: screenshotFile.uri }} style={styles.previewImage} contentFit="cover" />
                  <View style={styles.previewMeta}>
                    <Text style={styles.previewName} numberOfLines={1}>
                      {screenshotFile.name}
                    </Text>
                    <Pressable onPress={() => setScreenshotFile(null)}>
                      <Text style={styles.previewRemove}>Remove</Text>
                    </Pressable>
                  </View>
                </View>
              )}
            </View>

            <View style={styles.inputBlock}>
              <Text style={styles.inputLabel}>Reference note</Text>
              <TextInput
                value={reference}
                onChangeText={setReference}
                placeholder="Add any note for the nursery"
                placeholderTextColor={CustomerColors.textMuted}
                style={[styles.textInput, styles.noteInput]}
                multiline
              />
            </View>
          </ScrollView>

          <View style={styles.modalActions}>
            <CustomerActionButton label="Cancel" variant="secondary" onPress={onClose} style={styles.flexButton} />
            <CustomerActionButton
              label={isSubmitting ? "Submitting..." : "Submit"}
              onPress={onSubmit}
              style={styles.flexButton}
            />
          </View>
        </View>
      </View>

      <DateTimePickerModal
        isVisible={showDatePicker}
        mode="datetime"
        date={paymentAt ? new Date(paymentAt) : new Date()}
        onCancel={() => setShowDatePicker(false)}
        onConfirm={(date) => {
          setPaymentAt(date.toISOString());
          setShowDatePicker(false);
        }}
      />
    </Modal>
  );
}

export default function CustomerDuesScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [activeFilter, setActiveFilter] = useState<DueFilter>("ALL");
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState<PaymentMode>("UPI");
  const [utrNumber, setUtrNumber] = useState("");
  const [paymentAt, setPaymentAt] = useState("");
  const [reference, setReference] = useState("");
  const [screenshotFile, setScreenshotFile] = useState<{ uri: string; name: string; type?: string } | null>(null);
  const [showPaymentAtPicker, setShowPaymentAtPicker] = useState(false);

  const { data, refetch, isRefetching, isLoading } = useQuery({
    queryKey: ["customer-dues", user?.id, user?.phoneNumber],
    queryFn: () =>
      PaymentService.getDueSalesForUser({
        id: user?.id,
        phoneNumber: user?.phoneNumber,
        role: user?.role,
        nurseryId: user?.nurseryId,
      }),
  });

  const { data: rejectedPayments } = useQuery({
    queryKey: ["payment-proofs", "rejected"],
    queryFn: () => PaymentService.listPaymentProofs("REJECTED"),
  });

  const dues = useMemo(() => (Array.isArray(data) ? data : []), [data]);
  const selectedSale = useMemo(() => dues.find((item) => item.saleId === selectedSaleId), [dues, selectedSaleId]);
  const rejectedCount = Array.isArray(rejectedPayments) ? rejectedPayments.length : 0;

  const filteredDues = useMemo(() => {
    const rows = [...dues].sort((a, b) => String(b.issuedAt || "").localeCompare(String(a.issuedAt || "")));
    return rows.filter((item) => {
      const hasPendingVerification = item.transactions.some((tx) =>
        ["PENDING", "PENDING_VERIFICATION", "SYNC_QUEUED"].includes(String(tx.status || "").toUpperCase()),
      );
      if (activeFilter === "UNPAID") return item.dueAmount > 0 && item.paidAmount <= 0 && !hasPendingVerification;
      if (activeFilter === "PENDING") return hasPendingVerification;
      if (activeFilter === "PAID") return item.dueAmount <= 0;
      return true;
    });
  }, [activeFilter, dues]);

  const totalDue = dues.reduce((sum, item) => sum + item.dueAmount, 0);
  const totalPaid = dues.reduce((sum, item) => sum + item.paidAmount, 0);
  const pendingVerificationCount = dues.filter((item) =>
    item.transactions.some((tx) =>
      ["PENDING", "PENDING_VERIFICATION", "SYNC_QUEUED"].includes(String(tx.status || "").toUpperCase()),
    ),
  ).length;

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSale) throw new Error("Please select an invoice first.");
      const numericAmount = Number(amount);

      if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
        throw new Error("Please enter a valid payment amount.");
      }
      if (numericAmount > selectedSale.dueAmount) {
        throw new Error("Payment amount cannot exceed the balance due.");
      }
      if (mode !== "CASH" && !utrNumber.trim()) {
        throw new Error("Transaction ID is required for online payments.");
      }

      return PaymentService.submitPaymentProof({
        saleId: selectedSale.saleId,
        customerName: selectedSale.customerName,
        customerPhone: selectedSale.customerPhone,
        amount: numericAmount,
        mode,
        utrNumber: utrNumber.trim() || undefined,
        paymentAt: paymentAt.trim() || undefined,
        screenshotUri: screenshotFile?.uri || undefined,
        screenshotFile: screenshotFile || undefined,
        reference: reference.trim() || undefined,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["customer-dues"] });
      setSelectedSaleId(null);
      setAmount("");
      setMode("UPI");
      setUtrNumber("");
      setPaymentAt("");
      setReference("");
      setScreenshotFile(null);
      Alert.alert("Submitted", "Your payment proof was submitted for verification.");
    },
    onError: (err: any) => {
      Alert.alert("Unable to submit", err?.message || "Please try again.");
    },
  });

  const pickScreenshot = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission required", "Photo access is required to upload a payment screenshot.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.85,
    });
    if (result.canceled || !result.assets?.length) return;
    const asset = result.assets[0];
    setScreenshotFile({
      uri: asset.uri,
      name: asset.fileName || `payment_${Date.now()}.jpg`,
      type: asset.mimeType || "image/jpeg",
    });
  };

  const headerActions = (
    <View style={styles.headerActions}>
      {rejectedCount > 0 ? (
        <View style={styles.rejectedShortcut}>
          <StitchHeaderActionButton
            iconName="error-outline"
            onPress={() => router.push("/(customer)/rejected-payments")}
          />
          <Text style={styles.rejectedCount}>{rejectedCount}</Text>
        </View>
      ) : null}
      <StitchHeaderActionButton
        iconName={isRefetching ? "sync" : "refresh"}
        onPress={() => refetch()}
      />
    </View>
  );

  return (
    <CustomerScreen
      title="Payments"
      subtitle="Track dues, submitted proofs, and invoice status."
      actions={headerActions}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={refetch}
          colors={[CustomerColors.primary]}
          tintColor={CustomerColors.primary}
        />
      }
    >
      <View style={styles.summaryGrid}>
        <StatPill label="Outstanding" value={formatMoney(totalDue)} />
        <StatPill label="Paid" value={formatMoney(totalPaid)} />
        <StatPill label="Pending" value={String(pendingVerificationCount)} />
      </View>

      {rejectedCount > 0 ? (
        <CustomerSurfaceCard style={styles.rejectedCard}>
          <View style={styles.rejectedInfo}>
            <View style={styles.rejectedIconWrap}>
              <MaterialIcons name="error" size={18} color={CustomerColors.danger} />
            </View>
            <View style={styles.rejectedTextWrap}>
              <Text style={styles.rejectedTitle}>Rejected payments</Text>
              <Text style={styles.rejectedSubtitle}>Review failed verifications and re-submit proof if needed.</Text>
            </View>
          </View>
          <CustomerActionButton
            label="Open"
            variant="secondary"
            onPress={() => router.push("/(customer)/rejected-payments")}
          />
        </CustomerSurfaceCard>
      ) : null}

      <CustomerSurfaceCard style={styles.filterCard}>
        <SectionHeader title="Invoices" subtitle="Filter your list by due state or verification stage." />
        <View style={styles.filterRow}>
          {(["ALL", "UNPAID", "PENDING", "PAID"] as DueFilter[]).map((filter) => {
            return (
              <CustomerFilterChip
                key={filter}
                label={filter === "ALL" ? "All" : filter.charAt(0) + filter.slice(1).toLowerCase()}
                active={filter === activeFilter}
                onPress={() => setActiveFilter(filter)}
              />
            );
          })}
        </View>
      </CustomerSurfaceCard>

      {isLoading ? (
        <CustomerSurfaceCard style={styles.loadingCard}>
          <Text style={styles.loadingText}>Loading payment records...</Text>
        </CustomerSurfaceCard>
      ) : null}

      {!isLoading && filteredDues.length === 0 ? (
        <CustomerEmptyState
          title={dues.length === 0 ? "No payments due" : "No invoices in this filter"}
          message={
            dues.length === 0
              ? "You do not have any due or past invoices at the moment."
              : "Try another filter to review the rest of your invoices."
          }
          icon={<MaterialIcons name="receipt-long" size={44} color={CustomerColors.textMuted} />}
        />
      ) : null}

      {!isLoading
        ? filteredDues.map((item) => {
            const recentPending = item.transactions.find((tx) =>
              ["PENDING", "PENDING_VERIFICATION", "SYNC_QUEUED"].includes(String(tx.status || "").toUpperCase()),
            );
            // console.log(item);
            
            return (
              <CustomerSurfaceCard key={item.saleId} style={styles.dueCard}>
                <View style={styles.dueTopRow}>
                  <View style={styles.dueIdentity}>
                    <BannerCardImage
                      uri={item.imageUri}
                      iconName="receipt-long"
                      minHeight={60}
                      containerStyle={styles.dueImage}
                    />
                    <View style={styles.dueTextWrap}>
                      <Text style={styles.dueTitle}>{item.itemTitle || "Nursery invoice"}</Text>
                      <Text style={styles.dueSubtitle}>
                        {formatDate(item.issuedAt)}
                        {item.itemSubtitle ? ` • ${item.itemSubtitle}` : ""}
                      </Text>
                    </View>
                  </View>
                  <StatusChip label={getDueLabel(item)} tone={getDueTone(item)} />
                </View>

                <View style={styles.amountBlocks}>
                  <View style={styles.amountTile}>
                    <Text style={styles.amountTileLabel}>Total</Text>
                    <Text style={styles.amountTileValue}>{formatMoney(item.totalAmount)}</Text>
                  </View>
                  <View style={styles.amountTile}>
                    <Text style={styles.amountTileLabel}>Paid</Text>
                    <Text style={[styles.amountTileValue, styles.successText]}>{formatMoney(item.paidAmount)}</Text>
                  </View>
                  <View style={styles.amountTile}>
                    <Text style={styles.amountTileLabel}>Balance</Text>
                    <Text style={[styles.amountTileValue, item.dueAmount > 0 && styles.errorText]}>
                      {formatMoney(item.dueAmount)}
                    </Text>
                  </View>
                </View>

                {recentPending ? (
                  <View style={styles.infoStrip}>
                    <MaterialIcons name="hourglass-empty" size={16} color={CustomerColors.info} />
                    <Text style={styles.infoStripText}>Payment proof submitted and waiting for verification.</Text>
                  </View>
                ) : null}

                <View style={styles.dueActions}>
                  <CustomerActionButton
                    label="View Details"
                    variant="secondary"
                    onPress={() => router.push(`/(customer)/dues/${item.saleId}` as any)}
                    style={styles.flexButton}
                  />
                  {item.dueAmount > 0 ? (
                    <CustomerActionButton
                      label="Pay"
                      onPress={() => {
                        setSelectedSaleId(item.saleId);
                        setAmount(String(Math.round(item.dueAmount)));
                      }}
                      style={styles.flexButton}
                    />
                  ) : null}
                </View>
              </CustomerSurfaceCard>
            );
          })
        : null}

      <PaymentModal
        visible={Boolean(selectedSale)}
        selectedSale={selectedSale}
        onClose={() => setSelectedSaleId(null)}
        onSubmit={() => submitMutation.mutate()}
        amount={amount}
        setAmount={setAmount}
        mode={mode}
        setMode={setMode}
        utrNumber={utrNumber}
        setUtrNumber={setUtrNumber}
        reference={reference}
        setReference={setReference}
        paymentAt={paymentAt}
        setPaymentAt={setPaymentAt}
        screenshotFile={screenshotFile}
        setScreenshotFile={setScreenshotFile}
        onPickScreenshot={pickScreenshot}
        showDatePicker={showPaymentAtPicker}
        setShowDatePicker={setShowPaymentAtPicker}
        isSubmitting={submitMutation.isPending}
      />
    </CustomerScreen>
  );
}

const styles = StyleSheet.create({
  headerActions: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  rejectedShortcut: {
    position: "relative",
  },
  rejectedCount: {
    position: "absolute",
    top: -2,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: CustomerColors.white,
    textAlign: "center",
    color: CustomerColors.danger,
    fontSize: 10,
    fontWeight: "800",
    lineHeight: 16,
  },
  summaryGrid: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  rejectedCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  rejectedInfo: {
    flex: 1,
    flexDirection: "row",
    gap: Spacing.sm,
  },
  rejectedIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(239,68,68,0.12)",
  },
  rejectedTextWrap: {
    flex: 1,
    gap: 2,
  },
  rejectedTitle: {
    fontWeight: "700",
    color: CustomerColors.text,
  },
  rejectedSubtitle: {
    color: CustomerColors.textMuted,
    fontSize: 12,
  },
  filterCard: {
    gap: Spacing.md,
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  loadingCard: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
  },
  loadingText: {
    color: CustomerColors.textMuted,
  },
  dueCard: {
    gap: Spacing.md,
  },
  dueTopRow: {
    
    flexDirection: "row",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  dueIdentity: {
    
    flex: 1,
    flexDirection: "row",
    gap: Spacing.sm,
  },
  dueImage: {
    width: 72,
    minHeight: 72,
    borderRadius: 16,
  },
  dueTextWrap: {
    
    flex: 1,
    gap: 4,
  },
  dueTitle: {
    
    fontSize: 18,
    fontWeight: "800",
    color: CustomerColors.text,
  },
  dueSubtitle: {
    
    fontSize: 13,
    color: CustomerColors.textMuted,
    lineHeight: 20,
  },
  amountBlocks: {
    marginVertical: Spacing.sm,
    flexDirection: "row",
    gap: Spacing.sm,
  },
  amountTile: {
    flex: 1,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: CustomerColors.white,
    gap: 4,
    borderWidth: 1,
    borderColor: CustomerColors.border,
  },
  amountTileLabel: {
    fontSize: 11,
    color: CustomerColors.textMuted,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  amountTileValue: {
    fontSize: 16,
    fontWeight: "800",
    color: CustomerColors.text,
  },
  successText: {
    color: CustomerColors.success,
  },
  errorText: {
    color: CustomerColors.danger,
  },
  infoStrip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 16,
    backgroundColor: "rgba(14,165,233,0.12)",
  },
  infoStripText: {
    flex: 1,
    color: CustomerColors.info,
    fontSize: 12,
  },
  dueActions: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: 2,
  },
  flexButton: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: CustomerColors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
    maxHeight: "88%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: CustomerColors.text,
  },
  modalSubtitle: {
    marginTop: 4,
    color: CustomerColors.textMuted,
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(15,189,73,0.08)",
    borderWidth: 1,
    borderColor: CustomerColors.borderStrong,
  },
  modalContent: {
    gap: Spacing.md,
    paddingBottom: Spacing.md,
  },
  inputBlock: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: CustomerColors.text,
  },
  modeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  modeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: CustomerColors.border,
    borderWidth: 1,
    borderColor: CustomerColors.borderStrong,
  },
  modeChipActive: {
    backgroundColor: CustomerColors.primary,
    borderColor: CustomerColors.primary,
  },
  modeChipText: {
    color: CustomerColors.textMuted,
    fontWeight: "700",
  },
  modeChipTextActive: {
    color: CustomerColors.white,
  },
  textInput: {
    minHeight: 52,
    borderRadius: 16,
    paddingHorizontal: Spacing.md,
    backgroundColor: "rgba(15,189,73,0.05)",
    borderWidth: 1,
    borderColor: CustomerColors.borderStrong,
    color: CustomerColors.text,
  },
  noteInput: {
    minHeight: 92,
    paddingTop: Spacing.md,
    textAlignVertical: "top",
  },
  dateField: {
    minHeight: 52,
    borderRadius: 16,
    paddingHorizontal: Spacing.md,
    backgroundColor: "rgba(15,189,73,0.05)",
    borderWidth: 1,
    borderColor: CustomerColors.borderStrong,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dateValue: {
    color: CustomerColors.text,
  },
  datePlaceholder: {
    color: CustomerColors.textMuted,
  },
  uploadField: {
    minHeight: 132,
    borderRadius: 18,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: CustomerColors.borderStrong,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(15,189,73,0.04)",
    gap: 4,
  },
  uploadTitle: {
    fontWeight: "700",
    color: CustomerColors.text,
  },
  uploadCaption: {
    color: CustomerColors.textMuted,
    fontSize: 12,
  },
  previewCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: 18,
    backgroundColor: "rgba(15,189,73,0.05)",
    borderWidth: 1,
    borderColor: CustomerColors.borderStrong,
  },
  previewImage: {
    width: 72,
    height: 72,
    borderRadius: 14,
  },
  previewMeta: {
    flex: 1,
    gap: 6,
  },
  previewName: {
    fontWeight: "700",
    color: CustomerColors.text,
  },
  previewRemove: {
    color: CustomerColors.danger,
    fontWeight: "700",
  },
  modalActions: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
});
