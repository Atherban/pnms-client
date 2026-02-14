import { MaterialIcons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { BarChart, LineChart, PieChart } from "react-native-chart-kit";
import { SafeAreaView } from "react-native-safe-area-context";
import { ReportService } from "../../../services/reports.service";
import { Colors, Spacing } from "../../../theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CHART_WIDTH = SCREEN_WIDTH - Spacing.lg * 2 - Spacing.md * 2;
const CHART_HEIGHT = 200;
const BOTTOM_NAV_HEIGHT = 80;

export default function AdminReports() {
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<
    "week" | "month" | "year"
  >("month");

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["reports", selectedPeriod],
    queryFn: () => ReportService.getOverview(),
  });

  const onRefresh = async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await refetch();
    setRefreshing(false);
  };

  // Calculate insights
  const insights = useMemo(() => {
    if (!data) return null;

    const totalSales = Object.values(data.salesByDate).reduce(
      (sum, val) => sum + val,
      0,
    );

    const salesByPlantEntries = Object.entries(data.salesByPlant);
    const topPlant = salesByPlantEntries.sort(([, a], [, b]) => b - a)[0];

    const inventoryHealth = data.inventoryCount - data.lowStock;
    const healthPercentage =
      data.inventoryCount > 0
        ? ((inventoryHealth / data.inventoryCount) * 100).toFixed(1)
        : "0";

    return {
      totalSales,
      topPlant: topPlant ? { name: topPlant[0], amount: topPlant[1] } : null,
      inventoryHealth,
      healthPercentage,
    };
  }, [data]);

  // Prepare chart data
  const salesChartData = useMemo(() => {
    if (!data) return null;

    const entries = Object.entries(data.salesByDate).slice(-7);

    return {
      labels: entries.map(([date]) =>
        new Date(date).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
        }),
      ),
      datasets: [
        {
          data: entries.map(([, value]) => value),
          color: (opacity = 1) => `rgba(46, 125, 50, ${opacity})`,
          strokeWidth: 2,
        },
      ],
    };
  }, [data]);

  const plantChartData = useMemo(() => {
    if (!data) return null;

    const entries = Object.entries(data.salesByPlant)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    const colors = ["#2E7D32", "#4CAF50", "#81C784", "#A5D6A7", "#C8E6C9"];

    return {
      labels: entries.map(([name]) =>
        name.length > 8 ? name.substring(0, 8) + "..." : name,
      ),
      datasets: [
        {
          data: entries.map(([, value]) => value),
          colors: entries.map(
            (_, i) =>
              (opacity = 1) =>
                colors[i],
          ),
        },
      ],
    };
  }, [data]);

  const paymentChartData = useMemo(() => {
    if (!data) return null;

    const entries = Object.entries(data.paymentSplit);
    const colors = ["#2E7D32", "#4CAF50", "#81C784", "#A5D6A7", "#66BB6A"];

    return entries.map(([name, value], index) => ({
      name: name,
      amount: value,
      color: colors[index % colors.length],
      legendFontColor: Colors.textSecondary,
      legendFontSize: 12,
    }));
  }, [data]);

  const chartConfig = {
    backgroundGradientFrom: Colors.white,
    backgroundGradientTo: Colors.white,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(46, 125, 50, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(102, 102, 102, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: "4",
      strokeWidth: "1",
      stroke: Colors.primary,
    },
    propsForLabels: {
      fontSize: 10,
    },
    propsForVerticalLabels: {
      fontSize: 10,
    },
    propsForHorizontalLabels: {
      fontSize: 10,
    },
    barPercentage: 0.6,
    formatYLabel: (value: string) => `₹${Number(value).toLocaleString()}`,
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Loading analytics...</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !data) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <View style={styles.errorCard}>
            <MaterialIcons
              name="error-outline"
              size={48}
              color={Colors.error}
            />
            <Text style={styles.errorTitle}>Failed to Load Reports</Text>
            <Text style={styles.errorMessage}>
              Unable to fetch analytics data. Please try again.
            </Text>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                refetch();
              }}
              style={({ pressed }) => [
                styles.retryButton,
                pressed && styles.retryButtonPressed,
              ]}
            >
              <MaterialIcons name="refresh" size={20} color={Colors.white} />
              <Text style={styles.retryButtonText}>Try Again</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Enhanced Header with Glass Morphism Effect */}
      <LinearGradient
        colors={[Colors.primary, Colors.primaryLight]}
        style={styles.headerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Decorative Elements */}
        <View style={styles.headerDecoration2} />

        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <View style={styles.headerIconContainer}>
              <LinearGradient
                colors={["rgba(255,255,255,0.3)", "rgba(255,255,255,0.1)"]}
                style={styles.headerIconGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <MaterialIcons
                  name="analytics"
                  size={24}
                  color={Colors.white}
                />
              </LinearGradient>
            </View>
            <View>
              <Text style={styles.headerTitle}>Analytics</Text>
              <View style={styles.headerDateContainer}>
                <MaterialIcons
                  name="calendar-today"
                  size={12}
                  color="rgba(255,255,255,0.7)"
                />
                <Text style={styles.headerSubtitle}>
                  {new Date().toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.headerRight}>
            <View style={styles.headerStatsBadge}>
              <MaterialIcons
                name="inventory"
                size={12}
                color="rgba(255,255,255,0.9)"
              />
              <Text style={styles.headerStatsText}>
                {data.inventoryCount} items
              </Text>
            </View>
            <Pressable
              onPress={onRefresh}
              style={({ pressed }) => [
                styles.headerButton,
                pressed && styles.headerButtonPressed,
              ]}
            >
              <LinearGradient
                colors={["rgba(255,255,255,0.25)", "rgba(255,255,255,0.1)"]}
                style={styles.headerButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <MaterialIcons name="refresh" size={18} color={Colors.white} />
              </LinearGradient>
            </Pressable>
          </View>
        </View>

        {/* Enhanced KPI Cards with Glass Morphism */}
        <View style={styles.kpiGrid}>
          <LinearGradient
            colors={["rgba(255,255,255,0.15)", "rgba(255,255,255,0.05)"]}
            style={styles.kpiCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.kpiIconWrapper}>
              <View
                style={[styles.kpiIconBg, { backgroundColor: Colors.success }]}
              >
                <MaterialIcons
                  name="trending-up"
                  size={16}
                  color={Colors.white}
                />
              </View>
            </View>
            <View style={styles.kpiContent}>
              <Text style={styles.kpiLabel}>Total Revenue</Text>
              <Text style={styles.kpiValue}>
                ₹{insights?.totalSales.toLocaleString()}
              </Text>
            </View>
          </LinearGradient>

          <LinearGradient
            colors={["rgba(255,255,255,0.15)", "rgba(255,255,255,0.05)"]}
            style={styles.kpiCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.kpiIconWrapper}>
              <View
                style={[styles.kpiIconBg, { backgroundColor: Colors.warning }]}
              >
                <MaterialIcons
                  name="inventory"
                  size={16}
                  color={Colors.white}
                />
              </View>
            </View>
            <View style={styles.kpiContent}>
              <Text style={styles.kpiLabel}>Inventory Health</Text>
              <View style={styles.kpiHealthRow}>
                <Text style={styles.kpiValue}>
                  {insights?.healthPercentage}%
                </Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Quick Stats Row */}
        <View style={styles.quickStatsRow}>
          <View style={styles.quickStatItem}>
            <MaterialIcons
              name="local-florist"
              size={14}
              color="rgba(255,255,255,0.7)"
            />
            <Text style={styles.quickStatLabel}>Top Plant</Text>
            <Text style={styles.quickStatValue} numberOfLines={1}>
              {insights?.topPlant?.name || "N/A"}
            </Text>
          </View>
          <View style={styles.quickStatDivider} />
          <View style={styles.quickStatItem}>
            <MaterialIcons
              name="warning"
              size={14}
              color="rgba(255,255,255,0.7)"
            />
            <Text style={styles.quickStatLabel}>Low Stock Alert</Text>
            <Text style={[styles.quickStatValue, { color: Colors.warning }]}>
              {data.lowStock}
            </Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Period Selector */}
        <View style={styles.periodSection}>
          <View style={styles.periodChips}>
            {[
              { id: "week", label: "7 Days" },
              { id: "month", label: "30 Days" },
              { id: "year", label: "12 Months" },
            ].map((period) => (
              <Pressable
                key={period.id}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedPeriod(period.id as any);
                }}
                style={[
                  styles.periodChip,
                  selectedPeriod === period.id && styles.periodChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.periodChipText,
                    selectedPeriod === period.id && styles.periodChipTextActive,
                  ]}
                >
                  {period.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Sales Trend Chart */}
        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <View style={styles.chartTitleContainer}>
              <View style={styles.chartIconBg}>
                <MaterialIcons
                  name="show-chart"
                  size={16}
                  color={Colors.primary}
                />
              </View>
              <Text style={styles.chartTitle}>Sales Trend</Text>
            </View>
            {insights?.topPlant && (
              <View style={styles.topPerformerBadge}>
                <MaterialIcons name="stars" size={12} color={Colors.warning} />
                <Text style={styles.topPerformerText} numberOfLines={1}>
                  Top: {insights.topPlant.name}
                </Text>
              </View>
            )}
          </View>

          {salesChartData && salesChartData.labels.length > 0 ? (
            <View style={styles.chartWrapper}>
              <LineChart
                data={salesChartData}
                width={CHART_WIDTH}
                height={CHART_HEIGHT}
                chartConfig={chartConfig}
                bezier
                style={styles.chart}
                yAxisLabel="₹"
                yAxisSuffix=""
                fromZero
                withVerticalLines={false}
                withHorizontalLines={true}
                withVerticalLabels={true}
                withHorizontalLabels={true}
                segments={4}
              />
            </View>
          ) : (
            <View style={styles.noDataContainer}>
              <MaterialIcons
                name="insert-chart"
                size={28}
                color={Colors.textTertiary}
              />
              <Text style={styles.noDataText}>No sales data</Text>
            </View>
          )}
        </View>

        {/* Top Selling Plants Chart */}
        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <View style={styles.chartTitleContainer}>
              <View style={styles.chartIconBg}>
                <MaterialIcons
                  name="local-florist"
                  size={16}
                  color={Colors.primary}
                />
              </View>
              <Text style={styles.chartTitle}>Top Performing Plants</Text>
            </View>
            <Text style={styles.chartSubtitle}>
              {plantChartData?.labels.length || 0} varieties
            </Text>
          </View>

          {plantChartData && plantChartData.labels.length > 0 ? (
            <View style={styles.chartWrapper}>
              <BarChart
                data={plantChartData}
                width={CHART_WIDTH}
                height={CHART_HEIGHT}
                chartConfig={chartConfig}
                style={styles.chart}
                yAxisLabel="₹"
                yAxisSuffix=""
                fromZero
                showValuesOnTopOfBars
                withInnerLines={false}
                withVerticalLines={false}
                segments={4}
              />
            </View>
          ) : (
            <View style={styles.noDataContainer}>
              <MaterialIcons
                name="bar-chart"
                size={28}
                color={Colors.textTertiary}
              />
              <Text style={styles.noDataText}>No plant sales</Text>
            </View>
          )}
        </View>

        {/* Payment Methods */}
        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <View style={styles.chartTitleContainer}>
              <View style={styles.chartIconBg}>
                <MaterialIcons
                  name="payment"
                  size={16}
                  color={Colors.primary}
                />
              </View>
              <Text style={styles.chartTitle}>Payment Distribution</Text>
            </View>
          </View>

          {paymentChartData && paymentChartData.length > 0 ? (
            <View style={styles.pieChartContainer}>
              <View style={styles.pieChartWrapper}>
                <PieChart
                  data={paymentChartData}
                  width={CHART_WIDTH * 0.9}
                  height={160}
                  chartConfig={chartConfig}
                  accessor="amount"
                  backgroundColor="transparent"
                  paddingLeft="60"
                  absolute
                  hasLegend={false}
                />
              </View>

              {/* Compact Legend */}
              <View style={styles.pieLegend}>
                {paymentChartData.map((item, index) => {
                  const total = Object.values(data.paymentSplit).reduce(
                    (sum, val) => sum + val,
                    0,
                  );
                  const percentage =
                    total > 0 ? ((item.amount / total) * 100).toFixed(1) : "0";
                  return (
                    <View key={item.name} style={styles.legendRow}>
                      <View
                        style={[
                          styles.legendDot,
                          { backgroundColor: item.color },
                        ]}
                      />
                      <Text style={styles.legendName} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text style={styles.legendPercent}>{percentage}%</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          ) : (
            <View style={styles.noDataContainer}>
              <MaterialIcons
                name="pie-chart"
                size={28}
                color={Colors.textTertiary}
              />
              <Text style={styles.noDataText}>No payment data</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* -------------------- Enhanced Styles -------------------- */

const styles = {
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center" as const,
    alignItems: "center" as const,
    paddingHorizontal: Spacing.lg,
  },
  // Enhanced Header with Glass Morphism
  headerGradient: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    position: "relative" as const,
    overflow: "hidden" as const,
  },
  headerDecoration1: {
    position: "absolute" as const,
    top: -20,
    right: -20,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  headerDecoration2: {
    position: "absolute" as const,
    bottom: -30,
    left: -30,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  headerContent: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    marginBottom: Spacing.lg,
  },
  headerLeft: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: Spacing.md,
  },
  headerIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    overflow: "hidden" as const,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  headerIconGradient: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: Colors.white,
    marginBottom: 4,
  },
  headerDateContainer: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
  },
  headerSubtitle: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.9)",
  },
  headerRight: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: Spacing.sm,
  },
  headerStatsBadge: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  headerStatsText: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: Colors.white,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    overflow: "hidden" as const,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  headerButtonGradient: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  headerButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.95 }],
  },
  // Enhanced KPI Grid
  kpiGrid: {
    flexDirection: "row" as const,
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  kpiCard: {
    flex: 1,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    padding: Spacing.md,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  kpiIconWrapper: {
    marginRight: Spacing.sm,
  },
  kpiIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  kpiContent: {
    flex: 1,
  },
  kpiLabel: {
    fontSize: 11,
    color: "rgba(255,255,255,0.8)",
    marginBottom: 4,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
  },
  kpiValue: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: Colors.white,
    marginBottom: 4,
  },
  kpiTrend: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 2,
  },
  kpiTrendText: {
    fontSize: 10,
    color: Colors.success,
    fontWeight: "600" as const,
  },
  kpiHealthRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: Spacing.sm,
    marginBottom: 4,
  },
  healthPill: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: 12,
  },
  healthPillText: {
    fontSize: 10,
    fontWeight: "700" as const,
  },
  kpiSubtext: {
    fontSize: 10,
    color: "rgba(255,255,255,0.7)",
  },
  // Quick Stats Row
  quickStatsRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: "rgba(0,0,0,0.2)",
    borderRadius: 16,
    padding: Spacing.sm,
    marginTop: Spacing.xs,
  },
  quickStatItem: {
    flex: 1,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
  },
  quickStatLabel: {
    fontSize: 11,
    color: "rgba(255,255,255,0.7)",
  },
  quickStatValue: {
    fontSize: 12,
    fontWeight: "700" as const,
    color: Colors.white,
    flex: 1,
  },
  quickStatDivider: {
    width: 1,
    height: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    marginHorizontal: Spacing.sm,
  },
  // Scroll Content
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: BOTTOM_NAV_HEIGHT + Spacing.lg,
  },
  // Period Section
  periodSection: {
    marginBottom: Spacing.lg,
  },
  periodChips: {
    flexDirection: "row" as const,
    backgroundColor: Colors.surface,
    borderRadius: 30,
    padding: 4,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  periodChip: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingVertical: Spacing.sm,
    borderRadius: 26,
  },
  periodChipActive: {
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  periodChipText: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: Colors.textSecondary,
  },
  periodChipTextActive: {
    color: Colors.white,
  },
  // Chart Cards
  chartCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  chartHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    marginBottom: Spacing.md,
  },
  chartTitleContainer: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: Spacing.sm,
  },
  chartIconBg: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: Colors.primary + "10",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: Colors.text,
  },
  chartSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  chartWrapper: {
    alignItems: "center" as const,
    marginLeft: -Spacing.md,
  },
  chart: {
    marginVertical: Spacing.xs,
    borderRadius: 12,
  },
  topPerformerBadge: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: Colors.warning + "10",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 16,
    gap: 4,
    maxWidth: 160,
  },
  topPerformerText: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: Colors.warning,
  },
  // Pie Chart
  pieChartContainer: {
    alignItems: "center" as const,
  },
  pieChartWrapper: {
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginBottom: Spacing.sm,
  },
  pieLegend: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    justifyContent: "center" as const,
    gap: Spacing.md,
    marginTop: Spacing.xs,
  },
  legendRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 16,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendName: {
    fontSize: 11,
    color: Colors.text,
    maxWidth: 80,
  },
  legendPercent: {
    fontSize: 11,
    fontWeight: "700" as const,
    color: Colors.textSecondary,
  },
  // No Data
  noDataContainer: {
    height: CHART_HEIGHT,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: Spacing.sm,
  },
  noDataText: {
    fontSize: 13,
    color: Colors.textTertiary,
  },
  // Export Button
  exportButton: {
    borderRadius: 16,
    overflow: "hidden" as const,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  exportButtonPressed: {
    transform: [{ scale: 0.98 }],
  },
  exportGradient: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingVertical: Spacing.lg,
    gap: Spacing.sm,
  },
  exportButtonText: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: Colors.white,
  },
  // Loading & Error States
  loadingCard: {
    backgroundColor: Colors.white,
    padding: Spacing.xl,
    borderRadius: 24,
    alignItems: "center" as const,
    gap: Spacing.lg,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  loadingText: {
    fontSize: 15,
    color: Colors.textSecondary,
    fontWeight: "500" as const,
  },
  errorCard: {
    backgroundColor: Colors.white,
    padding: Spacing.xl,
    borderRadius: 24,
    alignItems: "center" as const,
    gap: Spacing.md,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: Colors.error,
    marginTop: Spacing.sm,
  },
  errorMessage: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: "center" as const,
    marginBottom: Spacing.sm,
  },
  retryButton: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: 12,
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  retryButtonPressed: {
    backgroundColor: Colors.primaryDark,
    transform: [{ scale: 0.98 }],
  },
  retryButtonText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: "600" as const,
  },
};
