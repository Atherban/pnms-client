import { MaterialIcons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  CustomerCard,
  CustomerEmptyState,
  CustomerScreen,
  SectionHeader,
  StatPill,
  StatusChip,
} from "@/src/components/common/StitchScreen";
import { CustomerSeedBatchService } from "@/src/services/customer-seed-batch.service";
import { CustomerColors, Spacing } from "@/src/theme";

const timelineSteps = [
  { key: "RECEIVED", label: "Seeds received" },
  { key: "SOWN", label: "Seeds sown" },
  { key: "GERMINATING", label: "Germination started" },
  { key: "READY", label: "Plants ready" },
  { key: "COLLECTED", label: "Collected" },
];

const statusOrder: Record<string, number> = {
  RECEIVED: 1,
  SOWN: 2,
  GERMINATING: 3,
  READY: 4,
  COLLECTED: 5,
  CLOSED: 5,
};

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

const formatCurrency = (value: number) => `₹${value.toLocaleString("en-IN")}`;

const getPaymentTone = (status: string): "success" | "warning" | "danger" => {
  switch (String(status || "").toUpperCase()) {
    case "PAID":
      return "success";
    case "PARTIAL":
      return "warning";
    default:
      return "danger";
  }
};

export default function CustomerSeedBatchDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["customer-seed-batch", id],
    queryFn: () => CustomerSeedBatchService.getById(String(id || "")),
    enabled: Boolean(id),
  });

  const batch = data;

  if (isLoading) {
    return (
      <CustomerScreen title="Seed Batch Detail" subtitle="Loading batch information..." onBackPress={() => router.back()}>
        <CustomerCard style={styles.centerCard}>
          <ActivityIndicator size="large" color={CustomerColors.primary} />
          <Text style={styles.helperText}>Loading batch details...</Text>
        </CustomerCard>
      </CustomerScreen>
    );
  }

  if (!batch) {
    return (
      <CustomerScreen title="Seed Batch Detail" subtitle="Not found" onBackPress={() => router.back()}>
        <CustomerEmptyState
          title="Batch not found"
          message="The selected seed batch is unavailable or no longer accessible."
          icon={<MaterialIcons name="error-outline" size={44} color={CustomerColors.danger} />}
        />
      </CustomerScreen>
    );
  }

  const plantTypeName =
    typeof batch.plantTypeId === "object" ? batch.plantTypeId?.name : "Seed batch";
  const currentOrder = statusOrder[String(batch.status || "RECEIVED").toUpperCase()] || 1;
  const sown = Number(batch.seedsSown || 0);
  const germinated = Number(batch.germinatedQuantity ?? batch.seedsGerminated ?? 0);
  const discarded = Number(batch.discardedQuantity ?? batch.seedsDiscarded ?? 0);
  const paymentStatus =
    typeof batch.saleId === "object" ? batch.saleId?.paymentStatus || "UNPAID" : "UNPAID";

  return (
    <CustomerScreen
      title="Seed Batch Detail"
      subtitle={plantTypeName}
      onBackPress={() => router.back()}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={refetch}
          colors={[CustomerColors.primary]}
          tintColor={CustomerColors.primary}
        />
      }
    >
      <CustomerCard style={styles.heroCard}>
        <SectionHeader
          title={plantTypeName}
          subtitle={`Expected ready ${formatDate(batch.expectedReadyDate || batch.estimatedPickupDate)}`}
          trailing={<StatusChip label={String(batch.status || "Unknown")} tone="info" />}
        />
        <View style={styles.summaryGrid}>
          <StatPill label="Seeds given" value={String(Number(batch.seedQuantity || 0).toLocaleString("en-IN"))} />
          <StatPill label="Germinated" value={String(germinated.toLocaleString("en-IN"))} />
          <StatPill label="Discarded" value={String(discarded.toLocaleString("en-IN"))} />
        </View>
      </CustomerCard>

      <CustomerCard>
        <SectionHeader title="Payment and service" subtitle="Amounts are shown exactly as recorded against this batch." />
        <View style={styles.detailList}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Service charge estimate</Text>
            <Text style={styles.detailValue}>{formatCurrency(Number(batch.serviceChargeEstimate || 0))}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Discount amount</Text>
            <Text style={[styles.detailValue, styles.successText]}>
              -{formatCurrency(Number(batch.discountAmount || 0))}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Final amount</Text>
            <Text style={styles.detailStrong}>{formatCurrency(Number(batch.finalAmount || 0))}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Payment status</Text>
            <StatusChip label={paymentStatus} tone={getPaymentTone(paymentStatus)} />
          </View>
        </View>
      </CustomerCard>

      <CustomerCard>
        <SectionHeader title="Lifecycle" subtitle="This timeline shows how far the nursery has progressed with your batch." />
        <View style={styles.timeline}>
          {timelineSteps.map((step, index) => {
            const done = currentOrder >= index + 1;
            const isLast = index === timelineSteps.length - 1;

            return (
              <View key={step.key} style={styles.timelineRow}>
                <View style={styles.timelineRail}>
                  <View style={[styles.timelineDot, done ? styles.timelineDotDone : styles.timelineDotPending]}>
                    <MaterialIcons
                      name={done ? "check" : "schedule"}
                      size={12}
                      color={done ? CustomerColors.white : CustomerColors.textMuted}
                    />
                  </View>
                  {!isLast ? <View style={[styles.timelineLine, done && styles.timelineLineDone]} /> : null}
                </View>
                <View style={styles.timelineBody}>
                  <Text style={styles.timelineTitle}>{step.label}</Text>
                  <Text style={styles.timelineCaption}>
                    {done ? "Completed in nursery workflow." : "Awaiting this stage."}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      </CustomerCard>

      <CustomerCard>
        <SectionHeader title="Batch numbers" />
        <View style={styles.summaryGrid}>
          <StatPill label="Seeds sown" value={String(sown.toLocaleString("en-IN"))} />
          <StatPill label="Germinated" value={String(germinated.toLocaleString("en-IN"))} />
          <StatPill label="Discarded" value={String(discarded.toLocaleString("en-IN"))} />
        </View>
      </CustomerCard>
    </CustomerScreen>
  );
}

const styles = StyleSheet.create({
  centerCard: {
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.xl,
  },
  helperText: {
    color: CustomerColors.textMuted,
  },
  heroCard: {
    gap: Spacing.md,
  },
  summaryGrid: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  detailList: {
    marginTop: Spacing.md,
    gap: Spacing.md,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  detailLabel: {
    flex: 1,
    color: CustomerColors.textMuted,
  },
  detailValue: {
    color: CustomerColors.text,
    fontWeight: "600",
  },
  detailStrong: {
    color: CustomerColors.primary,
    fontWeight: "800",
    fontSize: 16,
  },
  successText: {
    color: CustomerColors.success,
  },
  timeline: {
    marginTop: Spacing.md,
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
  timelineDotDone: {
    backgroundColor: CustomerColors.success,
  },
  timelineDotPending: {
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
  timelineLineDone: {
    backgroundColor: CustomerColors.success,
  },
  timelineBody: {
    flex: 1,
    paddingBottom: Spacing.lg,
    gap: 4,
  },
  timelineTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: CustomerColors.text,
  },
  timelineCaption: {
    color: CustomerColors.textMuted,
    lineHeight: 20,
  },
});
