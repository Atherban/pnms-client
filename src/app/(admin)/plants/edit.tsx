import { MaterialIcons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
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
import { PlantTypeService } from "../../../services/plant-type.service";
import { Colors, Spacing } from "../../../theme";
import { formatErrorMessage } from "../../../utils/error";

const priceRegex = /^\d+(\.\d{1,2})?$/;

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
  const [growthStages, setGrowthStages] = useState("");

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
    setGrowthStages(Array.isArray(plantType.growthStages) ? plantType.growthStages.join(", ") : "");
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

  const parsedGrowthStages = useMemo(
    () =>
      growthStages
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean),
    [growthStages],
  );

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

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

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
    !mutation.isPending;

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
};
