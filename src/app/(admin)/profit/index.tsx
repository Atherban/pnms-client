import { MaterialIcons } from "@expo/vector-icons";
import { useMutation } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { useState } from "react";
import { useRouter } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { SafeAreaView } from "react-native-safe-area-context";

import StitchHeader from "../../../components/common/StitchHeader";
import { AdminTheme } from "../../../components/admin/theme";
import { ProfitService } from "../../../services/profit.service";
import { formatErrorMessage } from "../../../utils/error";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const BOTTOM_NAV_HEIGHT = 80;

export default function AdminProfit() {
  const router = useRouter();
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  /* -------------------- Date Helpers -------------------- */

  const formatDateOnly = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const toDateOnlyValue = (date: Date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const getInclusiveDays = (start: Date, end: Date) => {
    const startOnly = toDateOnlyValue(start);
    const endOnly = toDateOnlyValue(end);
    const diffMs = endOnly.getTime() - startOnly.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
  };

  const formatDisplayDate = (date: Date | null) => {
    if (!date) return "Select date";
    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  /* -------------------- Date Handlers -------------------- */

  const handleStartDateConfirm = (date: Date) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const selected = toDateOnlyValue(date);
    setStartDate(selected);
    setEndDate((currentEnd) => {
      if (!currentEnd) return currentEnd;
      const normalizedEnd = toDateOnlyValue(currentEnd);
      return selected > normalizedEnd ? selected : normalizedEnd;
    });
    setShowStartPicker(false);
  };

  const handleEndDateConfirm = (date: Date) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const selected = toDateOnlyValue(date);
    setEndDate(selected);
    setStartDate((currentStart) => {
      if (!currentStart) return currentStart;
      const normalizedStart = toDateOnlyValue(currentStart);
      return selected < normalizedStart ? selected : normalizedStart;
    });
    setShowEndPicker(false);
  };

  const handleClearDates = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStartDate(null);
    setEndDate(null);
  };

  const handleQuickRange = (days: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const end = toDateOnlyValue(new Date());
    const start = toDateOnlyValue(new Date());
    start.setDate(start.getDate() - days);
    setStartDate(start);
    setEndDate(end);
  };

  /* -------------------- Profit Query -------------------- */

  const mutation = useMutation({
    mutationFn: ProfitService.getProfit,
    onError: (error: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Error", formatErrorMessage(error));
    },
  });

  const handleFetch = () => {
    if (!startDate || !endDate) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert(
        "Select Dates",
        "Please select both start and end dates to generate profit report."
      );
      return;
    }

    if (startDate > endDate) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert("Invalid Date Range", "Start date cannot be after end date.");
      return;
    }

    const rangeDays = getInclusiveDays(startDate, endDate);
    if (rangeDays > 366) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert(
        "Invalid Date Range",
        "Date range cannot exceed 366 days. Please select a shorter period."
      );
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    mutation.mutate({
      startDate: formatDateOnly(startDate),
      endDate: formatDateOnly(endDate),
    });
  };

  /* -------------------- Normalize Response -------------------- */

  const result = mutation.data ?? {
    totalGrossSales: 0,
    totalDiscount: 0,
    totalSales: 0,
    totalCollected: 0,
    totalDue: 0,
    totalExpenses: 0,
    totalLabourCost: 0,
    totalCost: 0,
    accruedProfit: 0,
    profit: 0,
  };

  const totalGrossSales = Number(result.totalGrossSales) || 0;
  const totalDiscount = Number(result.totalDiscount) || 0;
  const totalSales = Number(result.totalSales) || 0;
  const totalCollected = Number(result.totalCollected) || 0;
  const totalDue = Number(result.totalDue) || 0;
  const totalExpenses = Number(result.totalExpenses) || 0;
  const totalLabourCost = Number(result.totalLabourCost) || 0;
  const totalCost = Number(result.totalCost) || 0;
  const accruedProfit = Number(result.accruedProfit) || 0;
  const profit = Number(result.profit) || 0;

  const profitMargin =
    totalSales > 0 ? ((profit / totalSales) * 100).toFixed(2) : "0";

  const dateRangeDays =
    startDate && endDate
      ? getInclusiveDays(startDate, endDate)
      : 0;

  const isDateRangeInvalid = (() => {
    if (!startDate || !endDate) return false;
    return startDate > endDate || getInclusiveDays(startDate, endDate) > 366;
  })();

  /* -------------------- UI -------------------- */

  return (
    <SafeAreaView style={styles.container} edges={["left", "right"]}>
      <StitchHeader title="Profit Report" subtitle="Analyze financial performance" onBackPress={() => router.back()} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Date Range Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <MaterialIcons name="calendar-today" size={20} color={AdminTheme.colors.primary} />
            </View>
            <Text style={styles.sectionTitle}>Date Range</Text>
          </View>

          {/* Quick Date Ranges */}
          <View style={styles.quickRangeContainer}>
            <Text style={styles.subsectionTitle}>Quick Select</Text>
            <View style={styles.quickRangeGrid}>
              {[
                { label: "Today", days: 0, icon: "today" },
                { label: "Last 7 Days", days: 6, icon: "date-range" },
                { label: "Last 30 Days", days: 29, icon: "calendar-month" },
                { label: "Last 90 Days", days: 89, icon: "calendar-view-week" },
              ].map((range) => (
                <Pressable
                  key={range.label}
                  onPress={() => handleQuickRange(range.days)}
                  style={({ pressed }) => [
                    styles.quickChip,
                    pressed && styles.quickChipPressed,
                  ]}
                >
                  <MaterialIcons name={range.icon as any} size={14} color={AdminTheme.colors.primary} />
                  <Text style={styles.quickChipText}>{range.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.divider} />

          {/* Custom Date Range */}
          <View style={styles.customRangeContainer}>
            <Text style={styles.subsectionTitle}>Custom Range</Text>
            
            <View style={styles.dateRow}>
              <Pressable
                onPress={() => setShowStartPicker(true)}
                style={({ pressed }) => [
                  styles.dateCard,
                  pressed && styles.dateCardPressed,
                ]}
              >
                <View style={styles.dateCardHeader}>
                  <MaterialIcons name="play-arrow" size={14} color={AdminTheme.colors.textMuted} />
                  <Text style={styles.dateCardLabel}>Start Date</Text>
                </View>
                <Text style={[
                  styles.dateCardValue,
                  startDate && styles.dateCardValueActive
                ]}>
                  {formatDisplayDate(startDate)}
                </Text>
              </Pressable>

              <MaterialIcons name="arrow-forward" size={20} color={AdminTheme.colors.textMuted} />

              <Pressable
                onPress={() => setShowEndPicker(true)}
                style={({ pressed }) => [
                  styles.dateCard,
                  pressed && styles.dateCardPressed,
                ]}
              >
                <View style={styles.dateCardHeader}>
                  <MaterialIcons name="stop" size={14} color={AdminTheme.colors.textMuted} />
                  <Text style={styles.dateCardLabel}>End Date</Text>
                </View>
                <Text style={[
                  styles.dateCardValue,
                  endDate && styles.dateCardValueActive
                ]}>
                  {formatDisplayDate(endDate)}
                </Text>
              </Pressable>
            </View>

            {(startDate || endDate) && (
              <Pressable
                onPress={handleClearDates}
                style={({ pressed }) => [
                  styles.clearButton,
                  pressed && styles.clearButtonPressed,
                ]}
              >
                <MaterialIcons name="clear" size={16} color={AdminTheme.colors.textMuted} />
                <Text style={styles.clearButtonText}>Clear Dates</Text>
              </Pressable>
            )}
          </View>

          {/* Date Range Info */}
          {startDate && endDate && !isDateRangeInvalid && (
            <View style={styles.rangeInfo}>
              <MaterialIcons name="info" size={14} color={AdminTheme.colors.info} />
              <Text style={styles.rangeInfoText}>
                {dateRangeDays} day{dateRangeDays !== 1 ? "s" : ""} selected
              </Text>
            </View>
          )}

          {/* Generate Button */}
          <Pressable
            onPress={handleFetch}
            disabled={!startDate || !endDate || mutation.isPending || isDateRangeInvalid}
            style={({ pressed }) => [
              styles.generateButton,
              (!startDate || !endDate || isDateRangeInvalid) && styles.generateButtonDisabled,
              pressed && styles.generateButtonPressed,
            ]}
          >
            {mutation.isPending ? (
              <ActivityIndicator color={AdminTheme.colors.surface} size="small" />
            ) : (
              <>
                <MaterialIcons name="analytics" size={20} color={AdminTheme.colors.surface} />
                <Text style={styles.generateButtonText}>Generate Report</Text>
              </>
            )}
          </Pressable>
        </View>

        {/* Loading State */}
        {mutation.isPending && (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color={AdminTheme.colors.primary} />
            <Text style={styles.loadingText}>Analyzing data...</Text>
          </View>
        )}

        {/* Error State */}
        {mutation.isError && (
          <View style={styles.errorCard}>
            <MaterialIcons name="error-outline" size={40} color={AdminTheme.colors.danger} />
            <Text style={styles.errorTitle}>Unable to Generate Report</Text>
            <Text style={styles.errorMessage}>Please check your connection and try again</Text>
          </View>
        )}

        {/* Results Section */}
        {mutation.data && (
          <View style={styles.resultsCard}>
            {/* Header */}
            <View style={styles.resultsHeader}>
              <View style={styles.resultsTitleContainer}>
                <MaterialIcons name="analytics" size={22} color={AdminTheme.colors.primary} />
                <Text style={styles.resultsTitle}>Profit Analysis</Text>
              </View>
              <View style={styles.periodChip}>
                <MaterialIcons name="date-range" size={12} color={AdminTheme.colors.surface} />
                <Text style={styles.periodChipText}>
                  {formatDisplayDate(startDate)} - {formatDisplayDate(endDate)}
                </Text>
              </View>
            </View>

            {/* Key Metrics Grid */}
            <View style={styles.metricsGrid}>
              {/* Net Sales */}
              <View style={styles.metricItem}>
                <View style={[styles.metricIcon, { backgroundColor: `${AdminTheme.colors.success}15` }]}>
                  <MaterialIcons name="trending-up" size={20} color={AdminTheme.colors.success} />
                </View>
                <View style={styles.metricContent}>
                  <Text style={styles.metricLabel}>Net Sales</Text>
                  <Text style={styles.metricValue}>₹ {totalSales.toLocaleString("en-IN")}</Text>
                  <Text style={styles.metricDetail}>
                    Gross: ₹ {totalGrossSales.toLocaleString("en-IN")}
                  </Text>
                  <Text style={styles.metricDetail}>
                    Discount: ₹ {totalDiscount.toLocaleString("en-IN")}
                  </Text>
                </View>
              </View>

              {/* Collections */}
              <View style={styles.metricItem}>
                <View style={[styles.metricIcon, { backgroundColor: `${AdminTheme.colors.info}15` }]}>
                  <MaterialIcons name="payments" size={20} color={AdminTheme.colors.info} />
                </View>
                <View style={styles.metricContent}>
                  <Text style={styles.metricLabel}>Collections</Text>
                  <Text style={styles.metricValue}>₹ {totalCollected.toLocaleString("en-IN")}</Text>
                  <Text style={styles.metricDetail}>
                    Due: ₹ {totalDue.toLocaleString("en-IN")}
                  </Text>
                </View>
              </View>

              {/* Total Cost */}
              <View style={styles.metricItem}>
                <View style={[styles.metricIcon, { backgroundColor: `${AdminTheme.colors.warning}15` }]}>
                  <MaterialIcons name="trending-down" size={20} color={AdminTheme.colors.warning} />
                </View>
                <View style={styles.metricContent}>
                  <Text style={styles.metricLabel}>Total Cost</Text>
                  <Text style={styles.metricValue}>₹ {totalCost.toLocaleString("en-IN")}</Text>
                  <Text style={styles.metricDetail}>
                    Expenses: ₹ {totalExpenses.toLocaleString("en-IN")}
                  </Text>
                  <Text style={styles.metricDetail}>
                    Labour: ₹ {totalLabourCost.toLocaleString("en-IN")}
                  </Text>
                </View>
              </View>

              {/* Profit */}
              <View style={styles.metricItem}>
                <View style={[styles.metricIcon, { backgroundColor: `${AdminTheme.colors.primary}15` }]}>
                  <MaterialIcons name="account-balance" size={20} color={AdminTheme.colors.primary} />
                </View>
                <View style={styles.metricContent}>
                  <Text style={styles.metricLabel}>Realized Profit</Text>
                  <Text style={[
                    styles.metricValue,
                    { color: profit >= 0 ? AdminTheme.colors.success : AdminTheme.colors.danger }
                  ]}>
                    ₹ {profit.toLocaleString("en-IN")}
                  </Text>
                  <Text style={styles.metricDetail}>
                    {profit >= 0 ? "Net profit earned" : "Net loss incurred"}
                  </Text>
                </View>
              </View>
            </View>

            {/* Summary Row */}
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Profit Margin</Text>
                <Text style={[
                  styles.summaryValue,
                  { color: profit >= 0 ? AdminTheme.colors.success : AdminTheme.colors.danger }
                ]}>
                  {profitMargin}%
                </Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Accrued Profit</Text>
                <Text style={[
                  styles.summaryValue,
                  { color: accruedProfit >= 0 ? AdminTheme.colors.success : AdminTheme.colors.danger }
                ]}>
                  ₹ {accruedProfit.toLocaleString("en-IN")}
                </Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Period</Text>
                <Text style={styles.summaryValue}>{dateRangeDays} days</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Date Pickers */}
      <DateTimePickerModal
        isVisible={showStartPicker}
        mode="date"
        onConfirm={handleStartDateConfirm}
        onCancel={() => setShowStartPicker(false)}
        maximumDate={endDate || new Date()}
        buttonTextColorIOS={AdminTheme.colors.primary}
      />

      <DateTimePickerModal
        isVisible={showEndPicker}
        mode="date"
        onConfirm={handleEndDateConfirm}
        onCancel={() => setShowEndPicker(false)}
        minimumDate={startDate || undefined}
        maximumDate={new Date()}
        buttonTextColorIOS={AdminTheme.colors.primary}
      />
    </SafeAreaView>
  );
}

const styles = {
  container: {
    flex: 1,
    backgroundColor: AdminTheme.colors.background,
  },
  scrollContent: {
    paddingHorizontal: AdminTheme.spacing.lg,
    paddingTop: AdminTheme.spacing.lg,
    paddingBottom: BOTTOM_NAV_HEIGHT + AdminTheme.spacing.lg,
    gap: AdminTheme.spacing.md,
  },

  // Section
  section: {
    backgroundColor: AdminTheme.colors.surface,
    borderRadius: 20,
    padding: AdminTheme.spacing.lg,
    borderWidth: 1,
    borderColor: AdminTheme.colors.borderSoft,
    ...AdminTheme.shadow,
  },
  sectionHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: AdminTheme.spacing.sm,
    marginBottom: AdminTheme.spacing.lg,
    paddingBottom: AdminTheme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: AdminTheme.colors.borderSoft,
  },
  sectionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: `${AdminTheme.colors.primary}10`,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600" as const,
    color: AdminTheme.colors.text,
  },
  subsectionTitle: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: AdminTheme.colors.textMuted,
    marginBottom: AdminTheme.spacing.sm,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
  },
  divider: {
    height: 1,
    backgroundColor: AdminTheme.colors.borderSoft,
    marginVertical: AdminTheme.spacing.lg,
  },

  // Quick Range
  quickRangeContainer: {
    marginBottom: AdminTheme.spacing.md,
  },
  quickRangeGrid: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: AdminTheme.spacing.sm,
  },
  quickChip: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: AdminTheme.spacing.xs,
    paddingHorizontal: AdminTheme.spacing.md,
    paddingVertical: AdminTheme.spacing.sm,
    backgroundColor: AdminTheme.colors.surface,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: AdminTheme.colors.borderSoft,
  },
  quickChipPressed: {
    backgroundColor: AdminTheme.colors.surfaceMuted,
    transform: [{ scale: 0.98 }],
  },
  quickChipText: {
    fontSize: 13,
    fontWeight: "500" as const,
    color: AdminTheme.colors.text,
  },

  // Custom Range
  customRangeContainer: {
    marginBottom: AdminTheme.spacing.md,
  },
  dateRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: AdminTheme.spacing.sm,
    marginBottom: AdminTheme.spacing.md,
  },
  dateCard: {
    flex: 1,
    backgroundColor: AdminTheme.colors.surface,
    borderRadius: 12,
    padding: AdminTheme.spacing.md,
    borderWidth: 1,
    borderColor: AdminTheme.colors.borderSoft,
  },
  dateCardPressed: {
    backgroundColor: AdminTheme.colors.surfaceMuted,
  },
  dateCardHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: AdminTheme.spacing.xs,
    marginBottom: AdminTheme.spacing.xs,
  },
  dateCardLabel: {
    fontSize: 11,
    color: AdminTheme.colors.textMuted,
    fontWeight: "500" as const,
  },
  dateCardValue: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: AdminTheme.colors.textMuted,
  },
  dateCardValueActive: {
    color: AdminTheme.colors.text,
  },
  clearButton: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    alignSelf: "flex-start" as const,
    gap: AdminTheme.spacing.xs,
    paddingHorizontal: AdminTheme.spacing.md,
    paddingVertical: AdminTheme.spacing.sm,
    borderRadius: 20,
    backgroundColor: AdminTheme.colors.surface,
    borderWidth: 1,
    borderColor: AdminTheme.colors.borderSoft,
  },
  clearButtonPressed: {
    backgroundColor: AdminTheme.colors.surfaceMuted,
  },
  clearButtonText: {
    fontSize: 13,
    color: AdminTheme.colors.textMuted,
    fontWeight: "500" as const,
  },
  rangeInfo: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: AdminTheme.spacing.sm,
    marginTop: AdminTheme.spacing.md,
    padding: AdminTheme.spacing.sm,
    backgroundColor: `${AdminTheme.colors.info}10`,
    borderRadius: 10,
  },
  rangeInfoText: {
    fontSize: 12,
    color: AdminTheme.colors.info,
    fontWeight: "500" as const,
  },

  // Generate Button
  generateButton: {
    backgroundColor: AdminTheme.colors.success,
    borderRadius: 12,
    paddingVertical: AdminTheme.spacing.md,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: AdminTheme.spacing.sm,
    marginTop: AdminTheme.spacing.md,
    ...AdminTheme.shadow,
  },
  generateButtonDisabled: {
    backgroundColor: AdminTheme.colors.border,
    opacity: 0.6,
  },
  generateButtonPressed: {
    transform: [{ scale: 0.98 }],
  },
  generateButtonText: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: AdminTheme.colors.surface,
  },

  // Loading State
  loadingCard: {
    backgroundColor: AdminTheme.colors.surface,
    borderRadius: 16,
    padding: AdminTheme.spacing.xl,
    alignItems: "center" as const,
    borderWidth: 1,
    borderColor: AdminTheme.colors.borderSoft,
    ...AdminTheme.shadow,
  },
  loadingText: {
    marginTop: AdminTheme.spacing.md,
    fontSize: 14,
    color: AdminTheme.colors.textMuted,
  },

  // Error State
  errorCard: {
    backgroundColor: AdminTheme.colors.surface,
    borderRadius: 16,
    padding: AdminTheme.spacing.xl,
    alignItems: "center" as const,
    borderWidth: 1,
    borderColor: AdminTheme.colors.borderSoft,
    ...AdminTheme.shadow,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: AdminTheme.colors.danger,
    marginTop: AdminTheme.spacing.md,
    marginBottom: AdminTheme.spacing.xs,
  },
  errorMessage: {
    fontSize: 13,
    color: AdminTheme.colors.textMuted,
    textAlign: "center" as const,
  },

  // Results Card
  resultsCard: {
    backgroundColor: AdminTheme.colors.surface,
    borderRadius: 20,
    padding: AdminTheme.spacing.lg,
    borderWidth: 1,
    borderColor: AdminTheme.colors.borderSoft,
    ...AdminTheme.shadow,
  },
  resultsHeader: {
    flexDirection: "column" as const,
    gap:8,
    justifyContent: "center" as const,
    marginBottom: AdminTheme.spacing.lg,
    paddingBottom: AdminTheme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: AdminTheme.colors.borderSoft,
  },
  resultsTitleContainer: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: AdminTheme.spacing.sm,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: "600" as const,
    color: AdminTheme.colors.text,
  },
  periodChip: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent:"center",
    gap: 4,
    backgroundColor: AdminTheme.colors.primary,
    paddingHorizontal: AdminTheme.spacing.sm,
    paddingVertical: 5,
    borderRadius: 20,
  },
  periodChipText: {
    fontSize: 10,
    fontWeight: "600" as const,
    color: AdminTheme.colors.surface,
  },

  // Metrics Grid
  metricsGrid: {
    gap: AdminTheme.spacing.md,
    marginBottom: AdminTheme.spacing.lg,
  },
  metricItem: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: AdminTheme.spacing.md,
    padding: AdminTheme.spacing.md,
    backgroundColor: AdminTheme.colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: AdminTheme.colors.borderSoft,
  },
  metricIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  metricContent: {
    flex: 1,
  },
  metricLabel: {
    fontSize: 12,
    color: AdminTheme.colors.textMuted,
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: AdminTheme.colors.text,
    marginBottom: 4,
  },
  metricDetail: {
    fontSize: 11,
    color: AdminTheme.colors.textSoft,
  },

  // Summary Row
  summaryRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: AdminTheme.colors.surfaceMuted,
    borderRadius: 12,
    padding: AdminTheme.spacing.md,
  },
  summaryItem: {
    flex: 1,
    alignItems: "center" as const,
    gap: 4,
  },
  summaryLabel: {
    fontSize: 11,
    color: AdminTheme.colors.textSoft,
    fontWeight: "500" as const,
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: AdminTheme.colors.text,
  },
  summaryDivider: {
    width: 1,
    height: 30,
    backgroundColor: AdminTheme.colors.border,
  },
} as const;