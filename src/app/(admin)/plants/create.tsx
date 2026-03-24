import { MaterialIcons } from "@expo/vector-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import StitchHeader from "../../../components/common/StitchHeader";
import StitchCard from "../../../components/common/StitchCard";
import StitchSectionHeader from "../../../components/common/StitchSectionHeader";
import { AdminTheme } from "../../../components/admin/theme";
import { PlantTypeService } from "../../../services/plant-type.service";
import type { PlantTypeGrowthStage } from "../../../types/plant.types";
import { formatErrorMessage } from "../../../utils/error";
import { Spacing } from "@/src/theme";

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

export default function CreatePlantType() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [variety, setVariety] = useState("");
  const [lifecycleDays, setLifecycleDays] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const [minStockLevel, setMinStockLevel] = useState("");
  const [defaultCostPrice, setDefaultCostPrice] = useState("");
  const [expectedSeedQtyPerBatch, setExpectedSeedQtyPerBatch] = useState("");
  const [expectedSeedUnit, setExpectedSeedUnit] = useState("");
  const [growthStages, setGrowthStages] = useState<GrowthStageFormEntry[]>(
    INITIAL_GROWTH_STAGES,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [dayPicker, setDayPicker] = useState<DayPickerState>({
    visible: false,
    stage: null,
    field: "dayFrom",
  });

  const CATEGORY_OPTIONS = ["VEGETABLE", "FLOWER", "FRUIT", "HERB"];

  const formatStageLabel = (stage: PlantTypeGrowthStage["stage"]) =>
    stage
      .toLowerCase()
      .split("_")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");

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

  const parsedExpectedSeedQtyPerBatch = useMemo(() => {
    const trimmed = expectedSeedQtyPerBatch.trim();
    if (!trimmed) return undefined;
    const value = Number(trimmed);
    return Number.isInteger(value) && value > 0 ? value : null;
  }, [expectedSeedQtyPerBatch]);

  const seedSowingGuidance = useMemo(() => {
    if (!parsedExpectedSeedQtyPerBatch) return null;
    const unit = expectedSeedUnit.trim() || "seeds";
    return `Sowing guidance: use ${parsedExpectedSeedQtyPerBatch} ${unit} for one standard batch of this plant type.`;
  }, [expectedSeedUnit, parsedExpectedSeedQtyPerBatch]);

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

  const parsedVariety = useMemo(() => {
    const trimmed = variety.trim();
    if (!trimmed) return undefined;
    if (trimmed.length < 2 || trimmed.length > 50) return null;
    const varietyRegex = /^[a-zA-Z0-9][a-zA-Z0-9\s\-'/().,&]*$/;
    return varietyRegex.test(trimmed) ? trimmed : null;
  }, [variety]);

  const mutation = useMutation({
    mutationFn: PlantTypeService.create,
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ["plant-types"] });
      Alert.alert("Success", "Plant type created successfully", [
        { text: "OK", onPress: () => router.replace("/(admin)/plants") },
      ]);
    },
    onError: (err: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Error", formatErrorMessage(err));
    },
    onSettled: () => setIsSubmitting(false),
  });

  const handleCreate = () => {
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
    if (
      expectedSeedQtyPerBatch.trim() &&
      parsedExpectedSeedQtyPerBatch === null
    ) {
      Alert.alert(
        "Validation Error",
        "Expected seed quantity must be a positive whole number",
      );
      return;
    }
    if (variety.trim() && parsedVariety === null) {
      Alert.alert(
        "Validation Error",
        "Variety must be 2-50 characters and use only letters, numbers, spaces, or - ' / ( ) . , &",
      );
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
    setIsSubmitting(true);

    mutation.mutate({
      name: name.trim(),
      category: category.trim(),
      variety: parsedVariety,
      lifecycleDays: parsedLifecycleDays ?? undefined,
      sellingPrice: parsedPrice,
      minStockLevel: parsedMinStockLevel ?? undefined,
      defaultCostPrice: parsedDefaultCostPrice ?? undefined,
      expectedSeedQtyPerBatch: parsedExpectedSeedQtyPerBatch ?? undefined,
      expectedSeedUnit: expectedSeedUnit.trim() || undefined,
      growthStages: parsedGrowthStages,
    });
  };

  const isFormValid =
    name.trim() &&
    category.trim() &&
    parsedPrice !== null &&
    (!lifecycleDays.trim() || parsedLifecycleDays !== null) &&
    (!minStockLevel.trim() || parsedMinStockLevel !== null) &&
    (!defaultCostPrice.trim() || parsedDefaultCostPrice !== null) &&
    (!expectedSeedQtyPerBatch.trim() || parsedExpectedSeedQtyPerBatch !== null) &&
    (!variety.trim() || parsedVariety !== null) &&
    parsedGrowthStages !== null &&
    !isSubmitting;

  const selectedDayValue = useMemo(() => {
    if (!dayPicker.stage) return null;
    const matched = growthStages.find((entry) => entry.stage === dayPicker.stage);
    if (!matched) return null;
    const value = matched[dayPicker.field];
    return value ? Number(value) : null;
  }, [dayPicker.field, dayPicker.stage, growthStages]);

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
      <StitchHeader
        title="Add Plant Type"
        subtitle="Create a new plant type"
        onBackPress={() => router.back()}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <StitchCard style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <MaterialIcons name="local-florist" size={22} color={AdminTheme.colors.primary} />
          </View>
          <View style={styles.heroContent}>
            <Text style={styles.heroTitle}>Create a plant type once and reuse it everywhere</Text>
            <Text style={styles.heroSubtitle}>
              Add pricing, stock guidance, and lifecycle timing so sales and inventory screens stay consistent.
            </Text>
          </View>
        </StitchCard>

        <View style={styles.formCard}>
          <StitchSectionHeader
            title="Basic Details"
            subtitle="Set the catalog identity, category, and pricing for this plant type."
          />
          <View style={styles.inputContainer}>
            <View style={styles.inputLabel}>
              <MaterialIcons name="label" size={18} color={AdminTheme.colors.text} />
              <Text style={styles.inputLabelText}>Plant Type Name *</Text>
            </View>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="e.g. Basil"
              placeholderTextColor={AdminTheme.colors.textSoft}
              style={styles.input}
            />
          </View>

          <View style={styles.inputContainer}>
            <View style={styles.inputLabel}>
              <MaterialIcons name="category" size={18} color={AdminTheme.colors.text} />
              <Text style={styles.inputLabelText}>Category *</Text>
            </View>
            <Pressable
              onPress={() => setCategoryOpen(true)}
              style={({ pressed }) => [
                styles.selector,
                pressed && styles.selectorPressed,
              ]}
            >
              <Text
                style={[
                  styles.selectorText,
                  !category && styles.selectorPlaceholder,
                ]}
              >
                {category || "Select category"}
              </Text>
              <MaterialIcons
                name="keyboard-arrow-down"
                size={20}
                color={AdminTheme.colors.textMuted}
              />
            </Pressable>
          </View>

          <View style={styles.inputContainer}>
            <View style={styles.inputLabel}>
              <MaterialIcons name="spa" size={18} color={AdminTheme.colors.text} />
              <Text style={styles.inputLabelText}>Variety (Optional)</Text>
            </View>
            <TextInput
              value={variety}
              onChangeText={setVariety}
              placeholder="e.g. Cherry Tomato"
              placeholderTextColor={AdminTheme.colors.textSoft}
              style={[styles.input, variety.trim() && parsedVariety === null && styles.inputError]}
              maxLength={50}
            />
            {variety.trim() && parsedVariety === null && (
              <Text style={styles.validationText}>
                Use 2-50 chars with letters, numbers, spaces, or - &apos; / ( ) . , &
              </Text>
            )}
          </View>

          <View style={styles.inputContainer}>
            <View style={styles.inputLabel}>
              <MaterialIcons name="schedule" size={18} color={AdminTheme.colors.text} />
              <Text style={styles.inputLabelText}>Lifecycle Days</Text>
            </View>
            <TextInput
              value={lifecycleDays}
              onChangeText={setLifecycleDays}
              placeholder="e.g. 45"
              placeholderTextColor={AdminTheme.colors.textSoft}
              keyboardType="numeric"
              style={styles.input}
            />
          </View>

          <View style={styles.inputContainer}>
            <View style={styles.inputLabel}>
              <MaterialIcons name="attach-money" size={18} color={AdminTheme.colors.text} />
              <Text style={styles.inputLabelText}>Selling Price *</Text>
            </View>
            <TextInput
              value={sellingPrice}
              onChangeText={setSellingPrice}
              placeholder="e.g. 120"
              placeholderTextColor={AdminTheme.colors.textSoft}
              keyboardType="numeric"
              style={styles.input}
            />
          </View>

          <View style={styles.inputContainer}>
            <View style={styles.inputLabel}>
              <MaterialIcons name="warning" size={18} color={AdminTheme.colors.text} />
              <Text style={styles.inputLabelText}>Min Stock Level</Text>
            </View>
            <TextInput
              value={minStockLevel}
              onChangeText={setMinStockLevel}
              placeholder="e.g. 20"
              placeholderTextColor={AdminTheme.colors.textSoft}
              keyboardType="numeric"
              style={styles.input}
            />
          </View>

          <View style={styles.inputContainer}>
            <View style={styles.inputLabel}>
              <MaterialIcons name="paid" size={18} color={AdminTheme.colors.text} />
              <Text style={styles.inputLabelText}>Default Cost Price</Text>
            </View>
            <TextInput
              value={defaultCostPrice}
              onChangeText={setDefaultCostPrice}
              placeholder="e.g. 60"
              placeholderTextColor={AdminTheme.colors.textSoft}
              keyboardType="numeric"
              style={styles.input}
            />
          </View>

          <View style={styles.inputContainer}>
            <StitchSectionHeader
              title="Seed Planning"
              subtitle="Capture expected sowing quantity and unit for a standard batch."
            />
            <View style={styles.inputLabel}>
              <MaterialIcons name="grain" size={18} color={AdminTheme.colors.text} />
              <Text style={styles.inputLabelText}>Expected Seed Qty / Batch</Text>
            </View>
            <TextInput
              value={expectedSeedQtyPerBatch}
              onChangeText={setExpectedSeedQtyPerBatch}
              placeholder="e.g. 200"
              placeholderTextColor={AdminTheme.colors.textSoft}
              keyboardType="numeric"
              style={styles.input}
            />
            <TextInput
              value={expectedSeedUnit}
              onChangeText={setExpectedSeedUnit}
              placeholder="Unit (e.g. grams, seeds)"
              placeholderTextColor={AdminTheme.colors.textSoft}
              style={[styles.input, { marginTop: 8 }]}
            />
            {seedSowingGuidance ? (
              <Text style={styles.guidanceText}>{seedSowingGuidance}</Text>
            ) : (
              <Text style={styles.hintText}>
                Add expected seed quantity so staff and customers know sowing requirement per batch.
              </Text>
            )}
          </View>

          <View style={styles.inputContainer}>
            <StitchSectionHeader
              title="Growth Stages"
              subtitle="Map stage day ranges to support a cleaner lifecycle view across the app."
            />
            <View style={styles.inputLabel}>
              <MaterialIcons name="timeline" size={18} color={AdminTheme.colors.text} />
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
                        <MaterialIcons name="event" size={15} color={AdminTheme.colors.primary} />
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
                          <MaterialIcons name="remove" size={14} color={AdminTheme.colors.textMuted} />
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
                          <MaterialIcons name="add" size={14} color={AdminTheme.colors.textMuted} />
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
                        <MaterialIcons name="event" size={15} color={AdminTheme.colors.primary} />
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
                          <MaterialIcons name="remove" size={14} color={AdminTheme.colors.textMuted} />
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
                          <MaterialIcons name="add" size={14} color={AdminTheme.colors.textMuted} />
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
              onPress={handleCreate}
              style={[
                styles.createButton,
                !isFormValid && styles.createButtonDisabled,
              ]}
            >
              <View
                style={[
                  styles.createGradient,
                  {
                    backgroundColor: !isFormValid
                      ? AdminTheme.colors.border
                      : AdminTheme.colors.primary,
                  },
                ]}
              >
                <MaterialIcons name="check" size={20} color={AdminTheme.colors.surface} />
                <Text style={styles.createButtonText}>
                  {isSubmitting ? "Creating..." : "Create Plant Type"}
                </Text>
              </View>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      <Modal transparent visible={categoryOpen} animationType="slide">
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setCategoryOpen(false)}
        >
          <Pressable style={styles.sheet} onPress={() => null}>
            <Text style={styles.sheetTitle}>Select Category</Text>
            {CATEGORY_OPTIONS.map((option) => (
              <Pressable
                key={option}
                onPress={() => {
                  setCategory(option);
                  setCategoryOpen(false);
                }}
                style={styles.sheetOption}
              >
                <Text style={styles.sheetOptionText}>{option}</Text>
                {category === option && (
                  <MaterialIcons
                    name="check"
                    size={18}
                    color={AdminTheme.colors.primary}
                  />
                )}
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>

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
    backgroundColor: AdminTheme.colors.background,
  },
  headerGradient: {
    paddingTop: AdminTheme.spacing.sm,
    paddingBottom: AdminTheme.spacing.lg,
    paddingHorizontal: AdminTheme.spacing.lg,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: AdminTheme.spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: AdminTheme.colors.surface + "20",
    justifyContent: "center" as const,
    alignItems: "center" as const,
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
    color: AdminTheme.colors.surface,
  },
  subtitle: {
    fontSize: 13,
    color: AdminTheme.colors.surface,
    opacity: 0.9,
  },
  hintText: {
    marginTop: 6,
    color: AdminTheme.colors.textMuted,
    fontSize: 12,
    lineHeight: 16,
  },
  guidanceText: {
    marginTop: 6,
    color: AdminTheme.colors.success,
    fontSize: 12,
    fontWeight: "600" as const,
    lineHeight: 16,
  },
  scrollContent: {
    padding: AdminTheme.spacing.lg,
    paddingBottom: 100,
    gap: AdminTheme.spacing.lg,
  },
  heroCard: {
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
    gap: AdminTheme.spacing.md,
  },
  heroIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: AdminTheme.colors.surfaceMuted,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  heroContent: {
    flex: 1,
  },
  heroTitle: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: AdminTheme.colors.text,
  },
  heroSubtitle: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 19,
    color: AdminTheme.colors.textMuted,
  },
  formCard: {
    
    borderRadius: Spacing.lg,
    backgroundColor: AdminTheme.colors.surface,
    padding: AdminTheme.spacing.lg,
  },
  inputContainer: {
    marginBottom: AdminTheme.spacing.md,
  },
  inputLabel: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: AdminTheme.spacing.xs,
    marginBottom: AdminTheme.spacing.xs,
  },
  inputLabelText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: AdminTheme.colors.text,
  },
  input: {
    borderWidth: 1,
    borderColor: AdminTheme.colors.border,
    borderRadius: 10,
    paddingHorizontal: AdminTheme.spacing.md,
    paddingVertical: AdminTheme.spacing.sm,
    fontSize: 15,
    color: AdminTheme.colors.text,
    backgroundColor: AdminTheme.colors.background,
  },
  inputError: {
    borderColor: AdminTheme.colors.danger,
  },
  selector: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    borderWidth: 1,
    borderColor: AdminTheme.colors.border,
    borderRadius: 10,
    paddingHorizontal: AdminTheme.spacing.md,
    paddingVertical: AdminTheme.spacing.sm,
    backgroundColor: AdminTheme.colors.background,
  },
  selectorPressed: {
    backgroundColor: AdminTheme.colors.surface,
  },
  selectorDisabled: {
    opacity: 0.6,
  },
  selectorText: {
    fontSize: 15,
    color: AdminTheme.colors.text,
    fontWeight: "500" as const,
  },
  selectorPlaceholder: {
    color: AdminTheme.colors.textSoft,
    fontWeight: "400" as const,
  },
  validationText: {
    marginTop: AdminTheme.spacing.xs,
    fontSize: 12,
    color: AdminTheme.colors.danger,
  },
  growthStageHint: {
    fontSize: 12,
    color: AdminTheme.colors.textMuted,
    marginBottom: AdminTheme.spacing.xs,
  },
  growthStagesCard: {
    borderWidth: 1,
    borderColor: AdminTheme.colors.border,
    borderRadius: 10,
    backgroundColor: AdminTheme.colors.background,
    padding: AdminTheme.spacing.sm,
    gap: AdminTheme.spacing.sm,
  },
  growthStageRow: {
    gap: AdminTheme.spacing.xs,
  },
  growthStageName: {
    fontSize: 13,
    color: AdminTheme.colors.textMuted,
    fontWeight: "700" as const,
    letterSpacing: 0.5,
  },
  growthStageInputs: {
    flexDirection: "row" as const,
    gap: AdminTheme.spacing.sm,
  },
  growthStageFieldGroup: {
    flex: 1,
    gap: 6,
  },
  growthStageFieldLabel: {
    fontSize: 11,
    color: AdminTheme.colors.textSoft,
    fontWeight: "600" as const,
  },
  growthStageDayButton: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    borderWidth: 1,
    borderColor: AdminTheme.colors.border,
    borderRadius: 10,
    paddingHorizontal: AdminTheme.spacing.sm,
    paddingVertical: AdminTheme.spacing.sm,
    backgroundColor: AdminTheme.colors.surface,
  },
  growthStageDayButtonText: {
    fontSize: 14,
    color: AdminTheme.colors.text,
    fontWeight: "600" as const,
  },
  growthStageDayButtonPlaceholder: {
    color: AdminTheme.colors.textSoft,
    fontWeight: "400" as const,
  },
  growthStageAdjustRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    gap: AdminTheme.spacing.xs,
  },
  growthStageAdjustButton: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: AdminTheme.colors.border,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: AdminTheme.colors.surface,
  },
  growthStageClearButton: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: AdminTheme.colors.borderSoft,
    paddingVertical: 5,
    alignItems: "center" as const,
    backgroundColor: AdminTheme.colors.surface,
  },
  growthStageClearButtonText: {
    fontSize: 11,
    color: AdminTheme.colors.textMuted,
    fontWeight: "600" as const,
  },
  actionsContainer: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: AdminTheme.spacing.md,
    marginTop: AdminTheme.spacing.md,
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: AdminTheme.spacing.lg,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: AdminTheme.colors.border,
  },
  cancelButtonText: {
    color: AdminTheme.colors.textMuted,
    fontWeight: "600" as const,
  },
  createButton: {
    flex: 1,
    borderRadius: 22,
    overflow: "hidden" as const,
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  createGradient: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingVertical: 12,
    gap: AdminTheme.spacing.xs,
  },
  createButtonText: {
    color: AdminTheme.colors.surface,
    fontSize: 15,
    fontWeight: "600" as const,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end" as const,
  },
  sheet: {
    backgroundColor: AdminTheme.colors.surface,
    padding: AdminTheme.spacing.lg,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "70%" as const,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: AdminTheme.colors.text,
    marginBottom: AdminTheme.spacing.xs,
  },
  sheetSubTitle: {
    fontSize: 13,
    color: AdminTheme.colors.textMuted,
    marginBottom: AdminTheme.spacing.sm,
  },
  sheetOption: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    paddingVertical: AdminTheme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: AdminTheme.colors.borderSoft,
  },
  sheetOptionText: {
    fontSize: 15,
    color: AdminTheme.colors.text,
  },
  sheetEmpty: {
    color: AdminTheme.colors.textMuted,
    fontSize: 14,
    paddingVertical: AdminTheme.spacing.sm,
  },
  quickDayRow: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: AdminTheme.spacing.xs,
    marginBottom: AdminTheme.spacing.sm,
  },
  quickDayChip: {
    borderWidth: 1,
    borderColor: AdminTheme.colors.border,
    borderRadius: 999,
    paddingHorizontal: AdminTheme.spacing.sm,
    paddingVertical: 6,
    backgroundColor: AdminTheme.colors.surface,
  },
  quickDayChipSelected: {
    borderColor: AdminTheme.colors.primary,
    backgroundColor: AdminTheme.colors.primary + "12",
  },
  quickDayChipText: {
    fontSize: 12,
    color: AdminTheme.colors.textMuted,
    fontWeight: "600" as const,
  },
  quickDayChipTextSelected: {
    color: AdminTheme.colors.primary,
  },
  dayGridScroll: {
    maxHeight: 300,
  },
  dayGrid: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: AdminTheme.spacing.xs,
    paddingBottom: AdminTheme.spacing.sm,
  },
  dayCell: {
    width: 40,
    height: 36,
    borderWidth: 1,
    borderColor: AdminTheme.colors.border,
    borderRadius: 8,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: AdminTheme.colors.surface,
  },
  dayCellSelected: {
    borderColor: AdminTheme.colors.primary,
    backgroundColor: AdminTheme.colors.primary + "15",
  },
  dayCellText: {
    fontSize: 12,
    color: AdminTheme.colors.textMuted,
    fontWeight: "600" as const,
  },
  dayCellTextSelected: {
    color: AdminTheme.colors.primary,
  },
};
