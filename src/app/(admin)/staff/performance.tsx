import { MaterialIcons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import FixedHeader from "../../../components/common/FixedHeader";
import { StaffPerformanceService } from "../../../services/staff-performance.service";
import { Colors, Spacing } from "../../../theme";

const formatMoney = (amount: number) => `₹${Math.round(amount).toLocaleString("en-IN")}`;

export default function StaffPerformanceScreen() {
  const { data, refetch, isRefetching } = useQuery({
    queryKey: ["staff-performance"],
    queryFn: () => StaffPerformanceService.getRows(),
  });

  const rows = data || [];

  return (
    <SafeAreaView style={styles.container} edges={["left", "right"]}>
      <FixedHeader
        title="Staff Performance"
        subtitle="Sales and collection tracking by staff"
        titleStyle={styles.headerTitle}
        actions={
          <Pressable style={styles.headerIconBtn} onPress={() => refetch()}>
            <MaterialIcons
              name={isRefetching ? "sync" : "refresh"}
              size={20}
              color={Colors.white}
            />
          </Pressable>
        }
      />

      <ScrollView contentContainerStyle={styles.content}>
        {rows.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No sales data available.</Text>
          </View>
        ) : null}

        {rows.map((row) => (
          <View key={row.staffId} style={styles.card}>
            <Text style={styles.staff}>{row.staffName}</Text>
            <View style={styles.row}><Text style={styles.label}>Sales Count</Text><Text style={styles.value}>{row.salesCount}</Text></View>
            <View style={styles.row}><Text style={styles.label}>Revenue</Text><Text style={styles.value}>{formatMoney(row.revenue)}</Text></View>
            <View style={styles.row}><Text style={styles.label}>Collected</Text><Text style={styles.value}>{formatMoney(row.collectedAmount)}</Text></View>
            <View style={styles.row}><Text style={[styles.label, styles.warn]}>Due</Text><Text style={[styles.value, styles.warn]}>{formatMoney(row.dueAmount)}</Text></View>
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
  content: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, gap: Spacing.md, paddingBottom: 100 },
  emptyCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    padding: Spacing.lg,
  },
  emptyText: { color: Colors.textSecondary, textAlign: "center" },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    padding: Spacing.md,
    gap: 8,
  },
  staff: { color: Colors.text, fontWeight: "700", fontSize: 16 },
  row: { flexDirection: "row", justifyContent: "space-between" },
  label: { color: Colors.textSecondary },
  value: { color: Colors.text, fontWeight: "600" },
  warn: { color: Colors.warning },
});
