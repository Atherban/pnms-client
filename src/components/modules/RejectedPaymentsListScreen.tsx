import { MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useCallback, useMemo } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  StyleSheet,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CustomerActionButton } from "@/src/components/customer/CustomerActionButton";
import StitchHeader from "../common/StitchHeader";
import StitchCard from "../common/StitchCard";
import StitchSectionHeader from "../common/StitchSectionHeader";
import StitchStatusBadge from "../common/StitchStatusBadge";
import { PaymentService } from "@/src/services/payment.service";
import type { PaymentProof } from "@/src/types/payment.types";
import { AdminTheme } from "../admin/theme";
import { moduleListRow } from "../common/moduleStyles";

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

export default function RejectedPaymentsListScreen() {
  const router = useRouter();

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ["payment-proofs", "rejected"],
    queryFn: () => PaymentService.listPaymentProofs("REJECTED"),
    staleTime: 5 * 60 * 1000,
  });

  const rejectedPayments = useMemo(() => (Array.isArray(data) ? data : []), [data]) as PaymentProof[];

  const stats = useMemo(() => {
    const totalCount = rejectedPayments.length;
    const totalAmount = rejectedPayments.reduce((sum, item) => sum + (item.amount || 0), 0);
    const latest = [...rejectedPayments]
      .sort(
        (a, b) =>
          new Date(b.reviewedAt || b.submittedAt || 0).getTime() -
          new Date(a.reviewedAt || a.submittedAt || 0).getTime(),
      )[0];
    const latestDate = latest?.reviewedAt || latest?.submittedAt;
    return { totalCount, totalAmount, latestDate };
  }, [rejectedPayments]);

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  return (
    <SafeAreaView style={styles.container} edges={["left", "right"]}>
      <StitchHeader
        title="Rejected Payments"
        subtitle="Review failed proofs and re-submit against the invoice."
        variant="gradient"
        showBackButton
        onBackPress={() => router.back()}
        actions={
          <Pressable onPress={() => refetch()} style={styles.headerRefreshButton}>
            <MaterialIcons name={isRefetching ? "sync" : "refresh"} size={20} color={AdminTheme.colors.text} />
          </Pressable>
        }
      />
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            colors={[AdminTheme.colors.primary]}
            tintColor={AdminTheme.colors.primary}
          />
        }
        contentContainerStyle={styles.scrollContent}
      >
        <StitchCard style={styles.explainCard}>
          <StitchSectionHeader
            title="Common rejection reasons"
            subtitle="Blurry screenshots, incorrect amounts, or missing transaction reference usually cause rejection."
            action={<StitchStatusBadge label="Fix and re-submit" tone="warning" />}
          />
          <Text style={styles.explainHint}>
            Open any invoice below and upload a clearer proof under Payment Details.
          </Text>
        </StitchCard>

        {rejectedPayments.length > 0 ? (
          <View style={styles.statsRow}>
            <StitchCard style={styles.statCard}>
              <Text style={styles.statLabel}>Rejected</Text>
              <Text style={styles.statValue}>{String(stats.totalCount)}</Text>
            </StitchCard>
            <StitchCard style={styles.statCard}>
              <Text style={styles.statLabel}>Amount</Text>
              <Text style={styles.statValue}>{formatMoney(stats.totalAmount)}</Text>
            </StitchCard>
            <StitchCard style={styles.statCard}>
              <Text style={styles.statLabel}>Latest</Text>
              <Text style={styles.statValue}>{stats.latestDate ? formatDate(stats.latestDate) : "-"}</Text>
            </StitchCard>
          </View>
        ) : null}

        {isLoading ? (
          <StitchCard style={styles.loadingCard}>
            <ActivityIndicator size="large" color={AdminTheme.colors.primary} />
            <Text style={styles.loadingText}>Loading rejected payments...</Text>
          </StitchCard>
        ) : null}

        {!isLoading && error ? (
          <StitchCard style={styles.loadingCard}>
            <MaterialIcons name="error-outline" size={44} color={AdminTheme.colors.danger} />
            <Text style={styles.loadingText}>
              {error instanceof Error ? error.message : "Failed to load rejected payments."}
            </Text>
            <CustomerActionButton
              label="Retry"
              onPress={() => refetch()}
              icon={<MaterialIcons name="refresh" size={18} color={AdminTheme.colors.surface} />}
            />
          </StitchCard>
        ) : null}

        {!isLoading && !error && rejectedPayments.length === 0 ? (
          <StitchCard style={styles.loadingCard}>
            <MaterialIcons name="task-alt" size={44} color={AdminTheme.colors.textMuted} />
            <Text style={styles.loadingText}>
              All your payment proofs are approved or currently being processed.
            </Text>
          </StitchCard>
        ) : null}

        {!isLoading && !error ? (
          <View style={styles.list}>
            {rejectedPayments.map((item) => {
            const reason =
              (item.rejectionReason || "").trim() || "No rejection reason provided.";
            const submittedAt = item.submittedAt ? formatDate(item.submittedAt) : "-";
            const reviewedAt = item.reviewedAt ? formatDate(item.reviewedAt) : undefined;

            return (
              <StitchCard key={item.id} style={styles.itemCard}>
                <View style={styles.itemHeader}>
                  <View style={styles.itemTitleWrap}>
                    <Text style={styles.itemAmount}>{formatMoney(item.amount || 0)}</Text>
                    <Text style={styles.itemMeta}>
                      {reviewedAt ? `Reviewed ${reviewedAt}` : `Submitted ${submittedAt}`}
                      {item.mode ? ` • ${String(item.mode).replace(/_/g, " ")}` : ""}
                    </Text>
                  </View>
                  <StitchStatusBadge label="Rejected" tone="danger" />
                </View>

                <View style={styles.reasonBox}>
                  <MaterialIcons name="error-outline" size={16} color={AdminTheme.colors.danger} />
                  <Text style={styles.reasonText} numberOfLines={3}>
                    {reason}
                  </Text>
                </View>

                <View style={styles.actionsRow}>
                  <CustomerActionButton
                    label="Open Invoice"
                    variant="secondary"
                    onPress={() => router.push(`/(customer)/dues/${item.saleId}` as any)}
                    style={styles.flex}
                  />
                  <CustomerActionButton
                    label="Upload Proof"
                    onPress={() => router.push(`/(customer)/dues/${item.saleId}` as any)}
                    style={styles.flex}
                  />
                </View>
              </StitchCard>
            );
            })}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AdminTheme.colors.background,
  },
  scrollContent: {
    paddingHorizontal: AdminTheme.spacing.lg,
    paddingBottom: AdminTheme.spacing.xl,
    gap: AdminTheme.spacing.md,
  },
  headerRefreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: AdminTheme.colors.borderSoft,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(15,189,73,0.10)",
  },
  explainCard: {
    gap: AdminTheme.spacing.sm,
  },
  explainHint: {
    color: AdminTheme.colors.textMuted,
    lineHeight: 20,
  },
  statsRow: {
    flexDirection: "row",
    gap: AdminTheme.spacing.sm,
  },
  statCard: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  statLabel: {
    fontSize: 11,
    color: AdminTheme.colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  statValue: {
    fontSize: 14,
    fontWeight: "700",
    color: AdminTheme.colors.text,
  },
  loadingCard: {
    alignItems: "center",
    gap: AdminTheme.spacing.sm,
    paddingVertical: AdminTheme.spacing.xl,
  },
  loadingText: {
    color: AdminTheme.colors.textMuted,
  },
  list: {
    gap: AdminTheme.spacing.md,
  },
  itemCard: {
    ...moduleListRow,
    gap: AdminTheme.spacing.md,
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: AdminTheme.spacing.sm,
  },
  itemTitleWrap: {
    flex: 1,
    gap: 4,
  },
  itemAmount: {
    fontSize: 18,
    fontWeight: "900",
    color: AdminTheme.colors.text,
  },
  itemMeta: {
    color: AdminTheme.colors.textMuted,
    fontSize: 12,
  },
  reasonBox: {
    flexDirection: "row",
    gap: 8,
    padding: AdminTheme.spacing.sm,
    borderRadius: 16,
    backgroundColor: "#FCE8E8",
  },
  reasonText: {
    flex: 1,
    color: AdminTheme.colors.danger,
    lineHeight: 20,
  },
  actionsRow: {
    flexDirection: "row",
    gap: AdminTheme.spacing.sm,
  },
  flex: {
    flex: 1,
  },
});
