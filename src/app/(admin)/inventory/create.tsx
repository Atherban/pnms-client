import { MaterialIcons } from "@expo/vector-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { InventoryService } from "../../../services/inventory.service";
import { PlantTypeService } from "../../../services/plant-type.service";
import { Colors, Spacing } from "../../../theme";

const BOTTOM_NAV_HEIGHT = 80;

const priceRegex = /^\d+(\.\d{1,2})?$/;

const formatCurrency = (amount: number | null) => {
  if (!amount || isNaN(amount)) return "₹0";
  return `₹${amount.toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
};

export default function CreatePlantType() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [variety, setVariety] = useState("");
  const [lifecycleDays, setLifecycleDays] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const parsedLifecycleDays = useMemo(() => {
    if (!lifecycleDays.trim()) return null;
    const value = Number(lifecycleDays);
    if (!Number.isInteger(value) || value <= 0) return null;
    return value;
  }, [lifecycleDays]);

  const parsedSellingPrice = useMemo(() => {
    if (!sellingPrice.trim()) return null;
    if (!priceRegex.test(sellingPrice.trim())) return null;
    const value = Number(sellingPrice);
    if (isNaN(value) || value <= 0) return null;
    return value;
  }, [sellingPrice]);

  const mutation = useMutation({
    mutationFn: PlantTypeService.create,
    onSuccess: async (created: any) => {
      try {
        const plantTypeId =
          created?._id || created?.id || created?.data?._id || created?.data?.id;
        if (plantTypeId) {
          await InventoryService.create({ plantType: plantTypeId, quantity: 0 });
          queryClient.invalidateQueries({ queryKey: ["inventory"] });
        }
      } catch (err: any) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert(
          "Warning",
          err?.message ||
            "Plant type created, but inventory record could not be created.",
        );
      } finally {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        queryClient.invalidateQueries({ queryKey: ["plant-types"] });
        Alert.alert("Success", "Plant type created successfully", [
          {
            text: "OK",
            onPress: () => router.replace("/(admin)/inventory"),
          },
        ]);
      }
    },
    onError: (err: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Error", err?.message || "Failed to create plant type");
      setIsSubmitting(false);
    },
    onSettled: () => {
      setIsSubmitting(false);
    },
  });

  const handleCreate = () => {
    if (!name.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert("Validation Error", "Plant name is required");
      return;
    }
    if (!category.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert("Validation Error", "Category is required");
      return;
    }
    if (!sellingPrice.trim() || parsedSellingPrice === null) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert(
        "Validation Error",
        "Selling price is required and must be a positive number (up to 2 decimals)",
      );
      return;
    }
    if (lifecycleDays.trim() && parsedLifecycleDays === null) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert(
        "Validation Error",
        "Lifecycle days must be a positive whole number",
      );
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsSubmitting(true);

    const payload: {
      name: string;
      category: string;
      variety?: string;
      lifecycleDays?: number;
      sellingPrice: number;
    } = {
      name: name.trim(),
      category: category.trim(),
      sellingPrice: parsedSellingPrice,
    };

    if (variety.trim()) payload.variety = variety.trim();
    if (parsedLifecycleDays !== null) payload.lifecycleDays = parsedLifecycleDays;

    mutation.mutate(payload);
  };

  const isFormValid = () =>
    name.trim() &&
    category.trim() &&
    parsedSellingPrice !== null &&
    (!lifecycleDays.trim() || parsedLifecycleDays !== null) &&
    !isSubmitting;

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={[Colors.primary, Colors.primaryLight || Colors.primary]}
        style={styles.headerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
          style={({ pressed }) => [
            styles.backButton,
            pressed && styles.backButtonPressed,
          ]}
        >
          <MaterialIcons name="arrow-back" size={20} color={Colors.white} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.title}>Add Plant Type</Text>
          <Text style={styles.subtitle}>Create a new inventory plant type</Text>
        </View>
        <View style={styles.headerSpacer} />
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.formCard}>
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="spa" size={22} color={Colors.text} />
              <Text style={styles.sectionTitle}>Plant Information</Text>
            </View>
            <Text style={styles.sectionDescription}>
              Provide the details for the plant type. Fields marked with * are
              required.
            </Text>

            <View style={styles.inputContainer}>
              <View style={styles.inputLabel}>
                <MaterialIcons name="label" size={18} color={Colors.text} />
                <Text style={styles.inputLabelText}>Name *</Text>
              </View>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Enter plant name"
                placeholderTextColor={Colors.textTertiary}
                style={[
                  styles.input,
                  name.trim() ? styles.inputSuccess : undefined,
                ]}
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
                placeholder="e.g. Vegetable, Flower"
                placeholderTextColor={Colors.textTertiary}
                autoCapitalize="words"
                style={[
                  styles.input,
                  category.trim() ? styles.inputSuccess : undefined,
                ]}
              />
            </View>

            <View style={styles.inputContainer}>
              <View style={styles.inputLabel}>
                <MaterialIcons name="tune" size={18} color={Colors.text} />
                <Text style={styles.inputLabelText}>Variety</Text>
              </View>
              <TextInput
                value={variety}
                onChangeText={setVariety}
                placeholder="Optional variety"
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
                placeholder="Optional number of days"
                placeholderTextColor={Colors.textTertiary}
                keyboardType="numeric"
                style={[
                  styles.input,
                  lifecycleDays.trim() && parsedLifecycleDays === null
                    ? styles.inputError
                    : lifecycleDays.trim()
                      ? styles.inputSuccess
                      : undefined,
                ]}
              />
              {lifecycleDays.trim() && parsedLifecycleDays === null && (
                <View style={styles.validationError}>
                  <MaterialIcons
                    name="error-outline"
                    size={16}
                    color={Colors.error}
                  />
                  <Text style={styles.validationText}>
                    Enter a positive whole number
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.inputContainer}>
              <View style={styles.inputLabel}>
                <MaterialIcons name="currency-rupee" size={18} color={Colors.text} />
                <Text style={styles.inputLabelText}>Selling Price *</Text>
              </View>
              <TextInput
                value={sellingPrice}
                onChangeText={setSellingPrice}
                placeholder="e.g. 120.50"
                placeholderTextColor={Colors.textTertiary}
                keyboardType="decimal-pad"
                style={[
                  styles.input,
                  sellingPrice.trim() && parsedSellingPrice === null
                    ? styles.inputError
                    : sellingPrice.trim()
                      ? styles.inputSuccess
                      : undefined,
                ]}
              />
              {sellingPrice.trim() && parsedSellingPrice === null && (
                <View style={styles.validationError}>
                  <MaterialIcons
                    name="error-outline"
                    size={16}
                    color={Colors.error}
                  />
                  <Text style={styles.validationText}>
                    Use a positive amount with up to 2 decimals
                  </Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.previewCard}>
            <View style={styles.previewHeader}>
              <MaterialIcons name="visibility" size={18} color={Colors.text} />
              <Text style={styles.previewTitle}>Summary</Text>
            </View>
            <View style={styles.previewContent}>
              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>Name</Text>
                <Text style={styles.previewValue}>
                  {name.trim() || "-"}
                </Text>
              </View>
              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>Category</Text>
                <Text style={styles.previewValue}>
                  {category.trim() || "-"}
                </Text>
              </View>
              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>Variety</Text>
                <Text style={styles.previewValue}>
                  {variety.trim() || "-"}
                </Text>
              </View>
              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>Lifecycle</Text>
                <Text
                  style={[
                    styles.previewValue,
                    lifecycleDays.trim() && parsedLifecycleDays === null
                      ? styles.previewValueError
                      : undefined,
                  ]}
                >
                  {lifecycleDays.trim()
                    ? parsedLifecycleDays ?? "Invalid"
                    : "-"}
                </Text>
              </View>
              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>Selling Price</Text>
                <Text
                  style={[
                    styles.previewValue,
                    sellingPrice.trim() && parsedSellingPrice === null
                      ? styles.previewValueError
                      : styles.previewValueSuccess,
                  ]}
                >
                  {parsedSellingPrice ? formatCurrency(parsedSellingPrice) : "-"}
                </Text>
              </View>
            </View>
          </View>

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
              <MaterialIcons name="close" size={18} color={Colors.textSecondary} />
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>

            <Pressable
              onPress={handleCreate}
              disabled={!isFormValid()}
              style={({ pressed }) => [
                styles.createButton,
                !isFormValid() && styles.createButtonDisabled,
                pressed && isFormValid() && styles.createButtonPressed,
                isSubmitting && styles.createButtonLoading,
              ]}
            >
              <LinearGradient
                colors={[Colors.success, Colors.primary]}
                style={styles.createGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <MaterialIcons name="check" size={20} color={Colors.white} />
                <Text style={styles.createButtonText}>
                  {isSubmitting ? "Creating..." : "Create Plant Type"}
                </Text>
              </LinearGradient>
            </Pressable>
          </View>

          <Text style={styles.hintText}>
            Tip: Use consistent category names to keep inventory organized.
          </Text>
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
  title: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: Colors.white,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.white,
    opacity: 0.9,
    marginTop: 2,
  },
  headerSpacer: {
    width: 44,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: BOTTOM_NAV_HEIGHT + Spacing.lg,
  },
  formCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
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
  previewCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  previewHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: Colors.text,
  },
  previewContent: {
    gap: Spacing.sm,
  },
  previewRow: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
  },
  previewLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: "500" as const,
    flex: 1,
  },
  previewValue: {
    fontSize: 13,
    color: Colors.text,
    fontWeight: "600" as const,
    textAlign: "right" as const,
    flex: 1,
  },
  previewValueError: {
    color: Colors.error,
  },
  previewValueSuccess: {
    color: Colors.success,
  },
  actionsContainer: {
    flexDirection: "row" as const,
    gap: Spacing.md,
    marginBottom: Spacing.md,
    alignItems: "center" as const,
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
  createButton: {
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
  createButtonDisabled: {
    shadowOpacity: 0,
    elevation: 0,
    opacity: 0.6,
  },
  createButtonPressed: {
    transform: [{ scale: 0.98 }],
  },
  createButtonLoading: {
    opacity: 0.9,
  },
  createGradient: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    padding: Spacing.lg,
    gap: Spacing.sm,
    flex: 1,
    minHeight: 56,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: Colors.white,
  },
  hintText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center" as const,
    fontStyle: "italic" as const,
  },
};
