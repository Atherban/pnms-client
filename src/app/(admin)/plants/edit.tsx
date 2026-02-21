import { MaterialIcons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
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
import { SafeAreaView } from "react-native-safe-area-context";
import { PlantTypeService } from "../../../services/plant-type.service";
import { Colors, Spacing } from "../../../theme";
import type { PlantTypeGrowthStage } from "../../../types/plant.types";
import { formatErrorMessage } from "../../../utils/error";

const priceRegex = /^\d+(\.\d{1,2})?$/;
const GROWTH_STAGE_OPTIONS: PlantTypeGrowthStage["stage"][] = [
  "SEED",
  "SOWN",
  "GERMINATED",
  "HARDENED",
  "READY_FOR_SALE",
];

type GrowthStageFormEntry = {
  stage: PlantTypeGrowthStage["stage"];
  dayFrom: string;
  dayTo: string;
};

const INITIAL_GROWTH_STAGES: GrowthStageFormEntry[] = GROWTH_STAGE_OPTIONS.map(
  (stage) => ({
    stage,
    dayFrom: "",
    dayTo: "",
  }),
);
const MAX_GROWTH_DAY = 180;
const DAY_OPTIONS = Array.from({ length: MAX_GROWTH_DAY + 1 }, (_, i) => i);

type DayPickerState = {
  visible: boolean;
  stage: PlantTypeGrowthStage["stage"] | null;
  field: "dayFrom" | "dayTo";
};

export default function EditPlantType() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["plant-type", id],
    queryFn: () => PlantTypeService.getById(id as string),
    enabled: Boolean(id),
  });

  const plantType = useMemo(() => {
    if (!data) return null;
    return (data as any)?.data ?? data;
  }, [data]);

  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [variety, setVariety] = useState("");
  const [lifecycleDays, setLifecycleDays] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const [minStockLevel, setMinStockLevel] = useState("");
  const [defaultCostPrice, setDefaultCostPrice] = useState("");
  const [growthStages, setGrowthStages] = useState<GrowthStageFormEntry[]>(
    INITIAL_GROWTH_STAGES,
  );
  const [dayPicker, setDayPicker] = useState<DayPickerState>({
    visible: false,
    stage: null,
    field: "dayFrom",
  });

  const formatStageLabel = (stage: PlantTypeGrowthStage["stage"]) =>
    stage
      .toLowerCase()
      .split("_")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");

  useEffect(() => {
    if (!plantType) return;
    setName(plantType.name ?? "");
    setCategory(plantType.category ?? "");
    setVariety(plantType.variety ?? "");
    setLifecycleDays(
      plantType.lifecycleDays ? String(plantType.lifecycleDays) : "",
    );
    setSellingPrice(
      plantType.sellingPrice ? String(plantType.sellingPrice) : "",
    );
    setMinStockLevel(
      plantType.minStockLevel ? String(plantType.minStockLevel) : "",
    );
    setDefaultCostPrice(
      plantType.defaultCostPrice ? String(plantType.defaultCostPrice) : "",
    );
    const stagesFromApi = Array.isArray(plantType.growthStages)
      ? plantType.growthStages
      : [];

    const nextGrowthStages = INITIAL_GROWTH_STAGES.map((entry) => {
      const matched = stagesFromApi.find(
        (item: any) => item?.stage === entry.stage,
      );
      return {
        stage: entry.stage,
        dayFrom:
          matched && typeof matched.dayFrom === "number"
            ? String(matched.dayFrom)
            : "",
        dayTo:
          matched && typeof matched.dayTo === "number"
            ? String(matched.dayTo)
            : "",
      };
    });
    setGrowthStages(nextGrowthStages);
  }, [plantType]);

  const parsedPrice = useMemo(() => {
    const trimmed = sellingPrice.trim();
    if (!trimmed || !priceRegex.test(trimmed)) return null;
    const value = Number(trimmed);
    return value > 0 ? value : null;
  }, [sellingPrice]);

  const parsedLifecycleDays = useMemo(() => {
    const trimmed = lifecycleDays.trim();
    if (!trimmed) return null;
    const value = Number(trimmed);
    return Number.isInteger(value) && value > 0 ? value : null;
  }, [lifecycleDays]);

  const parsedMinStockLevel = useMemo(() => {
    const trimmed = minStockLevel.trim();
    if (!trimmed) return undefined;
    const value = Number(trimmed);
    return Number.isInteger(value) && value > 0 ? value : null;
  }, [minStockLevel]);

  const parsedDefaultCostPrice = useMemo(() => {
    const trimmed = defaultCostPrice.trim();
    if (!trimmed) return undefined;
    if (!priceRegex.test(trimmed)) return null;
    const value = Number(trimmed);
    return value >= 0 ? value : null;
  }, [defaultCostPrice]);

  const parsedGrowthStages = useMemo(() => {
    let hasAnyValues = false;
    const parsed: PlantTypeGrowthStage[] = [];

    for (const entry of growthStages) {
      const fromText = entry.dayFrom.trim();
      const toText = entry.dayTo.trim();
      const hasInput = Boolean(fromText || toText);

      if (!hasInput) continue;
      hasAnyValues = true;

      if (!fromText || !toText) return null;

      const dayFrom = Number(fromText);
      const dayTo = Number(toText);

      if (
        !Number.isInteger(dayFrom) ||
        !Number.isInteger(dayTo) ||
        dayFrom < 0 ||
        dayTo < 0 ||
        dayTo < dayFrom
      ) {
        return null;
      }

      parsed.push({ stage: entry.stage, dayFrom, dayTo });
    }

    return hasAnyValues ? parsed : undefined;
  }, [growthStages]);

  const selectedDayValue = useMemo(() => {
    if (!dayPicker.stage) return null;
    const matched = growthStages.find((entry) => entry.stage === dayPicker.stage);
    if (!matched) return null;
    const value = matched[dayPicker.field];
    return value ? Number(value) : null;
  }, [dayPicker.field, dayPicker.stage, growthStages]);

  const mutation = useMutation({
    mutationFn: (payload: any) => PlantTypeService.update(id as string, payload),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ["plant-types"] });
      queryClient.invalidateQueries({ queryKey: ["plant-type", id] });
      Alert.alert("Success", "Plant type updated successfully", [
        { text: "OK", onPress: () => router.back() },
      ]);
    },
    onError: (err: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Error", formatErrorMessage(err));
    },
  });

  const handleSave = () => {
    if (!id) return;

    if (!name.trim()) {
      Alert.alert("Validation Error", "Plant type name is required");
      return;
    }
    if (!category.trim()) {
      Alert.alert("Validation Error", "Category is required");
      return;
    }
    if (parsedPrice === null) {
      Alert.alert("Validation Error", "Enter a valid selling price");
      return;
    }
    if (lifecycleDays.trim() && parsedLifecycleDays === null) {
      Alert.alert(
        "Validation Error",
        "Lifecycle days must be a positive whole number",
      );
      return;
    }
    if (minStockLevel.trim() && parsedMinStockLevel === null) {
      Alert.alert("Validation Error", "Min stock level must be a positive whole number");
      return;
    }
    if (defaultCostPrice.trim() && parsedDefaultCostPrice === null) {
      Alert.alert("Validation Error", "Enter a valid default cost price");
      return;
    }
    if (parsedGrowthStages === null) {
      Alert.alert(
        "Validation Error",
        "Growth stages must use whole numbers, dayFrom/dayTo cannot be empty, day values must be >= 0, and dayTo must be >= dayFrom",
      );
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    mutation.mutate({
      name: name.trim(),
      category: category.trim(),
      variety: variety.trim() || undefined,
      lifecycleDays: parsedLifecycleDays ?? undefined,
      sellingPrice: parsedPrice,
      minStockLevel: parsedMinStockLevel ?? undefined,
      defaultCostPrice: parsedDefaultCostPrice ?? undefined,
      growthStages: parsedGrowthStages,
    });
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={["left", "right"]}>
        <LinearGradient
          colors={[Colors.primary, Colors.primaryLight]}
          style={styles.headerGradient}
        >
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={20} color={Colors.white} />
          </Pressable>
          <View style={styles.headerText}>
            <Text style={styles.title}>Edit Plant Type</Text>
            <Text style={styles.subtitle}>Loading plant type details...</Text>
          </View>
          <View style={styles.headerSpacer} />
        </LinearGradient>

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading plant type data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !plantType) {
    return (
      <SafeAreaView style={styles.container} edges={["left", "right"]}>
        <LinearGradient
          colors={[Colors.primary, Colors.primaryLight]}
          style={styles.headerGradient}
        >
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={20} color={Colors.white} />
          </Pressable>
          <View style={styles.headerText}>
            <Text style={styles.title}>Edit Plant Type</Text>
            <Text style={styles.subtitle}>Unable to load data</Text>
          </View>
          <View style={styles.headerSpacer} />
        </LinearGradient>

        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={64} color={Colors.error} />
          <Text style={styles.errorTitle}>Failed to Load Plant Type</Text>
          <Text style={styles.errorMessage}>
            Unable to fetch plant type details. Please try again.
          </Text>
          <Pressable onPress={() => router.back()} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const isFormValid =
    name.trim() &&
    category.trim() &&
    parsedPrice !== null &&
    (!lifecycleDays.trim() || parsedLifecycleDays !== null) &&
    (!minStockLevel.trim() || parsedMinStockLevel !== null) &&
    (!defaultCostPrice.trim() || parsedDefaultCostPrice !== null) &&
    parsedGrowthStages !== null &&
    !mutation.isPending;

  const handleGrowthStageChange = (
    stage: PlantTypeGrowthStage["stage"],
    field: "dayFrom" | "dayTo",
    value: string,
  ) => {
    const numericValue = value.replace(/[^\d]/g, "");
    setGrowthStages((prev) =>
      prev.map((item) => {
        if (item.stage !== stage) return item;
        const next = { ...item, [field]: numericValue };
        if (numericValue) {
          const num = Number(numericValue);
          if (field === "dayFrom" && next.dayTo && num > Number(next.dayTo)) {
            next.dayTo = numericValue;
          }
          if (field === "dayTo" && next.dayFrom && num < Number(next.dayFrom)) {
            next.dayFrom = numericValue;
          }
        }
        return next;
      }),
    );
  };

  const handleGrowthStageShift = (
    stage: PlantTypeGrowthStage["stage"],
    field: "dayFrom" | "dayTo",
    delta: number,
  ) => {
    const current = growthStages.find((entry) => entry.stage === stage)?.[field] ?? "";
    const nextValue = Math.max(
      0,
      Math.min(MAX_GROWTH_DAY, Number(current || 0) + delta),
    );
    handleGrowthStageChange(stage, field, String(nextValue));
  };

  const handleGrowthStageClear = (
    stage: PlantTypeGrowthStage["stage"],
    field: "dayFrom" | "dayTo",
  ) => {
    setGrowthStages((prev) =>
      prev.map((item) =>
        item.stage === stage ? { ...item, [field]: "" } : item,
      ),
    );
  };

  const openDayPicker = (
    stage: PlantTypeGrowthStage["stage"],
    field: "dayFrom" | "dayTo",
  ) => {
    setDayPicker({ visible: true, stage, field });
  };

  const closeDayPicker = () => {
    setDayPicker({ visible: false, stage: null, field: "dayFrom" });
  };

  const handleDaySelect = (day: number) => {
    if (!dayPicker.stage) return;
    handleGrowthStageChange(dayPicker.stage, dayPicker.field, String(day));
    closeDayPicker();
  };

  return (
    <SafeAreaView style={styles.container} edges={["left", "right"]}>
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
        <View style={styles.headerText}>
          <Text style={styles.title}>Edit Plant Type</Text>
          <Text style={styles.subtitle}>Update plant type details</Text>
        </View>
        <View style={styles.headerSpacer} />
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.formCard}>
          <View style={styles.inputContainer}>
            <View style={styles.inputLabel}>
              <MaterialIcons name="label" size={18} color={Colors.text} />
              <Text style={styles.inputLabelText}>Plant Type Name *</Text>
            </View>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Edit plant type name"
              placeholderTextColor={Colors.textTertiary}
              style={styles.input}
            />
          </View>

          <View style={styles.inputContainer}>
            <View style={styles.inputLabel}>
              <MaterialIcons name="category" size={18} color={Colors.text} />
              <Text style={styles.inputLabelText}>Category *</Text>
            </View>
            <TextInput
              value={category}
              onChangeText={setCategory}
              placeholder="Edit category"
              placeholderTextColor={Colors.textTertiary}
              autoCapitalize="characters"
              style={styles.input}
            />
          </View>

          <View style={styles.inputContainer}>
            <View style={styles.inputLabel}>
              <MaterialIcons name="spa" size={18} color={Colors.text} />
              <Text style={styles.inputLabelText}>Variety</Text>
            </View>
            <TextInput
              value={variety}
              onChangeText={setVariety}
              placeholder="Edit variety"
              placeholderTextColor={Colors.textTertiary}
              style={styles.input}
            />
          </View>

          <View style={styles.inputContainer}>
            <View style={styles.inputLabel}>
              <MaterialIcons name="schedule" size={18} color={Colors.text} />
              <Text style={styles.inputLabelText}>Lifecycle Days</Text>
            </View>
            <TextInput
              value={lifecycleDays}
              onChangeText={setLifecycleDays}
              placeholder="Edit lifecycle days"
              placeholderTextColor={Colors.textTertiary}
              keyboardType="numeric"
              style={styles.input}
            />
          </View>

          <View style={styles.inputContainer}>
            <View style={styles.inputLabel}>
              <MaterialIcons name="attach-money" size={18} color={Colors.text} />
              <Text style={styles.inputLabelText}>Selling Price *</Text>
            </View>
            <TextInput
              value={sellingPrice}
              onChangeText={setSellingPrice}
              placeholder="Edit selling price"
              placeholderTextColor={Colors.textTertiary}
              keyboardType="numeric"
              style={styles.input}
            />
          </View>

          <View style={styles.inputContainer}>
            <View style={styles.inputLabel}>
              <MaterialIcons name="warning" size={18} color={Colors.text} />
              <Text style={styles.inputLabelText}>Min Stock Level</Text>
            </View>
            <TextInput
              value={minStockLevel}
              onChangeText={setMinStockLevel}
              placeholder="Edit min stock level"
              placeholderTextColor={Colors.textTertiary}
              keyboardType="numeric"
              style={styles.input}
            />
          </View>

          <View style={styles.inputContainer}>
            <View style={styles.inputLabel}>
              <MaterialIcons name="paid" size={18} color={Colors.text} />
              <Text style={styles.inputLabelText}>Default Cost Price</Text>
            </View>
            <TextInput
              value={defaultCostPrice}
              onChangeText={setDefaultCostPrice}
              placeholder="Edit default cost price"
              placeholderTextColor={Colors.textTertiary}
              keyboardType="numeric"
              style={styles.input}
            />
          </View>

          <View style={styles.inputContainer}>
            <View style={styles.inputLabel}>
              <MaterialIcons name="timeline" size={18} color={Colors.text} />
              <Text style={styles.inputLabelText}>Growth Stages (Optional)</Text>
            </View>
            <Text style={styles.growthStageHint}>
              Pick day ranges by stage. Use day selector or +/- controls.
            </Text>
            <View style={styles.growthStagesCard}>
              {growthStages.map((entry) => (
                <View key={entry.stage} style={styles.growthStageRow}>
                  <Text style={styles.growthStageName}>{formatStageLabel(entry.stage)}</Text>
                  <View style={styles.growthStageInputs}>
                    <View style={styles.growthStageFieldGroup}>
                      <Text style={styles.growthStageFieldLabel}>From Day</Text>
                      <Pressable
                        onPress={() => openDayPicker(entry.stage, "dayFrom")}
                        style={[
                          styles.growthStageDayButton,
                          parsedGrowthStages === null && styles.inputError,
                        ]}
                      >
                        <MaterialIcons name="event" size={15} color={Colors.primary} />
                        <Text
                          style={[
                            styles.growthStageDayButtonText,
                            !entry.dayFrom && styles.growthStageDayButtonPlaceholder,
                          ]}
                        >
                          {entry.dayFrom ? `Day ${entry.dayFrom}` : "Select"}
                        </Text>
                      </Pressable>
                      <View style={styles.growthStageAdjustRow}>
                        <Pressable
                          onPress={() => handleGrowthStageShift(entry.stage, "dayFrom", -1)}
                          style={styles.growthStageAdjustButton}
                        >
                          <MaterialIcons name="remove" size={14} color={Colors.textSecondary} />
                        </Pressable>
                        <Pressable
                          onPress={() => handleGrowthStageClear(entry.stage, "dayFrom")}
                          style={styles.growthStageClearButton}
                        >
                          <Text style={styles.growthStageClearButtonText}>Clear</Text>
                        </Pressable>
                        <Pressable
                          onPress={() => handleGrowthStageShift(entry.stage, "dayFrom", 1)}
                          style={styles.growthStageAdjustButton}
                        >
                          <MaterialIcons name="add" size={14} color={Colors.textSecondary} />
                        </Pressable>
                      </View>
                    </View>
                    <View style={styles.growthStageFieldGroup}>
                      <Text style={styles.growthStageFieldLabel}>To Day</Text>
                      <Pressable
                        onPress={() => openDayPicker(entry.stage, "dayTo")}
                        style={[
                          styles.growthStageDayButton,
                          parsedGrowthStages === null && styles.inputError,
                        ]}
                      >
                        <MaterialIcons name="event" size={15} color={Colors.primary} />
                        <Text
                          style={[
                            styles.growthStageDayButtonText,
                            !entry.dayTo && styles.growthStageDayButtonPlaceholder,
                          ]}
                        >
                          {entry.dayTo ? `Day ${entry.dayTo}` : "Select"}
                        </Text>
                      </Pressable>
                      <View style={styles.growthStageAdjustRow}>
                        <Pressable
                          onPress={() => handleGrowthStageShift(entry.stage, "dayTo", -1)}
                          style={styles.growthStageAdjustButton}
                        >
                          <MaterialIcons name="remove" size={14} color={Colors.textSecondary} />
                        </Pressable>
                        <Pressable
                          onPress={() => handleGrowthStageClear(entry.stage, "dayTo")}
                          style={styles.growthStageClearButton}
                        >
                          <Text style={styles.growthStageClearButtonText}>Clear</Text>
                        </Pressable>
                        <Pressable
                          onPress={() => handleGrowthStageShift(entry.stage, "dayTo", 1)}
                          style={styles.growthStageAdjustButton}
                        >
                          <MaterialIcons name="add" size={14} color={Colors.textSecondary} />
                        </Pressable>
                      </View>
                    </View>
                  </View>
                </View>
              ))}
            </View>
            {parsedGrowthStages === null && (
              <Text style={styles.validationText}>
                Fill both day fields, use whole numbers only, keep values &gt;= 0, and set To
                &gt;= From.
              </Text>
            )}
          </View>

          <View style={styles.actionsContainer}>
            <Pressable onPress={() => router.back()} style={styles.cancelButton}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>

            <Pressable
              disabled={!isFormValid}
              onPress={handleSave}
              style={[
                styles.saveButton,
                !isFormValid && styles.saveButtonDisabled,
              ]}
            >
              <LinearGradient
                colors={[Colors.success, Colors.primary]}
                style={styles.saveGradient}
              >
                <MaterialIcons name="check" size={20} color={Colors.white} />
                <Text style={styles.saveButtonText}>
                  {mutation.isPending ? "Saving..." : "Save Changes"}
                </Text>
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      <Modal transparent visible={dayPicker.visible} animationType="slide">
        <Pressable style={styles.modalBackdrop} onPress={closeDayPicker}>
          <Pressable style={styles.sheet} onPress={() => null}>
            <Text style={styles.sheetTitle}>
              Select {dayPicker.field === "dayFrom" ? "Start Day" : "End Day"}
            </Text>
            <Text style={styles.sheetSubTitle}>
              {dayPicker.stage ? formatStageLabel(dayPicker.stage) : ""}
            </Text>
            <View style={styles.quickDayRow}>
              {[7, 14, 21, 30, 45, 60, 90].map((day) => (
                <Pressable
                  key={day}
                  onPress={() => handleDaySelect(day)}
                  style={[
                    styles.quickDayChip,
                    selectedDayValue === day && styles.quickDayChipSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.quickDayChipText,
                      selectedDayValue === day && styles.quickDayChipTextSelected,
                    ]}
                  >
                    {day}
                  </Text>
                </Pressable>
              ))}
            </View>
            <ScrollView style={styles.dayGridScroll} showsVerticalScrollIndicator={false}>
              <View style={styles.dayGrid}>
                {DAY_OPTIONS.map((day) => (
                  <Pressable
                    key={day}
                    onPress={() => handleDaySelect(day)}
                    style={[
                      styles.dayCell,
                      selectedDayValue === day && styles.dayCellSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayCellText,
                        selectedDayValue === day && styles.dayCellTextSelected,
                      ]}
                    >
                      {day}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = {
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerGradient: {
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: Spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.white + "20",
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  backButtonPressed: {
    backgroundColor: Colors.white + "35",
    transform: [{ scale: 0.96 }],
  },
  headerText: {
    flex: 1,
  },
  headerSpacer: {
    width: 40,
  },
  title: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: Colors.white,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.white,
    opacity: 0.9,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: 100,
  },
  formCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  inputContainer: {
    marginBottom: Spacing.md,
  },
  inputLabel: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  inputLabelText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.text,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 15,
    color: Colors.text,
    backgroundColor: Colors.background,
  },
  inputError: {
    borderColor: Colors.error,
  },
  validationText: {
    marginTop: Spacing.xs,
    fontSize: 12,
    color: Colors.error,
  },
  growthStageHint: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  growthStagesCard: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    backgroundColor: Colors.background,
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  growthStageRow: {
    gap: Spacing.xs,
  },
  growthStageName: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: "700" as const,
    letterSpacing: 0.5,
  },
  growthStageInputs: {
    flexDirection: "row" as const,
    gap: Spacing.sm,
  },
  growthStageFieldGroup: {
    flex: 1,
    gap: 6,
  },
  growthStageFieldLabel: {
    fontSize: 11,
    color: Colors.textTertiary,
    fontWeight: "600" as const,
  },
  growthStageDayButton: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface,
  },
  growthStageDayButtonText: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: "600" as const,
  },
  growthStageDayButtonPlaceholder: {
    color: Colors.textTertiary,
    fontWeight: "400" as const,
  },
  growthStageAdjustRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    gap: Spacing.xs,
  },
  growthStageAdjustButton: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: Colors.surface,
  },
  growthStageClearButton: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    paddingVertical: 5,
    alignItems: "center" as const,
    backgroundColor: Colors.surface,
  },
  growthStageClearButtonText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: "600" as const,
  },
  actionsContainer: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  cancelButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cancelButtonText: {
    color: Colors.textSecondary,
    fontWeight: "600" as const,
  },
  saveButton: {
    flex: 1,
    borderRadius: 10,
    overflow: "hidden" as const,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveGradient: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingVertical: Spacing.sm,
    gap: Spacing.xs,
  },
  saveButtonText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: "600" as const,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingBottom: 80,
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: 16,
    color: Colors.textSecondary,
    fontWeight: "500" as const,
  },
  errorContainer: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    padding: Spacing.xl,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: Colors.text,
    marginTop: Spacing.md,
  },
  errorMessage: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center" as const,
    marginTop: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  retryButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: 12,
  },
  retryButtonText: {
    color: Colors.white,
    fontWeight: "600" as const,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end" as const,
  },
  sheet: {
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "70%" as const,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  sheetSubTitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  quickDayRow: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  quickDayChip: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 999,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    backgroundColor: Colors.surface,
  },
  quickDayChipSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + "12",
  },
  quickDayChipText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: "600" as const,
  },
  quickDayChipTextSelected: {
    color: Colors.primary,
  },
  dayGridScroll: {
    maxHeight: 300,
  },
  dayGrid: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: Spacing.xs,
    paddingBottom: Spacing.sm,
  },
  dayCell: {
    width: 40,
    height: 36,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: Colors.surface,
  },
  dayCellSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + "15",
  },
  dayCellText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: "600" as const,
  },
  dayCellTextSelected: {
    color: Colors.primary,
  },
};
