import { MaterialIcons } from "@expo/vector-icons";
import { useMutation } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
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

import { ProfitService } from "../../../services/profit.service";
import { Colors, Spacing } from "../../../theme";
import { formatErrorMessage } from "../../../utils/error";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const BOTTOM_NAV_HEIGHT = 80;

export default function AdminProfit() {
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
        "Please select both start and end dates to generate profit report.",
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
        "Date range cannot exceed 366 days. Please select a shorter period.",
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
    totalSales: 0,
    totalExpenses: 0,
    profit: 0,
  };

  const totalSales = Number(result.totalSales) || 0;
  const totalExpenses = Number(result.totalExpenses) || 0;
  const profit = Number(result.profit) || 0;

  const profitMargin =
    totalSales > 0 ? ((profit / totalSales) * 100).toFixed(2) : "0";

  const dateRangeDays =
    startDate && endDate
      ? getInclusiveDays(startDate, endDate)
      : 0;

  const isDateRangeInvalid =
    Boolean(startDate && endDate) &&
    (startDate > endDate || getInclusiveDays(startDate, endDate) > 366);

  /* -------------------- UI -------------------- */

  return (
    <SafeAreaView style={styles.container} edges={["left", "right"]}>
      {/* Fixed Header */}
      <LinearGradient
        colors={[Colors.primary, Colors.primaryLight]}
        style={styles.headerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.title}>Profit Report</Text>
            <Text style={styles.subtitle}>Analyze financial performance</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Scrollable Content */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Quick Date Ranges */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="bolt" size={22} color={Colors.text} />
            <Text style={styles.sectionTitle}>Quick Date Ranges</Text>
          </View>
          <Text style={styles.sectionDescription}>
            Select a predefined time period
          </Text>

          <View style={styles.quickRangeGrid}>
            {[
              { label: "Today", days: 1 },
              { label: "Last 7 Days", days: 6 },
              { label: "Last 30 Days", days: 29 },
              { label: "Last 90 Days", days: 89 },
            ].map((range) => (
              <Pressable
                key={range.label}
                onPress={() => handleQuickRange(range.days)}
                style={({ pressed }) => [
                  styles.rangeCard,
                  pressed && styles.rangeCardPressed,
                ]}
              >
                <View style={styles.rangeCardContent}>
                  <MaterialIcons
                    name="calendar-today"
                    size={18}
                    color={Colors.primary}
                  />
                  <Text style={styles.rangeLabel}>{range.label}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Custom Date Selection */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="edit-calendar" size={22} color={Colors.text} />
            <Text style={styles.sectionTitle}>Custom Date Range</Text>
          </View>
          <Text style={styles.sectionDescription}>
            Select specific start and end dates
          </Text>

          {/* Start Date */}
          <View style={styles.datePickerContainer}>
            <View style={styles.datePickerLabel}>
              <MaterialIcons name="date-range" size={18} color={Colors.text} />
              <Text style={styles.datePickerLabelText}>Start Date</Text>
            </View>
            <Pressable
              onPress={() => setShowStartPicker(true)}
              style={({ pressed }) => [
                styles.datePickerButton,
                pressed && styles.datePickerButtonPressed,
              ]}
            >
              <MaterialIcons
                name="calendar-month"
                size={20}
                color={startDate ? Colors.success : Colors.textSecondary}
              />
              <Text
                style={[
                  styles.datePickerText,
                  startDate && styles.datePickerTextSelected,
                ]}
              >
                {formatDisplayDate(startDate)}
              </Text>
              <MaterialIcons
                name="chevron-right"
                size={20}
                color={Colors.textTertiary}
              />
            </Pressable>
          </View>

          {/* End Date */}
          <View style={styles.datePickerContainer}>
            <View style={styles.datePickerLabel}>
              <MaterialIcons name="date-range" size={18} color={Colors.text} />
              <Text style={styles.datePickerLabelText}>End Date</Text>
            </View>
            <Pressable
              onPress={() => setShowEndPicker(true)}
              style={({ pressed }) => [
                styles.datePickerButton,
                pressed && styles.datePickerButtonPressed,
              ]}
            >
              <MaterialIcons
                name="calendar-month"
                size={20}
                color={endDate ? Colors.success : Colors.textSecondary}
              />
              <Text
                style={[
                  styles.datePickerText,
                  endDate && styles.datePickerTextSelected,
                ]}
              >
                {formatDisplayDate(endDate)}
              </Text>
              <MaterialIcons
                name="chevron-right"
                size={20}
                color={Colors.textTertiary}
              />
            </Pressable>
          </View>

          {/* Date Range Summary */}
          {(startDate || endDate) && (
            <View style={styles.dateRangeSummary}>
              <LinearGradient
                colors={[Colors.info + "20", Colors.info + "10"]}
                style={styles.dateRangeGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <MaterialIcons name="info" size={18} color={Colors.info} />
                <View style={styles.dateRangeTextContainer}>
                  <Text style={styles.dateRangeTitle}>Selected Date Range</Text>
                  <Text style={styles.dateRangeDates}>
                    {formatDisplayDate(startDate)} →{" "}
                    {formatDisplayDate(endDate)}
                  </Text>
                  {dateRangeDays > 0 && (
                    <Text style={styles.dateRangeDays}>
                      {dateRangeDays} day{dateRangeDays !== 1 ? "s" : ""}
                    </Text>
                  )}
                </View>
              </LinearGradient>
            </View>
          )}

          {/* Clear Dates Button */}
          {(startDate || endDate) && (
            <Pressable
              onPress={handleClearDates}
              style={({ pressed }) => [
                styles.clearButton,
                pressed && styles.clearButtonPressed,
              ]}
            >
              <MaterialIcons
                name="clear"
                size={18}
                color={Colors.textSecondary}
              />
              <Text style={styles.clearButtonText}>Clear Dates</Text>
            </Pressable>
          )}
        </View>

        {/* Generate Report Button */}
        <View style={styles.section}>
          <Pressable
            onPress={handleFetch}
            disabled={!startDate || !endDate || mutation.isPending || isDateRangeInvalid}
            style={({ pressed }) => [
              styles.generateButton,
              (!startDate || !endDate || isDateRangeInvalid) && styles.generateButtonDisabled,
              pressed && styles.generateButtonPressed,
              mutation.isPending && styles.generateButtonLoading,
            ]}
          >
            <LinearGradient
              colors={
                !startDate || !endDate || isDateRangeInvalid
                  ? [Colors.border, Colors.borderLight]
                  : [Colors.success, "#34D399"]
              }
              style={styles.generateGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {mutation.isPending ? (
                <ActivityIndicator color={Colors.white} size="small" />
              ) : (
                <>
                  <MaterialIcons
                    name="analytics"
                    size={22}
                    color={Colors.white}
                  />
                  <Text style={styles.generateButtonText}>
                    Generate Profit Report
                  </Text>
                </>
              )}
            </LinearGradient>
          </Pressable>

          {/* Validation Hint */}
          {(!startDate || !endDate) && (
            <Text style={styles.hintText}>
              ⓘ Please select both start and end dates
            </Text>
          )}
          {isDateRangeInvalid && (
            <Text style={styles.hintText}>
              ⓘ Invalid range. Keep start before end and within 366 days.
            </Text>
          )}
        </View>

        {/* Loading State */}
        {mutation.isPending && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Generating report...</Text>
          </View>
        )}

        {/* Error State */}
        {mutation.isError && (
          <View style={styles.errorContainer}>
            <MaterialIcons
              name="error-outline"
              size={48}
              color={Colors.error}
            />
            <Text style={styles.errorTitle}>Unable to Generate Report</Text>
            <Text style={styles.errorMessage}>
              Please check your connection and try again
            </Text>
          </View>
        )}

        {/* Results Section */}
        {mutation.data && (
          <View style={styles.resultsCard}>
            <View style={styles.resultsHeader}>
              <MaterialIcons
                name="assessment"
                size={24}
                color={Colors.primary}
              />
              <Text style={styles.resultsTitle}>Profit Report</Text>
              <View style={styles.dateRangeBadge}>
                <MaterialIcons
                  name="calendar-today"
                  size={12}
                  color={Colors.white}
                />
                <Text style={styles.dateRangeBadgeText}>
                  {formatDisplayDate(startDate)} - {formatDisplayDate(endDate)}
                </Text>
              </View>
            </View>

            <View style={styles.resultsContent}>
              {/* Total Sales */}
              <View style={styles.metricCard}>
                <LinearGradient
                  colors={[Colors.success + "20", Colors.success + "10"]}
                  style={styles.metricGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <View style={styles.metricHeader}>
                    <View style={styles.metricIcon}>
                      <MaterialIcons
                        name="trending-up"
                        size={20}
                        color={Colors.success}
                      />
                    </View>
                    <Text style={styles.metricLabel}>Total Sales</Text>
                  </View>
                  <Text style={styles.metricValue}>
                    ₹ {totalSales.toLocaleString("en-IN")}
                  </Text>
                  <Text style={styles.metricSubtext}>
                    Revenue generated from sales
                  </Text>
                </LinearGradient>
              </View>

              {/* Total Expenses */}
              <View style={styles.metricCard}>
                <LinearGradient
                  colors={[Colors.warning + "20", Colors.warning + "10"]}
                  style={styles.metricGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <View style={styles.metricHeader}>
                    <View style={styles.metricIcon}>
                      <MaterialIcons
                        name="trending-down"
                        size={20}
                        color={Colors.warning}
                      />
                    </View>
                    <Text style={styles.metricLabel}>Total Expenses</Text>
                  </View>
                  <Text style={styles.metricValue}>
                    ₹ {totalExpenses.toLocaleString("en-IN")}
                  </Text>
                  <Text style={styles.metricSubtext}>
                    Costs and operational expenses
                  </Text>
                </LinearGradient>
              </View>

              {/* Profit */}
              <View style={styles.metricCard}>
                <LinearGradient
                  colors={[Colors.primary + "20", Colors.primary + "10"]}
                  style={styles.metricGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <View style={styles.metricHeader}>
                    <View style={styles.metricIcon}>
                      <MaterialIcons
                        name="account-balance"
                        size={20}
                        color={Colors.primary}
                      />
                    </View>
                    <Text style={styles.metricLabel}>Net Profit</Text>
                  </View>
                  <Text
                    style={[
                      styles.metricValue,
                      styles.profitValue,
                      { color: profit >= 0 ? Colors.success : Colors.error },
                    ]}
                  >
                    ₹ {profit.toLocaleString("en-IN")}
                  </Text>
                  <Text style={styles.metricSubtext}>
                    {profit >= 0 ? "Profit earned" : "Loss incurred"}
                  </Text>
                </LinearGradient>
              </View>
            </View>

            {/* Summary */}
            <View style={styles.summaryContainer}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Profit Margin</Text>
                <Text
                  style={[
                    styles.summaryValue,
                    { color: profit >= 0 ? Colors.success : Colors.error },
                  ]}
                >
                  {profitMargin}%
                </Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Period</Text>
                <Text style={styles.summaryValue}>
                  {dateRangeDays} day{dateRangeDays !== 1 ? "s" : ""}
                </Text>
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
        buttonTextColorIOS={Colors.primary}
      />

      <DateTimePickerModal
        isVisible={showEndPicker}
        mode="date"
        onConfirm={handleEndDateConfirm}
        onCancel={() => setShowEndPicker(false)}
        minimumDate={startDate || undefined}
        maximumDate={new Date()}
        buttonTextColorIOS={Colors.primary}
      />
    </SafeAreaView>
  );
}

const styles = {
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerGradient: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.lg,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
  },
  title: {
    fontSize: 24,
    fontWeight: "700" as const,
    color: Colors.white,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.9)",
    fontWeight: "500" as const,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: BOTTOM_NAV_HEIGHT + Spacing.lg,
  },
  section: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
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
    marginBottom: Spacing.md,
    lineHeight: 20,
  },
  quickRangeGrid: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: Spacing.sm,
  },
  rangeCard: {
    flex: 1,
    minWidth: (SCREEN_WIDTH - Spacing.lg * 2 - Spacing.lg - Spacing.sm) / 2,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    padding: Spacing.md,
  },
  rangeCardPressed: {
    backgroundColor: Colors.surfaceDark,
    transform: [{ scale: 0.98 }],
  },
  rangeCardContent: {
    alignItems: "center" as const,
    gap: Spacing.sm,
  },
  rangeLabel: {
    fontSize: 13,
    color: Colors.text,
    fontWeight: "600" as const,
    textAlign: "center" as const,
  },
  datePickerContainer: {
    marginBottom: Spacing.md,
  },
  datePickerLabel: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  datePickerLabelText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.text,
  },
  datePickerButton: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  datePickerButtonPressed: {
    backgroundColor: Colors.surfaceDark,
  },
  datePickerText: {
    flex: 1,
    fontSize: 15,
    color: Colors.textSecondary,
    fontWeight: "500" as const,
  },
  datePickerTextSelected: {
    color: Colors.text,
    fontWeight: "600" as const,
  },
  dateRangeSummary: {
    marginTop: Spacing.lg,
  },
  dateRangeGradient: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    padding: Spacing.md,
    borderRadius: 12,
    gap: Spacing.sm,
  },
  dateRangeTextContainer: {
    flex: 1,
  },
  dateRangeTitle: {
    fontSize: 12,
    color: Colors.textTertiary,
    fontWeight: "600" as const,
    marginBottom: 2,
  },
  dateRangeDates: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: "600" as const,
    marginBottom: 2,
  },
  dateRangeDays: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: "500" as const,
  },
  clearButton: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    gap: Spacing.sm,
    alignSelf: "flex-start" as const,
  },
  clearButtonPressed: {
    backgroundColor: Colors.surfaceDark,
  },
  clearButtonText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: "600" as const,
  },
  generateButton: {
    borderRadius: 16,
    overflow: "hidden" as const,
    shadowColor: Colors.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  generateButtonDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  generateButtonPressed: {
    transform: [{ scale: 0.98 }],
  },
  generateButtonLoading: {
    opacity: 0.9,
  },
  generateGradient: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  generateButtonText: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: Colors.white,
  },
  hintText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center" as const,
    marginTop: Spacing.md,
    fontStyle: "italic" as const,
  },
  loadingContainer: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: Spacing.xl,
    alignItems: "center" as const,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: 16,
    color: Colors.textSecondary,
    fontWeight: "500" as const,
  },
  errorContainer: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: Spacing.xl,
    alignItems: "center" as const,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "600" as const,
    color: Colors.error,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  errorMessage: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center" as const,
  },
  resultsCard: {
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
  resultsHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  resultsTitle: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: Colors.text,
    flex: 1,
  },
  dateRangeBadge: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  dateRangeBadgeText: {
    fontSize: 11,
    color: Colors.white,
    fontWeight: "600" as const,
  },
  resultsContent: {
    gap: Spacing.md,
  },
  metricCard: {
    borderRadius: 16,
    overflow: "hidden" as const,
  },
  metricGradient: {
    padding: Spacing.lg,
  },
  metricHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  metricIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.white + "80",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  metricLabel: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: "600" as const,
  },
  metricValue: {
    fontSize: 32,
    fontWeight: "700" as const,
    color: Colors.text,
    marginBottom: 2,
  },
  profitValue: {
    fontSize: 36,
  },
  metricSubtext: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: "500" as const,
  },
  summaryContainer: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: Spacing.md,
    marginTop: Spacing.lg,
  },
  summaryItem: {
    flex: 1,
    alignItems: "center" as const,
    gap: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: Colors.textTertiary,
    fontWeight: "500" as const,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: Colors.text,
  },
  summaryDivider: {
    width: 1,
    height: 30,
    backgroundColor: Colors.border,
  },
};
