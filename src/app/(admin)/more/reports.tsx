import { MaterialIcons } from "@expo/vector-icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
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
import StitchCard from "../../../components/common/StitchCard";
import StitchHeader from "../../../components/common/StitchHeader";
import { AdminTheme } from "../../../components/admin/theme";
import { ReportsExportService } from "../../../services/reports-export.service";
import { ReportService } from "../../../services/reports.service";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CHART_WIDTH = SCREEN_WIDTH - AdminTheme.spacing.lg * 2;
const CHART_HEIGHT = 200;

type Period = "all" | "week" | "month" | "year";
type ReportType =
  | "SALES"
  | "PAYMENT_DUES"
  | "INVENTORY"
  | "STAFF_ACCOUNTING";

const formatCurrency = (value: number) => `₹${Number(value || 0).toLocaleString("en-IN")}`;
const formatNumber = (value: number) => Number(value || 0).toLocaleString("en-IN");

const chartConfig = {
  backgroundGradientFrom: AdminTheme.colors.surface,
  backgroundGradientTo: AdminTheme.colors.surface,
  decimalPlaces: 0,
  color: (opacity = 1) => `rgba(31, 94, 140, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(92, 107, 122, ${opacity})`,
  barPercentage: 0.65,
  propsForBackgroundLines: { stroke: AdminTheme.colors.borderSoft },
  propsForLabels: { fontSize: 10 },
};

const reportTypeOptions: { id: ReportType; label: string; icon: keyof typeof MaterialIcons.glyphMap }[] = [
  { id: "SALES", label: "Sales", icon: "payments" },
  { id: "PAYMENT_DUES", label: "Dues", icon: "pending-actions" },
  { id: "INVENTORY", label: "Inventory", icon: "inventory" },
  { id: "STAFF_ACCOUNTING", label: "Staff", icon: "groups" },
];

const periodOptions: { id: Period; label: string; days?: number }[] = [
  { id: "all", label: "All Time" },
  { id: "week", label: "7 Days", days: 7 },
  { id: "month", label: "30 Days", days: 30 },
  { id: "year", label: "12 Months", days: 365 },
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
  const router = useRouter();
  const [selectedPeriod, setSelectedPeriod] = useState<Period>("all");
  const [selectedReportType, setSelectedReportType] = useState<ReportType>("SALES");

  const { startDate, endDate } = useMemo(() => getDateRange(selectedPeriod), [selectedPeriod]);

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ["report-analytics", selectedPeriod],
    queryFn: () => ReportService.getOverview({ startDate, endDate }),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const exportMutation = useMutation({
    mutationFn: (format: "PDF" | "XLSX") =>
      ReportsExportService.downloadByFormat({
        format,
        reportType: selectedReportType,
        startDate,
        endDate,
      }),
    onSuccess: async (response, format) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      try {
        if (response?.fileUri) {
          Alert.alert(
            "✅ Report Ready",
            `${format} report has been generated and opened for save/share.`
          );
          return;
        }

        throw new Error("Generated file could not be prepared on this device.");
      } catch (error: any) {
        Alert.alert(
          "⚠️ File Error",
          error?.message || "Unable to open the generated file. Please try again."
        );
      }
    },
    onError: (error: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        "❌ Report Error",
        error?.message || "Unable to generate report. Please check your connection and try again."
      );
    },
  });
  const summaryCards = useMemo(() => {
    if (!data) return [];
    return [
      { label: "Total Sales", value: formatCurrency(data.sales.totalSales), color: AdminTheme.colors.primary },
      { label: "Total Paid", value: formatCurrency(data.sales.totalPaid), color: AdminTheme.colors.success },
      { label: "Total Due", value: formatCurrency(data.sales.totalDue), color: AdminTheme.colors.danger },
      { label: "Profit", value: formatCurrency(data.sales.profit), color: data.sales.profit >= 0 ? AdminTheme.colors.success : AdminTheme.colors.danger },
    ];
  }, [data]);

  const chartPayload = useMemo(() => {
    if (!data) return null;

    if (selectedReportType === "SALES") {
      return {
        title: "Sales Overview",
        bar: {
          labels: ["Sales", "Paid", "Due", "Profit"],
          values: [
            data.sales.totalSales,
            data.sales.totalPaid,
            data.sales.totalDue,
            data.sales.profit,
          ],
          colors: [
            AdminTheme.colors.primary,
            AdminTheme.colors.success,
            AdminTheme.colors.danger,
            data.sales.profit >= 0 ? AdminTheme.colors.success : AdminTheme.colors.danger,
          ],
        },
      };
    }

    if (selectedReportType === "INVENTORY") {
      return {
        title: "Inventory Overview",
        bar: {
          labels: ["Available", "Sold", "Returned", "Discarded"],
          values: [
            data.inventory.totalPlantsAvailable,
            data.inventory.plantsSold,
            data.inventory.plantsReturned,
            data.inventory.plantsDiscarded,
          ],
          colors: [
            AdminTheme.colors.success,
            AdminTheme.colors.primary,
            AdminTheme.colors.warning,
            AdminTheme.colors.danger,
          ],
        },
      };
    }

    if (selectedReportType === "PAYMENT_DUES") {
      const total = data.sales.totalPaid + data.sales.totalDue;
      return {
        title: "Payment Distribution",
        pie: [
          {
            name: "Paid",
            amount: data.sales.totalPaid,
            color: AdminTheme.colors.success,
            legendFontColor: AdminTheme.colors.textMuted,
            legendFontSize: 12,
            percentage: total > 0 ? ((data.sales.totalPaid / total) * 100).toFixed(1) : "0",
          },
          {
            name: "Due",
            amount: data.sales.totalDue,
            color: AdminTheme.colors.danger,
            legendFontColor: AdminTheme.colors.textMuted,
            legendFontSize: 12,
            percentage: total > 0 ? ((data.sales.totalDue / total) * 100).toFixed(1) : "0",
          },
        ],
      };
    }

    if (selectedReportType === "STAFF_ACCOUNTING") {
      const topStaff = (data.staff.analytics || [])
        .filter(s => Number(s.collections || 0) > 0)
        .sort((a, b) => Number(b.collections || 0) - Number(a.collections || 0))
        .slice(0, 5);

      return {
        title: "Top Staff Collections",
        bar: {
          labels: topStaff.map((row) => (row.staffName || "Staff").slice(0, 10)),
          values: topStaff.map((row) => Number(row.collections || 0)),
          colors: [AdminTheme.colors.primary],
        },
      };
    }

    return null;
  }, [data, selectedReportType]);

  const onRefresh = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await refetch();
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.centered} edges={["left", "right"]}>
        <StitchHeader title="Reports" subtitle="Loading analytics..." onBackPress={() => router.back()} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={AdminTheme.colors.primary} />
          <Text style={styles.loadingText}>Loading report data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !data) {
    return (
      <SafeAreaView style={styles.centered} edges={["left", "right"]}>
        <StitchHeader title="Reports" subtitle="Unable to load reports" onBackPress={() => router.back()} />
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={48} color={AdminTheme.colors.danger} />
          <Text style={styles.errorTitle}>Unable to Load Reports</Text>
          <Text style={styles.errorMessage}>
            There was an issue loading the report data. Please check your connection and try again.
          </Text>
          <Pressable style={styles.retryButton} onPress={onRefresh}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const dateRangeText = startDate && endDate
    ? `${new Date(startDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} - ${new Date(endDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}`
    : "All-time data";

  return (
    <SafeAreaView style={styles.container} edges={["left", "right"]}>
      <StitchHeader title="Reports" subtitle="Analytics and exports" onBackPress={() => router.back()} actions={
        <Pressable onPress={onRefresh} style={styles.refreshButton}>
            <MaterialIcons name={isRefetching ? "hourglass-top" : "refresh"} size={20} color={AdminTheme.colors.surface} />
          </Pressable>
      }/>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        

        {/* Summary Cards */}
        <View style={styles.summaryGrid}>
          {summaryCards.map((item) => (
            <StitchCard key={item.label} style={styles.summaryCard}>
              <Text style={styles.summaryCardLabel}>{item.label}</Text>
              <Text style={[styles.summaryCardValue, { color: item.color }]}>{item.value}</Text>
            </StitchCard>
          ))}
        </View>

        {/* Controls Card */}
        <StitchCard style={styles.controlsCard}>
          {/* Period Selector */}
          <View style={styles.periodSection}>
            <Text style={styles.sectionLabel}>Time Period</Text>
            <View style={styles.periodGrid}>
              {periodOptions.map((period) => (
                <Pressable
                  key={period.id}
                  onPress={() => setSelectedPeriod(period.id)}
                  style={[
                    styles.periodChip,
                    selectedPeriod === period.id && styles.periodChipActive,
                  ]}
                >
                  <Text style={[
                    styles.periodChipText,
                    selectedPeriod === period.id && styles.periodChipTextActive,
                  ]}>
                    {period.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Report Type Selector */}
          <View style={styles.typeSection}>
            <Text style={styles.sectionLabel}>Report Type</Text>
            <View style={styles.typeGrid}>
              {reportTypeOptions.map((opt) => (
                <Pressable
                  key={opt.id}
                  onPress={() => setSelectedReportType(opt.id)}
                  style={[
                    styles.typeChip,
                    selectedReportType === opt.id && styles.typeChipActive,
                  ]}
                >
                  <MaterialIcons
                    name={opt.icon}
                    size={16}
                    color={selectedReportType === opt.id ? AdminTheme.colors.surface : AdminTheme.colors.textMuted}
                  />
                  <Text style={[
                    styles.typeChipText,
                    selectedReportType === opt.id && styles.typeChipTextActive,
                  ]}>
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Export Buttons */}
          <View style={styles.exportSection}>
            <Pressable
              style={[styles.exportButton, styles.pdfButton]}
              onPress={() => exportMutation.mutate("PDF")}
              disabled={exportMutation.isPending}
            >
              {exportMutation.isPending ? (
                <ActivityIndicator size="small" color={AdminTheme.colors.surface} />
              ) : (
                <>
                  <MaterialIcons name="picture-as-pdf" size={16} color={AdminTheme.colors.surface} />
                  <Text style={styles.exportButtonText}>Export PDF</Text>
                </>
              )}
            </Pressable>
            <Pressable
              style={[styles.exportButton, styles.excelButton]}
              onPress={() => exportMutation.mutate("XLSX")}
              disabled={exportMutation.isPending}
            >
              {exportMutation.isPending ? (
                <ActivityIndicator size="small" color={AdminTheme.colors.surface} />
              ) : (
                <>
                  <MaterialIcons name="grid-on" size={16} color={AdminTheme.colors.surface} />
                  <Text style={styles.exportButtonText}>Export Excel</Text>
                </>
              )}
            </Pressable>
          </View>
        </StitchCard>

        {/* Chart Section */}
        {chartPayload && (
          <StitchCard style={styles.chartCard}>
            <Text style={styles.chartTitle}>{chartPayload.title}</Text>
            {chartPayload.bar && chartPayload.bar.values.some(v => Number(v) > 0) ? (
              <View style={styles.chartContainer}>
                <BarChart
                  data={{
                    labels: chartPayload.bar.labels,
                    datasets: [{ data: chartPayload.bar.values }],
                  }}
                  width={CHART_WIDTH}
                  height={CHART_HEIGHT}
                  chartConfig={chartConfig}
                  fromZero
                  yAxisLabel={chartPayload.title.includes("Sales") ? "₹" : ""}
                  yAxisSuffix=""
                  showValuesOnTopOfBars
                  withInnerLines
                  style={styles.chart}
                />
              </View>
            ) : null}
            {chartPayload.pie && chartPayload.pie.some(d => Number(d.amount) > 0) ? (
              <View style={styles.pieContainer}>
                <PieChart
                  data={chartPayload.pie}
                  width={CHART_WIDTH}
                  height={180}
                  chartConfig={chartConfig}
                  accessor="amount"
                  backgroundColor="transparent"
                  paddingLeft="0"
                  absolute
                />
                <View style={styles.legendContainer}>
                  {chartPayload.pie.map((item, idx) => (
                    <View key={idx} style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                      <Text style={styles.legendText}>{item.name}</Text>
                      <Text style={styles.legendPercentage}>{item.percentage}%</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}
            {(!chartPayload.bar || !chartPayload.bar.values.some(v => Number(v) > 0)) &&
             (!chartPayload.pie || !chartPayload.pie.some(d => Number(d.amount) > 0)) && (
              <View style={styles.noDataContainer}>
                <MaterialIcons name="bar-chart" size={32} color={AdminTheme.colors.textSoft} />
                <Text style={styles.noDataText}>No data available for selected filters</Text>
              </View>
            )}
          </StitchCard>
        )}

        {/* Seed Lifecycle Section */}
        <StitchCard style={styles.metricsCard}>
          <Text style={styles.metricsTitle}>Seed Lifecycle</Text>
          <View style={styles.metricsGrid}>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Seeds Purchased</Text>
              <Text style={styles.metricValue}>{formatNumber(data.seedLifecycle.seedsPurchased)}</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Seeds Sown</Text>
              <Text style={styles.metricValue}>{formatNumber(data.seedLifecycle.seedsSown)}</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Germinated</Text>
              <Text style={[styles.metricValue, { color: AdminTheme.colors.success }]}>
                {formatNumber(data.seedLifecycle.germinatedPlants)}
              </Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Discarded</Text>
              <Text style={[styles.metricValue, { color: AdminTheme.colors.danger }]}>
                {formatNumber(data.seedLifecycle.discardedSeeds)}
              </Text>
            </View>
          </View>
        </StitchCard>

        {/* Customer Metrics Section */}
        <StitchCard style={styles.metricsCard}>
          <Text style={styles.metricsTitle}>Customer Metrics</Text>
          <View style={styles.customerMetrics}>
            <View style={styles.customerMetric}>
              <Text style={styles.metricLabel}>Total Customers</Text>
              <Text style={styles.metricValue}>{formatNumber(data.customers.totalCustomers)}</Text>
            </View>
            <View style={styles.customerMetric}>
              <Text style={styles.metricLabel}>With Due Balance</Text>
              <Text style={[styles.metricValue, { color: AdminTheme.colors.danger }]}>
                {formatNumber(data.customers.customersWithDues)}
              </Text>
            </View>
            <View style={styles.customerMetric}>
              <Text style={styles.metricLabel}>Completed Payments</Text>
              <Text style={[styles.metricValue, { color: AdminTheme.colors.success }]}>
                {formatNumber(data.customers.customersWithCompletedPayments)}
              </Text>
            </View>
          </View>
        </StitchCard>

        {/* Staff Performance Section */}
        <StitchCard style={styles.metricsCard}>
          <Text style={styles.metricsTitle}>Staff Performance</Text>
          {(data.staff.analytics || []).length > 0 ? (
            <View style={styles.staffList}>
              {(data.staff.analytics || []).slice(0, 5).map((row, index) => (
                <View key={`${row.staffUserId}-${index}`} style={styles.staffItem}>
                  <View style={styles.staffInfo}>
                    <Text style={styles.staffName}>{row.staffName || "Unknown Staff"}</Text>
                    <Text style={styles.staffSales}>Sales: {formatNumber(row.salesMade || 0)}</Text>
                  </View>
                  <View style={styles.staffStats}>
                    <Text style={styles.staffCollections}>
                      Collections: {formatCurrency(Number(row.collections || 0))}
                    </Text>
                    <Text style={styles.staffExpenses}>
                      Expenses: {formatCurrency(Number(row.expensesRecorded || 0))}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.noDataContainer}>
              <MaterialIcons name="people" size={32} color={AdminTheme.colors.textSoft} />
              <Text style={styles.noDataText}>No staff data available for this period</Text>
            </View>
          )}
        </StitchCard>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F6FAFF",
  },
  centered: {
    flex: 1,
    backgroundColor: "#F6FAFF",
  },
  scrollContent: {
    padding: AdminTheme.spacing.lg,
    gap: AdminTheme.spacing.md,
    paddingBottom: 100,
  },

  // Header Section
  headerSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: AdminTheme.spacing.xs,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: AdminTheme.colors.text,
  },
  dateRange: {
    fontSize: 12,
    color: AdminTheme.colors.textMuted,
    marginTop: 2,
  },
  refreshButton: {
    width: 44,
    height: 44,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    borderWidth:1,
    borderColor: "rgba(255,255,255,0.2)",
  },

  // Summary Cards
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  summaryCard: {
    width: "48%",
    padding: 12,
  },
  summaryCardLabel: {
    fontSize: 12,
    color: AdminTheme.colors.textMuted,
  },
  summaryCardValue: {
    fontSize: 18,
    fontWeight: "700",
    marginTop: 4,
  },

  // Controls Card
  controlsCard: {
    padding: 16,
    gap: 16,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: AdminTheme.colors.textMuted,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  periodSection: {
    gap: 8,
  },
  periodGrid: {
    flexDirection: "row",
    gap: 8,
  },
  periodChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: AdminTheme.colors.border,
    alignItems: "center",
  },
  periodChipActive: {
    backgroundColor: AdminTheme.colors.primary,
    borderColor: AdminTheme.colors.primary,
  },
  periodChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: AdminTheme.colors.textMuted,
  },
  periodChipTextActive: {
    color: AdminTheme.colors.surface,
  },
  typeSection: {
    gap: 8,
  },
  typeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  typeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: AdminTheme.colors.border,
    backgroundColor: AdminTheme.colors.surface,
  },
  typeChipActive: {
    backgroundColor: AdminTheme.colors.primary,
    borderColor: AdminTheme.colors.primary,
  },
  typeChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: AdminTheme.colors.textMuted,
  },
  typeChipTextActive: {
    color: AdminTheme.colors.surface,
  },
  exportSection: {
    flexDirection: "row",
    gap: 12,
    marginTop: 4,
  },
  exportButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 10,
    borderRadius: 10,
  },
  pdfButton: {
    backgroundColor: AdminTheme.colors.danger,
  },
  excelButton: {
    backgroundColor: AdminTheme.colors.success,
  },
  exportButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: AdminTheme.colors.surface,
  },

  // Chart Card
  chartCard: {
    padding: 16,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: AdminTheme.colors.text,
    marginBottom: 12,
  },
  chartContainer: {
    alignItems: "center",
  },
  chart: {
    marginLeft: -12,
    borderRadius: 12,
  },
  pieContainer: {
    alignItems: "center",
  },
  legendContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
    marginTop: 12,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    color: AdminTheme.colors.textMuted,
  },
  legendPercentage: {
    fontSize: 11,
    fontWeight: "600",
    color: AdminTheme.colors.text,
  },

  // Metrics Cards
  metricsCard: {
    padding: 16,
  },
  metricsTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: AdminTheme.colors.text,
    marginBottom: 12,
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  metricItem: {
    width: "48%",
    padding: 10,
    backgroundColor: AdminTheme.colors.surfaceMuted,
    borderRadius: 10,
  },
  metricLabel: {
    fontSize: 11,
    color: AdminTheme.colors.textMuted,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: "700",
    color: AdminTheme.colors.text,
  },
  customerMetrics: {
    flexDirection: "row",
    gap: 12,
  },
  customerMetric: {
    flex: 1,
    padding: 10,
    backgroundColor: AdminTheme.colors.surfaceMuted,
    borderRadius: 10,
  },

  // Staff List
  staffList: {
    gap: 12,
  },
  staffItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: AdminTheme.colors.borderSoft,
  },
  staffInfo: {
    flex: 1,
  },
  staffName: {
    fontSize: 14,
    fontWeight: "700",
    color: AdminTheme.colors.text,
  },
  staffSales: {
    fontSize: 11,
    color: AdminTheme.colors.textMuted,
    marginTop: 2,
  },
  staffStats: {
    alignItems: "flex-end",
  },
  staffCollections: {
    fontSize: 12,
    fontWeight: "600",
    color: AdminTheme.colors.success,
  },
  staffExpenses: {
    fontSize: 11,
    color: AdminTheme.colors.textMuted,
    marginTop: 2,
  },

  // Loading & Error States
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: AdminTheme.colors.textMuted,
  },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    gap: 12,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: AdminTheme.colors.text,
  },
  errorMessage: {
    fontSize: 13,
    color: AdminTheme.colors.textMuted,
    textAlign: "center",
    lineHeight: 18,
  },
  retryButton: {
    backgroundColor: AdminTheme.colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: AdminTheme.colors.surface,
    fontWeight: "700",
  },
  noDataContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
    gap: 8,
  },
  noDataText: {
    fontSize: 13,
    color: AdminTheme.colors.textSoft,
  },
});
