import { MaterialIcons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { AdminTheme } from "../admin/theme";
import StitchHeader from "../common/StitchHeader";
import { moduleBadge } from "../common/moduleStyles";

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
      return { bg: AdminTheme.colors.surface, text: AdminTheme.colors.textMuted };
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
      <StitchHeader
        title={title}
        subtitle={roleLabel}
        variant="gradient"
        showBackButton
        onBackPress={handleBack}
        actions={
          createPath ? (
            <Pressable onPress={handleCreate} style={styles.createButton}>
              <MaterialIcons name="add" size={18} color={AdminTheme.colors.surface} />
            </Pressable>
          ) : null
        }
      />

      {/* Content */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            colors={[AdminTheme.colors.primary]}
            tintColor={AdminTheme.colors.primary}
          />
        }
      >
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={AdminTheme.colors.primary} />
            <Text style={styles.loadingText}>Loading batches...</Text>
          </View>
        )}

        {!isLoading && batches.length === 0 && (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="inbox" size={48} color={AdminTheme.colors.textSoft} />
            <Text style={styles.emptyTitle}>No Batches Found</Text>
            <Text style={styles.emptyMessage}>
              Customer seed batches will appear here once created.
            </Text>
            {createPath && (
              <Pressable onPress={handleCreate} style={styles.emptyButton}>
                <MaterialIcons name="add" size={16} color={AdminTheme.colors.surface} />
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
                <MaterialIcons name="person" size={14} color={AdminTheme.colors.textMuted} />
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
                    <ActivityIndicator size="small" color={AdminTheme.colors.surface} />
                  ) : (
                    <>
                      <MaterialIcons
                        name="check-circle"
                        size={16}
                        color={canMarkReady ? AdminTheme.colors.surface : AdminTheme.colors.textSoft}
                      />
                      <Text
                        style={[
                          styles.actionButtonText,
                          canMarkReady ? { color: AdminTheme.colors.surface } : { color: AdminTheme.colors.textSoft },
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
                    <ActivityIndicator size="small" color={AdminTheme.colors.surface} />
                  ) : (
                    <>
                      <MaterialIcons
                        name="inventory"
                        size={16}
                        color={canCollect ? AdminTheme.colors.surface : AdminTheme.colors.textSoft}
                      />
                      <Text
                        style={[
                          styles.actionButtonText,
                          canCollect ? { color: AdminTheme.colors.surface } : { color: AdminTheme.colors.textSoft },
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

const cardSurface = {
  borderWidth: 1,
  borderColor: AdminTheme.colors.borderSoft,
  borderRadius: AdminTheme.radius.lg,
  backgroundColor: AdminTheme.colors.surface,
  ...AdminTheme.shadow.card,
};

const styles = {
  container: {
    flex: 1,
    backgroundColor: AdminTheme.colors.background,
  },

  createButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent:"center",
    alignItems:"center"
  },
  createButtonText: {
    color: AdminTheme.colors.surface,
    fontWeight: "600" as const,
    fontSize: 14,
  },

  // Scroll Content
  scrollContent: {
    padding: AdminTheme.spacing.lg,
    paddingBottom: 100,
    gap: AdminTheme.spacing.md,
  },

  // Loading & Empty States
  loadingContainer: {
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingVertical: AdminTheme.spacing.xl,
    gap: AdminTheme.spacing.md,
  },
  loadingText: {
    color: AdminTheme.colors.textMuted,
    fontSize: 15,
    fontWeight: "500" as const,
  },
  emptyContainer: {
    ...cardSurface,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingVertical: AdminTheme.spacing.xl * 2,
    paddingHorizontal: AdminTheme.spacing.lg,
    gap: AdminTheme.spacing.md,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600" as const,
    color: AdminTheme.colors.text,
    marginTop: AdminTheme.spacing.sm,
  },
  emptyMessage: {
    fontSize: 14,
    color: AdminTheme.colors.textMuted,
    textAlign: "center" as const,
    paddingHorizontal: AdminTheme.spacing.xl,
    lineHeight: 20,
  },
  emptyButton: {
    marginTop: AdminTheme.spacing.sm,
    backgroundColor: AdminTheme.colors.primary,
    borderRadius: 20,
    paddingHorizontal: AdminTheme.spacing.lg,
    paddingVertical: AdminTheme.spacing.sm,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
  },
  emptyButtonText: {
    color: AdminTheme.colors.surface,
    fontWeight: "600" as const,
    fontSize: 14,
  },

  // Batch Card
  batchCard: {
    ...cardSurface,
    backgroundColor: AdminTheme.colors.surface,
    borderWidth: 1,
    borderColor: AdminTheme.colors.border,
    borderRadius: 16,
    padding: AdminTheme.spacing.md,
    marginBottom: AdminTheme.spacing.md,
  },
  statusBadge: {
    ...moduleBadge,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    alignSelf: "flex-start" as const,
    paddingHorizontal: AdminTheme.spacing.sm,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 4,
    marginBottom: AdminTheme.spacing.sm,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600" as const,
  },
  plantName: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: AdminTheme.colors.text,
    marginBottom: AdminTheme.spacing.xs,
  },
  customerRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    marginBottom: AdminTheme.spacing.sm,
  },
  customerName: {
    fontSize: 14,
    color: AdminTheme.colors.textMuted,
    fontWeight: "500" as const,
  },
  dueRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
    marginBottom: AdminTheme.spacing.sm,
  },
  dueAmount: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: AdminTheme.colors.text,
  },
  dueBadge: {
    ...moduleBadge,
    backgroundColor: AdminTheme.colors.warning + "15",
    paddingHorizontal: AdminTheme.spacing.sm,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: AdminTheme.spacing.xs,
  },
  dueBadgeText: {
    fontSize: 10,
    fontWeight: "600" as const,
    color: AdminTheme.colors.warning,
  },
  divider: {
    height: 1,
    backgroundColor: AdminTheme.colors.border,
    marginVertical: AdminTheme.spacing.md,
  },

  // Action Buttons
  actionRow: {
    flexDirection: "row" as const,
    gap: AdminTheme.spacing.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingVertical: AdminTheme.spacing.sm,
    paddingHorizontal: AdminTheme.spacing.md,
    borderRadius: 10,
    gap: 6,
  },
  markReadyButton: {
    backgroundColor: AdminTheme.colors.warning,
  },
  collectButton: {
    backgroundColor: AdminTheme.colors.success,
  },
  actionButtonDisabled: {
    backgroundColor: AdminTheme.colors.surface,
    borderWidth: 1,
    borderColor: AdminTheme.colors.border,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: "600" as const,
  },
} as const;
