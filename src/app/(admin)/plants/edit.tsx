import { MaterialIcons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
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
import StitchHeader from "../../../components/common/StitchHeader";
import { AdminTheme } from "../../../components/admin/theme";
import { PlantTypeService } from "../../../services/plant-type.service";
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
  const [expectedSeedQtyPerBatch, setExpectedSeedQtyPerBatch] = useState("");
  const [expectedSeedUnit, setExpectedSeedUnit] = useState("");
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
    setExpectedSeedQtyPerBatch(
      plantType.expectedSeedQtyPerBatch
        ? String(plantType.expectedSeedQtyPerBatch)
        : "",
    );
    setExpectedSeedUnit(plantType.expectedSeedUnit ?? "");
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
      expectedSeedQtyPerBatch: parsedExpectedSeedQtyPerBatch ?? undefined,
      expectedSeedUnit: expectedSeedUnit.trim() || undefined,
      growthStages: parsedGrowthStages,
    });
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={["left", "right"]}>
        <StitchHeader
          title="Edit Plant Type"
          subtitle="Loading plant type details..."
          onBackPress={() => router.back()}
        />

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={AdminTheme.colors.primary} />
          <Text style={styles.loadingText}>Loading plant type data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !plantType) {
    return (
      <SafeAreaView style={styles.container} edges={["left", "right"]}>
        <StitchHeader
          title="Edit Plant Type"
          subtitle="Unable to load data"
          onBackPress={() => router.back()}
        />

        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={64} color={AdminTheme.colors.danger} />
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
      <StitchHeader
        title="Edit Plant Type"
        subtitle="Update plant type details"
        onBackPress={() => router.back()}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.formCard}>
          <View style={styles.inputContainer}>
            <View style={styles.inputLabel}>
              <MaterialIcons name="label" size={18} color={AdminTheme.colors.text} />
              <Text style={styles.inputLabelText}>Plant Type Name *</Text>
            </View>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Edit plant type name"
              placeholderTextColor={AdminTheme.colors.textSoft}
              style={styles.input}
            />
          </View>

          <View style={styles.inputContainer}>
            <View style={styles.inputLabel}>
              <MaterialIcons name="category" size={18} color={AdminTheme.colors.text} />
              <Text style={styles.inputLabelText}>Category *</Text>
            </View>
            <TextInput
              value={category}
              onChangeText={setCategory}
              placeholder="Edit category"
              placeholderTextColor={AdminTheme.colors.textSoft}
              autoCapitalize="characters"
              style={styles.input}
            />
          </View>

          <View style={styles.inputContainer}>
            <View style={styles.inputLabel}>
              <MaterialIcons name="spa" size={18} color={AdminTheme.colors.text} />
              <Text style={styles.inputLabelText}>Variety</Text>
            </View>
            <TextInput
              value={variety}
              onChangeText={setVariety}
              placeholder="Edit variety"
              placeholderTextColor={AdminTheme.colors.textSoft}
              style={styles.input}
            />
          </View>

          <View style={styles.inputContainer}>
            <View style={styles.inputLabel}>
              <MaterialIcons name="schedule" size={18} color={AdminTheme.colors.text} />
              <Text style={styles.inputLabelText}>Lifecycle Days</Text>
            </View>
            <TextInput
              value={lifecycleDays}
              onChangeText={setLifecycleDays}
              placeholder="Edit lifecycle days"
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
              placeholder="Edit selling price"
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
              placeholder="Edit min stock level"
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
              placeholder="Edit default cost price"
              placeholderTextColor={AdminTheme.colors.textSoft}
              keyboardType="numeric"
              style={styles.input}
            />
          </View>

          <View style={styles.inputContainer}>
            <View style={styles.inputLabel}>
              <MaterialIcons name="grain" size={18} color={AdminTheme.colors.text} />
              <Text style={styles.inputLabelText}>Expected Seed Qty / Batch</Text>
            </View>
            <TextInput
              value={expectedSeedQtyPerBatch}
              onChangeText={setExpectedSeedQtyPerBatch}
              placeholder="Edit expected seed quantity"
              placeholderTextColor={AdminTheme.colors.textSoft}
              keyboardType="numeric"
              style={styles.input}
            />
            <TextInput
              value={expectedSeedUnit}
              onChangeText={setExpectedSeedUnit}
              placeholder="Edit expected seed unit"
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
              onPress={handleSave}
              style={[
                styles.saveButton,
                !isFormValid && styles.saveButtonDisabled,
              ]}
            >
              <View
                style={[
                  styles.saveGradient,
                  {
                    backgroundColor: !isFormValid
                      ? AdminTheme.colors.border
                      : AdminTheme.colors.primary,
                  },
                ]}
              >
                <MaterialIcons name="check" size={20} color={AdminTheme.colors.surface} />
                <Text style={styles.saveButtonText}>
                  {mutation.isPending ? "Saving..." : "Save Changes"}
                </Text>
              </View>
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
  backButtonPressed: {
    backgroundColor: AdminTheme.colors.surface + "35",
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
    color: AdminTheme.colors.surface,
  },
  subtitle: {
    fontSize: 13,
    color: AdminTheme.colors.surface,
    opacity: 0.9,
  },
  scrollContent: {
    padding: AdminTheme.spacing.lg,
    paddingBottom: 100,
  },
  formCard: {
    backgroundColor: AdminTheme.colors.surface,
    borderRadius: 16,
    padding: AdminTheme.spacing.lg,
    borderWidth: 1,
    borderColor: AdminTheme.colors.borderLight,
    shadowColor: AdminTheme.colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
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
  validationText: {
    marginTop: AdminTheme.spacing.xs,
    fontSize: 12,
    color: AdminTheme.colors.danger,
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
    borderColor: AdminTheme.colors.borderLight,
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
  saveButton: {
    flex: 1,
    borderRadius: 22,
    overflow: "hidden" as const,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveGradient: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingVertical: 12,
    gap: AdminTheme.spacing.xs,
  },
  saveButtonText: {
    color: AdminTheme.colors.surface,
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
    marginTop: AdminTheme.spacing.md,
    fontSize: 16,
    color: AdminTheme.colors.textMuted,
    fontWeight: "500" as const,
  },
  errorContainer: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    padding: AdminTheme.spacing.xl,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: AdminTheme.colors.text,
    marginTop: AdminTheme.spacing.md,
  },
  errorMessage: {
    fontSize: 14,
    color: AdminTheme.colors.textMuted,
    textAlign: "center" as const,
    marginTop: AdminTheme.spacing.sm,
    marginBottom: AdminTheme.spacing.lg,
  },
  retryButton: {
    backgroundColor: AdminTheme.colors.primary,
    paddingHorizontal: AdminTheme.spacing.lg,
    paddingVertical: AdminTheme.spacing.sm,
    borderRadius: 12,
  },
  retryButtonText: {
    color: AdminTheme.colors.surface,
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
