import { MaterialIcons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
  ActivityIndicator,
} from "react-native";
import { CustomerSeedBatchService } from "@/src/services/customer-seed-batch.service";
import { Colors, Spacing } from "@/src/theme";

type Props = {
  title: string;
  roleLabel: string;
  createPath?: string;
};

type BatchStatus = "SOWN" | "GERMINATING" | "READY" | "COLLECTED";

const getStatusColor = (status: BatchStatus) => {
  switch (status) {
    case "SOWN":
      return { bg: "#EFF6FF", text: "#1E40AF" };
    case "GERMINATING":
      return { bg: "#FEF3C7", text: "#92400E" };
    case "READY":
      return { bg: "#D1FAE5", text: "#065F46" };
    case "COLLECTED":
      return { bg: "#E5E7EB", text: "#374151" };
    default:
      return { bg: Colors.surface, text: Colors.textSecondary };
  }
};

const getStatusIcon = (status: BatchStatus): keyof typeof MaterialIcons.glyphMap => {
  switch (status) {
    case "SOWN":
      return "grass";
    case "GERMINATING":
      return "spa";
    case "READY":
      return "check-circle";
    case "COLLECTED":
      return "inventory";
    default:
      return "help";
  }
};

export default function CustomerSeedBatchManagementScreen({
  title,
  roleLabel,
  createPath,
}: Props) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ["customer-seed-batches"],
    queryFn: CustomerSeedBatchService.getAll,
  });

  const markReadyMutation = useMutation({
    mutationFn: (id: string) => CustomerSeedBatchService.markReady(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-seed-batches"] });
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["customer-dashboard-overview"] });
      Alert.alert("✅ Updated", "Batch marked as READY and service sale generated.");
    },
    onError: (error: any) => {
      Alert.alert(
        "❌ Unable to mark ready",
        error?.response?.data?.message || error?.message || "An error occurred"
      );
    },
  });

  const collectMutation = useMutation({
    mutationFn: (id: string) => CustomerSeedBatchService.collect(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-seed-batches"] });
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["customer-dashboard-overview"] });
      Alert.alert("✅ Updated", "Batch marked as collected.");
    },
    onError: (error: any) => {
      Alert.alert(
        "❌ Unable to collect",
        error?.response?.data?.message || error?.message || "An error occurred"
      );
    },
  });

  const batches = Array.isArray(data) ? data : [];

  const handleBack = () => {
    router.back();
  };

  const handleCreate = () => {
    if (createPath) {
      router.push(createPath as any);
    }
  };

  const handleMarkReady = (batchId: string) => {
    Alert.alert(
      "Confirm Action",
      "Are you sure you want to mark this batch as READY? This will generate a service sale.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Mark Ready", onPress: () => markReadyMutation.mutate(batchId) },
      ]
    );
  };

  const handleCollect = (batchId: string) => {
    Alert.alert(
      "Confirm Action",
      "Are you sure you want to mark this batch as COLLECTED?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Mark Collected", onPress: () => collectMutation.mutate(batchId) },
      ]
    );
  };

  const isPending = markReadyMutation.isPending || collectMutation.isPending;

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={[Colors.primary, Colors.primaryLight || Colors.primary]}
        style={styles.headerGradient}
      >
        <View style={styles.headerContent}>
          <Pressable onPress={handleBack} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={22} color={Colors.white} />
          </Pressable>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>{title}</Text>
            <Text style={styles.headerSubtitle}>{roleLabel}</Text>
          </View>
        </View>

        {createPath && (
          <Pressable onPress={handleCreate} style={styles.createButton}>
            <MaterialIcons name="add" size={18} color={Colors.white} />
            <Text style={styles.createButtonText}>Create Batch</Text>
          </Pressable>
        )}
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
            <Text style={styles.loadingText}>Loading batches...</Text>
          </View>
        )}

        {!isLoading && batches.length === 0 && (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="inbox" size={48} color={Colors.textTertiary} />
            <Text style={styles.emptyTitle}>No Batches Found</Text>
            <Text style={styles.emptyMessage}>
              Customer seed batches will appear here once created.
            </Text>
            {createPath && (
              <Pressable onPress={handleCreate} style={styles.emptyButton}>
                <MaterialIcons name="add" size={16} color={Colors.white} />
                <Text style={styles.emptyButtonText}>Create First Batch</Text>
              </Pressable>
            )}
          </View>
        )}

        {batches.map((batch) => {
          const plantName =
            typeof batch.plantTypeId === "object" ? batch.plantTypeId?.name : "Unknown Plant";
          const customerName =
            typeof batch.customerId === "object" ? batch.customerId?.name : "Unknown Customer";
          const due = typeof batch.saleId === "object"
            ? Number(batch.saleId?.dueAmount || 0)
            : Number(batch.finalAmount || 0);
          const status = batch.status as BatchStatus;
          const statusColors = getStatusColor(status);
          const statusIcon = getStatusIcon(status);
          const canMarkReady = status === "SOWN" || status === "GERMINATING";
          const canCollect = status === "READY";

          return (
            <View key={batch._id} style={styles.batchCard}>
              {/* Status Badge */}
              <View style={[styles.statusBadge, { backgroundColor: statusColors.bg }]}>
                <MaterialIcons name={statusIcon} size={14} color={statusColors.text} />
                <Text style={[styles.statusText, { color: statusColors.text }]}>
                  {status}
                </Text>
              </View>

              {/* Plant & Customer Info */}
              <Text style={styles.plantName}>{plantName}</Text>
              <View style={styles.customerRow}>
                <MaterialIcons name="person" size={14} color={Colors.textSecondary} />
                <Text style={styles.customerName}>{customerName}</Text>
              </View>

              {/* Due Amount */}
              <View style={styles.dueRow}>
                <Text style={styles.dueAmount}>₹{due.toLocaleString("en-IN")}</Text>
                <View style={styles.dueBadge}>
                  <Text style={styles.dueBadgeText}>Due</Text>
                </View>
              </View>

              {/* Divider */}
              <View style={styles.divider} />

              {/* Action Buttons */}
              <View style={styles.actionRow}>
                <Pressable
                  disabled={!canMarkReady || isPending}
                  onPress={() => handleMarkReady(batch._id)}
                  style={[
                    styles.actionButton,
                    canMarkReady ? styles.markReadyButton : styles.actionButtonDisabled,
                  ]}
                >
                  {markReadyMutation.isPending ? (
                    <ActivityIndicator size="small" color={Colors.white} />
                  ) : (
                    <>
                      <MaterialIcons
                        name="check-circle"
                        size={16}
                        color={canMarkReady ? Colors.white : Colors.textTertiary}
                      />
                      <Text
                        style={[
                          styles.actionButtonText,
                          canMarkReady ? { color: Colors.white } : { color: Colors.textTertiary },
                        ]}
                      >
                        Mark Ready
                      </Text>
                    </>
                  )}
                </Pressable>

                <Pressable
                  disabled={!canCollect || isPending}
                  onPress={() => handleCollect(batch._id)}
                  style={[
                    styles.actionButton,
                    canCollect ? styles.collectButton : styles.actionButtonDisabled,
                  ]}
                >
                  {collectMutation.isPending ? (
                    <ActivityIndicator size="small" color={Colors.white} />
                  ) : (
                    <>
                      <MaterialIcons
                        name="inventory"
                        size={16}
                        color={canCollect ? Colors.white : Colors.textTertiary}
                      />
                      <Text
                        style={[
                          styles.actionButtonText,
                          canCollect ? { color: Colors.white } : { color: Colors.textTertiary },
                        ]}
                      >
                        Collect
                      </Text>
                    </>
                  )}
                </Pressable>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
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
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  headerTextContainer: {
    flex: 1,
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
  createButton: {
    marginTop: Spacing.md,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 20,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    alignSelf: "flex-start" as const,
    gap: 6,
  },
  createButtonText: {
    color: Colors.white,
    fontWeight: "600" as const,
    fontSize: 14,
  },

  // Scroll Content
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: 100,
  },

  // Loading & Empty States
  loadingContainer: {
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingVertical: Spacing.xl,
    gap: Spacing.md,
  },
  loadingText: {
    color: Colors.textSecondary,
    fontSize: 15,
    fontWeight: "500" as const,
  },
  emptyContainer: {
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingVertical: Spacing.xl * 2,
    gap: Spacing.md,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600" as const,
    color: Colors.text,
    marginTop: Spacing.sm,
  },
  emptyMessage: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center" as const,
    paddingHorizontal: Spacing.xl,
    lineHeight: 20,
  },
  emptyButton: {
    marginTop: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: 20,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
  },
  emptyButtonText: {
    color: Colors.white,
    fontWeight: "600" as const,
    fontSize: 14,
  },

  // Batch Card
  batchCard: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 16,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  statusBadge: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    alignSelf: "flex-start" as const,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 4,
    marginBottom: Spacing.sm,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600" as const,
  },
  plantName: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  customerRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    marginBottom: Spacing.sm,
  },
  customerName: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: "500" as const,
  },
  dueRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
    marginBottom: Spacing.sm,
  },
  dueAmount: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: Colors.textPrimary,
  },
  dueBadge: {
    backgroundColor: Colors.warning + "15",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: Spacing.xs,
  },
  dueBadgeText: {
    fontSize: 10,
    fontWeight: "600" as const,
    color: Colors.warning,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.md,
  },

  // Action Buttons
  actionRow: {
    flexDirection: "row" as const,
    gap: Spacing.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: 10,
    gap: 6,
  },
  markReadyButton: {
    backgroundColor: Colors.warning,
  },
  collectButton: {
    backgroundColor: Colors.success,
  },
  actionButtonDisabled: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: "600" as const,
  },
} as const;