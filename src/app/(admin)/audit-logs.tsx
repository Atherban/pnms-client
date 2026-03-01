import { MaterialIcons } from "@expo/vector-icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import FixedHeader from "../../components/common/FixedHeader";
import { SoftDeleteService, SoftDeletedAuditRow } from "../../services/soft-delete.service";
import { useAuthStore } from "../../stores/auth.store";
import { Colors, Spacing } from "../../theme";

const formatDateTime = (value?: string) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN");
};

export default function AdminAuditLogsScreen() {
  const user = useAuthStore((s) => s.user);
  const nurseryId = user?.nurseryId;

  const { data, refetch, isRefetching } = useQuery({
    queryKey: ["audit-logs", "admin", nurseryId],
    queryFn: () => SoftDeleteService.listAuditLogs({ nurseryId }),
    enabled: Boolean(nurseryId),
  });

  const purgeMutation = useMutation({
    mutationFn: () => SoftDeleteService.purgeExpired({ nurseryId, retentionDays: 30 }),
    onSuccess: () => {
      Alert.alert("Cleanup Started", "Soft-deleted items older than 30 days are being purged.");
      refetch();
    },
    onError: (err: any) =>
      Alert.alert("Failed", err?.message || "Unable to start cleanup for this nursery."),
  });

  return (
    <SafeAreaView style={styles.container} edges={["left", "right"]}>
      <FixedHeader
        title="Soft Delete Audit"
        subtitle="Nursery scoped deleted records"
        titleStyle={styles.headerTitle}
        actions={
          <Pressable style={styles.headerIconBtn} onPress={() => refetch()}>
            <MaterialIcons name={isRefetching ? "sync" : "refresh"} size={20} color={Colors.white} />
          </Pressable>
        }
      />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.toolbar}>
          <Text style={styles.meta}>Retention policy: 30 days auto-delete</Text>
          <Pressable
            style={styles.purgeBtn}
            onPress={() =>
              Alert.alert(
                "Run Cleanup",
                "Delete records that are soft-deleted for more than 30 days?",
                [
                  { text: "Cancel", style: "cancel" },
                  { text: "Run", onPress: () => purgeMutation.mutate() },
                ],
              )
            }
          >
            <Text style={styles.purgeBtnText}>
              {purgeMutation.isPending ? "Running..." : "Run Cleanup"}
            </Text>
          </Pressable>
        </View>

        {!data?.length ? <Text style={styles.empty}>No soft-deleted audit records found.</Text> : null}

        {(data || []).map((row: SoftDeletedAuditRow) => (
          <View key={row.id} style={styles.card}>
            <Text style={styles.title}>{row.entityType}</Text>
            <Text style={styles.line}>Entity: {row.entityName || row.entityId || "—"}</Text>
            <Text style={styles.line}>Deleted At: {formatDateTime(row.deletedAt)}</Text>
            <Text style={styles.line}>Auto Purge At: {formatDateTime(row.purgeAt)}</Text>
            <Text style={styles.line}>Deleted By: {row.deletedBy || "System"}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  headerTitle: { fontSize: 24 },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.34)",
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    gap: Spacing.md,
    paddingBottom: 110,
  },
  toolbar: {
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  meta: { color: Colors.textSecondary },
  purgeBtn: {
    backgroundColor: Colors.warning,
    borderRadius: 10,
    alignItems: "center",
    paddingVertical: Spacing.sm,
  },
  purgeBtnText: { color: Colors.white, fontWeight: "700" },
  empty: { color: Colors.textSecondary, textAlign: "center", marginTop: Spacing.md },
  card: {
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    gap: 4,
  },
  title: { color: Colors.text, fontWeight: "700" },
  line: { color: Colors.textSecondary, fontSize: 12 },
});
