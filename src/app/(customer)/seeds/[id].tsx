import { MaterialIcons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CustomerSeedBatchService } from "@/src/services/customer-seed-batch.service";
import { Colors, Spacing } from "@/src/theme";

type TimelineStep = {
  key: string;
  label: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  description: string;
};

const timelineSteps: TimelineStep[] = [
  {
    key: "RECEIVED",
    label: "Seeds Received",
    icon: "inventory",
    description: "Seeds have been handed over to nursery",
  },
  {
    key: "SOWN",
    label: "Seeds Sown",
    icon: "grass",
    description: "Seeds have been planted in growing medium",
  },
  {
    key: "GERMINATING",
    label: "Germination Started",
    icon: "spa",
    description: "Seeds have sprouted and seedlings are growing",
  },
  {
    key: "READY",
    label: "Plants Ready",
    icon: "done-all",
    description: "Plants are ready for collection",
  },
  {
    key: "COLLECTED",
    label: "Collected",
    icon: "local-shipping",
    description: "Plants have been collected by customer",
  },
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

const formatCurrency = (value: number) => {
  return `₹${value.toLocaleString("en-IN")}`;
};

const getPaymentStatusColor = (status: string) => {
  switch (status.toUpperCase()) {
    case "PAID":
      return { bg: "#D1FAE5", text: "#065F46", icon: "check-circle" };
    case "PARTIAL":
      return { bg: "#FEF3C7", text: "#92400E", icon: "pending" };
    default:
      return { bg: "#FEE2E2", text: "#991B1B", icon: "error" };
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
  const plantTypeName =
    typeof batch?.plantTypeId === "object" ? batch?.plantTypeId?.name : "-";
  const plantCategory =
    typeof batch?.plantTypeId === "object" ? batch?.plantTypeId?.category : null;
  const germinated = Number(batch?.germinatedQuantity ?? batch?.seedsGerminated ?? 0);
  const discarded = Number(batch?.discardedQuantity ?? batch?.seedsDiscarded ?? 0);
  const sown = Number(batch?.seedsSown || 0);
  const currentOrder = statusOrder[String(batch?.status || "RECEIVED").toUpperCase()] || 1;
  const paymentStatus =
    typeof batch?.saleId === "object" ? batch?.saleId?.paymentStatus || "UNPAID" : "UNPAID";
  const paymentStatusConfig = getPaymentStatusColor(paymentStatus);

  const handleBack = () => {
    router.back();
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={["left", "right"]}>
        <LinearGradient
          colors={[Colors.primary, Colors.primaryLight || Colors.primary]}
          style={styles.headerGradient}
        >
          <View style={styles.headerContent}>
            <Pressable onPress={handleBack} style={styles.backButton}>
              <MaterialIcons name="arrow-back" size={22} color={Colors.white} />
            </Pressable>
            <View>
              <Text style={styles.headerTitle}>Seed Batch Detail</Text>
              <Text style={styles.headerSubtitle}>Loading...</Text>
            </View>
          </View>
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading batch details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!batch) {
    return (
      <SafeAreaView style={styles.container} edges={["left", "right"]}>
        <LinearGradient
          colors={[Colors.primary, Colors.primaryLight || Colors.primary]}
          style={styles.headerGradient}
        >
          <View style={styles.headerContent}>
            <Pressable onPress={handleBack} style={styles.backButton}>
              <MaterialIcons name="arrow-back" size={22} color={Colors.white} />
            </Pressable>
            <View>
              <Text style={styles.headerTitle}>Seed Batch Detail</Text>
              <Text style={styles.headerSubtitle}>Not Found</Text>
            </View>
          </View>
        </LinearGradient>
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={48} color={Colors.error} />
          <Text style={styles.errorTitle}>Batch Not Found</Text>
          <Text style={styles.errorMessage}>
            The seed batch you're looking for doesn't exist or has been removed.
          </Text>
          <Pressable onPress={handleBack} style={styles.errorButton}>
            <Text style={styles.errorButtonText}>Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["left", "right"]}>
      {/* Header */}
      <LinearGradient
        colors={[Colors.primary, Colors.primaryLight || Colors.primary]}
        style={styles.headerGradient}
      >
        <View style={styles.headerContent}>
          <Pressable onPress={handleBack} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={22} color={Colors.white} />
          </Pressable>
          <View>
            <Text style={styles.headerTitle}>Seed Batch Detail</Text>
            <Text style={styles.headerSubtitle}>{plantTypeName}</Text>
          </View>
        </View>
      </LinearGradient>

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
        {/* Status Overview */}
        <View style={styles.statusOverviewCard}>
          <View style={styles.statusRow}>
            <View style={styles.statusBadge}>
              <View style={[styles.statusDot, { backgroundColor: statusOrder[batch.status] >= 4 ? Colors.success : Colors.warning }]} />
              <Text style={styles.statusText}>Current Status: <Text style={styles.statusValue}>{batch.status}</Text></Text>
            </View>
            <View style={[styles.paymentBadge, { backgroundColor: paymentStatusConfig.bg }]}>
              <MaterialIcons name={paymentStatusConfig.icon as any} size={12} color={paymentStatusConfig.text} />
              <Text style={[styles.paymentText, { color: paymentStatusConfig.text }]}>
                {paymentStatus}
              </Text>
            </View>
          </View>

          {plantCategory && (
            <View style={styles.categoryBadge}>
              <MaterialIcons name="category" size={12} color={Colors.info} />
              <Text style={styles.categoryText}>{plantCategory}</Text>
            </View>
          )}
        </View>

        {/* Batch Summary */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="info" size={20} color={Colors.primary} />
            <Text style={styles.cardTitle}>Batch Summary</Text>
          </View>

          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Seeds Given</Text>
              <Text style={styles.statValue}>{batch.seedQuantity?.toLocaleString("en-IN")}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Seeds Sown</Text>
              <Text style={styles.statValue}>{sown.toLocaleString("en-IN")}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Germinated</Text>
              <Text style={[styles.statValue, { color: Colors.success }]}>
                {germinated.toLocaleString("en-IN")}
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Discarded</Text>
              <Text style={[styles.statValue, { color: Colors.error }]}>
                {discarded.toLocaleString("en-IN")}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.detailsList}>
            <View style={styles.detailRow}>
              <View style={styles.detailIcon}>
                <MaterialIcons name="calendar-today" size={16} color={Colors.textSecondary} />
              </View>
              <Text style={styles.detailLabel}>Expected Ready Date</Text>
              <Text style={styles.detailValue}>
                {formatDate(batch.expectedReadyDate || batch.estimatedPickupDate)}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <View style={styles.detailIcon}>
                <MaterialIcons name="currency-rupee" size={16} color={Colors.textSecondary} />
              </View>
              <Text style={styles.detailLabel}>Service Charges</Text>
              <Text style={styles.detailValue}>{formatCurrency(Number(batch.serviceChargeEstimate || 0))}</Text>
            </View>

            <View style={styles.detailRow}>
              <View style={styles.detailIcon}>
                <MaterialIcons name="discount" size={16} color={Colors.success} />
              </View>
              <Text style={styles.detailLabel}>Discount</Text>
              <Text style={[styles.detailValue, { color: Colors.success }]}>
                -{formatCurrency(Number(batch.discountAmount || 0))}
              </Text>
            </View>

            <View style={styles.totalRow}>
              <View style={styles.detailIcon}>
                <MaterialIcons name="receipt" size={18} color={Colors.primary} />
              </View>
              <Text style={styles.totalLabel}>Final Amount</Text>
              <Text style={styles.totalValue}>{formatCurrency(Number(batch.finalAmount || 0))}</Text>
            </View>
          </View>
        </View>

        {/* Progress Timeline */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="timeline" size={20} color={Colors.primary} />
            <Text style={styles.cardTitle}>Progress Timeline</Text>
          </View>

          <View style={styles.timelineContainer}>
            {timelineSteps.map((step, index) => {
              const done = currentOrder >= index + 1;
              const isLast = index === timelineSteps.length - 1;

              return (
                <View key={step.key} style={styles.timelineItem}>
                  <View style={styles.timelineLeft}>
                    <View
                      style={[
                        styles.timelineIcon,
                        done && styles.timelineIconDone,
                        { backgroundColor: done ? Colors.success + "20" : Colors.surface },
                      ]}
                    >
                      <MaterialIcons
                        name={step.icon}
                        size={16}
                        color={done ? Colors.success : Colors.textTertiary}
                      />
                    </View>
                    {!isLast && <View style={[styles.timelineLine, done && styles.timelineLineDone]} />}
                  </View>

                  <View style={styles.timelineContent}>
                    <Text style={[styles.timelineLabel, done && styles.timelineLabelDone]}>
                      {step.label}
                    </Text>
                    <Text style={styles.timelineDescription}>{step.description}</Text>
                  </View>

                  {done && (
                    <View style={styles.timelineCheck}>
                      <MaterialIcons name="check-circle" size={16} color={Colors.success} />
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </View>
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
  headerContent: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: Spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  headerTitle: {
    color: Colors.white,
    fontSize: 22,
    fontWeight: "700" as const,
    marginBottom: 2,
  },
  headerSubtitle: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 13,
    fontWeight: "500" as const,
  },

  // Scroll Content
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: 100,
    gap: Spacing.md,
  },

  // Loading State
  loadingContainer: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: Spacing.md,
  },
  loadingText: {
    color: Colors.textSecondary,
    fontSize: 15,
    fontWeight: "500" as const,
  },

  // Error State
  errorContainer: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "600" as const,
    color: Colors.error,
    marginTop: Spacing.sm,
  },
  errorMessage: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center" as const,
    lineHeight: 20,
    paddingHorizontal: Spacing.xl,
  },
  errorButton: {
    marginTop: Spacing.md,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: 10,
  },
  errorButtonText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: "600" as const,
  },

  // Status Overview
  statusOverviewCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statusRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    marginBottom: Spacing.xs,
  },
  statusBadge: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  statusValue: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: Colors.text,
  },
  paymentBadge: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 16,
    gap: 4,
  },
  paymentText: {
    fontSize: 11,
    fontWeight: "600" as const,
  },
  categoryBadge: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
    marginTop: Spacing.xs,
  },
  categoryText: {
    fontSize: 12,
    color: Colors.info,
    fontWeight: "500" as const,
  },

  // Cards
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: Colors.text,
  },

  // Stats Grid
  statsGrid: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
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
    fontSize: 15,
    fontWeight: "700" as const,
    color: Colors.text,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: "#E5E7EB",
    marginHorizontal: 4,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.md,
  },

  // Details List
  detailsList: {
    gap: Spacing.sm,
  },
  detailRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
  },
  detailIcon: {
    width: 32,
    alignItems: "center" as const,
  },
  detailLabel: {
    flex: 1,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: Colors.text,
  },
  totalRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    marginTop: Spacing.xs,
    paddingTop: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  totalLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.text,
  },
  totalValue: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: Colors.primary,
  },

  // Timeline
  timelineContainer: {
    marginTop: Spacing.sm,
  },
  timelineItem: {
    flexDirection: "row" as const,
    marginBottom: Spacing.md,
    position: "relative" as const,
  },
  timelineLeft: {
    width: 40,
    alignItems: "center" as const,
    position: "relative" as const,
  },
  timelineIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    zIndex: 2,
  },
  timelineIconDone: {
    backgroundColor: Colors.success + "20",
  },
  timelineLine: {
    position: "absolute" as const,
    top: 32,
    width: 2,
    height: 40,
    backgroundColor: Colors.border,
    zIndex: 1,
  },
  timelineLineDone: {
    backgroundColor: Colors.success + "40",
  },
  timelineContent: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  timelineLabel: {
    fontSize: 14,
    fontWeight: "500" as const,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  timelineLabelDone: {
    color: Colors.text,
    fontWeight: "600" as const,
  },
  timelineDescription: {
    fontSize: 12,
    color: Colors.textTertiary,
  },
  timelineCheck: {
    marginLeft: Spacing.sm,
    justifyContent: "center" as const,
  },
} as const;