import { MaterialIcons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import EntityThumbnail from "../../../components/ui/EntityThumbnail";
import { InventoryService } from "../../../services/inventory.service";
import { PlantTypeService } from "../../../services/plant-type.service";
import { Colors, Spacing } from "../../../theme";
import { formatErrorMessage } from "../../../utils/error";
import { resolveEntityImage } from "../../../utils/image";
import {
  QUANTITY_UNITS,
  formatQuantityUnit,
  normalizeQuantityUnit,
} from "../../../utils/units";
import StitchHeader from "../../../components/common/StitchHeader";
import StitchCard from "../../../components/common/StitchCard";

const BOTTOM_NAV_HEIGHT = 80;

export default function StaffInventoryCreate() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const [plantType, setPlantType] = useState<string>("");
  const [quantity, setQuantity] = useState("");
  const [quantityUnit, setQuantityUnit] = useState("UNITS");
  const [plantTypeOpen, setPlantTypeOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["plant-types"],
    queryFn: PlantTypeService.getAll,
  });

  const plantTypes = useMemo(() => (Array.isArray(data) ? data : []), [data]);
  const selectedPlant = useMemo(
    () => plantTypes.find((pt: any) => pt._id === plantType),
    [plantTypes, plantType],
  );

  useEffect(() => {
    if (!selectedPlant) {
      return;
    }
    setQuantityUnit(
      normalizeQuantityUnit(selectedPlant.expectedSeedUnit, "UNITS"),
    );
  }, [selectedPlant]);

  const parsedQuantity = Number(quantity);
  const parsedUnitCost = Number(
    selectedPlant?.defaultCostPrice ??
      selectedPlant?.sellingPrice,
  );
  const isValid =
    Boolean(plantType) &&
    Number.isFinite(parsedQuantity) &&
    parsedQuantity > 0 &&
    Number.isFinite(parsedUnitCost) &&
    parsedUnitCost >= 0;

  const mutation = useMutation({
    mutationFn: () =>
      InventoryService.createPurchased({
        plantType,
        quantity: parsedQuantity,
        quantityUnit: normalizeQuantityUnit(quantityUnit, "UNITS"),
        unitCost: parsedUnitCost,
      }),
    onSuccess: async () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await queryClient.invalidateQueries({ queryKey: ["inventory"] });
      Alert.alert("Success", "Purchased inventory created successfully", [
        { text: "OK", onPress: () => router.replace("/(staff)/inventory") },
      ]);
    },
    onError: (error: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Error", formatErrorMessage(error));
    },
  });

  const formatNumber = (value: string) => {
    const num = value.replace(/[^0-9]/g, "");
    return num;
  };

  const isQuantityValid = () => {
    return Number.isFinite(parsedQuantity) && parsedQuantity > 0;
  };

  const handleSubmit = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    mutation.mutate();
  };

  const getCategoryIcon = (category?: string) => {
    switch (category?.toUpperCase()) {
      case "FLOWER":
        return "local-florist";
      case "FRUIT":
        return "cake";
      case "INDOOR":
        return "house";
      case "OUTDOOR":
        return "park";
      case "VEGETABLE":
        return "grass";
      case "MEDICINAL":
        return "medical-services";
      case "ORNAMENTAL":
        return "spa";
      default:
        return "local-florist";
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["left", "right"]}>
      <StitchHeader
        title="Add Inventory"
        subtitle="Purchased stock entry"
        variant="solid"
        showBackButton
        onBackPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.back();
        }}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <StitchCard style={styles.heroCard}>
          <Text style={styles.heroTitle}>Create a purchased inventory entry with the same admin flow</Text>
          <Text style={styles.heroSubtitle}>
            Select a plant type, confirm quantity and unit, then let pricing apply from configuration automatically.
          </Text>
        </StitchCard>

        {/* Form Card */}
        <View style={styles.formCard}>
          {/* Inventory Information Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="inventory" size={22} color={Colors.text} />
              <Text style={styles.sectionTitle}>Inventory Details</Text>
            </View>
            <Text style={styles.sectionDescription}>
              Enter the details for the purchased inventory. All fields marked
              with * are required.
            </Text>

            {/* Plant Type Selection */}
            <View style={styles.inputContainer}>
              <View style={styles.inputLabel}>
                <MaterialIcons
                  name="local-florist"
                  size={18}
                  color={Colors.text}
                />
                <Text style={styles.inputLabelText}>Plant Type *</Text>
              </View>

              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setPlantTypeOpen(!plantTypeOpen);
                }}
                style={({ pressed }) => [
                  styles.selector,
                  pressed && styles.selectorPressed,
                  plantTypeOpen && styles.selectorOpen,
                ]}
              >
                <View style={styles.selectorContent}>
                  {selectedPlant ? (
                    <View style={styles.selectedItem}>
                      <EntityThumbnail
                        uri={resolveEntityImage(selectedPlant)}
                        label={selectedPlant.name}
                        size={32}
                        iconName={getCategoryIcon(selectedPlant.category)}
                      />
                      <View style={styles.selectedItemInfo}>
                        <Text style={styles.selectedItemName} numberOfLines={1}>
                          {selectedPlant.name}
                        </Text>
                        <Text style={styles.selectedItemCategory}>
                          {selectedPlant.category || "Uncategorized"}
                        </Text>
                      </View>
                    </View>
                  ) : (
                    <Text style={styles.selectorPlaceholder}>
                      Select a plant type
                    </Text>
                  )}
                  <MaterialIcons
                    name={plantTypeOpen ? "expand-less" : "expand-more"}
                    size={20}
                    color={Colors.textSecondary}
                  />
                </View>
              </Pressable>

              {!plantType && (
                <View style={styles.validationError}>
                  <MaterialIcons
                    name="error"
                    size={14}
                    color={Colors.warning}
                  />
                  <Text style={styles.validationText}>
                    Please select a plant type
                  </Text>
                </View>
              )}
            </View>

            {/* Quantity Field */}
            <View style={styles.inputContainer}>
              <View style={styles.inputLabel}>
                <MaterialIcons name="inventory" size={18} color={Colors.text} />
                <Text style={styles.inputLabelText}>Quantity *</Text>
              </View>
              <TextInput
                value={quantity}
                onChangeText={(text) => setQuantity(formatNumber(text))}
                placeholder="Enter quantity"
                placeholderTextColor={Colors.textTertiary}
                keyboardType="number-pad"
                style={[
                  styles.input,
                  quantity && !isQuantityValid() && styles.inputError,
                  isQuantityValid() && styles.inputSuccess,
                ]}
              />
              {!isQuantityValid() && quantity && (
                <View style={styles.validationError}>
                  <MaterialIcons name="error" size={14} color={Colors.error} />
                  <Text style={styles.validationText}>
                    Please enter a valid quantity (greater than 0)
                  </Text>
                </View>
              )}
              {isQuantityValid() && (
                <View style={styles.preview}>
                  <LinearGradient
                    colors={[Colors.success + "20", Colors.success + "10"]}
                    style={styles.previewGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <MaterialIcons
                      name="check-circle"
                      size={16}
                      color={Colors.success}
                    />
                    <Text style={styles.previewText}>
                      Quantity: {Number(quantity).toLocaleString("en-IN")}{" "}
                      {formatQuantityUnit(quantityUnit, "UNITS")}
                    </Text>
                  </LinearGradient>
                </View>
              )}
            </View>

            <View style={styles.inputContainer}>
              <View style={styles.inputLabel}>
                <MaterialIcons name="straighten" size={18} color={Colors.text} />
                <Text style={styles.inputLabelText}>Quantity Unit</Text>
              </View>
              <View style={styles.unitPills}>
                {QUANTITY_UNITS.map((unit) => {
                  const isSelected = quantityUnit === unit;
                  return (
                    <Pressable
                      key={unit}
                      onPress={() => setQuantityUnit(unit)}
                      style={[
                        styles.unitPill,
                        isSelected && styles.unitPillSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.unitPillText,
                          isSelected && styles.unitPillTextSelected,
                        ]}
                      >
                        {formatQuantityUnit(unit, "UNITS")}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              {selectedPlant?.expectedSeedUnit ? (
                <Text style={styles.unitHint}>
                  Plant default:{" "}
                  {formatQuantityUnit(selectedPlant.expectedSeedUnit, "UNITS")}
                </Text>
              ) : null}
            </View>

            {selectedPlant && (
              <View style={styles.preview}>
                <LinearGradient
                  colors={[Colors.info + "20", Colors.info + "10"]}
                  style={styles.previewGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <MaterialIcons name="info" size={16} color={Colors.info} />
                  <Text style={[styles.previewText, { color: Colors.info }]}>
                    Pricing is auto-applied from plant configuration.
                  </Text>
                </LinearGradient>
              </View>
            )}
            {selectedPlant?.expectedSeedQtyPerBatch ? (
              <View style={styles.preview}>
                <LinearGradient
                  colors={[Colors.primary + "18", Colors.primary + "0F"]}
                  style={styles.previewGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <MaterialIcons
                    name="format-list-numbered"
                    size={16}
                    color={Colors.primary}
                  />
                  <Text style={[styles.previewText, { color: Colors.primary }]}>
                    Plant setup: {selectedPlant.expectedSeedQtyPerBatch}{" "}
                    {formatQuantityUnit(selectedPlant.expectedSeedUnit, "UNITS")}{" "}
                    per batch
                  </Text>
                </LinearGradient>
              </View>
            ) : null}
          </View>

          {/* Summary Preview */}
          {isValid && (
            <View style={styles.summaryCard}>
              <View style={styles.summaryHeader}>
                <MaterialIcons
                  name="check-circle"
                  size={20}
                  color={Colors.success}
                />
                <Text style={styles.summaryTitle}>Entry Summary</Text>
              </View>
              <View style={styles.summaryContent}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Quantity:</Text>
                  <Text style={styles.summaryValue}>
                    {Number(quantity).toLocaleString("en-IN")}{" "}
                    {formatQuantityUnit(quantityUnit, "UNITS")}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionsContainer}>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.back();
              }}
              style={({ pressed }) => [
                styles.cancelButton,
                pressed && styles.cancelButtonPressed,
              ]}
            >
              <MaterialIcons
                name="close"
                size={20}
                color={Colors.textSecondary}
              />
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>

            <Pressable
              onPress={handleSubmit}
              disabled={!isValid || mutation.isPending}
              style={({ pressed }) => [
                styles.submitButton,
                (!isValid || mutation.isPending) && styles.submitButtonDisabled,
                pressed && styles.submitButtonPressed,
              ]}
            >
              <LinearGradient
                colors={
                  !isValid || mutation.isPending
                    ? [Colors.border, Colors.borderLight]
                    : [Colors.success, "#34D399"]
                }
                style={styles.submitGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {mutation.isPending ? (
                  <>
                    <ActivityIndicator size="small" color={Colors.white} />
                    <Text style={styles.submitButtonText}>Creating...</Text>
                  </>
                ) : (
                  <>
                    <MaterialIcons
                      name="add-circle"
                      size={22}
                      color={Colors.white}
                    />
                    <Text style={styles.submitButtonText}>
                      Create Inventory
                    </Text>
                  </>
                )}
              </LinearGradient>
            </Pressable>
          </View>

          {/* Validation Status */}
          {!isValid && (
            <Text style={styles.hintText}>
              ⓘ Please select a plant type and enter a valid quantity
            </Text>
          )}
        </View>

        {/* Help Card */}
        <View style={styles.helpCard}>
          <MaterialIcons
            name="help-outline"
            size={18}
            color={Colors.textSecondary}
          />
          <View style={styles.helpContent}>
            <Text style={styles.helpTitle}>About Purchased Inventory</Text>
            <Text style={styles.helpText}>
              • Select the plant type you&apos;re adding stock for{"\n"}•
              Quantity must be greater than 0{"\n"}• Pricing is configured by
              admin and applied automatically
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Plant Type Dropdown - Outside ScrollView */}
      <Modal
        visible={plantTypeOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setPlantTypeOpen(false)}
        statusBarTranslucent
      >
        <View style={styles.dropdownOverlay}>
          <Pressable
            style={styles.dropdownBackdrop}
            onPress={() => setPlantTypeOpen(false)}
          />
          <View
            style={[
              styles.dropdownContainer,
              { paddingBottom: Math.max(insets.bottom, Spacing.md) },
            ]}
          >
            <View style={styles.dropdownHeader}>
              <Text style={styles.dropdownTitle}>Select Plant Type</Text>
              <Pressable
                onPress={() => setPlantTypeOpen(false)}
                style={styles.dropdownCloseButton}
              >
                <MaterialIcons name="close" size={20} color={Colors.text} />
              </Pressable>
            </View>
            {isLoading ? (
              <View style={styles.dropdownLoading}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={styles.dropdownLoadingText}>
                  Loading plants...
                </Text>
              </View>
            ) : (
              <ScrollView
                style={styles.dropdownScroll}
                showsVerticalScrollIndicator={false}
              >
                {plantTypes.map((pt: any) => (
                  <Pressable
                    key={pt._id}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setPlantType(pt._id);
                      setPlantTypeOpen(false);
                    }}
                    style={({ pressed }) => [
                      styles.dropdownOption,
                      plantType === pt._id && styles.dropdownOptionSelected,
                      pressed && styles.dropdownOptionPressed,
                    ]}
                  >
                    <View style={styles.dropdownOptionContent}>
                      <EntityThumbnail
                        uri={resolveEntityImage(pt)}
                        label={pt.name}
                        size={40}
                        iconName={getCategoryIcon(pt.category)}
                      />
                      <View style={styles.dropdownDetails}>
                        <Text
                          style={[
                            styles.dropdownLabel,
                            plantType === pt._id &&
                              styles.dropdownLabelSelected,
                          ]}
                        >
                          {pt.name}
                        </Text>
                        <Text style={styles.dropdownDescription}>
                          {pt.category || "Uncategorized"}
                        </Text>
                      </View>
                      {plantType === pt._id && (
                        <MaterialIcons
                          name="check-circle"
                          size={20}
                          color={Colors.primary}
                        />
                      )}
                    </View>
                  </Pressable>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

/* -------------------- Styles -------------------- */

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
  headerContent: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700" as const,
    color: Colors.white,
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.9)",
    fontWeight: "500" as const,
  },
  headerSpacer: {
    width: 44,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: BOTTOM_NAV_HEIGHT + 2 * Spacing.xl,
  },
  heroCard: {
    marginBottom: Spacing.lg,
  },
  heroTitle: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: Colors.text,
  },
  heroSubtitle: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 19,
    color: Colors.textSecondary,
  },
  formCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    marginBottom: Spacing.lg,
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
  inputContainer: {
    marginBottom: Spacing.lg,
  },
  inputLabel: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  inputLabelText: {
    fontSize: 14,
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
    backgroundColor: Colors.surface,
    minHeight: 50,
  },
  inputError: {
    borderColor: Colors.error,
    backgroundColor: Colors.error + "10",
  },
  inputSuccess: {
    borderColor: Colors.success,
  },
  validationError: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: Colors.error + "10",
    padding: Spacing.sm,
    borderRadius: 8,
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  validationText: {
    fontSize: 13,
    color: Colors.error,
    fontWeight: "500" as const,
    flex: 1,
  },
  unitPills: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: Spacing.sm,
  },
  unitPill: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 999,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.surface,
  },
  unitPillSelected: {
    borderColor: Colors.primary,
    backgroundColor: `${Colors.primary}12`,
  },
  unitPillText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: "500" as const,
    textTransform: "capitalize" as const,
  },
  unitPillTextSelected: {
    color: Colors.primary,
    fontWeight: "700" as const,
  },
  unitHint: {
    marginTop: Spacing.xs,
    color: Colors.textSecondary,
    fontSize: 12,
    textTransform: "capitalize" as const,
  },
  // Selector Styles
  selector: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    overflow: "hidden" as const,
    minHeight: 50,
    justifyContent: "center",
  },
  selectorPressed: {
    backgroundColor: Colors.surfaceDark,
  },
  selectorOpen: {
    borderColor: Colors.primary,
  },
  selectorContent: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    padding: Spacing.md,
  },
  selectorPlaceholder: {
    fontSize: 16,
    color: Colors.textTertiary,
    flex: 1,
  },
  selectedItem: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: Spacing.sm,
    flex: 1,
  },
  selectedItemInfo: {
    flex: 1,
  },
  selectedItemName: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: Colors.text,
  },
  selectedItemCategory: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  preview: {
    marginTop: Spacing.sm,
  },
  previewGradient: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    padding: Spacing.md,
    borderRadius: 12,
    gap: Spacing.sm,
  },
  previewText: {
    fontSize: 14,
    color: Colors.success,
    fontWeight: "600" as const,
  },
  summaryCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  summaryHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: Colors.text,
  },
  summaryContent: {
    gap: Spacing.sm,
  },
  summaryRow: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
  },
  summaryLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: "500" as const,
  },
  summaryValue: {
    fontSize: 13,
    color: Colors.text,
    fontWeight: "600" as const,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: Spacing.sm,
  },
  totalLabel: {
    fontSize: 15,
    color: Colors.text,
    fontWeight: "600" as const,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: Colors.success,
  },
  actionsContainer: {
    flexDirection: "row" as const,
    gap: Spacing.md,
    marginTop: "auto" as const,
    marginBottom: Spacing.md,
    alignItems: "center",
  },
  cancelButton: {
    flex: 1,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    gap: Spacing.sm,
    minHeight: 56,
  },
  cancelButtonPressed: {
    backgroundColor: Colors.surfaceDark,
    transform: [{ scale: 0.98 }],
  },
  cancelButtonText: {
    fontSize: 16,
    color: Colors.textSecondary,
    fontWeight: "600" as const,
  },
  submitButton: {
    flex: 2,
    borderRadius: 16,
    overflow: "hidden" as const,
    shadowColor: Colors.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    minHeight: 56,
  },
  submitButtonDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonPressed: {
    transform: [{ scale: 0.98 }],
  },
  submitGradient: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    padding: Spacing.lg,
    gap: Spacing.sm,
    flex: 1,
    minHeight: 56,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: Colors.white,
  },
  hintText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center" as const,
    fontStyle: "italic" as const,
    marginTop: Spacing.sm,
  },
  helpCard: {
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.md,
  },
  helpContent: {
    flex: 1,
  },
  helpTitle: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  helpText: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  // Dropdown overlay styles
  dropdownOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end" as const,
  },
  dropdownBackdrop: {
    position: "absolute" as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  dropdownContainer: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "70%",
  },
  dropdownHeader: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  dropdownTitle: {
    fontSize: 18,
    fontWeight: "600" as const,
    color: Colors.text,
  },
  dropdownCloseButton: {
    padding: Spacing.xs,
  },
  dropdownLoading: {
    padding: Spacing.xl,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  dropdownLoadingText: {
    marginTop: Spacing.md,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  dropdownScroll: {
    maxHeight: 400,
  },
  dropdownOption: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  dropdownOptionSelected: {
    backgroundColor: Colors.primary + "10",
  },
  dropdownOptionPressed: {
    backgroundColor: Colors.surfaceDark,
  },
  dropdownOptionContent: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  dropdownDetails: {
    flex: 1,
  },
  dropdownLabel: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: Colors.text,
    marginBottom: 4,
  },
  dropdownLabelSelected: {
    color: Colors.primary,
  },
  dropdownDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
};
