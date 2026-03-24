import { MaterialIcons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
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
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import StitchCard from "../../../components/common/StitchCard";
import StitchHeader from "../../../components/common/StitchHeader";
import { AdminTheme } from "../../../components/admin/theme";
import { PaymentService } from "../../../services/payment.service";
import { useAuthStore } from "../../../stores/auth.store";

const BOTTOM_NAV_HEIGHT = 80;
const SCREEN_WIDTH = Dimensions.get("window").width;

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
  <View style={styles.statsCard}>
    <View style={styles.statsRow}>

      <View style={styles.statItem}>
        <View style={[styles.statIcon, { backgroundColor: `${AdminTheme.colors.primary}20` }]}>
          <Text style={styles.statLabel}>Total</Text>
          <MaterialIcons name="receipt" size={16} color={AdminTheme.colors.primary} />
          <Text style={styles.statNumber}>{total}</Text>
        </View>
        
      </View>

      

      <View style={styles.statItem}>
        <View style={[styles.statIcon, { backgroundColor: "#D9770620" }]}>
          <Text style={styles.statLabel}>Pending</Text>
          <MaterialIcons name="pending" size={16} color="#D97706" />
          <Text style={styles.statNumber}>{pending}</Text>
        </View>
        
        
      </View>

      

      <View style={styles.statItem}>
        <View style={[styles.statIcon, { backgroundColor: "#05966920" }]}>
          <Text style={styles.statLabel}>Approved</Text>
          <MaterialIcons name="check-circle" size={16} color="#059669" />
          <Text style={styles.statNumber}>{approved}</Text>
        </View>
       
      </View>



      <View style={styles.statItem}>
        <View style={[styles.statIcon, { backgroundColor: "#DC262620" }]}>
          <Text style={styles.statLabel}>Rejected</Text>
          <MaterialIcons name="cancel" size={16} color="#DC2626" />
          <Text style={styles.statNumber}>{rejected}</Text>
        </View>
      </View>
    </View>
  </View>
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
            <View style={[styles.avatar, { backgroundColor: `${AdminTheme.colors.primary}10` }]}>
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
            <View style={styles.modalBlur}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <View style={[styles.modalAvatar, { backgroundColor: `${AdminTheme.colors.primary}10` }]}>
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
                  <View style={[styles.modalButtonGradient, { backgroundColor: "#DC2626" }]}>
                    <MaterialIcons name="close" size={18} color={AdminTheme.colors.surface} />
                    <Text style={styles.modalButtonText}>Reject</Text>
                  </View>
                </Pressable>
                <Pressable
                  onPress={onApprove}
                  disabled={isPending}
                  style={[styles.modalApproveButton, isPending && styles.modalButtonDisabled]}
                >
                  <View style={[styles.modalButtonGradient, { backgroundColor: "#059669" }]}>
                    <MaterialIcons name="check" size={18} color={AdminTheme.colors.surface} />
                    <Text style={styles.modalButtonText}>Approve</Text>
                  </View>
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
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

// ==================== MAIN COMPONENT ====================

export default function AdminPaymentVerificationScreen() {
  const router = useRouter();
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
      <StitchHeader
        title="Payment Verification"
        subtitle="Approve or reject payment screenshots"
        onBackPress={() => router.back()}
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
              color={AdminTheme.colors.surface}
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
            <View style={styles.emptyIconContainer}>
              <MaterialIcons name="receipt" size={48} color="#9CA3AF" />
            </View>
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
    backgroundColor: AdminTheme.colors.background,
  },
  headerIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.21)",
  },
  headerIconBtnPressed: {
    
    transform: [{ scale: 0.95 }],
  },

  // Stats Card
  statsCard: {
    marginHorizontal: 20,
    gap:10,
    marginTop: 20,
    marginBottom: 8,
    // backgroundColor:"red",
    overflow: "hidden",
    
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    // backgroundColor:"red"
  },
  statItem: {
    flex: 1,
    flexDirection: "column",
    alignItems: "center",
    gap: 8,
  },
  statIcon: {
    flexDirection:"column",
    width: SCREEN_WIDTH / 4 -20,
    paddingVertical: 12,
    gap:5,
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
    height: "100%",
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
    backgroundColor: AdminTheme.colors.surface,
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
    color: AdminTheme.colors.primary,
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
    color: AdminTheme.colors.primary,
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
    backgroundColor: AdminTheme.colors.surface,
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
    color: AdminTheme.colors.surface,
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
    backgroundColor: AdminTheme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  modalCloseActionText: {
    color: AdminTheme.colors.surface,
    fontSize: 15,
    fontWeight: "600",
  },
});
