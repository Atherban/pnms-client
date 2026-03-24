import { MaterialIcons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import Animated, {
    FadeInDown,
    FadeInUp,
    SlideInRight,
} from "react-native-reanimated";

import { PaymentService } from "@/src/services/payment.service";
import type { PaymentProof } from "@/src/types/payment.types";
import StitchHeader from "../common/StitchHeader";
import StitchStatusBadge from "../common/StitchStatusBadge";
import { AdminTheme } from "../admin/theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const PAYMENT_MODES = [
  { id: "UPI", label: "UPI", icon: "qr-code", color: AdminTheme.colors.primary },
  { id: "ONLINE", label: "Online", icon: "language", color: "#8B5CF6" },
  {
    id: "BANK_TRANSFER",
    label: "Bank Transfer",
    icon: "account-balance",
    color: "#059669",
  },
  { id: "CASH", label: "Cash", icon: "payments", color: "#D97706" },
] as const;

type PaymentMode = (typeof PAYMENT_MODES)[number]["id"];

const formatMoney = (amount: number) =>
  `₹${Math.round(amount).toLocaleString("en-IN")}`;

const formatDateTime = (dateString?: string) => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const formatDateTimeLabel = (value?: string) => {
  if (!value) return "Select payment date & time";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (parsed.toDateString() === today.toDateString()) {
    return `Today, ${parsed.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })}`;
  } else if (parsed.toDateString() === yesterday.toDateString()) {
    return `Yesterday, ${parsed.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })}`;
  }

  return parsed.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

// ==================== IMAGE ZOOM MODAL ====================

interface ImageZoomModalProps {
  visible: boolean;
  imageUri?: string;
  onClose: () => void;
}

const ImageZoomModal = ({
  visible,
  imageUri,
  onClose,
}: ImageZoomModalProps) => {
  if (!imageUri) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.zoomOverlay}>
        <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
        <Pressable style={styles.zoomClose} onPress={onClose}>
          <MaterialIcons name="close" size={28} color={AdminTheme.colors.surface} />
        </Pressable>
        <Image
          source={{ uri: imageUri }}
          style={styles.zoomImage}
          contentFit="contain"
        />
      </View>
    </Modal>
  );
};

// ==================== RESUBMIT MODAL ====================

interface ResubmitModalProps {
  visible: boolean;
  payment: PaymentProof;
  onClose: () => void;
  isSubmitting: boolean;
  onSubmit: () => void;
  amount: string;
  setAmount: (value: string) => void;
  mode: PaymentMode;
  setMode: (mode: PaymentMode) => void;
  utrNumber: string;
  setUtrNumber: (value: string) => void;
  reference: string;
  setReference: (value: string) => void;
  paymentAt: string;
  setPaymentAt: (value: string) => void;
  screenshotFile: any;
  setScreenshotFile: (file: any) => void;
  onPickScreenshot: () => void;
  showDatePicker: boolean;
  setShowDatePicker: (show: boolean) => void;
}

const ResubmitModal = ({
  visible,
  payment,
  onClose,
  isSubmitting,
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
}: ResubmitModalProps) => {
  const dueAmount = payment?.amount || 0;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />

        <Animated.View
          entering={SlideInRight.springify().damping(45)}
          style={styles.modalContent}
        >
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Resubmit Payment</Text>
              <Text style={styles.modalSubtitle}>
                {payment?.customerName || "Unknown Customer"}
              </Text>
            </View>
            <Pressable onPress={onClose} style={styles.modalClose}>
              <MaterialIcons
                name="close"
                size={20}
                color={AdminTheme.colors.textMuted}
              />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.modalBody}
          >
            {/* Due Amount Highlight */}
            <View style={styles.dueHighlight}>
              <Text style={styles.dueHighlightLabel}>Amount to Submit</Text>
              <Text style={styles.dueHighlightAmount}>
                {formatMoney(dueAmount)}
              </Text>
            </View>

            {/* Payment Method Selection */}
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>
                How would you like to pay?
              </Text>
              <View style={styles.modeGrid}>
                {PAYMENT_MODES.map((item) => {
                  const isActive = mode === item.id;
                  return (
                    <Pressable
                      key={item.id}
                      onPress={() => setMode(item.id)}
                      style={[
                        styles.modeOption,
                        isActive && styles.modeOptionActive,
                        isActive && { borderColor: item.color },
                      ]}
                    >
                      <View
                        style={[
                          styles.modeIcon,
                          {
                            backgroundColor: isActive
                              ? item.color + "10"
                              : "#F3F4F6",
                          },
                        ]}
                      >
                        <MaterialIcons
                          name={item.icon as any}
                          size={18}
                          color={isActive ? item.color : AdminTheme.colors.textMuted}
                        />
                      </View>
                      <Text
                        style={[
                          styles.modeLabel,
                          isActive && { color: item.color, fontWeight: "600" },
                        ]}
                      >
                        {item.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Payment Amount */}
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Payment Amount</Text>
              <View style={styles.amountInputContainer}>
                <Text style={styles.amountCurrency}>₹</Text>
                <TextInput
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="Enter amount"
                  keyboardType="numeric"
                  style={styles.amountInput}
                  placeholderTextColor={AdminTheme.colors.textSoft}
                />
              </View>
              {amount && Number(amount) > dueAmount && (
                <Text style={styles.validationErrorText}>
                  Amount cannot exceed {formatMoney(dueAmount)}
                </Text>
              )}
            </View>

            {/* Transaction ID */}
            {mode !== "CASH" && (
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>
                  Transaction ID / UTR{" "}
                  <Text style={styles.requiredStar}>*</Text>
                </Text>
                <TextInput
                  value={utrNumber}
                  onChangeText={setUtrNumber}
                  placeholder="Enter transaction ID from your payment app"
                  style={styles.modalInput}
                  placeholderTextColor={AdminTheme.colors.textSoft}
                  autoCapitalize="characters"
                />
              </View>
            )}

            {/* Payment Date */}
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>When did you pay?</Text>
              <Pressable
                onPress={() => setShowDatePicker(true)}
                style={styles.datePickerButton}
              >
                <MaterialIcons
                  name="calendar-today"
                  size={18}
                  color={AdminTheme.colors.primary}
                />
                <Text
                  style={
                    paymentAt
                      ? styles.datePickerText
                      : styles.datePickerPlaceholder
                  }
                >
                  {formatDateTimeLabel(paymentAt)}
                </Text>
              </Pressable>
            </View>

            {/* Payment Screenshot */}
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>
                Payment Screenshot (Optional)
              </Text>
              <Text style={styles.helperText}>
                Upload a screenshot to help us verify faster
              </Text>

              {!screenshotFile ? (
                <Pressable
                  onPress={onPickScreenshot}
                  style={styles.uploadButton}
                >
                  <MaterialIcons
                    name="add-photo-alternate"
                    size={24}
                    color={AdminTheme.colors.primary}
                  />
                  <Text style={styles.uploadButtonText}>Choose Screenshot</Text>
                </Pressable>
              ) : (
                <View style={styles.previewContainer}>
                  <Image
                    source={{ uri: screenshotFile.uri }}
                    style={styles.previewImage}
                    contentFit="cover"
                    transition={200}
                  />
                  <View style={styles.previewOverlay}>
                    <Text style={styles.previewName} numberOfLines={1}>
                      {screenshotFile.name}
                    </Text>
                    <Pressable
                      onPress={() => setScreenshotFile(null)}
                      style={styles.previewRemove}
                    >
                      <MaterialIcons
                        name="close"
                        size={16}
                        color={AdminTheme.colors.surface}
                      />
                    </Pressable>
                  </View>
                </View>
              )}
            </View>

            {/* Additional Notes */}
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>
                Additional Notes (Optional)
              </Text>
              <TextInput
                value={reference}
                onChangeText={setReference}
                placeholder="Any additional information"
                style={[styles.modalInput, styles.textArea]}
                placeholderTextColor={AdminTheme.colors.textSoft}
                multiline
                numberOfLines={3}
              />
            </View>
          </ScrollView>

          {/* Modal Footer */}
          <View style={styles.modalFooter}>
            <Pressable onPress={onClose} style={styles.modalCancelButton}>
              <Text style={styles.modalCancelButtonText}>Cancel</Text>
            </Pressable>

            <Pressable
              onPress={onSubmit}
              disabled={isSubmitting}
              style={[
                styles.modalSubmitButton,
                isSubmitting && styles.modalSubmitButtonDisabled,
              ]}
            >
              <View
                style={[
                  styles.modalSubmitGradient,
                  { backgroundColor: AdminTheme.colors.primary },
                ]}
              >
                {isSubmitting ? (
                  <>
                    <MaterialIcons name="sync" size={18} color={AdminTheme.colors.surface} />
                    <Text style={styles.modalSubmitButtonText}>
                      Submitting...
                    </Text>
                  </>
                ) : (
                  <>
                    <MaterialIcons
                      name="check-circle"
                      size={18}
                      color={AdminTheme.colors.surface}
                    />
                    <Text style={styles.modalSubmitButtonText}>
                      Submit Payment
                    </Text>
                  </>
                )}
              </View>
            </Pressable>
          </View>
        </Animated.View>
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
};

// ==================== MAIN DETAIL SCREEN ====================

interface RejectedPaymentDetailScreenProps {
  id: string;
}

export default function RejectedPaymentDetailScreen({
  id,
}: RejectedPaymentDetailScreenProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showImageZoom, setShowImageZoom] = useState(false);
  const [showResubmitModal, setShowResubmitModal] = useState(false);
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState<PaymentMode>("UPI");
  const [utrNumber, setUtrNumber] = useState("");
  const [paymentAt, setPaymentAt] = useState("");
  const [reference, setReference] = useState("");
  const [screenshotFile, setScreenshotFile] = useState<{
    uri: string;
    name: string;
    type?: string;
  } | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const {
    data: allPayments,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["payment-proofs", "rejected"],
    queryFn: () => PaymentService.listPaymentProofs("REJECTED"),
  });

  const payment = useMemo(() => {
    return (allPayments || []).find((p: any) => p.id === id);
  }, [allPayments, id]);

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!payment) throw new Error("Payment not found");
      const numericAmount = Number(amount);

      if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
        throw new Error("Please enter a valid amount");
      }
      if (numericAmount > (payment.amount || 0)) {
        throw new Error("Amount cannot exceed original payment amount");
      }
      if (mode !== "CASH" && !utrNumber.trim()) {
        throw new Error("Transaction ID is required");
      }

      return PaymentService.submitPaymentProof({
        saleId: payment.saleId,
        customerName: payment.customerName,
        customerPhone: payment.customerPhone,
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
      await queryClient.invalidateQueries({
        queryKey: ["payment-proofs", "rejected"],
      });
      await queryClient.invalidateQueries({
        queryKey: ["customer-dues"],
      });
      setShowResubmitModal(false);
      setAmount("");
      setMode("UPI");
      setUtrNumber("");
      setPaymentAt("");
      setReference("");
      setScreenshotFile(null);
      Alert.alert(
        "✅ Resubmitted!",
        "Your payment has been resubmitted for verification. We'll notify you once reviewed.",
      );
      router.back();
    },
    onError: (err: any) => {
      Alert.alert(
        "Unable to Resubmit",
        err?.message || "Please check your information and try again",
      );
    },
  });

  const pickScreenshot = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Permission Required",
        "We need access to your photos to upload a payment screenshot.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.85,
    });
    if (result.canceled || !result.assets?.length) return;
    const asset = result.assets[0];
    const name = asset.fileName || `payment_${Date.now()}.jpg`;

    setScreenshotFile({
      uri: asset.uri,
      name,
      type: asset.mimeType || "image/jpeg",
    });
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={AdminTheme.colors.primary} />
          <Text style={styles.loadingText}>Loading payment details...</Text>
        </View>
      </View>
    );
  }

  if (error || !payment) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={48} color={AdminTheme.colors.danger} />
          <Text style={styles.errorText}>Unable to load payment details</Text>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Animated.View entering={FadeInDown.springify().damping(35)}>
        <StitchHeader
          title="Payment Details"
          subtitle="Rejected payment proof"
          variant="gradient"
          showBackButton
          onBackPress={() => router.back()}
          actions={<StitchStatusBadge label="Rejected" tone="danger" />}
        />
      </Animated.View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* Section 1: Payment Info */}
        <Animated.View
          entering={FadeInUp.delay(100).springify().damping(35)}
          style={styles.section}
        >
          <View style={styles.sectionCard}>
            <Text style={styles.amountValue}>
              {formatMoney(payment.amount)}
            </Text>
            <Text style={styles.amountLabel}>Payment Amount</Text>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Customer</Text>
              <Text style={styles.infoValue}>{payment.customerName}</Text>
            </View>

            {payment.customerPhone && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Phone</Text>
                <Text style={styles.infoValue}>{payment.customerPhone}</Text>
              </View>
            )}

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Mode</Text>
              <Text style={styles.infoValue}>
                {payment.mode?.replace("_", " ") || "N/A"}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Paid On</Text>
              <Text style={styles.infoValue}>
                {formatDateTime(payment.paymentAt || payment.submittedAt)}
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Section 2: Rejection Reason (RED HIGHLIGHTED) */}
        <Animated.View
          entering={FadeInUp.delay(200).springify().damping(35)}
          style={styles.section}
        >
          <View style={styles.rejectionCard}>
            <View style={styles.rejectionHeader}>
              <MaterialIcons name="warning" size={20} color={AdminTheme.colors.danger} />
              <Text style={styles.rejectionTitle}>Rejection Reason</Text>
            </View>

            <Text style={styles.rejectionReasonText}>
              {payment.rejectionReason || "No reason provided"}
            </Text>

            <View style={styles.rejectionDivider} />

            <View style={styles.rejectionMeta}>
              <View style={styles.rejectionMetaRow}>
                <Text style={styles.rejectionMetaLabel}>Reviewed By</Text>
                <Text style={styles.rejectionMetaValue}>
                  {payment.reviewerName || "Admin"}
                </Text>
              </View>
              <View style={styles.rejectionMetaRow}>
                <Text style={styles.rejectionMetaLabel}>On</Text>
                <Text style={styles.rejectionMetaValue}>
                  {formatDateTime(payment.reviewedAt)}
                </Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Section 3: Payment Evidence */}
        <Animated.View
          entering={FadeInUp.delay(300).springify().damping(35)}
          style={styles.section}
        >
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Payment Evidence</Text>

            {payment.screenshotUri && (
              <Pressable
                onPress={() => setShowImageZoom(true)}
                style={styles.screenshotContainer}
              >
                <Image
                  source={{ uri: payment.screenshotUri }}
                  style={styles.screenshot}
                  contentFit="cover"
                  transition={200}
                />
                <View style={styles.screenshotOverlay}>
                  <MaterialIcons
                    name="zoom-in"
                    size={32}
                    color={AdminTheme.colors.surface}
                  />
                  <Text style={styles.screenshotText}>Tap to Zoom</Text>
                </View>
              </Pressable>
            )}

            <View style={styles.transactionDetails}>
              <Text style={styles.detailsTitle}>Transaction Details</Text>

              {payment.utrNumber && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>UTR / Reference</Text>
                  <Text style={[styles.detailValue, styles.monospace]}>
                    {payment.utrNumber}
                  </Text>
                </View>
              )}

              {payment.reference && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Notes</Text>
                  <Text style={styles.detailValue}>{payment.reference}</Text>
                </View>
              )}

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Submitted</Text>
                <Text style={styles.detailValue}>
                  {formatDateTime(payment.submittedAt)}
                </Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Section 4: Resubmit Action */}
        <Animated.View
          entering={FadeInUp.delay(400).springify().damping(35)}
          style={styles.section}
        >
          <View style={styles.actionCard}>
            <View style={styles.actionHeader}>
              <MaterialIcons name="refresh" size={24} color={AdminTheme.colors.primary} />
              <View style={styles.actionTitleContainer}>
                <Text style={styles.actionTitle}>Resubmit Payment</Text>
                <Text style={styles.actionSubtitle}>
                  You can resubmit with updated details
                </Text>
              </View>
            </View>

            <Pressable
              onPress={() => {
                setAmount(String(payment.amount));
                setMode((payment.mode as PaymentMode) || "UPI");
                setShowResubmitModal(true);
              }}
              style={({ pressed }) => [
                styles.resubmitButton,
                pressed && styles.buttonPressed,
              ]}
            >
              <View
                style={[
                  styles.resubmitButtonGradient,
                  { backgroundColor: AdminTheme.colors.primary },
                ]}
              >
                <MaterialIcons name="send" size={18} color={AdminTheme.colors.surface} />
                <Text style={styles.resubmitButtonText}>Resubmit Payment</Text>
              </View>
            </Pressable>
          </View>
        </Animated.View>
      </ScrollView>

      {/* Image Zoom Modal */}
      <ImageZoomModal
        visible={showImageZoom}
        imageUri={payment.screenshotUri}
        onClose={() => setShowImageZoom(false)}
      />

      {/* Resubmit Modal */}
      <ResubmitModal
        visible={showResubmitModal}
        payment={payment}
        onClose={() => setShowResubmitModal(false)}
        isSubmitting={submitMutation.isPending}
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
        showDatePicker={showDatePicker}
        setShowDatePicker={setShowDatePicker}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },

  // Header
  header: {
    overflow: "hidden",
  },
  headerBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: AdminTheme.spacing.sm,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
    alignSelf: "flex-start",
  },
  headerBadgeText: {
    fontSize: 11,
    fontWeight: "600",
  },

  // Content
  content: {
    paddingHorizontal: AdminTheme.spacing.lg,
    paddingVertical: AdminTheme.spacing.lg,
    paddingBottom: 100,
    gap: AdminTheme.spacing.md,
  },

  // Section
  section: {
    marginBottom: AdminTheme.spacing.sm,
  },
  sectionCard: {
    backgroundColor: AdminTheme.colors.surface,
    borderRadius: 16,
    padding: AdminTheme.spacing.lg,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: AdminTheme.colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },

  // Amount
  amountValue: {
    fontSize: 32,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  amountLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: AdminTheme.spacing.md,
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: AdminTheme.spacing.md,
  },

  // Info Row
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: AdminTheme.spacing.sm,
  },
  infoLabel: {
    fontSize: 13,
    color: "#6B7280",
    flex: 1,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: "500",
    color: "#111827",
    textAlign: "right",
    flex: 1,
  },
  monospace: {
    fontFamily: "monospace",
    fontSize: 11,
  },

  // Rejection Card (RED)
  rejectionCard: {
    backgroundColor: "#FEF2F2",
    borderRadius: 16,
    padding: AdminTheme.spacing.lg,
    borderWidth: 1,
    borderColor: "#FEE2E2",
  },
  rejectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: AdminTheme.spacing.sm,
    marginBottom: AdminTheme.spacing.md,
  },
  rejectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: AdminTheme.colors.danger,
  },
  rejectionReasonText: {
    fontSize: 15,
    color: "#5F2828",
    fontWeight: "500",
    lineHeight: 20,
    marginBottom: AdminTheme.spacing.md,
  },
  rejectionDivider: {
    height: 1,
    backgroundColor: "#FEE2E2",
    marginVertical: AdminTheme.spacing.md,
  },
  rejectionMeta: {
    gap: AdminTheme.spacing.sm,
  },
  rejectionMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  rejectionMetaLabel: {
    fontSize: 12,
    color: "#6B7280",
  },
  rejectionMetaValue: {
    fontSize: 12,
    fontWeight: "500",
    color: "#111827",
  },

  // Screenshot
  screenshotContainer: {
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: AdminTheme.spacing.md,
  },
  screenshot: {
    width: "100%",
    height: 200,
    backgroundColor: "#F3F4F6",
  },
  screenshotOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.3)",
    alignItems: "center",
    justifyContent: "center",
    gap: AdminTheme.spacing.sm,
  },
  screenshotText: {
    fontSize: 12,
    color: AdminTheme.colors.surface,
    fontWeight: "600",
  },

  // Transaction Details
  transactionDetails: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: AdminTheme.spacing.md,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  detailsTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    marginBottom: AdminTheme.spacing.sm,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: AdminTheme.spacing.xs,
  },
  detailLabel: {
    fontSize: 12,
    color: "#6B7280",
  },
  detailValue: {
    fontSize: 12,
    fontWeight: "500",
    color: "#111827",
    textAlign: "right",
    flex: 1,
    marginLeft: AdminTheme.spacing.md,
  },

  // Action Card
  actionCard: {
    backgroundColor: "#F0F7FF",
    borderRadius: 16,
    padding: AdminTheme.spacing.lg,
    borderWidth: 1,
    borderColor: "#DBEAFE",
  },
  actionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: AdminTheme.spacing.md,
    marginBottom: AdminTheme.spacing.lg,
  },
  actionTitleContainer: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  actionSubtitle: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  resubmitButton: {
    borderRadius: 12,
    overflow: "hidden",
  },
  resubmitButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: AdminTheme.spacing.md,
    gap: AdminTheme.spacing.sm,
  },
  resubmitButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: AdminTheme.colors.surface,
  },
  buttonPressed: {
    transform: [{ scale: 0.98 }],
  },

  // Section Title
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: AdminTheme.spacing.md,
  },

  // Loading & Error
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: AdminTheme.spacing.md,
  },
  loadingText: {
    fontSize: 14,
    color: "#6B7280",
  },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: AdminTheme.spacing.lg,
    paddingHorizontal: AdminTheme.spacing.lg,
  },
  errorText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    textAlign: "center",
  },
  backButton: {
    paddingHorizontal: AdminTheme.spacing.lg,
    paddingVertical: AdminTheme.spacing.sm,
    backgroundColor: AdminTheme.colors.primary,
    borderRadius: 12,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: AdminTheme.colors.surface,
  },

  // Zoom Modal
  zoomOverlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  zoomImage: {
    width: SCREEN_WIDTH * 0.95,
    height: SCREEN_WIDTH * 0.95,
  },
  zoomClose: {
    position: "absolute",
    top: 40,
    right: 20,
    zIndex: 10,
  },

  // Modal Styles (Resubmit)
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: AdminTheme.colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: AdminTheme.spacing.lg,
    paddingVertical: AdminTheme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  modalSubtitle: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  modalClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
  },
  modalBody: {
    padding: AdminTheme.spacing.lg,
    gap: AdminTheme.spacing.md,
  },
  dueHighlight: {
    backgroundColor: "#FEF2F2",
    borderRadius: 16,
    padding: AdminTheme.spacing.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FEE2E2",
  },
  dueHighlightLabel: {
    fontSize: 12,
    color: "#DC2626",
    marginBottom: 2,
  },
  dueHighlightAmount: {
    fontSize: 28,
    fontWeight: "700",
    color: "#DC2626",
  },
  modalSection: {
    marginBottom: AdminTheme.spacing.md,
  },
  modalSectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: AdminTheme.spacing.sm,
  },
  requiredStar: {
    color: "#DC2626",
  },
  helperText: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 4,
    lineHeight: 14,
  },
  modeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: AdminTheme.spacing.sm,
  },
  modeOption: {
    flex: 1,
    minWidth: "45%",
    flexDirection: "row",
    alignItems: "center",
    padding: AdminTheme.spacing.sm,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    backgroundColor: AdminTheme.colors.surface,
    gap: AdminTheme.spacing.sm,
  },
  modeOptionActive: {
    borderWidth: 2,
    backgroundColor: AdminTheme.colors.surface,
  },
  modeIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  modeLabel: {
    fontSize: 13,
    color: "#6B7280",
    flex: 1,
  },
  amountInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    backgroundColor: AdminTheme.colors.surface,
    paddingHorizontal: AdminTheme.spacing.md,
    height: 48,
  },
  amountCurrency: {
    fontSize: 16,
    fontWeight: "600",
    color: AdminTheme.colors.primary,
    marginRight: AdminTheme.spacing.xs,
  },
  amountInput: {
    flex: 1,
    fontSize: 16,
    color: "#111827",
    padding: 0,
  },
  validationErrorText: {
    fontSize: 12,
    color: "#DC2626",
    marginTop: 4,
    marginLeft: 4,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: AdminTheme.spacing.md,
    paddingVertical: AdminTheme.spacing.sm,
    fontSize: 14,
    color: "#111827",
    backgroundColor: AdminTheme.colors.surface,
    height: 44,
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  datePickerButton: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: AdminTheme.spacing.md,
    paddingVertical: AdminTheme.spacing.sm,
    backgroundColor: AdminTheme.colors.surface,
    height: 44,
    gap: AdminTheme.spacing.sm,
  },
  datePickerText: {
    fontSize: 14,
    color: "#111827",
    flex: 1,
  },
  datePickerPlaceholder: {
    fontSize: 14,
    color: "#9CA3AF",
    flex: 1,
  },
  uploadButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: AdminTheme.colors.primary,
    borderStyle: "dashed",
    borderRadius: 12,
    paddingVertical: AdminTheme.spacing.md,
    gap: AdminTheme.spacing.sm,
    backgroundColor: "#EFF6FF",
  },
  uploadButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: AdminTheme.colors.primary,
  },
  previewContainer: {
    position: "relative",
    borderRadius: 12,
    overflow: "hidden",
  },
  previewImage: {
    width: "100%",
    height: 160,
    backgroundColor: "#F3F4F6",
  },
  previewOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: AdminTheme.spacing.sm,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  previewName: {
    fontSize: 12,
    color: AdminTheme.colors.surface,
    flex: 1,
  },
  previewRemove: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalFooter: {
    flexDirection: "row",
    paddingHorizontal: AdminTheme.spacing.lg,
    paddingVertical: AdminTheme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    gap: AdminTheme.spacing.md,
  },
  modalCancelButton: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: AdminTheme.colors.surface,
  },
  modalCancelButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },
  modalSubmitButton: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    overflow: "hidden",
  },
  modalSubmitButtonDisabled: {
    opacity: 0.5,
  },
  modalSubmitGradient: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: AdminTheme.spacing.sm,
  },
  modalSubmitButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: AdminTheme.colors.surface,
  },
});
