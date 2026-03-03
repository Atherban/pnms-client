import { MaterialIcons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import FixedHeader from "../../../components/common/FixedHeader";
import { PaymentService } from "../../../services/payment.service";
import { useAuthStore } from "../../../stores/auth.store";
import { Colors } from "../../../theme";

const BOTTOM_NAV_HEIGHT = 80;

const formatMoney = (amount: number) => 
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);

const formatPaymentMode = (value?: string) => {
  const mode = String(value || "").trim().toUpperCase();
  if (!mode) return "—";
  return mode.replace(/_/g, " ");
};

const formatDateTime = (dateString?: string) => {
  if (!dateString) return "—";
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return `Today, ${date.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  } else if (date.toDateString() === yesterday.toDateString()) {
    return `Yesterday, ${date.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  }
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getStatusConfig = (status: string) => {
  switch (status) {
    case "PENDING":
    case "PENDING_VERIFICATION":
      return {
        label: "Pending",
        color: "#D97706",
        bg: "#FFFBEB",
        icon: "pending",
      };
    case "VERIFIED":
    case "APPROVED":
      return {
        label: "Approved",
        color: "#059669",
        bg: "#ECFDF5",
        icon: "check-circle",
      };
    case "REJECTED":
      return {
        label: "Rejected",
        color: "#DC2626",
        bg: "#FEF2F2",
        icon: "cancel",
      };
    default:
      return {
        label: status,
        color: "#6B7280",
        bg: "#F3F4F6",
        icon: "help",
      };
  }
};

const isPendingVerificationStatus = (status?: string) => {
  const normalized = String(status || "").toUpperCase();
  return normalized === "PENDING" || normalized === "PENDING_VERIFICATION";
};

// ==================== STATS CARD ====================

interface StatsCardProps {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}

const StatsCard = ({ total, pending, approved, rejected }: StatsCardProps) => (
  <BlurView intensity={80} tint="light" style={styles.statsCard}>
    <View style={styles.statsRow}>
      <View style={styles.statItem}>
        <View style={[styles.statIcon, { backgroundColor: `${Colors.primary}20` }]}>
          <MaterialIcons name="receipt" size={16} color={Colors.primary} />
        </View>
        <View style={styles.statInfo}>
          <Text style={styles.statNumber}>{total}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
      </View>

      <View style={styles.statDivider} />

      <View style={styles.statItem}>
        <View style={[styles.statIcon, { backgroundColor: "#D9770620" }]}>
          <MaterialIcons name="pending" size={16} color="#D97706" />
        </View>
        <View style={styles.statInfo}>
          <Text style={styles.statNumber}>{pending}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
      </View>

      <View style={styles.statDivider} />

      <View style={styles.statItem}>
        <View style={[styles.statIcon, { backgroundColor: "#05966920" }]}>
          <MaterialIcons name="check-circle" size={16} color="#059669" />
        </View>
        <View style={styles.statInfo}>
          <Text style={styles.statNumber}>{approved}</Text>
          <Text style={styles.statLabel}>Approved</Text>
        </View>
      </View>

      <View style={styles.statDivider} />

      <View style={styles.statItem}>
        <View style={[styles.statIcon, { backgroundColor: "#DC262620" }]}>
          <MaterialIcons name="cancel" size={16} color="#DC2626" />
        </View>
        <View style={styles.statInfo}>
          <Text style={styles.statNumber}>{rejected}</Text>
          <Text style={styles.statLabel}>Rejected</Text>
        </View>
      </View>
    </View>
  </BlurView>
);

// ==================== PAYMENT CARD ====================

interface PaymentCardProps {
  proof: any;
  onPress: (id: string) => void;
}

const PaymentCard = ({ proof, onPress }: PaymentCardProps) => {
  const status = getStatusConfig(proof.status);
  const customerName = String(proof.customerName || "Walk-in Customer");
  const customerPhone = String(proof.customerPhone || "").trim();
  const saleNumber = String(proof.saleNumber || "").trim();
  const reference = String(proof.reference || proof.utrNumber || "").trim();
  const reviewedMeta =
    proof.status === "VERIFIED" || proof.status === "APPROVED" || proof.status === "REJECTED"
      ? `${proof.reviewerName ? `By ${proof.reviewerName}` : "Reviewed"} • ${formatDateTime(proof.reviewedAt)}`
      : "";

  return (
    <View>
      <Pressable
        style={({ pressed }) => [
          styles.card,
          pressed && styles.cardPressed,
        ]}
        onPress={() => onPress(proof.id)}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <View style={[styles.avatar, { backgroundColor: `${Colors.primary}10` }]}>
              <Text style={styles.avatarText}>
                {customerName?.charAt(0).toUpperCase() || "?"}
              </Text>
            </View>
            <View style={styles.customerInfo}>
              <Text style={styles.customerName} numberOfLines={1}>
                {customerName}
              </Text>
              <Text style={styles.saleId} numberOfLines={1}>
                {customerPhone || saleNumber || "Customer payment proof"}
              </Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
            <MaterialIcons name={status.icon as any} size={12} color={status.color} />
            <Text style={[styles.statusText, { color: status.color }]}>
              {status.label}
            </Text>
          </View>
        </View>

        <View style={styles.cardContent}>
          <View style={styles.amountSection}>
            <Text style={styles.amountLabel}>Amount</Text>
            <Text style={styles.amountValue}>{formatMoney(proof.amount)}</Text>
          </View>

          <View style={styles.cardDivider} />

          <View style={styles.detailsSection}>
            <View style={styles.detailRow}>
              <MaterialIcons name="payment" size={12} color="#9CA3AF" />
              <Text style={styles.detailText}>{formatPaymentMode(proof.mode)}</Text>
            </View>
            {reference && (
              <View style={styles.detailRow}>
                <MaterialIcons name="tag" size={12} color="#9CA3AF" />
                <Text style={styles.detailText} numberOfLines={1}>Ref: {reference}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.footerMeta}>
            <View style={styles.footerItem}>
              <MaterialIcons name="access-time" size={12} color="#9CA3AF" />
              <Text style={styles.footerText}>Submitted {formatDateTime(proof.submittedAt)}</Text>
            </View>
            {(proof.status === "VERIFIED" || proof.status === "APPROVED" || proof.status === "REJECTED") &&
              reviewedMeta ? (
                <View style={styles.footerItem}>
                  <MaterialIcons name="verified-user" size={12} color="#9CA3AF" />
                  <Text style={styles.footerText} numberOfLines={1}>{reviewedMeta}</Text>
                </View>
              ) : null}
          </View>
          {proof.screenshotUri && (
            <View style={styles.imageIndicator}>
              <MaterialIcons name="image" size={12} color="#9CA3AF" />
              <Text style={styles.imageIndicatorText}>Screenshot</Text>
            </View>
          )}
        </View>
      </Pressable>
    </View>
  );
};

// ==================== DETAILS MODAL ====================

interface DetailsModalProps {
  visible: boolean;
  proof: any;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
  rejectReason: string;
  onRejectReasonChange: (text: string) => void;
  isPending: boolean;
}

const DetailsModal = ({
  visible,
  proof,
  onClose,
  onApprove,
  onReject,
  rejectReason,
  onRejectReasonChange,
  isPending,
}: DetailsModalProps) => {
  const insets = useSafeAreaInsets();
  if (!proof) return null;

  const status = getStatusConfig(proof.status);
  const canReview = isPendingVerificationStatus(proof.status);
  const customerName = String(proof.customerName || "Walk-in Customer");
  const reference = String(proof.reference || proof.utrNumber || "").trim();
  const saleNumber = String(proof.saleNumber || "").trim();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <Pressable style={styles.modalBackdrop} onPress={onClose} />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.modalKeyboardAvoid}
        >
          <View style={styles.modalSheet}>
            <BlurView intensity={90} tint="light" style={styles.modalBlur}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <View style={[styles.modalAvatar, { backgroundColor: `${Colors.primary}10` }]}>
                  <Text style={styles.modalAvatarText}>
                    {customerName?.charAt(0).toUpperCase() || "?"}
                  </Text>
                </View>
                <View>
                  <Text style={styles.modalTitle}>Payment Verification</Text>
                  <Text style={styles.modalSubtitle}>
                    {customerName}
                    {proof.customerPhone ? ` • ${proof.customerPhone}` : ""}
                  </Text>
                </View>
              </View>
              <Pressable onPress={onClose} style={styles.modalCloseButton}>
                <MaterialIcons name="close" size={20} color="#6B7280" />
              </Pressable>
            </View>

            <ScrollView 
              style={styles.modalScroll}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalContent}
              keyboardShouldPersistTaps="handled"
            >
              {/* Status Badge */}
              <View style={styles.modalStatusContainer}>
                <View style={[styles.modalStatusBadge, { backgroundColor: status.bg }]}>
                  <MaterialIcons name={status.icon as any} size={14} color={status.color} />
                  <Text style={[styles.modalStatusText, { color: status.color }]}>
                    {status.label}
                  </Text>
                </View>
              </View>

              {/* Amount */}
              <View style={styles.modalAmountContainer}>
                <Text style={styles.modalAmountLabel}>Amount</Text>
                <Text style={styles.modalAmountValue}>{formatMoney(proof.amount)}</Text>
              </View>

              {/* Details Grid */}
              <View style={styles.modalDetailsGrid}>
                {saleNumber ? (
                  <View style={styles.modalDetailItem}>
                    <MaterialIcons name="confirmation-number" size={14} color="#6B7280" />
                    <Text style={styles.modalDetailLabel}>Sale No.</Text>
                    <Text style={styles.modalDetailValue}>{saleNumber}</Text>
                  </View>
                ) : null}

                {proof.mode && (
                  <View style={styles.modalDetailItem}>
                    <MaterialIcons name="payment" size={14} color="#6B7280" />
                    <Text style={styles.modalDetailLabel}>Mode</Text>
                    <Text style={styles.modalDetailValue}>{formatPaymentMode(proof.mode)}</Text>
                  </View>
                )}

                {reference && (
                  <View style={styles.modalDetailItem}>
                    <MaterialIcons name="tag" size={14} color="#6B7280" />
                    <Text style={styles.modalDetailLabel}>Reference</Text>
                    <Text style={styles.modalDetailValue}>{reference}</Text>
                  </View>
                )}

                <View style={styles.modalDetailItem}>
                  <MaterialIcons name="calendar-today" size={14} color="#6B7280" />
                  <Text style={styles.modalDetailLabel}>Paid at</Text>
                  <Text style={styles.modalDetailValue}>
                    {formatDateTime(proof.paymentAt || proof.submittedAt)}
                  </Text>
                </View>

                <View style={styles.modalDetailItem}>
                  <MaterialIcons name="access-time" size={14} color="#6B7280" />
                  <Text style={styles.modalDetailLabel}>Submitted</Text>
                  <Text style={styles.modalDetailValue}>{formatDateTime(proof.submittedAt)}</Text>
                </View>

                {(proof.status === "VERIFIED" || proof.status === "APPROVED" || proof.status === "REJECTED") && (
                  <>
                    <View style={styles.modalDetailItem}>
                      <MaterialIcons name="person-outline" size={14} color="#6B7280" />
                      <Text style={styles.modalDetailLabel}>Reviewed by</Text>
                      <Text style={styles.modalDetailValue}>
                        {proof.reviewerName || "Unknown reviewer"}
                      </Text>
                    </View>

                    <View style={styles.modalDetailItem}>
                      <MaterialIcons name="event-available" size={14} color="#6B7280" />
                      <Text style={styles.modalDetailLabel}>Reviewed at</Text>
                      <Text style={styles.modalDetailValue}>{formatDateTime(proof.reviewedAt)}</Text>
                    </View>
                  </>
                )}
              </View>

              {/* Screenshot */}
              {proof.screenshotUri ? (
                <View style={styles.modalImageSection}>
                  <Text style={styles.modalImageLabel}>Payment Screenshot</Text>
                  <View style={styles.modalImageContainer}>
                    <Image
                      source={{ uri: proof.screenshotUri }}
                      style={styles.modalImage}
                      contentFit="contain"
                      transition={200}
                    />
                  </View>
                </View>
              ) : (
                <View style={styles.modalNoImage}>
                  <MaterialIcons name="image-not-supported" size={32} color="#9CA3AF" />
                  <Text style={styles.modalNoImageText}>No screenshot provided</Text>
                </View>
              )}

              {/* Rejection Reason Input */}
              {canReview && (
                <View style={styles.modalInputSection}>
                  <Text style={styles.modalInputLabel}>Rejection Reason (required for reject)</Text>
                  <TextInput
                    value={rejectReason}
                    onChangeText={onRejectReasonChange}
                    placeholder="Enter reason for rejection..."
                    placeholderTextColor="#9CA3AF"
                    style={styles.modalInput}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                  />
                </View>
              )}

              {/* Rejection Reason Display */}
              {proof.rejectionReason && (
                <View style={styles.modalRejectionSection}>
                  <MaterialIcons name="error-outline" size={16} color="#DC2626" />
                  <Text style={styles.modalRejectionText}>{proof.rejectionReason}</Text>
                </View>
              )}
            </ScrollView>

            {/* Actions */}
            {canReview && (
              <View
                style={[
                  styles.modalActions,
                  { paddingBottom: Math.max(insets.bottom, 12) },
                ]}
              >
                <Pressable
                  onPress={onClose}
                  style={styles.modalCancelButton}
                >
                  <Text style={styles.modalCancelButtonText}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={onReject}
                  disabled={isPending}
                  style={[styles.modalRejectButton, isPending && styles.modalButtonDisabled]}
                >
                  <LinearGradient
                    colors={["#DC2626", "#B91C1C"]}
                    style={styles.modalButtonGradient}
                  >
                    <MaterialIcons name="close" size={18} color={Colors.white} />
                    <Text style={styles.modalButtonText}>Reject</Text>
                  </LinearGradient>
                </Pressable>
                <Pressable
                  onPress={onApprove}
                  disabled={isPending}
                  style={[styles.modalApproveButton, isPending && styles.modalButtonDisabled]}
                >
                  <LinearGradient
                    colors={["#059669", "#047857"]}
                    style={styles.modalButtonGradient}
                  >
                    <MaterialIcons name="check" size={18} color={Colors.white} />
                    <Text style={styles.modalButtonText}>Approve</Text>
                  </LinearGradient>
                </Pressable>
              </View>
            )}

            {/* Close Button for Reviewed Items */}
            {!canReview && (
              <View
                style={[
                  styles.modalSingleAction,
                  { paddingBottom: Math.max(insets.bottom, 12) },
                ]}
              >
                <Pressable
                  onPress={onClose}
                  style={styles.modalCloseAction}
                >
                  <Text style={styles.modalCloseActionText}>Close</Text>
                </Pressable>
              </View>
            )}
            </BlurView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

// ==================== MAIN COMPONENT ====================

export default function AdminPaymentVerificationScreen() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [selectedProofId, setSelectedProofId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const { data, refetch, isRefetching } = useQuery({
    queryKey: ["payment-proofs"],
    queryFn: () => PaymentService.listPaymentProofs(),
  });

  const proofs = useMemo(() => (Array.isArray(data) ? data : []), [data]);

  const selected = useMemo(
    () => proofs.find((item) => item.id === selectedProofId),
    [proofs, selectedProofId],
  );

  const stats = useMemo(() => {
    const total = proofs.length;
    const pending = proofs.filter(p => 
      p.status === "PENDING" || p.status === "PENDING_VERIFICATION"
    ).length;
    const approved = proofs.filter(p => 
      p.status === "APPROVED" || p.status === "VERIFIED"
    ).length;
    const rejected = proofs.filter(p => p.status === "REJECTED").length;
    return { total, pending, approved, rejected };
  }, [proofs]);

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

  const handleCardPress = (id: string) => {
    setSelectedProofId(id);
  };

  const handleCloseModal = () => {
    setSelectedProofId(null);
    setRejectReason("");
  };

  const handleApprove = () => {
    reviewMutation.mutate(true);
  };

  const handleReject = () => {
    if (!rejectReason.trim()) {
      Alert.alert("Error", "Please provide a reason for rejection");
      return;
    }
    reviewMutation.mutate(false);
  };

  const handleRefresh = () => {
    refetch();
  };

  const isPending = reviewMutation.isPending;

  return (
    <View style={styles.container}>
      <FixedHeader
        title="Payment Verification"
        subtitle="Approve or reject payment screenshots"
        titleStyle={styles.headerTitle}
        actions={
          <Pressable 
            style={({ pressed }) => [
              styles.headerIconBtn,
              pressed && styles.headerIconBtnPressed,
            ]} 
            onPress={handleRefresh}
          >
            <MaterialIcons
              name={isRefetching ? "sync" : "refresh"}
              size={20}
              color={Colors.white}
            />
          </Pressable>
        }
      />

      {/* Stats Card */}
      {proofs.length > 0 && (
        <StatsCard
          total={stats.total}
          pending={stats.pending}
          approved={stats.approved}
          rejected={stats.rejected}
        />
      )}

      <ScrollView 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {proofs.length === 0 ? (
          <View style={styles.emptyContainer}>
            <LinearGradient
              colors={["#F3F4F6", "#F9FAFB"]}
              style={styles.emptyIconContainer}
            >
              <MaterialIcons name="receipt" size={48} color="#9CA3AF" />
            </LinearGradient>
            <Text style={styles.emptyTitle}>No Payment Proofs</Text>
            <Text style={styles.emptyText}>
              Payment screenshots submitted by customers will appear here
            </Text>
          </View>
        ) : (
          proofs.map((proof) => (
            <PaymentCard
              key={proof.id}
              proof={proof}
              onPress={handleCardPress}
            />
          ))
        )}
      </ScrollView>

      <DetailsModal
        visible={Boolean(selected)}
        proof={selected}
        onClose={handleCloseModal}
        onApprove={handleApprove}
        onReject={handleReject}
        rejectReason={rejectReason}
        onRejectReasonChange={setRejectReason}
        isPending={isPending}
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
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerIconBtnPressed: {
    backgroundColor: "rgba(255,255,255,0.1)",
    transform: [{ scale: 0.95 }],
  },

  // Stats Card
  statsCard: {
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 8,
    borderRadius: 20,
    padding: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    backgroundColor: "rgba(255,255,255,0.7)",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  statInfo: {
    flex: 1,
  },
  statNumber: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 10,
    color: "rgba(0,0,0,0.5)",
    fontWeight: "500",
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: "rgba(0,0,0,0.1)",
    marginHorizontal: 8,
  },

  // Content
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: BOTTOM_NAV_HEIGHT + 20,
    gap: 12,
  },

  // Card
  card: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  cardPressed: {
    transform: [{ scale: 0.98 }],
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  cardHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.primary,
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 2,
  },
  saleId: {
    fontSize: 12,
    color: "#6B7280",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  amountSection: {
    flex: 1,
  },
  amountLabel: {
    fontSize: 11,
    color: "#6B7280",
    marginBottom: 2,
  },
  amountValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#059669",
  },
  cardDivider: {
    width: 1,
    height: 40,
    backgroundColor: "#E5E7EB",
    marginHorizontal: 12,
  },
  detailsSection: {
    flex: 1,
    gap: 4,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  detailText: {
    fontSize: 12,
    color: "#374151",
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    gap: 8,
  },
  footerMeta: {
    flex: 1,
    gap: 4,
  },
  footerItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  footerText: {
    fontSize: 11,
    color: "#6B7280",
  },
  imageIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  imageIndicatorText: {
    fontSize: 10,
    color: "#4B5563",
    fontWeight: "500",
  },

  // Empty State
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    paddingHorizontal: 20,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 18,
    paddingHorizontal: 20,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalKeyboardAvoid: {
    justifyContent: "flex-end",
  },
  modalSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: "hidden",
    height: "88%",
    minHeight: 460,
  },
  modalBlur: {
    flex: 1,
    paddingTop: 20,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.3)",
    backgroundColor: "rgba(255,255,255,0.95)",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  modalHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  modalAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  modalAvatarText: {
    fontSize: 20,
    fontWeight: "600",
    color: Colors.primary,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 2,
  },
  modalSubtitle: {
    fontSize: 13,
    color: "#6B7280",
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  modalScroll: {
    flex: 1,
  },
  modalContent: {
    gap: 16,
    paddingBottom: 12,
  },
  modalStatusContainer: {
    alignItems: "center",
  },
  modalStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 24,
    gap: 6,
  },
  modalStatusText: {
    fontSize: 13,
    fontWeight: "600",
  },
  modalAmountContainer: {
    alignItems: "center",
    paddingVertical: 8,
  },
  modalAmountLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 4,
  },
  modalAmountValue: {
    fontSize: 32,
    fontWeight: "700",
    color: "#059669",
  },
  modalDetailsGrid: {
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  modalDetailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  modalDetailLabel: {
    fontSize: 12,
    color: "#6B7280",
    width: 86,
  },
  modalDetailValue: {
    flex: 1,
    fontSize: 13,
    fontWeight: "500",
    color: "#111827",
  },
  modalImageSection: {
    gap: 8,
  },
  modalImageLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginLeft: 4,
  },
  modalImageContainer: {
    backgroundColor: "#F3F4F6",
    borderRadius: 16,
    padding: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  modalImage: {
    width: "100%",
    height: 240,
    borderRadius: 12,
  },
  modalNoImage: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    gap: 8,
  },
  modalNoImageText: {
    fontSize: 13,
    color: "#6B7280",
  },
  modalInputSection: {
    gap: 8,
  },
  modalInputLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: "#374151",
    marginLeft: 4,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: "#111827",
    backgroundColor: "#F9FAFB",
    minHeight: 80,
  },
  modalRejectionSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEF2F2",
    borderRadius: 12,
    padding: 12,
  },
  modalRejectionText: {
    flex: 1,
    fontSize: 13,
    color: "#DC2626",
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  modalCancelButton: {
    flex: 1,
    height: 48,
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
  modalRejectButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    overflow: "hidden",
  },
  modalApproveButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    overflow: "hidden",
  },
  modalButtonDisabled: {
    opacity: 0.5,
  },
  modalButtonGradient: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  modalButtonText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: "600",
  },
  modalSingleAction: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  modalCloseAction: {
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  modalCloseActionText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: "600",
  },
});
