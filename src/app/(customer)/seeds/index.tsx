import { MaterialIcons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CustomerSeedBatchService } from "@/src/services/customer-seed-batch.service";
import { Colors, Spacing } from "@/src/theme";

type BatchStatus = "SOWN" | "GERMINATING" | "READY" | "COLLECTED" | "CLOSED";

const getStatusConfig = (status?: string) => {
  switch (String(status || "").toUpperCase()) {
    case "READY":
      return {
        color: Colors.success,
        bg: "#D1FAE5",
        icon: "check-circle",
        label: "Ready",
      };
    case "GERMINATING":
      return {
        color: "#92400E",
        bg: "#FEF3C7",
        icon: "sprout",
        label: "Germinating",
      };
    case "SOWN":
      return {
        color: "#1E40AF",
        bg: "#EFF6FF",
        icon: "grass",
        label: "Sown",
      };
    case "COLLECTED":
      return {
        color: "#374151",
        bg: "#E5E7EB",
        icon: "inventory",
        label: "Collected",
      };
    case "CLOSED":
      return {
        color: "#6B7280",
        bg: "#F3F4F6",
        icon: "check-circle",
        label: "Closed",
      };
    default:
      return {
        color: Colors.textSecondary,
        bg: Colors.surface,
        icon: "help",
        label: status || "Unknown",
      };
  }
};

const formatNumber = (num: number) => {
  return num.toLocaleString("en-IN");
};

export default function CustomerSeedBatchIndexScreen() {
  const router = useRouter();
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["customer-seed-batches"],
    queryFn: CustomerSeedBatchService.getAll,
  });

  const batches = Array.isArray(data) ? data : [];

  const getProgressPercentage = (batch: any) => {
    const total = Number(batch.seedsSown || 0);
    if (total === 0) return 0;
    const germinated = Number(batch.germinatedQuantity ?? batch.seedsGerminated ?? 0);
    return (germinated / total) * 100;
  };

  return (
    <SafeAreaView style={styles.container} edges={["left", "right"]}>
      {/* Header */}
      <LinearGradient
        colors={[Colors.primary, Colors.primaryLight || Colors.primary]}
        style={styles.headerGradient}
      >
        <Text style={styles.headerTitle}>Seed Progress</Text>
        <Text style={styles.headerSubtitle}>
          Track your seed batch lifecycle in nursery
        </Text>
      </LinearGradient>

      {/* Content */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
      >
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Loading seed batches...</Text>
          </View>
        )}

        {!isLoading && batches.length === 0 && (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <MaterialIcons name="inventory-2" size={48} color={Colors.textTertiary} />
            </View>
            <Text style={styles.emptyTitle}>No Seed Batches Found</Text>
            <Text style={styles.emptyMessage}>
              Your seed batches will appear here once created by nursery staff.
            </Text>
          </View>
        )}

        {batches.map((batch) => {
          const plantName =
            typeof batch.plantTypeId === "object" ? batch.plantTypeId?.name : "Unknown Plant";
          const plantCategory =
            typeof batch.plantTypeId === "object" ? batch.plantTypeId?.category : "";
          const germinated = Number(batch.germinatedQuantity ?? batch.seedsGerminated ?? 0);
          const discarded = Number(batch.discardedQuantity ?? batch.seedsDiscarded ?? 0);
          const sown = Number(batch.seedsSown || 0);
          const pending = Math.max(sown - germinated - discarded, 0);
          const status = batch.status as BatchStatus;
          const statusConfig = getStatusConfig(status);
          const progressPercentage = getProgressPercentage(batch);

          return (
            <Pressable
              key={batch._id}
              onPress={() => router.push(`/(customer)/seeds/${batch._id}` as any)}
              style={({ pressed }) => [
                styles.batchCard,
                pressed && styles.batchCardPressed,
              ]}
            >
              {/* Header */}
              <View style={styles.cardHeader}>
                <View style={styles.plantInfo}>
                  <Text style={styles.plantName}>{plantName}</Text>
                  {plantCategory ? (
                    <View style={[styles.categoryBadge, { backgroundColor: Colors.info + "10" }]}>
                      <Text style={[styles.categoryText, { color: Colors.info }]}>
                        {plantCategory}
                      </Text>
                    </View>
                  ) : null}
                </View>
                <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
                  <MaterialIcons
                    name={statusConfig.icon as any}
                    size={12}
                    color={statusConfig.color}
                  />
                  <Text style={[styles.statusText, { color: statusConfig.color }]}>
                    {statusConfig.label}
                  </Text>
                </View>
              </View>

              {/* Stats Grid */}
              <View style={styles.statsGrid}>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Sown</Text>
                  <Text style={styles.statValue}>{formatNumber(sown)}</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Germinated</Text>
                  <Text style={[styles.statValue, { color: Colors.success }]}>
                    {formatNumber(germinated)}
                  </Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Discarded</Text>
                  <Text style={[styles.statValue, { color: Colors.error }]}>
                    {formatNumber(discarded)}
                  </Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Pending</Text>
                  <Text style={[styles.statValue, { color: Colors.warning }]}>
                    {formatNumber(pending)}
                  </Text>
                </View>
              </View>

              {/* Progress Bar */}
              {sown > 0 && (
                <View style={styles.progressContainer}>
                  <View style={styles.progressHeader}>
                    <Text style={styles.progressLabel}>Germination Progress</Text>
                    <Text style={styles.progressValue}>
                      {Math.round((germinated / sown) * 100)}%
                    </Text>
                  </View>
                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${progressPercentage}%`,
                          backgroundColor: progressPercentage >= 80
                            ? Colors.success
                            : progressPercentage >= 50
                            ? Colors.warning
                            : Colors.primary,
                        },
                      ]}
                    />
                  </View>
                </View>
              )}

              {/* Footer */}
              <View style={styles.cardFooter}>
                <View style={styles.footerItem}>
                  <MaterialIcons name="inventory" size={14} color={Colors.textSecondary} />
                  <Text style={styles.footerText}>
                    Given: {formatNumber(batch.seedQuantity || 0)} seeds
                  </Text>
                </View>
                {batch.expectedReadyDate && (
                  <View style={styles.footerDot} />
                )}
                {batch.expectedReadyDate && (
                  <View style={styles.footerItem}>
                    <MaterialIcons name="calendar-today" size={14} color={Colors.textSecondary} />
                    <Text style={styles.footerText}>
                      Ready: {new Date(batch.expectedReadyDate).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                      })}
                    </Text>
                  </View>
                )}
              </View>

              {/* Touch Indicator */}
              <View style={styles.touchIndicator}>
                <MaterialIcons name="chevron-right" size={20} color={Colors.textTertiary} />
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = {
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  // Header
  headerGradient: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTitle: {
    color: Colors.white,
    fontSize: 28,
    fontWeight: "700" as const,
    marginBottom: 4,
  },
  headerSubtitle: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 14,
    fontWeight: "500" as const,
  },

  // Scroll Content
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: 100,
  },

  // Loading State
  loadingContainer: {
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingVertical: Spacing.xl * 2,
    gap: Spacing.md,
  },
  loadingText: {
    color: Colors.textSecondary,
    fontSize: 15,
    fontWeight: "500" as const,
  },

  // Empty State
  emptyContainer: {
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingVertical: Spacing.xl * 2,
    paddingHorizontal: Spacing.xl,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.surface,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600" as const,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  emptyMessage: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center" as const,
    lineHeight: 20,
  },

  // Batch Card
  batchCard: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 16,
    padding: Spacing.md,
    backgroundColor: Colors.white,
    marginBottom: Spacing.md,
    position: "relative" as const,
  },
  batchCardPressed: {
    transform: [{ scale: 0.98 }],
  },
  cardHeader: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    marginBottom: Spacing.sm,
  },
  plantInfo: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: Spacing.xs,
    flex: 1,
  },
  plantName: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: Colors.textPrimary,
  },
  categoryBadge: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: 8,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: "600" as const,
  },
  statusBadge: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 16,
    gap: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600" as const,
  },

  // Stats Grid
  statsGrid: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  statItem: {
    flex: 1,
    alignItems: "center" as const,
  },
  statLabel: {
    fontSize: 10,
    color: "#9CA3AF",
    marginBottom: 2,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: Colors.text,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: "#E5E7EB",
    marginHorizontal: 4,
  },

  // Progress Bar
  progressContainer: {
    marginBottom: Spacing.sm,
  },
  progressHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    marginBottom: 4,
  },
  progressLabel: {
    fontSize: 11,
    color: "#6B7280",
  },
  progressValue: {
    fontSize: 11,
    fontWeight: "600" as const,
    color: Colors.text,
  },
  progressBar: {
    height: 4,
    backgroundColor: "#F3F4F6",
    borderRadius: 2,
    overflow: "hidden" as const,
  },
  progressFill: {
    height: "100%" as const,
    borderRadius: 2,
  },

  // Card Footer
  cardFooter: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  footerItem: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
  },
  footerText: {
    fontSize: 11,
    color: "#6B7280",
  },
  footerDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "#D1D5DB",
  },

  // Touch Indicator
  touchIndicator: {
    position: "absolute" as const,
    right: Spacing.md,
    top: "50%" as const,
    marginTop: -10,
  },
} as const;