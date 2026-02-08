import { MaterialIcons } from "@expo/vector-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Dimensions,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { PlantService } from "../../../services/plant.service";
import { Colors, Spacing } from "../../../theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const BOTTOM_NAV_HEIGHT = 80;

export default function UpdateQuantity() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const plantId =
    typeof params.id === "string"
      ? params.id
      : Array.isArray(params.id)
        ? params.id[0]
        : undefined;

  const router = useRouter();
  const queryClient = useQueryClient();

  const [quantity, setQuantity] = useState("");
  const [isDecrease, setIsDecrease] = useState(false);

  const mutation = useMutation({
    mutationFn: (q: number) => PlantService.updateQuantity(plantId!, q),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ["plants"] });
      queryClient.invalidateQueries({ queryKey: ["plant", plantId] });

      const action = isDecrease ? "decreased" : "increased";
      Alert.alert("Success", `Quantity ${action} successfully`, [
        {
          text: "OK",
          onPress: () => router.back(),
        },
      ]);
    },
    onError: (err: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Error", err?.message || "Failed to update quantity");
    },
  });

  const handleUpdate = () => {
    if (!plantId) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert("Validation Error", "Plant ID is missing");
      return;
    }

    const quantityValue = Number(quantity);

    if (isNaN(quantityValue)) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert("Validation Error", "Please enter a valid number");
      return;
    }

    if (quantityValue === 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert("Validation Error", "Quantity cannot be zero");
      return;
    }

    // Determine if this is a decrease (negative) or increase (positive)
    setIsDecrease(quantityValue < 0);

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    mutation.mutate(quantityValue);
  };

  const handleQuickSet = (value: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setQuantity(value.toString());
    setIsDecrease(value < 0);
  };

  const quantityValue = Number(quantity);
  const isQuantityValid = !isNaN(quantityValue) && quantityValue !== 0;
  const isPositive = quantityValue > 0;
  const isNegative = quantityValue < 0;

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
        <View style={styles.headerText}>
          <Text style={styles.title}>Update Quantity</Text>
          <Text style={styles.subtitle}>Adjust plant stock level</Text>
        </View>
        <View style={styles.headerSpacer} />
      </LinearGradient>

      {/* Scrollable Content */}
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Form Card */}
        <View style={styles.formCard}>
          {/* Quantity Update Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="inventory" size={22} color={Colors.text} />
              <Text style={styles.sectionTitle}>Stock Adjustment</Text>
            </View>
            <Text style={styles.sectionDescription}>
              Enter a positive number to increase stock, or a negative number to
              decrease stock.
            </Text>

            {/* Quantity Input Field */}
            <View style={styles.inputContainer}>
              <View style={styles.inputLabel}>
                <MaterialIcons name="numbers" size={18} color={Colors.text} />
                <Text style={styles.inputLabelText}>Adjustment Quantity *</Text>
              </View>

              <View style={styles.quantityInputWrapper}>
                <TextInput
                  value={quantity}
                  onChangeText={(text) => {
                    setQuantity(text);
                    const val = Number(text);
                    setIsDecrease(val < 0);
                  }}
                  placeholder="e.g., +10 or -5"
                  placeholderTextColor={Colors.textTertiary}
                  keyboardType="numbers-and-punctuation"
                  style={[
                    styles.input,
                    isPositive && styles.inputPositive,
                    isNegative && styles.inputNegative,
                  ]}
                />

                {/* Quick Action Buttons */}
                <View style={styles.quickActions}>
                  <Pressable
                    onPress={() => handleQuickSet(5)}
                    style={({ pressed }) => [
                      styles.quickButton,
                      styles.quickAddButton,
                      pressed && styles.quickButtonPressed,
                    ]}
                  >
                    <MaterialIcons
                      name="add"
                      size={16}
                      color={Colors.success}
                    />
                    <Text style={styles.quickButtonText}>+5</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => handleQuickSet(10)}
                    style={({ pressed }) => [
                      styles.quickButton,
                      styles.quickAddButton,
                      pressed && styles.quickButtonPressed,
                    ]}
                  >
                    <MaterialIcons
                      name="add"
                      size={16}
                      color={Colors.success}
                    />
                    <Text style={styles.quickButtonText}>+10</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => handleQuickSet(-5)}
                    style={({ pressed }) => [
                      styles.quickButton,
                      styles.quickRemoveButton,
                      pressed && styles.quickButtonPressed,
                    ]}
                  >
                    <MaterialIcons
                      name="remove"
                      size={16}
                      color={Colors.error}
                    />
                    <Text style={styles.quickButtonText}>-5</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => handleQuickSet(-10)}
                    style={({ pressed }) => [
                      styles.quickButton,
                      styles.quickRemoveButton,
                      pressed && styles.quickButtonPressed,
                    ]}
                  >
                    <MaterialIcons
                      name="remove"
                      size={16}
                      color={Colors.error}
                    />
                    <Text style={styles.quickButtonText}>-10</Text>
                  </Pressable>
                </View>
              </View>

              {/* Validation & Preview */}
              {!isQuantityValid && quantity !== "" && (
                <View style={styles.validationError}>
                  <MaterialIcons name="error" size={14} color={Colors.error} />
                  <Text style={styles.validationText}>
                    Please enter a non-zero number
                  </Text>
                </View>
              )}

              {isQuantityValid && (
                <View style={styles.quantityPreview}>
                  <LinearGradient
                    colors={
                      isPositive
                        ? [Colors.success + "20", Colors.success + "10"]
                        : [Colors.error + "20", Colors.error + "10"]
                    }
                    style={styles.quantityPreviewGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <MaterialIcons
                      name={isPositive ? "arrow-upward" : "arrow-downward"}
                      size={18}
                      color={isPositive ? Colors.success : Colors.error}
                    />
                    <View style={styles.quantityPreviewContent}>
                      <Text style={styles.quantityPreviewTitle}>
                        {isPositive ? "Stock Increase" : "Stock Decrease"}
                      </Text>
                      <Text
                        style={[
                          styles.quantityPreviewValue,
                          isPositive
                            ? styles.quantityPreviewPositive
                            : styles.quantityPreviewNegative,
                        ]}
                      >
                        {isPositive ? "+" : ""}
                        {quantityValue} units
                      </Text>
                    </View>
                    <MaterialIcons
                      name="inventory"
                      size={20}
                      color={isPositive ? Colors.success : Colors.error}
                    />
                  </LinearGradient>
                </View>
              )}
            </View>

            {/* Help Text */}
            <View style={styles.helpCard}>
              <MaterialIcons
                name="help-outline"
                size={18}
                color={Colors.textSecondary}
              />
              <Text style={styles.helpText}>
                • Positive numbers add to current stock{"\n"}• Negative numbers
                remove from stock{"\n"}• Changes are applied immediately
              </Text>
            </View>
          </View>

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
              onPress={handleUpdate}
              disabled={mutation.isLoading || !isQuantityValid}
              style={({ pressed }) => [
                styles.updateButton,
                !isQuantityValid && styles.updateButtonDisabled,
                pressed && styles.updateButtonPressed,
                mutation.isLoading && styles.updateButtonLoading,
              ]}
            >
              <LinearGradient
                colors={
                  !isQuantityValid
                    ? [Colors.border, Colors.borderLight]
                    : isPositive
                      ? [Colors.success, "#34D399"]
                      : [Colors.error, "#F87171"]
                }
                style={styles.updateGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <MaterialIcons
                  name={
                    mutation.isLoading
                      ? "hourglass-empty"
                      : isPositive
                        ? "add-circle"
                        : "remove-circle"
                  }
                  size={22}
                  color={Colors.white}
                />
                <Text style={styles.updateButtonText}>
                  {mutation.isLoading
                    ? "Updating..."
                    : isPositive
                      ? "Increase Stock"
                      : "Decrease Stock"}
                </Text>
              </LinearGradient>
            </Pressable>
          </View>

          {/* Validation Status */}
          {!isQuantityValid && (
            <Text style={styles.hintText}>
              ⓘ Enter a non-zero number to update stock
            </Text>
          )}
        </View>
      </ScrollView>
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
  headerText: {
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
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: BOTTOM_NAV_HEIGHT + 2 * Spacing.lg,
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
    marginBottom: Spacing.md,
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
  quantityInputWrapper: {
    gap: Spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: Spacing.md,
    fontSize: 16,
    color: Colors.text,
    backgroundColor: Colors.surface,
    textAlign: "center" as const,
    fontWeight: "600" as const,
  },
  inputPositive: {
    borderColor: Colors.success + "50",
    backgroundColor: Colors.success + "10",
    color: Colors.success,
  },
  inputNegative: {
    borderColor: Colors.error + "50",
    backgroundColor: Colors.error + "10",
    color: Colors.error,
  },
  quickActions: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: Spacing.sm,
  },
  quickButton: {
    flex: 1,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: 10,
    borderWidth: 1,
    minWidth: 80,
    gap: Spacing.xs,
  },
  quickAddButton: {
    borderColor: Colors.success + "30",
    backgroundColor: Colors.success + "10",
  },
  quickRemoveButton: {
    borderColor: Colors.error + "30",
    backgroundColor: Colors.error + "10",
  },
  quickButtonPressed: {
    transform: [{ scale: 0.95 }],
  },
  quickButtonText: {
    fontSize: 14,
    fontWeight: "600" as const,
  },
  validationError: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: Colors.error + "10",
    padding: Spacing.sm,
    borderRadius: 8,
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  validationText: {
    fontSize: 13,
    color: Colors.error,
    fontWeight: "500" as const,
    flex: 1,
  },
  quantityPreview: {
    marginTop: Spacing.sm,
  },
  quantityPreviewGradient: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    padding: Spacing.lg,
    borderRadius: 16,
    gap: Spacing.md,
  },
  quantityPreviewContent: {
    flex: 1,
    gap: Spacing.xs,
  },
  quantityPreviewTitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: "500" as const,
  },
  quantityPreviewValue: {
    fontSize: 18,
    fontWeight: "700" as const,
  },
  quantityPreviewPositive: {
    color: Colors.success,
  },
  quantityPreviewNegative: {
    color: Colors.error,
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
    marginTop: Spacing.lg,
  },
  helpText: {
    flex: 1,
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  actionsContainer: {
    flexDirection: "row" as const,
    gap: Spacing.md,
    marginBottom: Spacing.md,
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
  updateButton: {
    flex: 2,
    borderRadius: 16,
    overflow: "hidden" as const,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  updateButtonDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  updateButtonPressed: {
    transform: [{ scale: 0.98 }],
  },
  updateButtonLoading: {
    opacity: 0.9,
  },
  updateGradient: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  updateButtonText: {
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
