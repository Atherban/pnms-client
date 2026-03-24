import { MaterialIcons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
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
import { CustomerDashboardService } from "@/src/services/customer-dashboard.service";
import { CustomerSeedBatchService } from "@/src/services/customer-seed-batch.service";
import { useAuthStore } from "@/src/stores/auth.store";
import { CustomerColors, Spacing } from "@/src/theme";

const formatNumber = (num: number) => num.toLocaleString("en-IN");

const getStatusTone = (status?: string): "success" | "warning" | "info" | "default" => {
  switch (String(status || "").toUpperCase()) {
    case "READY":
    case "COLLECTED":
      return "success";
    case "GERMINATING":
      return "warning";
    case "SOWN":
      return "info";
    default:
      return "default";
  }
};

export default function CustomerSeedBatchIndexScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const { data: overview } = useQuery({
    queryKey: ["customer-dashboard-lifecycle", user?.id, user?.phoneNumber, user?.nurseryId],
    enabled: Boolean(user?.id || user?.phoneNumber),
    queryFn: () =>
      CustomerDashboardService.getOverview({
        id: user?.id,
        phoneNumber: user?.phoneNumber,
        role: user?.role,
        nurseryId: user?.nurseryId,
      }),
  });

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["customer-seed-batches"],
    queryFn: CustomerSeedBatchService.getAll,
  });

  const batches = Array.isArray(data) ? data : [];
  const activeCount = batches.filter((batch) => !["COLLECTED", "CLOSED"].includes(String(batch.status || "").toUpperCase())).length;
  const readyCount = batches.filter((batch) => String(batch.status || "").toUpperCase() === "READY").length;
  const lifecycle = overview?.lifecycle || { sown: 0, germinated: 0, discarded: 0, pending: 0 };
  const germinationRate =
    lifecycle.sown > 0 ? Math.round((Number(lifecycle.germinated || 0) / Number(lifecycle.sown || 0)) * 100) : 0;

  return (
    <CustomerScreen
      title="Seed Progress"
      subtitle="Track nursery batches and their growing stages."
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
      <View style={styles.summaryGrid}>
        <StatPill label="Total batches" value={String(batches.length)} />
        <StatPill label="Active" value={String(activeCount)} />
        <StatPill label="Ready" value={String(readyCount)} />
      </View>

      <CustomerCard style={styles.lifecycleCard}>
        <SectionHeader
          title="Lifecycle snapshot"
          subtitle="Aggregated counts based on nursery lifecycle updates."
          trailing={<StatusChip label={`${germinationRate}% rate`} tone="success" />}
        />
        <View style={styles.lifecycleGrid}>
          <View style={styles.lifecycleTile}>
            <Text style={styles.lifecycleValue}>{formatNumber(Number(lifecycle.sown || 0))}</Text>
            <Text style={styles.lifecycleLabel}>Seeds given</Text>
          </View>
          <View style={styles.lifecycleTile}>
            <Text style={[styles.lifecycleValue, styles.successText]}>
              {formatNumber(Number(lifecycle.germinated || 0))}
            </Text>
            <Text style={styles.lifecycleLabel}>Germinated</Text>
          </View>
          <View style={styles.lifecycleTile}>
            <Text style={[styles.lifecycleValue, styles.warningText]}>
              {formatNumber(Number(lifecycle.pending || 0))}
            </Text>
            <Text style={styles.lifecycleLabel}>In progress</Text>
          </View>
          <View style={styles.lifecycleTile}>
            <Text style={styles.lifecycleValue}>{formatNumber(Number(lifecycle.discarded || 0))}</Text>
            <Text style={styles.lifecycleLabel}>Discarded</Text>
          </View>
        </View>
      </CustomerCard>

      <CustomerCard>
        <SectionHeader
          title="Your seed batches"
          subtitle="Open any batch to review status, payment context, and lifecycle updates."
        />

        {isLoading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color={CustomerColors.primary} />
            <Text style={styles.loadingText}>Loading seed batches...</Text>
          </View>
        ) : null}

        {!isLoading && batches.length === 0 ? (
          <CustomerEmptyState
            title="No seed batches yet"
            message="Batches will appear here after the nursery creates them for your account."
            icon={<MaterialIcons name="inventory-2" size={44} color={CustomerColors.textMuted} />}
          />
        ) : null}

        {!isLoading ? (
          <View style={styles.list}>
            {batches.map((batch) => {
              const plantName =
                typeof batch.plantTypeId === "object" ? batch.plantTypeId?.name : "Unknown plant";
              const sown = Number(batch.seedsSown || 0);
              const germinated = Number(batch.germinatedQuantity ?? batch.seedsGerminated ?? 0);
              const discarded = Number(batch.discardedQuantity ?? batch.seedsDiscarded ?? 0);
              const pending = Math.max(sown - germinated - discarded, 0);
              const statusLabel = String(batch.status || "Unknown").replace(/_/g, " ");

              return (
                <Pressable
                  key={batch._id}
                  onPress={() => router.push(`/(customer)/seeds/${batch._id}` as any)}
                  style={({ pressed }) => [styles.batchCard, pressed && styles.batchCardPressed]}
                >
                  <View style={styles.batchHeader}>
                    <View style={styles.batchTitleWrap}>
                      <Text style={styles.batchTitle}>{plantName}</Text>
                      <Text style={styles.batchMeta}>
                        Seeds given {formatNumber(Number(batch.seedQuantity || 0))}
                      </Text>
                    </View>
                    <StatusChip label={statusLabel} tone={getStatusTone(batch.status)} />
                  </View>

                  <View style={styles.metricsRow}>
                    <View style={styles.metricBlock}>
                      <Text style={styles.metricValue}>{formatNumber(sown)}</Text>
                      <Text style={styles.metricLabel}>Sown</Text>
                    </View>
                    <View style={styles.metricBlock}>
                      <Text style={[styles.metricValue, styles.successText]}>{formatNumber(germinated)}</Text>
                      <Text style={styles.metricLabel}>Germinated</Text>
                    </View>
                    <View style={styles.metricBlock}>
                      <Text style={[styles.metricValue, styles.warningText]}>{formatNumber(pending)}</Text>
                      <Text style={styles.metricLabel}>Pending</Text>
                    </View>
                  </View>

                  <View style={styles.progressWrap}>
                    <View style={styles.progressTrack}>
                      <View
                        style={[
                          styles.progressFill,
                          { width: `${sown > 0 ? Math.min((germinated / sown) * 100, 100) : 0}%` },
                        ]}
                      />
                    </View>
                    <Text style={styles.progressLabel}>
                      Germination {sown > 0 ? Math.round((germinated / sown) * 100) : 0}%
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        ) : null}
      </CustomerCard>
    </CustomerScreen>
  );
}

const styles = StyleSheet.create({
  summaryGrid: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  lifecycleCard: {
    gap: Spacing.md,
  },
  lifecycleGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  lifecycleTile: {
    flexGrow: 1,
    flexBasis: "48%",
    padding: Spacing.sm,
    borderRadius: 16,
    backgroundColor: CustomerColors.surface,
    alignItems: "center",
    gap: 2,
    borderWidth: 1,
    borderColor: CustomerColors.border,
  },
  lifecycleValue: {
    fontSize: 16,
    fontWeight: "900",
    color: CustomerColors.text,
  },
  lifecycleLabel: {
    fontSize: 12,
    color: CustomerColors.textMuted,
    fontWeight: "600",
  },
  loadingState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.xl,
    gap: Spacing.sm,
  },
  loadingText: {
    color: CustomerColors.textMuted,
  },
  list: {
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  batchCard: {
    padding: Spacing.md,
    borderRadius: 20,
    backgroundColor: "rgba(15,189,73,0.05)",
    borderWidth: 1,
    borderColor: CustomerColors.borderStrong,
    gap: Spacing.md,
  },
  batchCardPressed: {
    opacity: 0.9,
  },
  batchHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  batchTitleWrap: {
    flex: 1,
    gap: 4,
  },
  batchTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: CustomerColors.text,
  },
  batchMeta: {
    fontSize: 12,
    color: CustomerColors.textMuted,
  },
  metricsRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  metricBlock: {
    flex: 1,
    padding: Spacing.sm,
    borderRadius: 16,
    backgroundColor: CustomerColors.surface,
    alignItems: "center",
    gap: 2,
    borderWidth: 1,
    borderColor: CustomerColors.border,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: "800",
    color: CustomerColors.text,
  },
  metricLabel: {
    fontSize: 12,
    color: CustomerColors.textMuted,
  },
  successText: {
    color: CustomerColors.success,
  },
  warningText: {
    color: CustomerColors.warning,
  },
  progressWrap: {
    gap: 8,
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: CustomerColors.border,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: CustomerColors.primary,
  },
  progressLabel: {
    fontSize: 12,
    color: CustomerColors.textMuted,
  },
});
