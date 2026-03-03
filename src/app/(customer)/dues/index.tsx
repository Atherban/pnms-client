import { MaterialIcons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
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
import DateTimePickerModal from "react-native-modal-datetime-picker";
import Animated, {
  FadeInDown,
  FadeInUp,
  Layout,
  SlideInRight,
} from "react-native-reanimated";

import FixedHeader from "../../../components/common/FixedHeader";
import BannerCardImage from "../../../components/ui/BannerCardImage";
import { PaymentService } from "../../../services/payment.service";
import { useAuthStore } from "../../../stores/auth.store";
import { Colors, Spacing } from "../../../theme";

const formatMoney = (amount: number) =>
  `₹${Math.round(amount).toLocaleString("en-IN")}`;
const formatCompactMoney = (amount: number) => {
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
  return `₹${amount}`;
};

const PAYMENT_MODES = [
  { id: "UPI", label: "UPI", icon: "qr-code", color: Colors.primary },
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

// ==================== STATS CARD ====================

interface StatsCardProps {
  totalDue: number;
  totalPaid: number;
  pendingCount: number;
}

const StatsCard = ({ totalDue, totalPaid, pendingCount }: StatsCardProps) => {
  const progressPercentage =
    totalDue > 0 ? (totalPaid / (totalDue + totalPaid)) * 100 : 0;

  return (
    <Animated.View
      entering={FadeInDown.springify().damping(35)}
      style={styles.statsCard}
    >
      <LinearGradient
        colors={[Colors.white, Colors.surface]}
        style={styles.statsCardGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      >
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <View
              style={[
                styles.statIcon,
                { backgroundColor: Colors.error + "10" },
              ]}
            >
              <MaterialIcons name="receipt" size={20} color={Colors.error} />
            </View>
            <View style={styles.statContent}>
              <Text style={styles.statLabel}>Total Due</Text>
              <Text style={[styles.statValue, { color: Colors.error }]}>
                {formatCompactMoney(totalDue)}
              </Text>
            </View>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statItem}>
            <View
              style={[
                styles.statIcon,
                { backgroundColor: Colors.success + "10" },
              ]}
            >
              <MaterialIcons
                name="check-circle"
                size={20}
                color={Colors.success}
              />
            </View>
            <View style={styles.statContent}>
              <Text style={styles.statLabel}>Paid</Text>
              <Text style={[styles.statValue, { color: Colors.success }]}>
                {formatCompactMoney(totalPaid)}
              </Text>
            </View>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statItem}>
            <View
              style={[
                styles.statIcon,
                { backgroundColor: Colors.warning + "10" },
              ]}
            >
              <MaterialIcons name="pending" size={20} color={Colors.warning} />
            </View>
            <View style={styles.statContent}>
              <Text style={styles.statLabel}>Pending</Text>
              <Text style={[styles.statValue, { color: Colors.warning }]}>
                {pendingCount}
              </Text>
            </View>
          </View>
        </View>

        {/* Progress Bar */}
        <View style={styles.statsProgressContainer}>
          <View style={styles.statsProgressBar}>
            <View
              style={[
                styles.statsProgressFill,
                { width: `${Math.min(progressPercentage, 100)}%` },
              ]}
            />
          </View>
          <Text style={styles.statsProgressText}>
            {progressPercentage.toFixed(1)}% of dues cleared
          </Text>
        </View>
      </LinearGradient>
    </Animated.View>
  );
};

// ==================== DUE CARD (Customer Friendly) ====================

interface DueCardProps {
  item: any;
  onPress: (saleId: string) => void;
  onViewDetails: (saleId: string) => void;
  index: number;
}

const DueCard = ({ item, onPress, onViewDetails, index }: DueCardProps) => {
  const paidRatio =
    item.totalAmount > 0 ? (item.paidAmount / item.totalAmount) * 100 : 0;
  const transactions = Array.isArray(item.transactions) ? item.transactions : [];
  const recentTransactions = [...transactions]
    .sort((a: any, b: any) => {
      const aTime = new Date(a?.paymentAt || a?.createdAt || 0).getTime();
      const bTime = new Date(b?.paymentAt || b?.createdAt || 0).getTime();
      return bTime - aTime;
    })
    .slice(0, 2);
  const orderDate = item.issuedAt || item.saleDate || item.createdAt;
  const formattedDate = orderDate
    ? new Date(orderDate).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : null;

  // Get status display
  const getStatusDisplay = () => {
    if (item.status === "PAID") {
      return { label: "Paid", color: Colors.success, icon: "check-circle" };
    }
    if (item.dueAmount === 0) {
      return {
        label: "Completed",
        color: Colors.success,
        icon: "check-circle",
      };
    }
    if (item.paidAmount > 0) {
      return {
        label: "Partial Paid",
        color: Colors.warning,
        icon: "hourglass-empty",
      };
    }
    return { label: "Pending", color: Colors.warning, icon: "pending" };
  };

  const status = getStatusDisplay();
  const getTransactionStatusDisplay = (status?: string) => {
    const value = String(status || "").toUpperCase();
    if (value === "VERIFIED" || value === "APPROVED") {
      return { label: "Verified", color: Colors.success, icon: "check-circle" };
    }
    if (value === "REJECTED" || value === "CANCELLED") {
      return { label: "Rejected", color: Colors.error, icon: "cancel" };
    }
    return { label: "Pending", color: Colors.warning, icon: "hourglass-empty" };
  };

  return (
    <Animated.View
      entering={FadeInUp.delay(index * 100)
        .springify()
        .damping(35)}
      layout={Layout.springify()}
      style={styles.card}
    >
      <LinearGradient
        colors={[Colors.white, Colors.surface]}
        style={styles.cardGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      >
        <BannerCardImage
          uri={item.imageUri}
          iconName="receipt-long"
          minHeight={140}
          containerStyle={styles.cardImageBanner}
        />
        <View style={styles.cardContent}>
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <View
              style={[
                styles.cardIcon,
                { backgroundColor: Colors.primary + "10" },
              ]}
            >
              <MaterialIcons
                name="receipt-long"
                size={16}
                color={Colors.primary}
              />
            </View>
            <View>
              <Text style={styles.orderLabel}>{item.itemTitle || "Invoice"}</Text>
              {item.itemSubtitle ? (
                <Text style={styles.orderDate}>{item.itemSubtitle}</Text>
              ) : null}
              {formattedDate && (
                <Text style={styles.orderDate}>{formattedDate}</Text>
              )}
            </View>
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: status.color + "10" },
            ]}
          >
            <MaterialIcons
              name={status.icon as any}
              size={12}
              color={status.color}
            />
            <Text style={[styles.statusText, { color: status.color }]}>
              {status.label}
            </Text>
          </View>
        </View>

        {/* Amounts */}
        <View style={styles.amountContainer}>
          <View style={styles.amountRow}>
            <Text style={styles.amountLabel}>Total Bill</Text>
            <Text style={styles.amountValue}>
              {formatMoney(item.totalAmount)}
            </Text>
          </View>
          <View style={styles.amountRow}>
            <Text style={styles.amountLabel}>Paid</Text>
            <Text style={[styles.amountValue, { color: Colors.success }]}>
              {formatMoney(item.paidAmount)}
            </Text>
          </View>
          <View style={styles.amountRow}>
            <Text style={styles.amountLabel}>Balance Due</Text>
            <Text
              style={[
                styles.amountValue,
                { color: Colors.error, fontWeight: "700" },
              ]}
            >
              {formatMoney(item.dueAmount)}
            </Text>
          </View>
        </View>

        {/* Due Progress Bar */}
        <View style={styles.dueProgressContainer}>
          <View style={styles.dueProgressBar}>
            <View
              style={[
                styles.dueProgressFill,
                {
                  width: `${Math.min(Math.max(paidRatio, 0), 100)}%`,
                  backgroundColor:
                    paidRatio < 50 ? Colors.warning : Colors.success,
                },
              ]}
            />
          </View>
          <Text style={styles.dueProgressText}>
            {Math.round(Math.min(Math.max(paidRatio, 0), 100))}% paid
          </Text>
        </View>

        {/* Recent Payment Activity */}
        {recentTransactions.length > 0 && (
          <View style={styles.activityContainer}>
            <Text style={styles.activityTitle}>Recent Activity</Text>
            {recentTransactions.map((tx: any) => (
              <View key={tx.id} style={styles.activityItem}>
                {(() => {
                  const txStatus = getTransactionStatusDisplay(tx.status);
                  return (
                    <View style={styles.activityLeft}>
                      <View
                        style={[
                          styles.activityIcon,
                          { backgroundColor: txStatus.color + "10" },
                        ]}
                      >
                        <MaterialIcons
                          name={txStatus.icon as any}
                          size={12}
                          color={txStatus.color}
                        />
                      </View>
                      <View>
                        <Text style={styles.activityAmount}>
                          {formatMoney(tx.amount)}
                        </Text>
                        <Text style={styles.activityMeta}>
                          {tx.mode?.replace("_", " ")} • {txStatus.label}
                        </Text>
                      </View>
                    </View>
                  );
                })()}
              </View>
            ))}
            {transactions.length > 2 && (
              <Text style={styles.moreActivity}>
                +{transactions.length - 2} more payment
                {transactions.length - 2 > 1 ? "s" : ""}
              </Text>
            )}
          </View>
        )}

        <View style={styles.cardActions}>
          <Pressable
            onPress={() => onViewDetails(item.saleId)}
            style={({ pressed }) => [
              styles.viewDetailsButton,
              pressed && styles.buttonPressed,
            ]}
          >
            <MaterialIcons name="receipt-long" size={16} color={Colors.primary} />
            <Text style={styles.viewDetailsText}>View Details</Text>
          </Pressable>

          {item.dueAmount > 0 && (
            <Pressable
              onPress={() => onPress(item.saleId)}
              style={({ pressed }) => [
                styles.payButton,
                pressed && styles.buttonPressed,
              ]}
            >
              <LinearGradient
                colors={[Colors.primary, Colors.primaryLight || Colors.primary]}
                style={styles.payButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <MaterialIcons name="payment" size={18} color={Colors.white} />
                <Text style={styles.payButtonText}>Make a Payment</Text>
              </LinearGradient>
            </Pressable>
          )}
        </View>
        </View>
      </LinearGradient>
    </Animated.View>
  );
};

// ==================== PAYMENT MODAL (Customer Friendly) ====================

interface PaymentModalProps {
  visible: boolean;
  selectedSale: any;
  onClose: () => void;
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
  isSubmitting: boolean;
}

const PaymentModal = ({
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
}: PaymentModalProps) => {
  const dueAmount = selectedSale?.dueAmount || 0;
  const invoiceDate = selectedSale?.issuedAt || selectedSale?.saleDate || selectedSale?.createdAt;
  const formattedInvoiceDate = invoiceDate
    ? new Date(invoiceDate).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : null;

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
              <Text style={styles.modalTitle}>Make a Payment</Text>
              <Text style={styles.modalSubtitle}>
                Invoice from {formattedInvoiceDate || "Unknown date"}
              </Text>
            </View>
            <Pressable onPress={onClose} style={styles.modalClose}>
              <MaterialIcons
                name="close"
                size={20}
                color={Colors.textSecondary}
              />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.modalBody}
          >
            {/* Due Amount Highlight */}
            <View style={styles.dueHighlight}>
              <Text style={styles.dueHighlightLabel}>Balance Due</Text>
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
                          color={isActive ? item.color : Colors.textSecondary}
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
                  placeholderTextColor={Colors.textTertiary}
                />
              </View>
              {amount && Number(amount) > dueAmount && (
                <Text style={styles.errorText}>
                  Amount cannot exceed your balance due
                </Text>
              )}
            </View>

            {/* Transaction ID (for online payments) */}
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
                  placeholderTextColor={Colors.textTertiary}
                  autoCapitalize="characters"
                />
                <Text style={styles.helperText}>
                  You can find this in your payment app after successful payment
                </Text>
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
                  color={Colors.primary}
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
              {paymentAt && (
                <Pressable
                  onPress={() => setPaymentAt("")}
                  style={styles.clearDateButton}
                >
                  <Text style={styles.clearDateText}>Clear date</Text>
                </Pressable>
              )}
            </View>

            {/* Payment Screenshot (Optional) */}
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>
                Payment Screenshot (Optional)
              </Text>
              <Text style={styles.helperText}>
                Upload a screenshot to help us verify your payment faster
              </Text>

              {!screenshotFile ? (
                <Pressable
                  onPress={onPickScreenshot}
                  style={styles.uploadButton}
                >
                  <MaterialIcons
                    name="add-photo-alternate"
                    size={24}
                    color={Colors.primary}
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
                        color={Colors.white}
                      />
                    </Pressable>
                  </View>
                </View>
              )}
            </View>

            {/* Additional Notes (Optional) */}
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>
                Additional Notes (Optional)
              </Text>
              <TextInput
                value={reference}
                onChangeText={setReference}
                placeholder="Any additional information you'd like to share"
                style={[styles.modalInput, styles.textArea]}
                placeholderTextColor={Colors.textTertiary}
                multiline
                numberOfLines={3}
              />
            </View>
          </ScrollView>

          {/* Modal Actions */}
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
              <LinearGradient
                colors={[Colors.primary, Colors.primaryLight || Colors.primary]}
                style={styles.modalSubmitGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {isSubmitting ? (
                  <>
                    <MaterialIcons name="sync" size={18} color={Colors.white} />
                    <Text style={styles.modalSubmitButtonText}>
                      Submitting...
                    </Text>
                  </>
                ) : (
                  <>
                    <MaterialIcons
                      name="check-circle"
                      size={18}
                      color={Colors.white}
                    />
                    <Text style={styles.modalSubmitButtonText}>
                      Submit Payment
                    </Text>
                  </>
                )}
              </LinearGradient>
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

// ==================== MAIN COMPONENT ====================

export default function CustomerDuesScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
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
  const [showPaymentAtPicker, setShowPaymentAtPicker] = useState(false);

  const { data, refetch, isRefetching } = useQuery({
    queryKey: ["customer-dues", user?.id, user?.phoneNumber],
    queryFn: () =>
      PaymentService.getDueSalesForUser({
        id: user?.id,
        phoneNumber: user?.phoneNumber,
        role: user?.role,
        nurseryId: user?.nurseryId,
      }),
  });

  // Fetch rejected payments count
  const { data: rejectedPayments } = useQuery({
    queryKey: ["payment-proofs", "rejected"],
    queryFn: () => PaymentService.listPaymentProofs("REJECTED"),
  });

  const rejectedCount = (rejectedPayments || []).length;

  const selectedSale = useMemo(
    () => (data || []).find((item) => item.saleId === selectedSaleId),
    [data, selectedSaleId],
  );

  const sortedDues = useMemo(() => {
    const rows = Array.isArray(data) ? data : [];
    return [...rows].sort((a, b) => {
      const aOutstanding = Number(a?.dueAmount ?? 0) > 0 ? 1 : 0;
      const bOutstanding = Number(b?.dueAmount ?? 0) > 0 ? 1 : 0;
      if (aOutstanding !== bOutstanding) return bOutstanding - aOutstanding;
      return String(b?.issuedAt || "").localeCompare(String(a?.issuedAt || ""));
    });
  }, [data]);

  // Calculate stats
  const stats = useMemo(() => {
    const dues = sortedDues;
    const totalDue = dues.reduce((sum, item) => sum + item.dueAmount, 0);
    const totalPaid = dues.reduce((sum, item) => sum + item.paidAmount, 0);
    const pendingCount = dues.filter((item) =>
      item.transactions.some((tx: any) => {
        const value = String(tx?.status || "").toUpperCase();
        return value === "PENDING" || value === "PENDING_VERIFICATION" || value === "SYNC_QUEUED";
      }),
    ).length;
    return { totalDue, totalPaid, pendingCount };
  }, [sortedDues]);

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSale) throw new Error("Please select an invoice to pay for");
      const numericAmount = Number(amount);

      if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
        throw new Error("Please enter a valid payment amount");
      }
      if (numericAmount > selectedSale.dueAmount) {
        throw new Error("Payment amount cannot be more than your balance due");
      }
      if (mode !== "CASH" && !utrNumber.trim()) {
        throw new Error("Transaction ID is required for online payments");
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
      Alert.alert(
        "✅ Thank You!",
        "Your payment has been submitted for verification. We'll notify you once it's confirmed.",
      );
    },
    onError: (err: any) => {
      Alert.alert(
        "Unable to submit",
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

  return (
    <View style={styles.container}>
      <FixedHeader
        title="Payments"
        subtitle="Track and settle your nursery bills"
        titleStyle={styles.headerTitle}
        actions={
          <View style={styles.headerActions}>
            {rejectedCount > 0 && (
              <Pressable
                style={({ pressed }) => [
                  styles.headerRejectedBtn,
                  pressed && styles.headerIconBtnPressed,
                ]}
                onPress={() => router.push("/(customer)/rejected-payments")}
              >
                <MaterialIcons name="error" size={18} color={Colors.error} />
                <Text style={styles.headerRejectedBadge}>{rejectedCount}</Text>
              </Pressable>
            )}
            <Pressable
              style={({ pressed }) => [
                styles.headerIconBtn,
                pressed && styles.headerIconBtnPressed,
              ]}
              onPress={() => refetch()}
            >
              <MaterialIcons
                name={isRefetching ? "sync" : "refresh"}
                size={20}
                color={Colors.white}
              />
            </Pressable>
          </View>
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* Stats Card */}
        {sortedDues.length > 0 && (
          <StatsCard
            totalDue={stats.totalDue}
            totalPaid={stats.totalPaid}
            pendingCount={stats.pendingCount}
          />
        )}

        {/* Bills List */}
        {sortedDues.length === 0 ? (
          <Animated.View
            entering={FadeInDown.springify()}
            style={styles.emptyCard}
          >
            <View style={styles.emptyIconContainer}>
              <MaterialIcons
                name="receipt"
                size={48}
                color={Colors.textTertiary}
              />
            </View>
            <Text style={styles.emptyTitle}>No Payments Due</Text>
            <Text style={styles.emptyMessage}>
              You do not have any pending payments at the moment.
            </Text>
          </Animated.View>
        ) : (
          sortedDues.map((item, index) => (
            <DueCard
              key={item.saleId}
              item={item}
              onPress={setSelectedSaleId}
              onViewDetails={(saleId) => router.push(`/(customer)/dues/${saleId}` as any)}
              index={index}
            />
          ))
        )}
      </ScrollView>

      {/* Payment Modal */}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  headerTitle: {
    fontSize: 24,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  headerRejectedBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: Colors.error,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.error + "15",
    flexDirection: "row",
    gap: 4,
  },
  headerRejectedBadge: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.error,
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.32)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  headerIconBtnPressed: {
    backgroundColor: "rgba(255,255,255,0.2)",
    transform: [{ scale: 0.95 }],
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: 100,
    gap: Spacing.md,
  },

  // Stats Card
  statsCard: {
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: Colors.white,
    marginBottom: Spacing.xs,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statsCardGradient: {
    padding: Spacing.lg,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
  },
  statItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  statContent: {
    flex: 1,
  },
  statLabel: {
    fontSize: 11,
    color: "#6B7280",
    marginBottom: 2,
  },
  statValue: {
    fontSize: 16,
    fontWeight: "700",
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: "#E5E7EB",
    marginHorizontal: 8,
  },
  statsProgressContainer: {
    gap: 4,
  },
  statsProgressBar: {
    height: 4,
    backgroundColor: "#F3F4F6",
    borderRadius: 2,
    overflow: "hidden",
  },
  statsProgressFill: {
    height: "100%",
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  statsProgressText: {
    fontSize: 11,
    color: "#9CA3AF",
    textAlign: "right",
  },

  // Due Card (Customer Friendly)
  card: {
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: Colors.white,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardGradient: {
    padding: 0,
  },
  cardImageBanner: {
    width: "100%",
    minHeight: 140,
    borderRadius: 0,
    marginBottom: 0,
  },
  cardContent: {
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  cardIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  orderLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  orderDate: {
    fontSize: 12,
    fontWeight: "500",
    color: "#6B7280",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
  },
  amountContainer: {
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  amountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  amountLabel: {
    fontSize: 13,
    color: "#6B7280",
  },
  amountValue: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  dueProgressContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  dueProgressBar: {
    flex: 1,
    height: 4,
    backgroundColor: "#F3F4F6",
    borderRadius: 2,
    overflow: "hidden",
  },
  dueProgressFill: {
    height: "100%",
    borderRadius: 2,
  },
  dueProgressText: {
    fontSize: 11,
    color: "#6B7280",
  },
  activityContainer: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
    gap: Spacing.xs,
  },
  activityTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 2,
  },
  activityItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  activityLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    flex: 1,
  },
  activityIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  activityAmount: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
  },
  activityMeta: {
    fontSize: 10,
    color: "#9CA3AF",
  },
  moreActivity: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: "600",
    marginTop: 2,
  },
  cardActions: {
    gap: Spacing.sm,
  },
  viewDetailsButton: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primary + "35",
    backgroundColor: Colors.primary + "08",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.sm,
    gap: Spacing.xs,
  },
  viewDetailsText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: "600",
  },
  payButton: {
    borderRadius: 12,
    overflow: "hidden",
  },
  payButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  payButtonText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: "600",
  },
  buttonPressed: {
    transform: [{ scale: 0.98 }],
  },

  // Empty State
  emptyCard: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    backgroundColor: Colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: Spacing.md,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
  },
  emptyMessage: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    paddingHorizontal: 32,
  },

  // Modal Styles (Customer Friendly)
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
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
    padding: Spacing.lg,
    gap: Spacing.md,
  },

  // Due Highlight
  dueHighlight: {
    backgroundColor: "#FEF2F2",
    borderRadius: 16,
    padding: Spacing.md,
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

  // Modal Sections
  modalSection: {
    marginBottom: Spacing.md,
  },
  modalSectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: Spacing.sm,
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

  // Mode Selection
  modeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  modeOption: {
    flex: 1,
    minWidth: "45%",
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    backgroundColor: Colors.white,
    gap: Spacing.sm,
  },
  modeOptionActive: {
    borderWidth: 2,
    backgroundColor: Colors.white,
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

  // Amount Input
  amountInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.md,
    height: 48,
  },
  amountCurrency: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.primary,
    marginRight: Spacing.xs,
  },
  amountInput: {
    flex: 1,
    fontSize: 16,
    color: "#111827",
    padding: 0,
  },
  errorText: {
    fontSize: 12,
    color: "#DC2626",
    marginTop: 4,
    marginLeft: 4,
  },

  // Modal Input
  modalInput: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 14,
    color: "#111827",
    backgroundColor: Colors.white,
    height: 44,
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },

  // Date Picker
  datePickerButton: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.white,
    height: 44,
    gap: Spacing.sm,
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
  clearDateButton: {
    marginTop: 4,
    marginLeft: 4,
  },
  clearDateText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: "500",
  },

  // Upload Button
  uploadButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.primary,
    borderStyle: "dashed",
    borderRadius: 12,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
    backgroundColor: "#EFF6FF",
  },
  uploadButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.primary,
  },

  // Preview
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
    padding: Spacing.sm,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  previewName: {
    fontSize: 12,
    color: Colors.white,
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

  // Modal Footer
  modalFooter: {
    flexDirection: "row",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    gap: Spacing.md,
  },
  modalCancelButton: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.white,
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
    gap: Spacing.sm,
  },
  modalSubmitButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.white,
  },
});
