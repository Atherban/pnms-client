import { MaterialIcons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Seed, SeedService } from "../../../services/seed.service";
import { SowingService } from "../../../services/sowing.service";
import { Colors, Spacing } from "../../../theme";

export default function StaffSowingCreate() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [seedId, setSeedId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState("");

  /* Fetch seeds */
  const {
    data: seedsData,
    isLoading: loadingSeeds,
    error: seedsError,
    refetch: refetchSeeds,
  } = useQuery({
    queryKey: ["staff-seeds"],
    queryFn: SeedService.getAll,
  });

  const seeds = useMemo<Seed[]>(() => {
    if (!seedsData) return [];
    return Array.isArray(seedsData) ? seedsData : (seedsData.data ?? []);
  }, [seedsData]);

  const selectedSeed = useMemo(
    () => seeds?.find((s) => s._id === seedId),
    [seeds, seedId],
  );

  const getSeedStock = (seed?: Seed) =>
    Number(
      seed?.quantityInStock ??
        (seed as any)?.availableQuantity ??
        (seed as any)?.remainingQuantity ??
        seed?.totalPurchased ??
        0,
    );

  const rawStockValue =
    selectedSeed?.quantityInStock ??
    (selectedSeed as any)?.availableQuantity ??
    (selectedSeed as any)?.remainingQuantity ??
    selectedSeed?.totalPurchased;
  const stockKnown = typeof rawStockValue === "number";
  const maxQuantity = getSeedStock(selectedSeed);
  const numericQuantity = Number(quantity);

  const isQuantityValid =
    Number.isFinite(numericQuantity) &&
    numericQuantity > 0 &&
    (!stockKnown || numericQuantity <= maxQuantity);

  useEffect(() => {
    setQuantity("");
  }, [seedId]);

  /* Create sowing mutation */
  const mutation = useMutation({
    mutationFn: async () => {
      if (!seedId || !isQuantityValid) {
        throw new Error("Invalid sowing data");
      }
      return SowingService.create({
        seedId,
        quantity: numericQuantity,
      });
    },
    onSuccess: async () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["staff-seeds"] }),
        queryClient.invalidateQueries({ queryKey: ["staff-sowings"] }),
        queryClient.invalidateQueries({ queryKey: ["staff-dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["inventory"] }),
      ]);

      Alert.alert("Success", "Sowing recorded successfully", [
        { text: "OK", onPress: () => router.back() },
      ]);
    },
    onError: (err: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Error", err?.message || "Failed to create sowing");
    },
  });

  const handleSeedSelect = (seed: Seed) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSeedId(seed._id);
  };

  const handleSubmit = () => {
    if (!seedId || !isQuantityValid || mutation.isLoading) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    mutation.mutate();
  };

  if (loadingSeeds) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={[Colors.primary, Colors.primaryLight]}
          style={styles.fixedHeader}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <View style={styles.headerContent}>
            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => [
                styles.backButton,
                pressed && styles.backButtonPressed,
              ]}
            >
              <MaterialIcons name="arrow-back" size={20} color={Colors.white} />
            </Pressable>
            <View>
              <Text style={styles.title}>Record New Sowing</Text>
              <Text style={styles.subtitle}>Loading data...</Text>
            </View>
            <View style={styles.headerSpacer} />
          </View>
        </LinearGradient>
        <View style={styles.contentArea}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.info} />
            <Text style={styles.loadingText}>Loading seeds...</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (seedsError) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={[Colors.primary, Colors.primaryLight]}
          style={styles.fixedHeader}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <View style={styles.headerContent}>
            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => [
                styles.backButton,
                pressed && styles.backButtonPressed,
              ]}
            >
              <MaterialIcons name="arrow-back" size={20} color={Colors.white} />
            </Pressable>
            <View>
              <Text style={styles.title}>Record New Sowing</Text>
              <Text style={styles.subtitle}>Unable to load seeds</Text>
            </View>
            <View style={styles.headerSpacer} />
          </View>
        </LinearGradient>
        <View style={styles.contentArea}>
          <View style={styles.loadingContainer}>
            <MaterialIcons name="error-outline" size={48} color={Colors.error} />
            <Text style={styles.loadingText}>Failed to load seeds</Text>
            <Pressable
              onPress={() => refetchSeeds()}
              style={({ pressed }) => [
                styles.retryButton,
                pressed && styles.retryButtonPressed,
              ]}
            >
              <Text style={styles.retryButtonText}>Try Again</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Fixed Header */}
      <LinearGradient
        colors={[Colors.primary, Colors.primaryLight]}
        style={styles.fixedHeader}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <View style={styles.headerContent}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.backButtonPressed,
            ]}
          >
            <MaterialIcons name="arrow-back" size={20} color={Colors.white} />
          </Pressable>
          <View>
            <Text style={styles.title}>Record New Sowing</Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Form Card */}
        <View style={styles.formCard}>
          {/* Seed Selection */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="grass" size={24} color={Colors.success} />
              <Text style={styles.sectionTitle}>Select Seed</Text>
            </View>
            <Text style={styles.sectionDescription}>
              Choose the seed you want to sow
            </Text>

            <View style={styles.selectionContainer}>
              {seeds?.map((seed: Seed) => (
                <Pressable
                  key={seed._id}
                  onPress={() => handleSeedSelect(seed)}
                  style={({ pressed }) => [
                    styles.selectionCard,
                    seedId === seed._id && styles.selectionCardActive,
                    pressed && styles.selectionCardPressed,
                  ]}
                >
                  <View style={styles.selectionCardContent}>
                    <View style={styles.selectionCardHeader}>
                      <MaterialIcons
                        name="grass"
                        size={20}
                        color={
                          seedId === seed._id
                            ? Colors.success
                            : Colors.textSecondary
                        }
                      />
                      <Text
                        style={[
                          styles.selectionCardTitle,
                          seedId === seed._id &&
                            styles.selectionCardTitleActive,
                        ]}
                      >
                        {seed.name}
                      </Text>
                      {seedId === seed._id && (
                        <View style={styles.selectedIndicator}>
                          <MaterialIcons
                            name="check-circle"
                            size={16}
                            color={Colors.success}
                          />
                        </View>
                      )}
                    </View>

                    <View style={styles.selectionCardDetails}>
                      <View style={styles.selectionCardDetailItem}>
                        <MaterialIcons
                          name="inventory"
                          size={14}
                          color={Colors.textTertiary}
                        />
                        <Text style={styles.selectionCardDetailText}>
                          Stock: {getSeedStock(seed)}
                        </Text>
                      </View>

                      {(seed.category || seed.plantType?.name) && (
                        <View style={styles.selectionCardDetailItem}>
                          <MaterialIcons
                            name="spa"
                            size={14}
                            color={Colors.textTertiary}
                          />
                          <Text style={styles.selectionCardDetailText}>
                            {seed.category || seed.plantType?.name}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </Pressable>
              ))}
              {seeds.length === 0 && (
                <View style={styles.emptySelectionCard}>
                  <MaterialIcons
                    name="info"
                    size={18}
                    color={Colors.textSecondary}
                  />
                  <Text style={styles.emptySelectionText}>
                    No seeds available. Ask an admin to add seed stock.
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Quantity Input */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="numbers" size={24} color={Colors.info} />
              <Text style={styles.sectionTitle}>Quantity</Text>
            </View>

            <View style={styles.inputContainer}>
              <View style={styles.inputLabelContainer}>
                <MaterialIcons
                  name="format-list-numbered"
                  size={20}
                  color={Colors.textSecondary}
                />
                <Text style={styles.inputLabel}>Enter sowing quantity</Text>
              </View>

              <TextInput
                keyboardType="numeric"
                value={quantity}
                onChangeText={(text) =>
                  setQuantity(text.replace(/[^\d]/g, ""))
                }
                placeholder="e.g., 10, 25, 50"
                placeholderTextColor={Colors.textTertiary}
                style={styles.input}
              />

              {selectedSeed && (
                <View style={styles.inputHelper}>
                  <MaterialIcons
                    name="info"
                    size={16}
                    color={Colors.textTertiary}
                  />
                  <Text style={styles.inputHelperText}>
                    Available stock:{" "}
                    <Text style={styles.inputHelperHighlight}>
                      {stockKnown ? maxQuantity : "—"}
                    </Text>{" "}
                    units
                  </Text>
                </View>
              )}

              {quantity && !isQuantityValid && (
                <View style={styles.errorHelper}>
                  <MaterialIcons name="error" size={16} color={Colors.error} />
                  <Text style={styles.errorHelperText}>
                    {numericQuantity <= 0
                      ? "Quantity must be greater than 0"
                      : stockKnown
                        ? `Maximum allowed: ${maxQuantity}`
                        : "Check quantity"}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Summary Card */}
          {(selectedSeed || quantity) && (
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Sowing Summary</Text>

              <View style={styles.summaryContent}>
                {selectedSeed && (
                  <View style={styles.summaryItem}>
                    <MaterialIcons
                      name="grass"
                      size={18}
                      color={Colors.success}
                    />
                    <Text style={styles.summaryLabel}>Seed:</Text>
                    <Text style={styles.summaryValue}>{selectedSeed.name}</Text>
                  </View>
                )}

                {selectedSeed?.plantType?.name && (
                  <View style={styles.summaryItem}>
                    <MaterialIcons
                      name="spa"
                      size={18}
                      color={Colors.success}
                    />
                    <Text style={styles.summaryLabel}>Plant Type:</Text>
                    <Text style={styles.summaryValue}>
                      {selectedSeed.plantType.name}
                    </Text>
                  </View>
                )}

                {quantity && isQuantityValid && (
                  <View style={styles.summaryItem}>
                    <MaterialIcons
                      name="numbers"
                      size={18}
                      color={Colors.info}
                    />
                    <Text style={styles.summaryLabel}>Quantity:</Text>
                    <Text style={styles.summaryValue}>
                      {numericQuantity} units
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Submit Button */}
          <Pressable
            onPress={handleSubmit}
            disabled={
              !seedId || !isQuantityValid || mutation.isLoading
            }
            style={({ pressed }) => [
              styles.submitButton,
              (!seedId || !isQuantityValid || mutation.isLoading) &&
                styles.submitButtonDisabled,
              pressed && styles.submitButtonPressed,
            ]}
          >
            {mutation.isLoading ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <>
                <MaterialIcons
                  name="check-circle"
                  size={20}
                  color={Colors.white}
                />
                <Text style={styles.submitText}>Record Sowing</Text>
              </>
            )}
          </Pressable>

          {/* Validation Status */}
          {(!seedId || !isQuantityValid) && (
            <View style={styles.validationStatus}>
              <MaterialIcons
                name={
                  seedId && isQuantityValid ? "check-circle" : "info"
                }
                size={16}
                color={
                  seedId && isQuantityValid
                    ? Colors.success
                    : Colors.warning
                }
              />
              <Text
                style={[
                  styles.validationText,
                  {
                    color:
                      seedId && isQuantityValid
                        ? Colors.success
                        : Colors.textSecondary,
                  },
                ]}
              >
                {!seedId
                  ? "Select a seed"
                  : !quantity
                    ? "Enter quantity"
                    : !isQuantityValid
                      ? "Check quantity"
                      : "Ready to submit"}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* Styles */
const styles = {
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  fixedHeader: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
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
    fontSize: 28,
    fontWeight: "700" as const,
    color: Colors.white,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.9)",
    fontWeight: "500" as const,
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
  headerSpacer: {
    width: 44,
    height: 44,
  },
  contentArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    padding: Spacing.xl,
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: 16,
    color: Colors.textSecondary,
    fontWeight: "500" as const,
  },
  retryButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: 12,
    marginTop: Spacing.md,
  },
  retryButtonPressed: {
    backgroundColor: Colors.primaryDark,
    transform: [{ scale: 0.98 }],
  },
  retryButtonText: {
    color: Colors.white,
    fontWeight: "600" as const,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xl * 2,
  },
  formCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: Colors.text,
  },
  sectionDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
    lineHeight: 20,
  },
  selectionContainer: {
    gap: Spacing.sm,
  },
  selectionCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden" as const,
  },
  selectionCardActive: {
    borderColor: Colors.success,
    backgroundColor: Colors.success + "08",
    borderWidth: 2,
  },
  selectionCardPressed: {
    backgroundColor: Colors.surfaceDark,
    transform: [{ scale: 0.99 }],
  },
  selectionCardContent: {
    padding: Spacing.md,
  },
  selectionCardHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  selectionCardTitle: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: Colors.text,
    flex: 1,
  },
  selectionCardTitleActive: {
    color: Colors.success,
  },
  selectedIndicator: {
    marginLeft: "auto" as const,
  },
  selectionCardDetails: {
    flexDirection: "row" as const,
    gap: Spacing.md,
  },
  selectionCardDetailItem: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
  },
  selectionCardDetailText: {
    fontSize: 13,
    color: Colors.textTertiary,
  },
  emptySelectionCard: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: Spacing.sm,
    backgroundColor: Colors.surfaceDark,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
  },
  emptySelectionText: {
    fontSize: 13,
    color: Colors.textSecondary,
    flex: 1,
  },
  inputContainer: {
    gap: Spacing.sm,
  },
  inputLabelContainer: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: Spacing.sm,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: Colors.text,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: Spacing.md,
    fontSize: 16,
    color: Colors.text,
    backgroundColor: Colors.surfaceDark,
  },
  inputHelper: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: Spacing.xs,
  },
  inputHelperText: {
    fontSize: 13,
    color: Colors.textTertiary,
  },
  inputHelperHighlight: {
    color: Colors.info,
    fontWeight: "600" as const,
  },
  errorHelper: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: Colors.error + "10",
    padding: Spacing.sm,
    borderRadius: 8,
    gap: Spacing.sm,
  },
  errorHelperText: {
    fontSize: 13,
    color: Colors.error,
    flex: 1,
  },
  summaryCard: {
    backgroundColor: Colors.surfaceDark,
    borderRadius: 16,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  summaryContent: {
    gap: Spacing.sm,
  },
  summaryItem: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: Spacing.sm,
  },
  summaryLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: "500" as const,
    width: 70,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.text,
    flex: 1,
  },
  submitButton: {
    backgroundColor: Colors.success,
    padding: Spacing.lg,
    borderRadius: 16,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: Spacing.sm,
  },
  submitButtonDisabled: {
    backgroundColor: Colors.disabled,
  },
  submitButtonPressed: {
    backgroundColor: Colors.success,
    transform: [{ scale: 0.98 }],
  },
  submitText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: "600" as const,
  },
  validationStatus: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  validationText: {
    fontSize: 13,
    fontWeight: "500" as const,
  },
};
