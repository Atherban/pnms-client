import { MaterialIcons } from "@expo/vector-icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { GerminationService } from "../../../services/germination.service";
import { Sowing, SowingService } from "../../../services/sowing.service";
import { Colors, Spacing } from "../../../theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const BOTTOM_NAV_HEIGHT = 80;
const SOWING_CARD_WIDTH = (SCREEN_WIDTH - Spacing.lg * 2 - Spacing.sm * 2) / 2;

export default function StaffGerminationCreate() {
  const router = useRouter();

  const [sowingId, setSowingId] = useState<string | null>(null);
  const [germinated, setGerminated] = useState("");

  /* Fetch sowing records */
  const { data, isLoading } = useQuery({
    queryKey: ["staff-sowings"],
    queryFn: SowingService.getAll,
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  });

  const sowings: Sowing[] = Array.isArray(data) ? data : [];

  const selectedSowing = useMemo(
    () => sowings.find((s) => s._id === sowingId),
    [sowings, sowingId],
  );

  /* Reset input when sowing changes */
  useEffect(() => {
    setGerminated("");
  }, [sowingId]);

  const maxAllowed = selectedSowing?.quantity ?? 0;
  const numericValue = Number(germinated);

  const isNumericValid =
    Number.isFinite(numericValue) &&
    numericValue > 0 &&
    numericValue <= maxAllowed;

  const progressPercentage =
    maxAllowed > 0 ? (numericValue / maxAllowed) * 100 : 0;

  const getSeedName = (s: Sowing) =>
    typeof s.seedId === "object" ? s.seedId.name : "Seed";

  const getPlantName = (s: Sowing) =>
    typeof s.plantId === "object" ? s.plantId.name : "Plant";

  const handleSowingSelect = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSowingId(id);
  };

  const handleSubmit = () => {
    if (!sowingId || !isNumericValid || mutation.isLoading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    mutation.mutate();
  };

  const mutation = useMutation({
    mutationFn: async () => {
      if (!sowingId || !isNumericValid) {
        throw new Error("Invalid germination data");
      }
      return GerminationService.create({
        sowingId,
        germinatedSeeds: numericValue,
      });
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Success", "Germination recorded successfully!");
      router.back();
    },
    onError: (err: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        "Error",
        err?.message ||
          "Failed to record germination. Please check the values and try again.",
      );
    },
  });

  // Calculate stats
  const stats = useMemo(() => {
    const totalSowings = sowings.length;
    const totalSeeds = sowings.reduce((sum, s) => sum + s.quantity, 0);
    const completedSowings = sowings.filter(
      (s) => s.germinationRate > 0,
    ).length;

    return { totalSowings, totalSeeds, completedSowings };
  }, [sowings]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={[Colors.primary, Colors.primaryLight]}
          style={styles.headerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.backButtonPressed,
            ]}
          >
            <MaterialIcons name="arrow-back" size={20} color={Colors.white} />
          </Pressable>
          <View style={styles.headerTextContainer}>
            <Text style={styles.title}>Record Germination</Text>
            <Text style={styles.subtitle}>Loading sowing records...</Text>
          </View>
          <View style={styles.headerSpacer} />
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.info} />
          <Text style={styles.loadingText}>Loading sowing data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Fixed Header */}
      <LinearGradient
        colors={[Colors.primary, Colors.primaryLight]}
        style={styles.headerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.backButton,
            pressed && styles.backButtonPressed,
          ]}
        >
          <MaterialIcons name="arrow-back" size={20} color={Colors.white} />
        </Pressable>
        <View style={styles.headerTextContainer}>
          <Text style={styles.title}>Record Germination</Text>
          <Text style={styles.subtitle}>Track seed germination progress</Text>
        </View>
        <View style={styles.headerSpacer} />
      </LinearGradient>

      {/* Stats Overview */}
      <View style={styles.statsGrid}>
        <View
          style={[styles.statCard, { backgroundColor: Colors.primary + "10" }]}
        >
          <MaterialIcons name="list-alt" size={18} color={Colors.primary} />
          <Text style={styles.statValue}>{stats.totalSowings}</Text>
          <Text style={styles.statLabel}>Sowings</Text>
        </View>

        <View
          style={[styles.statCard, { backgroundColor: Colors.success + "10" }]}
        >
          <MaterialIcons name="check-circle" size={18} color={Colors.success} />
          <Text style={styles.statValue}>{stats.completedSowings}</Text>
          <Text style={styles.statLabel}>Tracked</Text>
        </View>

        <View
          style={[styles.statCard, { backgroundColor: Colors.info + "10" }]}
        >
          <MaterialIcons name="grass" size={18} color={Colors.info} />
          <Text style={styles.statValue}>{stats.totalSeeds}</Text>
          <Text style={styles.statLabel}>Seeds</Text>
        </View>
      </View>

      {/* Scrollable Content */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.heroIcon}>
            <MaterialIcons name="grass" size={32} color={Colors.success} />
          </View>
          <Text style={styles.heroTitle}>Track Seed Germination</Text>
          <Text style={styles.heroSubtitle}>
            Record successful germination from your sowing activities
          </Text>
        </View>

        {/* Sowing Selection */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="list-alt" size={22} color={Colors.text} />
            <Text style={styles.sectionTitle}>Select Sowing Record</Text>
          </View>
          <Text style={styles.sectionDescription}>
            Choose a sowing to record germination for
          </Text>

          {sowings.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialIcons
                name="inbox"
                size={48}
                color={Colors.textSecondary}
              />
              <Text style={styles.emptyStateTitle}>
                No Sowing Records Available
              </Text>
              <Text style={styles.emptyStateSubtext}>
                Create sowing activities first to track germination
              </Text>
            </View>
          ) : (
            <View style={styles.selectionGrid}>
              {sowings.map((s) => {
                const isSelected = sowingId === s._id;
                const hasGermination = s.germinationRate > 0;

                return (
                  <Pressable
                    key={s._id}
                    onPress={() => handleSowingSelect(s._id)}
                    style={({ pressed }) => [
                      styles.sowingCard,
                      isSelected && styles.sowingCardActive,
                      pressed && styles.sowingCardPressed,
                    ]}
                  >
                    <View style={styles.sowingCardContent}>
                      <View style={styles.sowingHeader}>
                        <View
                          style={[
                            styles.sowingIcon,
                            {
                              backgroundColor: isSelected
                                ? Colors.success + "20"
                                : Colors.surfaceDark,
                            },
                          ]}
                        >
                          <MaterialIcons
                            name="grass"
                            size={18}
                            color={
                              isSelected ? Colors.success : Colors.textSecondary
                            }
                          />
                        </View>
                        {isSelected && (
                          <View style={styles.selectedBadge}>
                            <MaterialIcons
                              name="check-circle"
                              size={12}
                              color={Colors.white}
                            />
                          </View>
                        )}
                      </View>

                      <Text
                        style={[
                          styles.sowingName,
                          isSelected && styles.sowingNameActive,
                        ]}
                        numberOfLines={1}
                      >
                        {getSeedName(s)}
                      </Text>
                      <Text style={styles.sowingDetails}>
                        → {getPlantName(s)}
                      </Text>

                      <View style={styles.sowingMeta}>
                        <View style={styles.metaItem}>
                          <MaterialIcons
                            name="numbers"
                            size={12}
                            color={Colors.textTertiary}
                          />
                          <Text style={styles.metaText}>
                            {s.quantity} seeds
                          </Text>
                        </View>
                        {hasGermination && (
                          <View style={styles.germinationBadge}>
                            <MaterialIcons
                              name="check"
                              size={10}
                              color={Colors.white}
                            />
                            <Text style={styles.germinationBadgeText}>
                              {s.germinationRate}%
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>

        {/* Germination Input */}
        {selectedSowing && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="edit" size={22} color={Colors.info} />
              <Text style={styles.sectionTitle}>Germination Details</Text>
            </View>

            <View style={styles.selectedItem}>
              <LinearGradient
                colors={[Colors.success + "20", Colors.success + "10"]}
                style={styles.selectedItemGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <MaterialIcons name="info" size={16} color={Colors.success} />
                <Text style={styles.selectedItemText}>
                  Selected: {getSeedName(selectedSowing)} →{" "}
                  {getPlantName(selectedSowing)}
                </Text>
              </LinearGradient>
            </View>

            <Text style={styles.label}>Number of Germinated Seeds</Text>
            <View style={styles.inputContainer}>
              <MaterialIcons
                name="tag"
                size={20}
                color={Colors.textSecondary}
                style={styles.inputIcon}
              />
              <TextInput
                keyboardType="numeric"
                value={germinated}
                onChangeText={setGerminated}
                placeholder="Enter count"
                placeholderTextColor={Colors.textTertiary}
                style={styles.input}
              />
              <View style={styles.inputSuffix}>
                <Text style={styles.inputSuffixText}>seeds</Text>
              </View>
            </View>

            {/* Progress Indicator */}
            {germinated && !isNaN(numericValue) && (
              <View style={styles.progressContainer}>
                <View style={styles.progressHeader}>
                  <Text style={styles.progressLabel}>Germination Progress</Text>
                  <Text style={styles.progressValue}>
                    {numericValue}/{maxAllowed} (
                    {Math.min(progressPercentage, 100).toFixed(0)}%)
                  </Text>
                </View>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${Math.min(progressPercentage, 100)}%`,
                        backgroundColor: isNumericValid
                          ? Colors.success
                          : Colors.error,
                      },
                    ]}
                  />
                </View>
                {!isNumericValid && numericValue > 0 && (
                  <Text style={styles.errorText}>
                    Cannot exceed sown quantity ({maxAllowed})
                  </Text>
                )}
                {isNumericValid && (
                  <Text style={styles.successText}>
                    ✓ Valid entry ({maxAllowed - numericValue} seeds remaining)
                  </Text>
                )}
              </View>
            )}

            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <MaterialIcons
                  name="check-circle"
                  size={16}
                  color={Colors.success}
                />
                <Text style={styles.statLabel}>Available</Text>
                <Text style={styles.statValue}>{maxAllowed}</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <MaterialIcons
                  name="warning"
                  size={16}
                  color={Colors.warning}
                />
                <Text style={styles.statLabel}>Minimum</Text>
                <Text style={styles.statValue}>1</Text>
              </View>
            </View>
          </View>
        )}

        {/* Submit Button */}
        <View style={styles.submitSection}>
          <Pressable
            onPress={handleSubmit}
            disabled={!sowingId || !isNumericValid || mutation.isLoading}
            style={({ pressed }) => [
              styles.submitButton,
              (!sowingId || !isNumericValid) && styles.submitButtonDisabled,
              pressed && styles.submitButtonPressed,
              mutation.isLoading && styles.submitButtonLoading,
            ]}
          >
            <LinearGradient
              colors={
                !sowingId || !isNumericValid
                  ? [Colors.border, Colors.borderLight]
                  : [Colors.success, "#34D399"]
              }
              style={styles.submitGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {mutation.isLoading ? (
                <ActivityIndicator color={Colors.white} size="small" />
              ) : (
                <>
                  <MaterialIcons
                    name="check-circle"
                    size={20}
                    color={Colors.white}
                  />
                  <Text style={styles.submitText}>Record Germination</Text>
                </>
              )}
            </LinearGradient>
          </Pressable>

          {/* Validation Status */}
          {!sowingId && (
            <Text style={styles.hintText}>
              ⓘ Please select a sowing record first
            </Text>
          )}
          {sowingId && germinated && !isNumericValid && (
            <Text style={styles.errorHint}>
              ✗ Please enter a valid number between 1 and {maxAllowed}
            </Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* -------------------- Enhanced Styles Following Pattern -------------------- */

const styles = {
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerGradient: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.lg,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  backButtonPressed: {
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    transform: [{ scale: 0.95 }],
  },
  headerTextContainer: {
    flex: 1,
    marginLeft: Spacing.md,
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
  headerSpacer: {
    width: 44,
  },
  statsGrid: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  statCard: {
    flex: 1,
    padding: Spacing.sm,
    borderRadius: 12,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginHorizontal: 2,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: Colors.text,
    marginTop: Spacing.xs,
  },
  statLabel: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontWeight: "500" as const,
    marginTop: 2,
    textAlign: "center" as const,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    padding: Spacing.xl,
    paddingBottom: BOTTOM_NAV_HEIGHT,
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: 16,
    color: Colors.textSecondary,
    fontWeight: "500" as const,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: BOTTOM_NAV_HEIGHT + Spacing.lg,
  },
  heroSection: {
    alignItems: "center" as const,
    marginBottom: Spacing.xl,
    padding: Spacing.lg,
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.success + "15",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginBottom: Spacing.md,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: Colors.text,
    marginBottom: Spacing.xs,
    textAlign: "center" as const,
  },
  heroSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center" as const,
    lineHeight: 20,
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
    marginBottom: Spacing.md,
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
  emptyState: {
    alignItems: "center" as const,
    padding: Spacing.xl,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderStyle: "dashed" as const,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: Colors.text,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center" as const,
  },
  selectionGrid: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    marginHorizontal: -Spacing.xs,
  },
  sowingCard: {
    width: SOWING_CARD_WIDTH,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: Spacing.md,
    margin: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  sowingCardActive: {
    borderColor: Colors.success,
    backgroundColor: Colors.success + "08",
    borderWidth: 2,
  },
  sowingCardPressed: {
    transform: [{ scale: 0.98 }],
  },
  sowingCardContent: {
    alignItems: "center" as const,
  },
  sowingHeader: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    width: "100%",
    marginBottom: Spacing.sm,
  },
  sowingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  selectedBadge: {
    backgroundColor: Colors.success,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  sowingName: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: Colors.text,
    textAlign: "center" as const,
    marginBottom: 2,
  },
  sowingNameActive: {
    color: Colors.success,
  },
  sowingDetails: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: "center" as const,
    marginBottom: Spacing.sm,
  },
  sowingMeta: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    width: "100%",
  },
  metaItem: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: Colors.textTertiary,
    fontWeight: "500" as const,
  },
  germinationBadge: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: Colors.success,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 3,
  },
  germinationBadgeText: {
    fontSize: 10,
    color: Colors.white,
    fontWeight: "600" as const,
  },
  selectedItem: {
    marginBottom: Spacing.lg,
  },
  selectedItemGradient: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    padding: Spacing.md,
    borderRadius: 12,
    gap: Spacing.sm,
  },
  selectedItemText: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: "500" as const,
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: "500" as const,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  inputContainer: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
    overflow: "hidden" as const,
  },
  inputIcon: {
    marginLeft: Spacing.md,
  },
  input: {
    flex: 1,
    padding: Spacing.md,
    fontSize: 16,
    color: Colors.text,
    fontWeight: "500" as const,
  },
  inputSuffix: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surfaceDark,
    borderLeftWidth: 1,
    borderLeftColor: Colors.border,
  },
  inputSuffixText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: "500" as const,
  },
  progressContainer: {
    marginBottom: Spacing.lg,
  },
  progressHeader: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    marginBottom: Spacing.xs,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: "500" as const,
    color: Colors.textSecondary,
  },
  progressValue: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.text,
  },
  progressBar: {
    height: 6,
    backgroundColor: Colors.border,
    borderRadius: 3,
    overflow: "hidden" as const,
    marginBottom: Spacing.sm,
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  errorText: {
    fontSize: 12,
    color: Colors.error,
    fontWeight: "500" as const,
    marginTop: 4,
  },
  successText: {
    fontSize: 12,
    color: Colors.success,
    fontWeight: "500" as const,
    marginTop: 4,
  },
  statsContainer: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: Spacing.md,
    marginTop: Spacing.lg,
  },
  statItem: {
    flex: 1,
    alignItems: "center" as const,
    gap: 4,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: "500" as const,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: Colors.text,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: Colors.border,
  },
  submitSection: {
    marginTop: Spacing.xs,
    marginBottom: 20,
  },
  submitButton: {
    borderRadius: 16,
    overflow: "hidden" as const,
    shadowColor: Colors.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonPressed: {
    transform: [{ scale: 0.98 }],
  },
  submitButtonLoading: {
    opacity: 0.9,
  },
  submitGradient: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  submitText: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: Colors.white,
  },
  hintText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center" as const,
    marginTop: Spacing.md,
    marginBottom: 4,
    fontStyle: "italic" as const,
  },
  errorHint: {
    fontSize: 14,
    color: Colors.error,
    textAlign: "center" as const,
    marginTop: Spacing.md,
    marginBottom: 4,
    fontWeight: "500" as const,
  },
};
