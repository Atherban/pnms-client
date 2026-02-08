import { MaterialIcons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { Dimensions, ScrollView, Text, View } from "react-native";
import { BarChart, LineChart, PieChart } from "react-native-chart-kit";
import { SafeAreaView } from "react-native-safe-area-context";
import { SalesService } from "../../../services/sales.service";
import { Colors, Spacing } from "../../../theme";

const SCREEN_WIDTH = Dimensions.get("window").width;
const CHART_WIDTH = SCREEN_WIDTH - Spacing.lg * 2 - Spacing.md * 2; // Account for card padding
const CHART_HEIGHT = 220;

export default function AdminReports() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["sales"],
    queryFn: SalesService.getAll,
  });

  const sales = Array.isArray(data?.data) ? data.data : [];

  /* -------------------- DATA PROCESSING -------------------- */
  const totalSalesAmount = sales.reduce((sum, sale) => {
    if (!Array.isArray(sale.items)) return sum;
    return (
      sum +
      sale.items.reduce(
        (s: number, i: any) => s + i.quantity * i.priceAtSale,
        0,
      )
    );
  }, 0);

  const totalTransactions = sales.length;
  const averageSaleValue =
    totalTransactions > 0 ? totalSalesAmount / totalTransactions : 0;

  const paymentStats = {
    CASH: 0,
    ONLINE: 0,
    UPI: 0,
  };

  sales.forEach((s) => {
    if (paymentStats[s.paymentMode] !== undefined) {
      paymentStats[s.paymentMode]++;
    }
  });

  /* ---------- Last 7 days sales ---------- */
  const last7Days = [...Array(7)]
    .map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split("T")[0];
    })
    .reverse();

  const dailySales = last7Days.map((date) => {
    return sales
      .filter((s) => s.saleDate?.startsWith(date))
      .reduce((sum, sale) => {
        if (!sale.items) return sum;
        return (
          sum +
          sale.items.reduce(
            (s: number, i: any) => s + i.quantity * i.priceAtSale,
            0,
          )
        );
      }, 0);
  });

  /* ---------- Top selling items ---------- */
  const itemMap: Record<string, number> = {};

  sales.forEach((sale) => {
    sale.items?.forEach((i: any) => {
      const key = i.plant?.name || "Unknown";
      itemMap[key] = (itemMap[key] || 0) + i.quantity;
    });
  });

  const topItems = Object.entries(itemMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  /* -------------------- LOADING STATE -------------------- */
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={[Colors.primary, Colors.primaryLight]}
          style={styles.headerGradient}
        >
          <View style={styles.headerContent}>
            <MaterialIcons name="analytics" size={28} color={Colors.white} />
            <Text style={styles.title}>Analytics & Reports</Text>
          </View>
        </LinearGradient>

        <View style={styles.loadingContainer}>
          <MaterialIcons
            name="data-saver-off"
            size={64}
            color={Colors.primary}
          />
          <Text style={styles.loadingTitle}>Loading Reports</Text>
          <Text style={styles.loadingSubtitle}>Fetching sales data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  /* -------------------- ERROR STATE -------------------- */
  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={[Colors.primary, Colors.primaryLight]}
          style={styles.headerGradient}
        >
          <View style={styles.headerContent}>
            <MaterialIcons name="analytics" size={28} color={Colors.white} />
            <Text style={styles.title}>Analytics & Reports</Text>
          </View>
        </LinearGradient>

        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={64} color={Colors.error} />
          <Text style={styles.errorTitle}>Failed to Load Reports</Text>
          <Text style={styles.errorMessage}>
            Unable to fetch sales data. Please try again later.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* -------------------- HEADER -------------------- */}
      <LinearGradient
        colors={[Colors.primary, Colors.primaryLight]}
        style={styles.headerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <View style={styles.headerContent}>
          <MaterialIcons name="analytics" size={28} color={Colors.white} />
          <Text style={styles.title}>Analytics & Reports</Text>
        </View>
        <Text style={styles.headerSubtitle}>
          Real-time insights and sales performance
        </Text>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* -------------------- KPI CARDS -------------------- */}
        <View style={styles.kpiRow}>
          <LinearGradient
            colors={[Colors.primary + "20", Colors.primaryLight + "20"]}
            style={styles.kpiCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.kpiIconContainer}>
              <MaterialIcons
                name="attach-money"
                size={22}
                color={Colors.primary}
              />
            </View>
            <Text style={styles.kpiValue}>
              ₹ {totalSalesAmount.toLocaleString("en-IN")}
            </Text>
            <Text style={styles.kpiLabel}>Total Sales</Text>
            <View style={styles.kpiTrend}>
              <MaterialIcons
                name="trending-up"
                size={16}
                color={Colors.success}
              />
              <Text style={styles.kpiTrendText}>Overall Revenue</Text>
            </View>
          </LinearGradient>

          <LinearGradient
            colors={[Colors.success + "20", "#34D399" + "20"]}
            style={styles.kpiCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.kpiIconContainer}>
              <MaterialIcons name="receipt" size={22} color={Colors.success} />
            </View>
            <Text style={styles.kpiValue}>{totalTransactions}</Text>
            <Text style={styles.kpiLabel}>Transactions</Text>
            <View style={styles.kpiTrend}>
              <MaterialIcons
                name="receipt-long"
                size={16}
                color={Colors.success}
              />
              <Text style={styles.kpiTrendText}>All Orders</Text>
            </View>
          </LinearGradient>

          <LinearGradient
            colors={[Colors.warning + "20", "#FBBF24" + "20"]}
            style={styles.kpiCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.kpiIconContainer}>
              <MaterialIcons
                name="trending-up"
                size={22}
                color={Colors.warning}
              />
            </View>
            <Text style={styles.kpiValue}>₹ {averageSaleValue.toFixed(0)}</Text>
            <Text style={styles.kpiLabel}>Avg. Order Value</Text>
            <View style={styles.kpiTrend}>
              <MaterialIcons
                name="analytics"
                size={16}
                color={Colors.warning}
              />
              <Text style={styles.kpiTrendText}>Per Transaction</Text>
            </View>
          </LinearGradient>
        </View>

        {/* -------------------- PAYMENT MODE DISTRIBUTION -------------------- */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="payment" size={22} color={Colors.text} />
            <Text style={styles.sectionTitle}>Payment Mode Distribution</Text>
          </View>
          <Text style={styles.sectionDescription}>
            Breakdown of payment methods used in transactions
          </Text>

          <View style={styles.chartContainer}>
            <View style={styles.chartWrapper}>
              <PieChart
                data={[
                  {
                    name: "Cash",
                    population: paymentStats.CASH,
                    color: Colors.success,
                    legendFontColor: Colors.textSecondary,
                    legendFontSize: 12,
                  },
                  {
                    name: "UPI",
                    population: paymentStats.UPI,
                    color: Colors.warning,
                    legendFontColor: Colors.textSecondary,
                    legendFontSize: 12,
                  },
                  {
                    name: "Online",
                    population: paymentStats.ONLINE,
                    color: Colors.primary,
                    legendFontColor: Colors.textSecondary,
                    legendFontSize: 12,
                  },
                ]}
                width={CHART_WIDTH}
                height={CHART_HEIGHT}
                chartConfig={chartConfig}
                accessor="population"
                backgroundColor="transparent"
                paddingLeft="70"
                absolute
                hasLegend={false}
              />
            </View>
          </View>

          {/* Custom Legend */}
          <View style={styles.legendContainer}>
            <View style={styles.legendItem}>
              <View
                style={[styles.legendDot, { backgroundColor: Colors.success }]}
              />
              <Text style={styles.legendLabel}>Cash</Text>
              <Text style={styles.legendValue}>{paymentStats.CASH}</Text>
            </View>
            <View style={styles.legendItem}>
              <View
                style={[styles.legendDot, { backgroundColor: Colors.warning }]}
              />
              <Text style={styles.legendLabel}>UPI</Text>
              <Text style={styles.legendValue}>{paymentStats.UPI}</Text>
            </View>
            <View style={styles.legendItem}>
              <View
                style={[styles.legendDot, { backgroundColor: Colors.primary }]}
              />
              <Text style={styles.legendLabel}>Online</Text>
              <Text style={styles.legendValue}>{paymentStats.ONLINE}</Text>
            </View>
          </View>
        </View>

        {/* -------------------- SALES TREND -------------------- */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="trending-up" size={22} color={Colors.text} />
            <Text style={styles.sectionTitle}>7-Day Sales Trend</Text>
          </View>
          <Text style={styles.sectionDescription}>
            Daily revenue performance over the past week
          </Text>

          <View style={styles.chartContainer}>
            <View style={styles.chartWrapper}>
              <LineChart
                data={{
                  labels: last7Days.map((d) => {
                    const date = new Date(d);
                    return date.toLocaleDateString("en-IN", {
                      weekday: "short",
                    });
                  }),
                  datasets: [
                    {
                      data: dailySales,
                    },
                  ],
                }}
                width={CHART_WIDTH}
                height={CHART_HEIGHT}
                chartConfig={lineChartConfig}
                bezier
                style={styles.chartStyle}
                verticalLabelRotation={0}
                formatYLabel={(value) => {
                  const num = parseInt(value);
                  return num >= 1000 ? `${(num / 1000).toFixed(0)}k` : value;
                }}
              />
            </View>
          </View>

          <View style={styles.summaryCard}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Highest Day</Text>
              <Text style={styles.summaryValue}>
                ₹ {Math.max(...dailySales).toLocaleString("en-IN")}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total Period</Text>
              <Text style={styles.summaryValue}>
                ₹{" "}
                {dailySales.reduce((a, b) => a + b, 0).toLocaleString("en-IN")}
              </Text>
            </View>
          </View>
        </View>

        {/* -------------------- TOP SELLING ITEMS -------------------- */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="local-offer" size={22} color={Colors.text} />
            <Text style={styles.sectionTitle}>Top Selling Items</Text>
          </View>
          <Text style={styles.sectionDescription}>
            Best performing plants by units sold
          </Text>

          <View style={styles.chartContainer}>
            <View style={styles.chartWrapper}>
              <BarChart
                data={{
                  labels: topItems.map((i) => {
                    const name = i[0];
                    return name.length > 8 ? name.substring(0, 8) + ".." : name;
                  }),
                  datasets: [
                    {
                      data: topItems.map((i) => i[1]),
                    },
                  ],
                }}
                width={CHART_WIDTH}
                height={CHART_HEIGHT + 40}
                chartConfig={barChartConfig}
                fromZero
                style={styles.chartStyle}
                verticalLabelRotation={30}
                showValuesOnTopOfBars
                showBarTops={false}
                yAxisLabel=""
                yAxisSuffix=""
              />
            </View>
          </View>

          <View style={styles.topItemsList}>
            {topItems.map(([name, quantity], index) => (
              <View key={name} style={styles.topItemRow}>
                <View
                  style={[
                    styles.rankContainer,
                    index === 0 && styles.rankFirst,
                    index === 1 && styles.rankSecond,
                    index === 2 && styles.rankThird,
                  ]}
                >
                  <Text
                    style={[
                      styles.rankText,
                      (index === 0 || index === 1 || index === 2) &&
                        styles.rankTextColored,
                    ]}
                  >
                    {index + 1}
                  </Text>
                </View>
                <Text style={styles.itemName} numberOfLines={1}>
                  {name}
                </Text>
                <View style={styles.quantityBadge}>
                  <Text style={styles.quantityText}>{quantity} units</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* -------------------- FOOTER -------------------- */}
        <View style={styles.footer}>
          <MaterialIcons name="update" size={16} color={Colors.textTertiary} />
          <Text style={styles.footerText}>
            Last updated:{" "}
            {new Date().toLocaleTimeString("en-IN", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            })}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* -------------------- STYLES -------------------- */

const styles = {
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerGradient: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xl,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    marginBottom: Spacing.lg,
  },
  headerContent: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  title: {
    fontSize: 24,
    fontWeight: "700" as const,
    color: Colors.white,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.9)",
    fontWeight: "500" as const,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    padding: 2 * Spacing.xl,
  },
  loadingTitle: {
    fontSize: 22,
    fontWeight: "700" as const,
    color: Colors.text,
    marginTop: Spacing.lg,
    marginBottom: Spacing.xs,
  },
  loadingSubtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: "center" as const,
  },
  errorContainer: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    padding: 2 * Spacing.xl,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: "700" as const,
    color: Colors.error,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  errorMessage: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: "center" as const,
    lineHeight: 22,
  },
  scroll: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  kpiRow: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  kpiCard: {
    flex: 1,
    minWidth: 110,
    borderRadius: 16,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  kpiIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginBottom: Spacing.sm,
  },
  kpiValue: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: Colors.text,
    marginBottom: 2,
  },
  kpiLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: "600" as const,
    marginBottom: Spacing.sm,
  },
  kpiTrend: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
  },
  kpiTrendText: {
    fontSize: 10,
    color: Colors.textTertiary,
  },
  sectionCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  sectionHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600" as const,
    color: Colors.text,
  },
  sectionDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
    lineHeight: 20,
  },
  chartContainer: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden" as const,
  },
  chartWrapper: {
    alignItems: "center" as const,
    justifyContent: "center" as const,
    overflow: "hidden" as const,
  },
  chartStyle: {
    borderRadius: 12,
    marginLeft: -20, // Compensate for chart padding
  },
  legendContainer: {
    flexDirection: "row" as const,
    justifyContent: "space-around" as const,
    gap: Spacing.sm,
    paddingHorizontal: Spacing.sm,
  },
  legendItem: {
    alignItems: "center" as const,
    flex: 1,
    padding: Spacing.sm,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: 4,
  },
  legendLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  legendValue: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: Colors.text,
  },
  summaryCard: {
    flexDirection: "row" as const,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  summaryItem: {
    flex: 1,
    alignItems: "center" as const,
  },
  summaryLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: Colors.text,
  },
  topItemsList: {
    gap: Spacing.sm,
  },
  topItemRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  rankContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surfaceDark,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  rankFirst: {
    backgroundColor: Colors.warning + "20",
  },
  rankSecond: {
    backgroundColor: Colors.textTertiary + "20",
  },
  rankThird: {
    backgroundColor: Colors.borderLight,
  },
  rankText: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: Colors.textSecondary,
  },
  rankTextColored: {
    color: Colors.primary,
  },
  itemName: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
    fontWeight: "500" as const,
  },
  quantityBadge: {
    backgroundColor: Colors.success + "20",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
  },
  quantityText: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: Colors.success,
  },
  footer: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: Spacing.xs,
    padding: Spacing.lg,
    marginBottom: 3 * Spacing.xl,
  },
  footerText: {
    fontSize: 12,
    color: Colors.textTertiary,
  },
};

/* -------------------- CHART CONFIGS -------------------- */

const chartConfig = {
  backgroundGradientFrom: Colors.white,
  backgroundGradientTo: Colors.white,
  decimalPlaces: 0,
  color: (opacity = 1) => Colors.primary,
  labelColor: (opacity = 1) => Colors.textSecondary,
  style: {
    borderRadius: 16,
  },
};

const lineChartConfig = {
  backgroundColor: Colors.white,
  backgroundGradientFrom: Colors.white,
  backgroundGradientTo: Colors.white,
  decimalPlaces: 0,
  color: (opacity = 1) => Colors.primary,
  labelColor: (opacity = 1) => Colors.textSecondary,
  style: {
    borderRadius: 16,
  },
  propsForDots: {
    r: "6",
    strokeWidth: "2",
    stroke: Colors.primary,
  },
  propsForBackgroundLines: {
    strokeWidth: 1,
    stroke: Colors.borderLight,
    strokeDasharray: "0",
  },
  fillShadowGradient: Colors.primary + "40",
  fillShadowGradientOpacity: 0.3,
};

const barChartConfig = {
  backgroundColor: Colors.white,
  backgroundGradientFrom: Colors.white,
  backgroundGradientTo: Colors.white,
  decimalPlaces: 0,
  color: (opacity = 1) => Colors.primary,
  labelColor: (opacity = 1) => Colors.textSecondary,
  style: {
    borderRadius: 16,
  },
  barPercentage: 0.6,
  propsForBackgroundLines: {
    strokeWidth: 1,
    stroke: Colors.borderLight,
  },
  fillShadowGradient: Colors.primary,
  fillShadowGradientOpacity: 1,
};
