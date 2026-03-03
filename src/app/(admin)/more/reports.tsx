import { MaterialIcons } from "@expo/vector-icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { BarChart, PieChart } from "react-native-chart-kit";
import { SafeAreaView } from "react-native-safe-area-context";
import { ReportsExportService } from "../../../services/reports-export.service";
import { ReportService } from "../../../services/reports.service";
import { Colors, Spacing } from "../../../theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CHART_WIDTH = SCREEN_WIDTH - Spacing.lg * 2 - 20;
const CHART_HEIGHT = 220;

type Period = "all" | "week" | "month" | "year";
type ReportType =
  | "SALES"
  | "PAYMENT_DUES"
  | "INVENTORY"
  | "STAFF_ACCOUNTING";

const formatCurrency = (value: number) => `₹${Number(value || 0).toLocaleString("en-IN")}`;

const chartConfig = {
  backgroundGradientFrom: Colors.surface,
  backgroundGradientTo: Colors.surface,
  decimalPlaces: 0,
  color: (opacity = 1) => `rgba(31, 94, 140, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(92, 107, 122, ${opacity})`,
  barPercentage: 0.55,
  propsForBackgroundLines: { stroke: Colors.borderLight },
};

const reportTypeOptions: { id: ReportType; label: string; icon: keyof typeof MaterialIcons.glyphMap }[] = [
  { id: "SALES", label: "Sales", icon: "payments" },
  { id: "PAYMENT_DUES", label: "Dues", icon: "pending-actions" },
  { id: "INVENTORY", label: "Inventory", icon: "inventory" },
  { id: "STAFF_ACCOUNTING", label: "Staff", icon: "groups" },
];

const periodOptions: { id: Period; label: string }[] = [
  { id: "all", label: "All Time" },
  { id: "week", label: "7 Days" },
  { id: "month", label: "30 Days" },
  { id: "year", label: "12 Months" },
];

const getDateRange = (period: Period) => {
  if (period === "all") {
    return { startDate: undefined, endDate: undefined };
  }
  const end = new Date();
  const start = new Date(end);
  if (period === "week") start.setDate(end.getDate() - 7);
  if (period === "month") start.setDate(end.getDate() - 30);
  if (period === "year") start.setFullYear(end.getFullYear() - 1);
  return { startDate: start.toISOString(), endDate: end.toISOString() };
};

export default function AdminReports() {
  const [selectedPeriod, setSelectedPeriod] = useState<Period>("all");
  const [selectedReportType, setSelectedReportType] = useState<ReportType>("SALES");
  const [lastExport, setLastExport] = useState<{
    fileName: string;
    fileUri: string;
    contentType?: string;
  } | null>(null);

  const { startDate, endDate } = useMemo(() => getDateRange(selectedPeriod), [selectedPeriod]);

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ["report-analytics", selectedPeriod],
    queryFn: () => ReportService.getOverview({ startDate, endDate }),
  });

  const exportMutation = useMutation({
    mutationFn: (format: "PDF" | "XLSX") =>
      ReportsExportService.downloadByFormat({
        format,
        reportType: selectedReportType,
        startDate,
        endDate,
      }),
    onSuccess: (res, format) => {
      if (res.fileUri && res.fileName) {
        setLastExport({
          fileName: res.fileName,
          fileUri: res.fileUri,
          contentType: res.contentType,
        });
      }
      Alert.alert(
        res.byteLength > 0 ? "Report Downloaded" : "Report Error",
        res.byteLength > 0
          ? `${format} report has been prepared and opened in share/save options.`
          : "Unable to generate report. Please try again."
      );
    },
    onError: (e: any) => {
      Alert.alert("Report Error", e?.message || "Unable to generate report. Please try again.");
    },
  });

  const summaryCards = useMemo(() => {
    if (!data) return [];
    return [
      { label: "Total Sales", value: formatCurrency(data.sales.totalSales), color: Colors.primary },
      { label: "Total Paid", value: formatCurrency(data.sales.totalPaid), color: Colors.success },
      { label: "Total Due", value: formatCurrency(data.sales.totalDue), color: Colors.error },
      { label: "Profit", value: formatCurrency(data.sales.profit), color: Colors.info },
    ];
  }, [data]);

  const chartPayload = useMemo(() => {
    if (!data) return null;

    if (selectedReportType === "SALES") {
      return {
        title: "Sales Snapshot",
        bar: {
          labels: ["Sales", "Paid", "Due", "Refund", "Profit"],
          values: [
            data.sales.totalSales,
            data.sales.totalPaid,
            data.sales.totalDue,
            data.sales.refundedAmount,
            data.sales.profit,
          ],
        },
      };
    }

    if (selectedReportType === "INVENTORY") {
      return {
        title: "Inventory Snapshot",
        bar: {
          labels: ["Available", "Sold", "Returned", "Discarded"],
          values: [
            data.inventory.totalPlantsAvailable,
            data.inventory.plantsSold,
            data.inventory.plantsReturned,
            data.inventory.plantsDiscarded,
          ],
        },
      };
    }

    if (selectedReportType === "PAYMENT_DUES") {
      return {
        title: "Payment Distribution",
        pie: [
          {
            name: "Paid",
            amount: data.sales.totalPaid,
            color: Colors.success,
            legendFontColor: Colors.textSecondary,
            legendFontSize: 12,
          },
          {
            name: "Due",
            amount: data.sales.totalDue,
            color: Colors.error,
            legendFontColor: Colors.textSecondary,
            legendFontSize: 12,
          },
        ],
      };
    }

    if (selectedReportType === "STAFF_ACCOUNTING") {
      const topStaff = (data.staff.analytics || [])
        .slice()
        .sort((a, b) => Number(b.collections || 0) - Number(a.collections || 0))
        .slice(0, 5);

      return {
        title: "Top Staff Collections",
        bar: {
          labels: topStaff.map((row) => (row.staffName || "Staff").slice(0, 8)),
          values: topStaff.map((row) => Number(row.collections || 0)),
        },
      };
    }

    return null;
  }, [data, selectedReportType]);

  const onRefresh = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await refetch();
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.centered} edges={["left", "right"]}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.helperText}>Loading report analytics...</Text>
      </SafeAreaView>
    );
  }

  if (error || !data) {
    return (
      <SafeAreaView style={styles.centered} edges={["left", "right"]}>
        <MaterialIcons name="error-outline" size={46} color={Colors.error} />
        <Text style={styles.errorTitle}>Unable to load reports</Text>
        <Text style={styles.helperText}>Please retry. If this continues, check report permissions.</Text>
        <Pressable style={styles.retryBtn} onPress={onRefresh}>
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["left", "right"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Reports</Text>
            <Text style={styles.subtitle}>
              {startDate && endDate
                ? `${new Date(startDate).toLocaleDateString("en-IN")} - ${new Date(endDate).toLocaleDateString("en-IN")}`
                : "All-time analytics"}
            </Text>
          </View>
          <Pressable onPress={onRefresh} style={styles.iconBtn}>
            <MaterialIcons name={isRefetching ? "hourglass-top" : "refresh"} size={18} color={Colors.white} />
          </Pressable>
        </View>

        <View style={styles.cardRow}>
          {summaryCards.map((item) => (
            <View key={item.label} style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>{item.label}</Text>
              <Text style={[styles.summaryValue, { color: item.color }]}>{item.value}</Text>
            </View>
          ))}
        </View>

        <View style={styles.selectorWrap}>
          <View style={styles.periodRow}>
            {periodOptions.map((period) => (
              <Pressable
                key={period.id}
                onPress={() => setSelectedPeriod(period.id)}
                style={[styles.chip, selectedPeriod === period.id && styles.chipActive]}
              >
                <Text style={[styles.chipText, selectedPeriod === period.id && styles.chipTextActive]}>
                  {period.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.typeRow}>
            {reportTypeOptions.map((opt) => (
              <Pressable
                key={opt.id}
                onPress={() => setSelectedReportType(opt.id)}
                style={[styles.typeChip, selectedReportType === opt.id && styles.typeChipActive]}
              >
                <MaterialIcons
                  name={opt.icon}
                  size={14}
                  color={selectedReportType === opt.id ? Colors.white : Colors.textSecondary}
                />
                <Text
                  style={[styles.typeChipText, selectedReportType === opt.id && styles.typeChipTextActive]}
                >
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <View style={styles.exportRow}>
            <Pressable
              style={[styles.exportBtn, { backgroundColor: Colors.error }]}
              onPress={() => exportMutation.mutate("PDF")}
              disabled={exportMutation.isPending}
            >
              <MaterialIcons name="picture-as-pdf" size={16} color={Colors.white} />
              <Text style={styles.exportText}>PDF</Text>
            </Pressable>
            <Pressable
              style={[styles.exportBtn, { backgroundColor: Colors.success }]}
              onPress={() => exportMutation.mutate("XLSX")}
              disabled={exportMutation.isPending}
            >
              <MaterialIcons name="grid-on" size={16} color={Colors.white} />
              <Text style={styles.exportText}>Excel</Text>
            </Pressable>
          </View>
        </View>

        {lastExport ? (
          <View style={styles.lastExportCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.lastExportTitle}>Last Export</Text>
              <Text style={styles.lastExportName}>{lastExport.fileName}</Text>
              <Text style={styles.lastExportPath} numberOfLines={1}>
                {lastExport.fileUri}
              </Text>
            </View>
            <Pressable
              style={styles.openAgainBtn}
              onPress={async () => {
                try {
                  await ReportsExportService.reopenSavedFile(
                    lastExport.fileUri,
                    lastExport.contentType
                  );
                } catch (e: any) {
                  Alert.alert("Open Failed", e?.message || "Unable to open exported file.");
                }
              }}
            >
              <MaterialIcons name="open-in-new" size={16} color={Colors.white} />
              <Text style={styles.openAgainText}>Open Again</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>{chartPayload?.title || "Overview"}</Text>
          {!!chartPayload?.bar && chartPayload.bar.values.some((v) => Number(v) > 0) ? (
            <BarChart
              data={{
                labels: chartPayload.bar.labels,
                datasets: [{ data: chartPayload.bar.values }],
              }}
              width={CHART_WIDTH}
              height={CHART_HEIGHT}
              chartConfig={chartConfig}
              fromZero
              yAxisLabel="₹"
              yAxisSuffix=""
              showValuesOnTopOfBars
              withInnerLines
              style={{ marginLeft: -12, borderRadius: 12 }}
            />
          ) : null}
          {!!chartPayload?.pie && chartPayload.pie.some((d) => Number(d.amount) > 0) ? (
            <PieChart
              data={chartPayload.pie}
              width={CHART_WIDTH}
              height={210}
              chartConfig={chartConfig}
              accessor="amount"
              backgroundColor="transparent"
              paddingLeft="12"
              absolute
            />
          ) : null}
          {((!chartPayload?.bar || !chartPayload.bar.values.some((v) => Number(v) > 0)) &&
            (!chartPayload?.pie || !chartPayload.pie.some((d) => Number(d.amount) > 0))) ? (
            <Text style={styles.helperText}>No chart data available for selected filters.</Text>
          ) : null}
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Seed Lifecycle</Text>
          <View style={styles.metricRow}><Text style={styles.metricLabel}>Seeds Purchased</Text><Text style={styles.metricValue}>{data.seedLifecycle.seedsPurchased}</Text></View>
          <View style={styles.metricRow}><Text style={styles.metricLabel}>Seeds Sown</Text><Text style={styles.metricValue}>{data.seedLifecycle.seedsSown}</Text></View>
          <View style={styles.metricRow}><Text style={styles.metricLabel}>Germinated</Text><Text style={styles.metricValue}>{data.seedLifecycle.germinatedPlants}</Text></View>
          <View style={styles.metricRow}><Text style={styles.metricLabel}>Discarded</Text><Text style={styles.metricValue}>{data.seedLifecycle.discardedSeeds}</Text></View>
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Customer Metrics</Text>
          <View style={styles.metricRow}><Text style={styles.metricLabel}>Total Customers</Text><Text style={styles.metricValue}>{data.customers.totalCustomers}</Text></View>
          <View style={styles.metricRow}><Text style={styles.metricLabel}>Customers with Due</Text><Text style={styles.metricValue}>{data.customers.customersWithDues}</Text></View>
          <View style={styles.metricRow}><Text style={styles.metricLabel}>Completed Payments</Text><Text style={styles.metricValue}>{data.customers.customersWithCompletedPayments}</Text></View>
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Staff Performance</Text>
          {(data.staff.analytics || []).slice(0, 6).map((row, index) => (
            <View key={`${row.staffUserId}-${index}`} style={styles.staffRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.staffName}>{row.staffName || "Unknown Staff"}</Text>
                <Text style={styles.staffMeta}>Sales: {row.salesMade || 0}</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={styles.staffMeta}>Collections: {formatCurrency(Number(row.collections || 0))}</Text>
                <Text style={styles.staffMeta}>Expenses: {formatCurrency(Number(row.expensesRecorded || 0))}</Text>
              </View>
            </View>
          ))}
          {(data.staff.analytics || []).length === 0 ? (
            <Text style={styles.helperText}>No staff accounting rows for selected period.</Text>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F6FAFF" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 20, backgroundColor: "#F6FAFF" },
  content: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: 120 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 24, fontWeight: "700", color: Colors.text },
  subtitle: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  iconBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: Colors.primary },

  cardRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  summaryCard: { width: "48%", backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.borderLight, borderRadius: 12, padding: 12 },
  summaryLabel: { fontSize: 12, color: Colors.textSecondary },
  summaryValue: { fontSize: 16, fontWeight: "700", marginTop: 4 },

  selectorWrap: { backgroundColor: Colors.surface, borderRadius: 12, borderWidth: 1, borderColor: Colors.borderLight, padding: 12, gap: 10 },
  periodRow: { flexDirection: "row", gap: 8 },
  chip: { flex: 1, borderRadius: 18, borderWidth: 1, borderColor: Colors.border, paddingVertical: 8, alignItems: "center" },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: 12, color: Colors.textSecondary, fontWeight: "600" },
  chipTextActive: { color: Colors.white },
  typeRow: { gap: 8, paddingVertical: 2, paddingRight: 12 },
  typeChip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1, borderColor: Colors.border, borderRadius: 18, backgroundColor: Colors.surface },
  typeChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  typeChipText: { color: Colors.textSecondary, fontSize: 12, fontWeight: "600" },
  typeChipTextActive: { color: Colors.white },

  exportRow: { flexDirection: "row", gap: 10 },
  exportBtn: { flex: 1, borderRadius: 10, paddingVertical: 10, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6 },
  exportText: { color: Colors.white, fontWeight: "700" },
  lastExportCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  lastExportTitle: { fontSize: 11, color: Colors.textSecondary, fontWeight: "600" },
  lastExportName: { fontSize: 14, color: Colors.text, fontWeight: "700", marginTop: 2 },
  lastExportPath: { fontSize: 11, color: Colors.textTertiary, marginTop: 2 },
  openAgainBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  openAgainText: { color: Colors.white, fontWeight: "700", fontSize: 12 },

  panel: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.borderLight, borderRadius: 12, padding: 12 },
  panelTitle: { fontSize: 15, fontWeight: "700", color: Colors.text, marginBottom: 8 },
  metricRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 },
  metricLabel: { color: Colors.textSecondary, fontSize: 13 },
  metricValue: { color: Colors.text, fontWeight: "700", fontSize: 13 },

  staffRow: { flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: Colors.borderLight, paddingTop: 10, marginTop: 10 },
  staffName: { color: Colors.text, fontWeight: "700", fontSize: 13 },
  staffMeta: { color: Colors.textSecondary, fontSize: 12 },

  helperText: { color: Colors.textSecondary, fontSize: 12, textAlign: "center" },
  errorTitle: { fontSize: 16, fontWeight: "700", color: Colors.text },
  retryBtn: { marginTop: 8, backgroundColor: Colors.primary, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 8 },
  retryText: { color: Colors.white, fontWeight: "700" },
});
