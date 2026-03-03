import { MaterialIcons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import FixedHeader from "../../../components/common/FixedHeader";
import { PaymentService } from "../../../services/payment.service";
import { useAuthStore } from "../../../stores/auth.store";
import { Colors } from "../../../theme";

const BOTTOM_NAV_HEIGHT = 80;

const formatMoney = (amount: number) =>
  `₹${Math.round(amount).toLocaleString("en-IN")}`;

const formatDate = (dateString?: string) => {
  if (!dateString) return "-";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "-";

  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return `Today, ${date.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })}`;
  } else if (date.toDateString() === yesterday.toDateString()) {
    return `Yesterday, ${date.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })}`;
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const getStatusConfig = (status?: string) => {
  const value = String(status || "").toUpperCase();
  if (value.includes("VERIFIED") || value.includes("PAID")) {
    return {
      label: "Verified",
      color: Colors.success,
      bg: "#ECFDF5",
      icon: "check-circle",
    };
  }
  if (value.includes("REJECTED") || value.includes("CANCEL")) {
    return {
      label: "Rejected",
      color: Colors.error,
      bg: "#FEF2F2",
      icon: "cancel",
    };
  }
  if (value.includes("PENDING")) {
    return {
      label: "Pending",
      color: Colors.warning,
      bg: "#FFFBEB",
      icon: "pending",
    };
  }
  return {
    label: status || "Unknown",
    color: Colors.textSecondary,
    bg: "#F3F4F6",
    icon: "help",
  };
};

// ==================== STATS CARD ====================

interface StatCardProps {
  label: string;
  value: string;
  icon: string;
  color: string;
}

const StatCard = ({ label, value, icon, color }: StatCardProps) => (
  <View style={[styles.statCard, { backgroundColor: `${color}08` }]}>
    <View style={[styles.statIcon, { backgroundColor: `${color}15` }]}>
      <MaterialIcons name={icon as any} size={18} color={color} />
    </View>
    <Text style={styles.statLabel}>{label}</Text>
    <Text style={[styles.statValue, { color }]}>{value}</Text>
  </View>
);

// ==================== COPYABLE FIELD ====================

interface CopyableFieldProps {
  label: string;
  value: string;
  icon?: string;
}

const CopyableField = ({
  label,
  value,
  icon = "content-copy",
}: CopyableFieldProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await Clipboard.setStringAsync(value);
    setCopied(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!value || value === "-" || value === "") return null;

  return (
    <TouchableOpacity
      style={styles.copyableField}
      onPress={handleCopy}
      activeOpacity={0.7}
    >
      <View style={styles.copyableFieldContent}>
        <Text style={styles.copyableFieldLabel}>{label}</Text>
        <View style={styles.copyableFieldValueContainer}>
          <Text
            style={styles.copyableFieldValue}
            numberOfLines={1}
            ellipsizeMode="middle"
          >
            {value}
          </Text>
          <MaterialIcons
            name={copied ? "check" : (icon as any)}
            size={16}
            color={copied ? Colors.success : Colors.primary}
          />
        </View>
      </View>
    </TouchableOpacity>
  );
};

// ==================== TRANSACTION CARD ====================

interface TransactionCardProps {
  transaction: any;
}

const TransactionCard = ({ transaction }: TransactionCardProps) => {
  const status = getStatusConfig(transaction.status);

  return (
    <View style={styles.txCard}>
      {/* Header */}
      <View style={styles.txHeader}>
        <View style={styles.txHeaderLeft}>
          <View
            style={[styles.txIcon, { backgroundColor: `${status.color}10` }]}
          >
            <MaterialIcons
              name={status.icon as any}
              size={18}
              color={status.color}
            />
          </View>
          <View>
            <Text style={styles.txAmount}>
              {formatMoney(transaction.amount)}
            </Text>
            <Text style={styles.txDate}>
              {formatDate(transaction.paymentAt)}
            </Text>
          </View>
        </View>
        <View style={[styles.txStatusBadge, { backgroundColor: status.bg }]}>
          <Text style={[styles.txStatusText, { color: status.color }]}>
            {status.label}
          </Text>
        </View>
      </View>

      {/* Payment Mode */}
      <View style={styles.txDetailRow}>
        <MaterialIcons name="payment" size={14} color="#6B7280" />
        <Text style={styles.txDetailLabel}>Payment Mode:</Text>
        <Text style={styles.txDetailValue}>{transaction.mode || "—"}</Text>
      </View>

      {/* Important Reference Numbers - Only these 3 are shown */}
      <CopyableField
        label="UTR Number (UPI Reference)"
        value={transaction.utrNumber}
        icon="qr-code"
      />

      <CopyableField
        label="Reference Number"
        value={transaction.reference}
        icon="fingerprint"
      />

      {/* Rejection Reason - Only shown if rejected */}
      {transaction.rejectionReason && (
        <View style={styles.rejectionContainer}>
          <MaterialIcons name="error" size={16} color={Colors.error} />
          <Text style={styles.rejectionText}>
            {transaction.rejectionReason}
          </Text>
        </View>
      )}
    </View>
  );
};

// ==================== MAIN COMPONENT ====================

export default function CustomerDueDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["customer-dues-detail", id, user?.id, user?.phoneNumber],
    enabled: !!id && !!user,
    queryFn: async () => {
      if (!user) throw new Error("User not authenticated");
      const all = await PaymentService.getDueSalesForUser({
        id: user.id,
        phoneNumber: user.phoneNumber,
        role: user.role,
        nurseryId: user.nurseryId,
      });
      const match = all.find((row) => row.saleId === id);
      if (!match) throw new Error("Payment record not found");
      return match;
    },
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await refetch();
    setRefreshing(false);
  };

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const handleGenerateBill = () => {
    if (!id) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/(customer)/sales/bill/${id}` as any);
  };

  if (!id) return null;

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <FixedHeader
          title="Payment Details"
          subtitle="Loading payment information..."
          showBackButton
          onBackPress={handleBack}
        />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading payment details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !data) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <FixedHeader
          title="Payment Details"
          subtitle="Error loading data"
          showBackButton
          onBackPress={handleBack}
        />
        <View style={styles.centerContainer}>
          <MaterialIcons name="error-outline" size={48} color={Colors.error} />
          <Text style={styles.errorTitle}>Failed to Load</Text>
          <Text style={styles.errorMessage}>
            Unable to load this payment record. Please try again.
          </Text>
          <TouchableOpacity onPress={handleRefresh} style={styles.retryButton}>
            <LinearGradient
              colors={[Colors.primary, Colors.primaryLight || Colors.primary]}
              style={styles.retryGradient}
            >
              <Text style={styles.retryButtonText}>Try Again</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const paymentProgress =
    data.totalAmount > 0
      ? Math.min(Math.max((data.paidAmount / data.totalAmount) * 100, 0), 100)
      : 0;

  return (
    <View style={styles.container}>
      <FixedHeader
        title="Payment Details"
        subtitle="Invoice payment summary"
        showBackButton
        onBackPress={handleBack}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
      >
        {/* Summary Stats */}
        <View style={styles.statsGrid}>
          <StatCard
            label="Total Bill"
            value={formatMoney(data.totalAmount)}
            icon="receipt"
            color={Colors.primary}
          />
          <StatCard
            label="Paid"
            value={formatMoney(data.paidAmount)}
            icon="check-circle"
            color={Colors.success}
          />
          <StatCard
            label="Balance"
            value={formatMoney(data.dueAmount)}
            icon="account-balance"
            color={data.dueAmount > 0 ? Colors.error : Colors.success}
          />
        </View>

        {/* Customer Info */}
        <View style={styles.customerCard}>
          <View style={styles.customerHeader}>
            <View
              style={[
                styles.customerAvatar,
                { backgroundColor: `${Colors.primary}10` },
              ]}
            >
              <Text style={styles.customerInitial}>
                {data.customerName?.charAt(0).toUpperCase() || "?"}
              </Text>
            </View>
            <View style={styles.customerInfo}>
              <Text style={styles.customerName}>{data.customerName}</Text>
            </View>
          </View>

          {/* Payment Progress */}
          <View style={styles.progressContainer}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>Payment Progress</Text>
              <Text style={styles.progressValue}>
                {paymentProgress.toFixed(1)}%
              </Text>
            </View>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${paymentProgress}%`,
                    backgroundColor:
                      paymentProgress === 100 ? Colors.success : Colors.primary,
                  },
                ]}
              />
            </View>
          </View>
        </View>

        {/* Transaction History */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="history" size={18} color={Colors.primary} />
            <Text style={styles.sectionTitle}>Transaction History</Text>
          </View>

          {data.transactions.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="history" size={32} color="#9CA3AF" />
              <Text style={styles.emptyTitle}>No Transactions Yet</Text>
              <Text style={styles.emptyMessage}>
                Transactions will appear here once payments are recorded.
              </Text>
            </View>
          ) : (
            data.transactions.map((tx) => (
              <TransactionCard key={tx.id} transaction={tx} />
            ))
          )}
        </View>

        {/* Back Link */}
        <TouchableOpacity
          onPress={handleGenerateBill}
          style={styles.billButton}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={[Colors.primary, Colors.primaryLight || Colors.primary]}
            style={styles.billButtonGradient}
          >
            <MaterialIcons name="receipt-long" size={18} color={Colors.white} />
            <Text style={styles.billButtonText}>Generate Full Bill</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push("/(customer)/dues")}
          style={styles.backLink}
        >
          <MaterialIcons name="arrow-back" size={16} color={Colors.primary} />
          <Text style={styles.backLinkText}>Back to payments</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },

  // Center Container
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: "#6B7280",
  },

  // Content
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: BOTTOM_NAV_HEIGHT + 100,
    gap: 20,
  },

  // Stats Grid
  statsGrid: {
    flexDirection: "row",
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
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

  // Customer Card
  customerCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 16,
  },
  customerHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  customerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  customerInitial: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.primary,
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },

  // Progress
  progressContainer: {
    gap: 8,
  },
  progressHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  progressLabel: {
    fontSize: 12,
    color: "#6B7280",
  },
  progressValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
  },
  progressBar: {
    height: 6,
    backgroundColor: "#F3F4F6",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },

  // Section
  section: {
    gap: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },

  // Transaction Card
  txCard: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 12,
  },
  txHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  txHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  txIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  txAmount: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 2,
  },
  txDate: {
    fontSize: 11,
    color: "#6B7280",
  },
  txStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
  },
  txStatusText: {
    fontSize: 11,
    fontWeight: "600",
  },
  txDetailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 4,
  },
  txDetailLabel: {
    fontSize: 12,
    color: "#6B7280",
  },
  txDetailValue: {
    fontSize: 12,
    fontWeight: "600",
    color: "#111827",
  },

  // Copyable Field
  copyableField: {
    backgroundColor: "#F9FAFB",
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginTop: 4,
  },
  copyableFieldContent: {
    gap: 4,
  },
  copyableFieldLabel: {
    fontSize: 10,
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  copyableFieldValueContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  copyableFieldValue: {
    fontSize: 13,
    fontWeight: "500",
    color: "#111827",
    flex: 1,
    marginRight: 8,
  },

  // Rejection
  rejectionContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEF2F2",
    borderRadius: 10,
    padding: 10,
    marginTop: 4,
  },
  rejectionText: {
    fontSize: 12,
    color: "#DC2626",
    flex: 1,
  },

  // Empty State
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  emptyMessage: {
    fontSize: 12,
    color: "#6B7280",
    textAlign: "center",
    paddingHorizontal: 24,
  },

  // Back Link
  backLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
  },
  backLinkText: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: "500",
  },
  billButton: {
    borderRadius: 12,
    overflow: "hidden",
  },
  billButtonGradient: {
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  billButtonText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: "700",
  },

  // Error State
  errorTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#DC2626",
  },
  errorMessage: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    paddingHorizontal: 20,
  },
  retryButton: {
    borderRadius: 10,
    overflow: "hidden",
    marginTop: 8,
  },
  retryGradient: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  retryButtonText: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: "600",
  },
});
