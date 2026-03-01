import { MaterialIcons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import FixedHeader from "../../../components/common/FixedHeader";
import { StaffAccountingService } from "../../../services/staff-accounting.service";
import { Colors, Spacing } from "../../../theme";

const formatMoney = (amount: number) => `₹${Math.round(amount).toLocaleString("en-IN")}`;

export default function StaffAccountingScreen() {
  const { data, refetch, isRefetching } = useQuery({
    queryKey: ["staff-accounting"],
    queryFn: () => StaffAccountingService.getRows(),
  });

  return (
    <SafeAreaView style={styles.container} edges={["left", "right"]}>
      <FixedHeader
        title="Staff Accounting"
        subtitle="Sales, collections, expenses and net"
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
        {(data || []).map((row) => (
          <View key={row.staffId} style={styles.card}>
            <Text style={styles.staff}>{row.staffName}</Text>
            <Text style={styles.meta}>
              {row.staffRole || "STAFF"}
              {row.periodStart && row.periodEnd
                ? ` • ${new Date(row.periodStart).toLocaleDateString("en-IN")} - ${new Date(row.periodEnd).toLocaleDateString("en-IN")}`
                : ""}
            </Text>
            <View style={styles.row}><Text style={styles.label}>Sales Count</Text><Text style={styles.value}>{Math.round(row.salesCount).toLocaleString("en-IN")}</Text></View>
            <View style={styles.row}><Text style={styles.label}>Sales</Text><Text style={styles.value}>{formatMoney(row.salesAmount)}</Text></View>
            <View style={styles.row}><Text style={styles.label}>Collections</Text><Text style={styles.value}>{formatMoney(row.collectionsAmount)}</Text></View>
            <View style={styles.row}><Text style={styles.label}>Expenses</Text><Text style={styles.value}>{formatMoney(row.expensesAmount)}</Text></View>
            <View style={styles.row}><Text style={[styles.label, styles.warn]}>Pending Due</Text><Text style={[styles.value, styles.warn]}>{formatMoney(row.pendingDueAmount)}</Text></View>
            <View style={styles.row}><Text style={styles.label}>Due Sales</Text><Text style={styles.value}>{Math.round(row.pendingDueSalesCount).toLocaleString("en-IN")}</Text></View>
            <View style={styles.row}><Text style={[styles.label, styles.net]}>Net</Text><Text style={[styles.value, styles.net]}>{formatMoney(row.netBalance)}</Text></View>
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
  card: { backgroundColor: Colors.surface, borderRadius: 14, borderWidth: 1, borderColor: Colors.borderLight, padding: Spacing.md, gap: 8 },
  staff: { color: Colors.text, fontWeight: "700", fontSize: 16 },
  meta: { color: Colors.textSecondary, marginBottom: 4 },
  row: { flexDirection: "row", justifyContent: "space-between" },
  label: { color: Colors.textSecondary },
  value: { color: Colors.text, fontWeight: "600" },
  net: { color: Colors.primary },
  warn: { color: Colors.warning },
});
