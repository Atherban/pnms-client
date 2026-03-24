import { MaterialIcons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import * as Clipboard from "expo-clipboard";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { CustomerActionButton } from "@/src/components/customer/CustomerActionButton";
import {
  CustomerCard,
  CustomerEmptyState,
  CustomerErrorState,
  CustomerScreen,
  SectionHeader,
  StatPill,
  StatusChip,
} from "@/src/components/common/StitchScreen";
import { PaymentService } from "@/src/services/payment.service";
import { useAuthStore } from "@/src/stores/auth.store";
import { CustomerColors, Spacing } from "@/src/theme";

const formatMoney = (amount: number) => `₹${Math.round(amount).toLocaleString("en-IN")}`;

const formatDate = (value?: string) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const getStatusTone = (status?: string): "success" | "warning" | "danger" | "default" => {
  const value = String(status || "").toUpperCase();
  if (value.includes("VERIFIED") || value.includes("PAID")) return "success";
  if (value.includes("REJECTED") || value.includes("CANCEL")) return "danger";
  if (value.includes("PENDING")) return "warning";
  return "default";
};

function CopyRow({ label, value }: { label: string; value?: string }) {
  const [copied, setCopied] = useState(false);

  if (!value) return null;

  return (
    <CustomerCard contentStyle={styles.contentStyle} style={styles.copyRow}>
      <View style={styles.copyTextWrap}>
        <Text style={styles.copyLabel}>{label}</Text>
        <Text style={styles.copyValue} numberOfLines={1} ellipsizeMode="middle">
          {value}
        </Text>
      </View>
      <CustomerActionButton
        label={copied ? "Copied" : "Copy"}
        icon={<MaterialIcons name={copied ? "check" : "content-copy"} size={20} color={copied ? CustomerColors.success : CustomerColors.primary} />}
        variant="secondary"
        onPress={async () => {
          await Clipboard.setStringAsync(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
      />
    </CustomerCard>
  );
}

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
    await refetch();
    setRefreshing(false);
  };

  if (isLoading) {
    return (
      <CustomerScreen title="Payment Detail" subtitle="Loading invoice..." onBackPress={() => router.back()}>
        <CustomerCard style={styles.centerCard}>
          <Text style={styles.helperText}>Loading payment details...</Text>
        </CustomerCard>
      </CustomerScreen>
    );
  }

  if (error || !data) {
    return (
      <CustomerScreen title="Payment Detail" subtitle="Unable to load this invoice." onBackPress={() => router.back()}>
        <CustomerErrorState
          title="Payment record unavailable"
          message="Please go back and try again."
          action={
            <CustomerActionButton
              label="Back to Payments"
              variant="secondary"
              onPress={() => router.back()}
            />
          }
        />
      </CustomerScreen>
    );
  }

  const latestTx = [...data.transactions].sort((a, b) =>
    String(b.paymentAt || b.createdAt || "").localeCompare(String(a.paymentAt || a.createdAt || "")),
  )[0];

  return (
    <CustomerScreen
      title="Payment Detail"
      subtitle={data.itemTitle || "Invoice"}
      onBackPress={() => router.back()}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          colors={[CustomerColors.primary]}
          tintColor={CustomerColors.primary}
        />
      }
      footer={
        <View style={styles.footerActions}>
          <CustomerActionButton
            label="View Bill"
            onPress={() => router.push(`/(customer)/sales/bill/${data.saleId}` as any)}
          />
          <CustomerActionButton
            label="Back to Payments"
            variant="secondary"
            onPress={() => router.back()}
          />
        </View>
      }
    >
      <CustomerCard style={styles.summaryCard}>
        <SectionHeader
          title={data.itemTitle || "Invoice"}
          subtitle={formatDate(data.issuedAt)}
          trailing={<StatusChip label={data.dueAmount <= 0 ? "Paid" : "Open"} tone={data.dueAmount <= 0 ? "success" : "warning"} />}
        />
        <View style={styles.summaryGrid}>
          <StatPill label="Total" value={formatMoney(data.totalAmount)} />
          <StatPill label="Paid" value={formatMoney(data.paidAmount)} />
          <StatPill label="Balance" value={formatMoney(data.dueAmount)} />
        </View>
      </CustomerCard>

      <CustomerCard>
        <SectionHeader title="Financial breakdown" subtitle="Current invoice values based on all verified and pending payments." />
        <View style={styles.breakdownList}>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Net total</Text>
            <Text style={styles.breakdownValue}>{formatMoney(data.totalAmount)}</Text>
          </View>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Amount paid</Text>
            <Text style={[styles.breakdownValue, styles.successText]}>{formatMoney(data.paidAmount)}</Text>
          </View>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Balance due</Text>
            <Text style={[styles.breakdownStrong, data.dueAmount > 0 && styles.errorText]}>
              {formatMoney(data.dueAmount)}
            </Text>
          </View>
        </View>
      </CustomerCard>

      {latestTx ? (
        <CustomerCard>
          <SectionHeader
            title="Latest payment reference"
            subtitle="Copy these values if the nursery asks for proof or payment reference."
            trailing={<StatusChip label={String(latestTx.status).replace(/_/g, " ")} tone={getStatusTone(latestTx.status)} />}
          />
          <View style={styles.copySection}>
            <CopyRow label="UTR number" value={latestTx.utrNumber} />
            <CopyRow label="Reference number" value={latestTx.reference} />
          </View>
        </CustomerCard>
      ) : null}

      <CustomerCard>
        <SectionHeader title="Verification history" subtitle="Each submitted payment and its verification state appears here." />
        {data.transactions.length === 0 ? (
          <CustomerEmptyState
          title="No payments submitted"
          message="No payment proofs have been submitted against this invoice yet."
          icon={<MaterialIcons name="history" size={44} color={CustomerColors.textMuted} />}
        />
      ) : (
          <View style={styles.timeline}>
            {data.transactions.map((tx, index) => {
              const isLast = index === data.transactions.length - 1;
              return (
                <View key={tx.id} style={styles.timelineRow}>
                  <View style={styles.timelineRail}>
                    <View style={[styles.timelineDot, styles[`tone_${getStatusTone(tx.status)}` as keyof typeof styles] || styles.tone_default]}>
                      <MaterialIcons
                        name={getStatusTone(tx.status) === "success" ? "check" : getStatusTone(tx.status) === "danger" ? "close" : "schedule"}
                        size={12}
                        color={getStatusTone(tx.status) === "warning" ? CustomerColors.textMuted : CustomerColors.white}
                      />
                    </View>
                    {!isLast ? <View style={styles.timelineLine} /> : null}
                  </View>
                  <CustomerCard style={styles.transactionCard}>
                    <View style={styles.transactionHeader}>
                      <View>
                        <Text style={styles.transactionAmount}>{formatMoney(tx.amount)}</Text>
                        <Text style={styles.transactionMeta}>{formatDate(tx.paymentAt || tx.createdAt)}</Text>
                      </View>
                      <StatusChip label={String(tx.status).replace(/_/g, " ")} tone={getStatusTone(tx.status)} />
                    </View>
                    <View style={styles.transactionFields}>
                      <Text style={styles.transactionField}>Mode: {tx.mode || "-"}</Text>
                      {tx.utrNumber ? <Text style={styles.transactionField}>UTR: {tx.utrNumber}</Text> : null}
                      {tx.reference ? <Text style={styles.transactionField}>Reference: {tx.reference}</Text> : null}
                    </View>
                    {tx.rejectionReason ? (
                      <View style={styles.rejectionNotice}>
                        <MaterialIcons name="error" size={16} color={CustomerColors.danger} />
                        <Text style={styles.rejectionText}>{tx.rejectionReason}</Text>
                      </View>
                    ) : null}
                  </CustomerCard>
                </View>
              );
            })}
          </View>
        )}
      </CustomerCard>
    </CustomerScreen>
  );
}

const styles = StyleSheet.create({
  centerCard: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
  },
  helperText: {
    color: CustomerColors.textMuted,
  },
  footerActions: {
    gap: Spacing.sm,
  },
  summaryCard: {
    gap: Spacing.md,
  },
  summaryGrid: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  breakdownList: {
    marginTop: Spacing.md,
    gap: Spacing.md,
  },
  breakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  breakdownLabel: {
    color: CustomerColors.textMuted,
  },
  breakdownValue: {
    fontWeight: "600",
    color: CustomerColors.text,
  },
  breakdownStrong: {
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
  copySection: {
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  copyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,

  },
  contentStyle:{
    paddingHorizontal: Spacing.md,
    flexDirection: "row",
     alignItems: "center",
      justifyContent: "space-between",  
  },
  copyTextWrap: {
    
    flex: 1,
    gap: 4,
  },
  copyLabel: {

    fontSize: 12,
    color: CustomerColors.textMuted,
  },
  copyValue: {

    fontWeight: "700",
    color: CustomerColors.text,
  },
  timeline: {
    
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  timelineRow: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  timelineRail: {
    width: 22,
    alignItems: "center",
  },
  timelineDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  tone_success: {
    backgroundColor: CustomerColors.success,
  },
  tone_warning: {
    backgroundColor: CustomerColors.border,
    borderWidth: 1,
    borderColor: CustomerColors.borderStrong,
  },
  tone_danger: {
    backgroundColor: CustomerColors.danger,
  },
  tone_default: {
    backgroundColor: CustomerColors.border,
    borderWidth: 1,
    borderColor: CustomerColors.borderStrong,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    marginVertical: 6,
    backgroundColor: CustomerColors.borderStrong,
  },
  transactionCard: {
    flex: 1,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
  },
  transactionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  transactionAmount: {
    fontWeight: "700",
    color: CustomerColors.text,
  },
  transactionMeta: {
    marginTop: 4,
    fontSize: 12,
    color: CustomerColors.textMuted,
  },
  transactionFields: {
    gap: 4,
  },
  transactionField: {
    color: CustomerColors.textMuted,
    fontSize: 12,
  },
  rejectionNotice: {
    flexDirection: "row",
    gap: 8,
    padding: Spacing.sm,
    borderRadius: 14,
    backgroundColor: "rgba(239,68,68,0.12)",
  },
  rejectionText: {
    flex: 1,
    color: CustomerColors.danger,
    fontSize: 12,
  },
});
