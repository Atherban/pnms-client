import { MaterialIcons } from "@expo/vector-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
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
import { PlantTypeService } from "../../../services/plant-type.service";
import { Colors, Spacing } from "../../../theme";
import { formatErrorMessage } from "../../../utils/error";

const priceRegex = /^\d+(\.\d{1,2})?$/;

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
  const [growthStages, setGrowthStages] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [varietyOpen, setVarietyOpen] = useState(false);

  const CATEGORY_OPTIONS = ["VEGETABLE", "FLOWER", "FRUIT", "HERB"];

  const VARIETY_OPTIONS: Record<string, string[]> = {
    VEGETABLE: ["Tomato", "Cucumber", "Spinach", "Carrot", "Okra"],
    FLOWER: ["Rose", "Lily", "Marigold", "Jasmine", "Sunflower"],
    FRUIT: ["Mango", "Apple", "Banana", "Papaya", "Guava"],
    HERB: ["Basil", "Mint", "Coriander", "Parsley", "Thyme"],
  };

  const availableVarieties =
    category && VARIETY_OPTIONS[category] ? VARIETY_OPTIONS[category] : [];

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

  const parsedGrowthStages = useMemo(
    () =>
      growthStages
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean),
    [growthStages],
  );

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

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsSubmitting(true);

    mutation.mutate({
      name: name.trim(),
      category: category.trim(),
      variety: variety.trim() || undefined,
      lifecycleDays: parsedLifecycleDays ?? undefined,
      sellingPrice: parsedPrice,
      minStockLevel: parsedMinStockLevel ?? undefined,
      defaultCostPrice: parsedDefaultCostPrice ?? undefined,
      growthStages: parsedGrowthStages.length > 0 ? parsedGrowthStages : undefined,
    });
  };

  const isFormValid =
    name.trim() &&
    category.trim() &&
    parsedPrice !== null &&
    (!lifecycleDays.trim() || parsedLifecycleDays !== null) &&
    (!minStockLevel.trim() || parsedMinStockLevel !== null) &&
    (!defaultCostPrice.trim() || parsedDefaultCostPrice !== null) &&
    !isSubmitting;

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={[Colors.primary, Colors.primaryLight || Colors.primary]}
        style={styles.headerGradient}
      >
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={20} color={Colors.white} />
        </Pressable>

        <View style={styles.headerText}>
          <Text style={styles.title}>Add Plant Type</Text>
          <Text style={styles.subtitle}>Create a new plant type</Text>
        </View>
        <View style={styles.headerSpacer} />
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
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
              placeholder="e.g. Basil"
              placeholderTextColor={Colors.textTertiary}
              style={styles.input}
            />
          </View>

          <View style={styles.inputContainer}>
            <View style={styles.inputLabel}>
              <MaterialIcons name="category" size={18} color={Colors.text} />
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
                color={Colors.textSecondary}
              />
            </Pressable>
          </View>

          <View style={styles.inputContainer}>
            <View style={styles.inputLabel}>
              <MaterialIcons name="spa" size={18} color={Colors.text} />
              <Text style={styles.inputLabelText}>Variety (Optional)</Text>
            </View>
            <Pressable
              onPress={() => setVarietyOpen(true)}
              disabled={!category}
              style={({ pressed }) => [
                styles.selector,
                !category && styles.selectorDisabled,
                pressed && styles.selectorPressed,
              ]}
            >
              <Text
                style={[
                  styles.selectorText,
                  !variety && styles.selectorPlaceholder,
                ]}
              >
                {variety || (category ? "Select variety" : "Select category")}
              </Text>
              <MaterialIcons
                name="keyboard-arrow-down"
                size={20}
                color={Colors.textSecondary}
              />
            </Pressable>
          </View>

          <View style={styles.inputContainer}>
            <View style={styles.inputLabel}>
              <MaterialIcons name="schedule" size={18} color={Colors.text} />
              <Text style={styles.inputLabelText}>Lifecycle Days</Text>
            </View>
            <TextInput
              value={lifecycleDays}
              onChangeText={setLifecycleDays}
              placeholder="e.g. 45"
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
              placeholder="e.g. 120"
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
              placeholder="e.g. 20"
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
              placeholder="e.g. 60"
              placeholderTextColor={Colors.textTertiary}
              keyboardType="numeric"
              style={styles.input}
            />
          </View>

          <View style={styles.inputContainer}>
            <View style={styles.inputLabel}>
              <MaterialIcons name="timeline" size={18} color={Colors.text} />
              <Text style={styles.inputLabelText}>Growth Stages (comma separated)</Text>
            </View>
            <TextInput
              value={growthStages}
              onChangeText={setGrowthStages}
              placeholder="Seedling, Vegetative, Flowering"
              placeholderTextColor={Colors.textTertiary}
              style={styles.input}
            />
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
              <LinearGradient
                colors={[Colors.success, Colors.primary]}
                style={styles.createGradient}
              >
                <MaterialIcons name="check" size={20} color={Colors.white} />
                <Text style={styles.createButtonText}>
                  {isSubmitting ? "Creating..." : "Create Plant Type"}
                </Text>
              </LinearGradient>
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
                  setVariety("");
                  setCategoryOpen(false);
                }}
                style={styles.sheetOption}
              >
                <Text style={styles.sheetOptionText}>{option}</Text>
                {category === option && (
                  <MaterialIcons
                    name="check"
                    size={18}
                    color={Colors.primary}
                  />
                )}
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal transparent visible={varietyOpen} animationType="slide">
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setVarietyOpen(false)}
        >
          <Pressable style={styles.sheet} onPress={() => null}>
            <Text style={styles.sheetTitle}>Select Variety</Text>
            {availableVarieties.length === 0 ? (
              <Text style={styles.sheetEmpty}>
                No varieties available for this category.
              </Text>
            ) : (
              availableVarieties.map((option) => (
                <Pressable
                  key={option}
                  onPress={() => {
                    setVariety(option);
                    setVarietyOpen(false);
                  }}
                  style={styles.sheetOption}
                >
                  <Text style={styles.sheetOptionText}>{option}</Text>
                  {variety === option && (
                    <MaterialIcons
                      name="check"
                      size={18}
                      color={Colors.primary}
                    />
                  )}
                </Pressable>
              ))
            )}
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
  selector: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.background,
  },
  selectorPressed: {
    backgroundColor: Colors.surface,
  },
  selectorDisabled: {
    opacity: 0.6,
  },
  selectorText: {
    fontSize: 15,
    color: Colors.text,
    fontWeight: "500" as const,
  },
  selectorPlaceholder: {
    color: Colors.textTertiary,
    fontWeight: "400" as const,
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
  createButton: {
    flex: 1,
    borderRadius: 10,
    overflow: "hidden" as const,
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  createGradient: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingVertical: Spacing.sm,
    gap: Spacing.xs,
  },
  createButtonText: {
    color: Colors.white,
    fontSize: 15,
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
    marginBottom: Spacing.md,
  },
  sheetOption: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  sheetOptionText: {
    fontSize: 15,
    color: Colors.text,
  },
  sheetEmpty: {
    color: Colors.textSecondary,
    fontSize: 14,
    paddingVertical: Spacing.sm,
  },
};
