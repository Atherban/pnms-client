import { MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useCallback, useMemo } from "react";
import {
    ActivityIndicator,
    Dimensions,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import Animated, {
    FadeInDown,
    FadeInUp,
    Layout,
} from "react-native-reanimated";

import FixedHeader from "@/src/components/common/FixedHeader";
import { PaymentService } from "@/src/services/payment.service";
import { useAuthStore } from "@/src/stores/auth.store";
import { Colors, Spacing } from "@/src/theme";
import type { PaymentProof } from "@/src/types/payment.types";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const formatMoney = (amount: number) =>
  `₹${Math.round(amount).toLocaleString("en-IN")}`;

const formatCompactMoney = (amount: number) => {
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
  return `₹${amount}`;
};

const formatDate = (dateString?: string) => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

// ==================== STATS CARD ====================

interface StatsCardProps {
  totalCount: number;
  totalAmount: number;
  latestDate?: string;
}

const StatsCard = ({ totalCount, totalAmount, latestDate }: StatsCardProps) => {
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
              <MaterialIcons name="error" size={20} color={Colors.error} />
            </View>
            <View style={styles.statContent}>
              <Text style={styles.statLabel}>Total Rejected</Text>
              <Text style={[styles.statValue, { color: Colors.error }]}>
                {totalCount}
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
              <MaterialIcons
                name="attach-money"
                size={20}
                color={Colors.warning}
              />
            </View>
            <View style={styles.statContent}>
              <Text style={styles.statLabel}>Amount</Text>
              <Text style={[styles.statValue, { color: Colors.warning }]}>
                {formatCompactMoney(totalAmount)}
              </Text>
            </View>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statItem}>
            <View
              style={[
                styles.statIcon,
                { backgroundColor: Colors.textTertiary + "10" },
              ]}
            >
              <MaterialIcons
                name="calendar-today"
                size={20}
                color={Colors.textTertiary}
              />
            </View>
            <View style={styles.statContent}>
              <Text style={styles.statLabel}>Latest</Text>
              <Text style={[styles.statValue, { color: Colors.text }]}>
                {formatDate(latestDate)}
              </Text>
            </View>
          </View>
        </View>
      </LinearGradient>
    </Animated.View>
  );
};

// ==================== REJECTED PAYMENT CARD ====================

interface RejectedPaymentCardProps {
  item: PaymentProof;
  onPress: (id: string) => void;
  index: number;
}

const RejectedPaymentCard = ({
  item,
  onPress,
  index,
}: RejectedPaymentCardProps) => {
  const submittedDate = formatDate(item.submittedAt);
  const reviewedDate = formatDate(item.reviewedAt);

  const reasonPreview = item.rejectionReason
    ? item.rejectionReason.split("\n")[0].substring(0, 80)
    : "No reason provided";
  const showMore = item.rejectionReason
    ? item.rejectionReason.length > 80
    : false;

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
        {/* Header - Amount & Status */}
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <Text style={styles.amountLabel}>Not Verified</Text>
            <Text style={styles.amountValue}>{formatMoney(item.amount)}</Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: Colors.error + "10" },
            ]}
          >
            <MaterialIcons name="error" size={12} color={Colors.error} />
            <Text style={[styles.statusText, { color: Colors.error }]}>
              Rejected
            </Text>
          </View>
        </View>

        {/* Customer Info */}
        <View style={styles.infoSection}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Customer</Text>
            <Text style={styles.infoValue}>{item.customerName}</Text>
          </View>
        </View>

        {/* Payment Mode & Dates */}
        <View style={styles.metaSection}>
          <View style={styles.metaRow}>
            <MaterialIcons
              name="payment"
              size={14}
              color={Colors.textTertiary}
            />
            <Text style={styles.metaText}>
              {item.mode?.replace("_", " ") || "N/A"}
            </Text>
          </View>
          <View style={styles.metaRow}>
            <MaterialIcons
              name="calendar-today"
              size={14}
              color={Colors.textTertiary}
            />
            <Text style={styles.metaText}>Submitted: {submittedDate}</Text>
          </View>
          {item.reviewedAt && (
            <View style={styles.metaRow}>
              <MaterialIcons
                name="check-circle"
                size={14}
                color={Colors.textTertiary}
              />
              <Text style={styles.metaText}>Reviewed: {reviewedDate}</Text>
            </View>
          )}
        </View>

        {/* Rejection Reason Preview */}
        <View style={styles.reasonPreviewContainer}>
          <Text style={styles.reasonPreviewLabel}>Rejection Reason</Text>
          <Text style={styles.reasonPreviewText} numberOfLines={2}>
            {reasonPreview}
            {showMore ? "..." : ""}
          </Text>
        </View>

        {/* View Details Button */}
        <Pressable
          onPress={() => onPress(item.id)}
          style={({ pressed }) => [
            styles.viewButton,
            pressed && styles.buttonPressed,
          ]}
        >
          <Text style={styles.viewButtonText}>View Details</Text>
          <MaterialIcons name="arrow-forward" size={16} color={Colors.error} />
        </Pressable>
      </LinearGradient>
    </Animated.View>
  );
};

// ==================== MAIN SCREEN ====================

export default function RejectedPaymentsListScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ["payment-proofs", "rejected"],
    queryFn: () => PaymentService.listPaymentProofs("REJECTED"),
    staleTime: 5 * 60 * 1000,
  });

  const rejectedPayments = (data || []) as PaymentProof[];

  // Calculate stats
  const stats = useMemo(() => {
    const totalCount = rejectedPayments.length;
    const totalAmount = rejectedPayments.reduce(
      (sum, item) => sum + (item.amount || 0),
      0,
    );
    const latestDate =
      rejectedPayments.length > 0
        ? rejectedPayments.sort(
            (a, b) =>
              new Date(b.reviewedAt || b.submittedAt).getTime() -
              new Date(a.reviewedAt || a.submittedAt).getTime(),
          )[0].reviewedAt || rejectedPayments[0].submittedAt
        : undefined;

    return { totalCount, totalAmount, latestDate };
  }, [rejectedPayments]);

  // Refetch when screen is focused
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  const handlePaymentPress = (id: string) => {
    router.push({
      pathname: "/(customer)/rejected-payments/[id]",
      params: { id },
    });
  };

  return (
    <View style={styles.container}>
      <FixedHeader
        title="Rejected Payments"
        subtitle="Review and resubmit your rejected payments"
        titleStyle={styles.headerTitle}
        actions={
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
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => refetch()}
          />
        }
      >
        {/* Stats Card */}
        {rejectedPayments.length > 0 && (
          <StatsCard
            totalCount={stats.totalCount}
            totalAmount={stats.totalAmount}
            latestDate={stats.latestDate}
          />
        )}

        {/* Loading State */}
        {isLoading ? (
          <Animated.View
            entering={FadeInDown.springify()}
            style={styles.loadingContainer}
          >
            <ActivityIndicator size="large" color={Colors.error} />
            <Text style={styles.loadingText}>Loading rejected payments...</Text>
          </Animated.View>
        ) : error ? (
          <Animated.View
            entering={FadeInDown.springify()}
            style={styles.errorCard}
          >
            <View style={styles.errorIconContainer}>
              <MaterialIcons
                name="error-outline"
                size={48}
                color={Colors.error}
              />
            </View>
            <Text style={styles.errorTitle}>Unable to Load</Text>
            <Text style={styles.errorMessage}>
              {error instanceof Error
                ? error.message
                : "Failed to load rejected payments"}
            </Text>
            <Pressable
              onPress={() => refetch()}
              style={({ pressed }) => [
                styles.retryButton,
                pressed && styles.buttonPressed,
              ]}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </Pressable>
          </Animated.View>
        ) : rejectedPayments.length === 0 ? (
          <Animated.View
            entering={FadeInDown.springify()}
            style={styles.emptyCard}
          >
            <View style={styles.emptyIconContainer}>
              <MaterialIcons
                name="check-circle"
                size={48}
                color={Colors.success}
              />
            </View>
            <Text style={styles.emptyTitle}>No Rejected Payments</Text>
            <Text style={styles.emptyMessage}>
              All your payments are verified. Great job!
            </Text>
          </Animated.View>
        ) : (
          rejectedPayments.map((item, index) => (
            <RejectedPaymentCard
              key={item.id}
              item={item}
              onPress={handlePaymentPress}
              index={index}
            />
          ))
        )}
      </ScrollView>
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
    fontSize: 14,
    fontWeight: "700",
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: "#E5E7EB",
    marginHorizontal: 6,
  },

  // Rejected Payment Card
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
    padding: Spacing.lg,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
  },
  cardHeaderLeft: {
    flex: 1,
  },
  amountLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 2,
  },
  amountValue: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
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

  // Info Section
  infoSection: {
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  infoLabel: {
    fontSize: 12,
    color: "#6B7280",
  },
  infoValue: {
    fontSize: 13,
    fontWeight: "500",
    color: "#111827",
    flex: 1,
    textAlign: "right",
  },
  monospace: {
    fontFamily: "monospace",
    fontSize: 11,
  },

  // Meta Section
  metaSection: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
    gap: Spacing.xs,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  metaText: {
    fontSize: 11,
    color: "#6B7280",
  },

  // Reason Preview
  reasonPreviewContainer: {
    backgroundColor: "#FEF2F2",
    borderRadius: 12,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: "#FEE2E2",
  },
  reasonPreviewLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.error,
    marginBottom: 4,
  },
  reasonPreviewText: {
    fontSize: 13,
    color: "#5F2828",
    lineHeight: 16,
  },

  // View Details Button
  viewButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.sm,
    gap: Spacing.xs,
  },
  viewButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.error,
  },
  buttonPressed: {
    transform: [{ scale: 0.98 }],
  },

  // Loading State
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    gap: Spacing.md,
  },
  loadingText: {
    fontSize: 14,
    color: "#6B7280",
  },

  // Error State
  errorCard: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    backgroundColor: Colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: Spacing.md,
  },
  errorIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#FEF2F2",
    alignItems: "center",
    justifyContent: "center",
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
  },
  errorMessage: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    paddingHorizontal: 24,
  },
  retryButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.error,
    borderRadius: 12,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.white,
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
    backgroundColor: Colors.success + "10",
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
});
