import { MaterialIcons } from "@expo/vector-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
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

/**
 * Categories accepted by backend
 * MUST match enum / validation exactly
 */
const PLANT_CATEGORIES = [
  "FLOWER",
  "FRUIT",
  "INDOOR",
  "OUTDOOR",
  "VEGETABLE",
  "MEDICINAL",
  "ORNAMENTAL",
] as const;

type PlantCategory = (typeof PLANT_CATEGORIES)[number];

export default function CreatePlant() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [category, setCategory] = useState<PlantCategory | "">("");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const mutation = useMutation({
    mutationFn: PlantService.create,
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ["plants"] });
      Alert.alert("Success", "Plant created successfully", [
        {
          text: "OK",
          onPress: () => router.replace("/(admin)/plants"),
        },
      ]);
    },
    onError: (err: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Error", err?.message || "Failed to create plant");
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

    if (!category) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert("Validation Error", "Please select a category");
      return;
    }

    const priceValue = Number(price);
    if (isNaN(priceValue) || priceValue <= 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert("Validation Error", "Please enter a valid price");
      return;
    }

    const quantityValue = Number(quantity);
    if (isNaN(quantityValue) || quantityValue < 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert("Validation Error", "Please enter a valid quantity");
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsSubmitting(true);

    mutation.mutate({
      name: name.trim(),
      category,
      price: priceValue,
      quantityAvailable: quantityValue,
    });
  };

  const getCategoryIcon = (cat: PlantCategory) => {
    switch (cat) {
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
        return "yard";
    }
  };

  const getCategoryDescription = (cat: PlantCategory) => {
    switch (cat) {
      case "FLOWER":
        return "Flowering plants and decorative blooms";
      case "FRUIT":
        return "Fruit-bearing trees and plants";
      case "INDOOR":
        return "Plants suitable for indoor environments";
      case "OUTDOOR":
        return "Plants for outdoor gardens and landscapes";
      case "VEGETABLE":
        return "Edible vegetable plants";
      case "MEDICINAL":
        return "Plants with medicinal properties";
      case "ORNAMENTAL":
        return "Decorative and ornamental plants";
      default:
        return "";
    }
  };

  const isPriceValid = () => {
    const priceValue = Number(price);
    return !isNaN(priceValue) && priceValue > 0;
  };

  const isQuantityValid = () => {
    const quantityValue = Number(quantity);
    return !isNaN(quantityValue) && quantityValue >= 0;
  };

  const isFormValid = () => {
    return (
      name.trim() &&
      category &&
      isPriceValid() &&
      isQuantityValid() &&
      !isSubmitting
    );
  };

  const formatPrice = (value: string) => {
    const num = value.replace(/[^0-9.]/g, "");
    return num;
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Fixed Header */}
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
          <Text style={styles.title}>Add New Plant</Text>
          <Text style={styles.subtitle}>Add plant to inventory</Text>
        </View>
        <View style={styles.headerSpacer} />
      </LinearGradient>

      {/* Scrollable Content */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Form Card */}
        <View style={styles.formCard}>
          {/* Plant Information Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="spa" size={22} color={Colors.text} />
              <Text style={styles.sectionTitle}>Plant Information</Text>
            </View>
            <Text style={styles.sectionDescription}>
              Enter the details for the new plant. All fields are required.
            </Text>

            {/* Name Field */}
            <View style={styles.inputContainer}>
              <View style={styles.inputLabel}>
                <MaterialIcons name="label" size={18} color={Colors.text} />
                <Text style={styles.inputLabelText}>Plant Name *</Text>
              </View>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Enter plant name"
                placeholderTextColor={Colors.textTertiary}
                style={styles.input}
              />
              {!name.trim() && (
                <View style={styles.validationError}>
                  <MaterialIcons name="error" size={14} color={Colors.error} />
                  <Text style={styles.validationText}>
                    Plant name is required
                  </Text>
                </View>
              )}
            </View>

            {/* Category Field */}
            <View style={styles.inputContainer}>
              <View style={styles.inputLabel}>
                <MaterialIcons name="category" size={18} color={Colors.text} />
                <Text style={styles.inputLabelText}>Category *</Text>
              </View>

              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setCategoryOpen(!categoryOpen);
                }}
                style={({ pressed }) => [
                  styles.categorySelector,
                  pressed && styles.categorySelectorPressed,
                  categoryOpen && styles.categorySelectorOpen,
                ]}
              >
                <View style={styles.categorySelectorContent}>
                  {category ? (
                    <View style={styles.categorySelected}>
                      <MaterialIcons
                        name={getCategoryIcon(category)}
                        size={20}
                        color={Colors.primary}
                      />
                      <Text
                        style={styles.categorySelectedText}
                        numberOfLines={1}
                      >
                        {category}
                      </Text>
                    </View>
                  ) : (
                    <Text style={styles.categoryPlaceholder}>
                      Select a category
                    </Text>
                  )}
                  <MaterialIcons
                    name={categoryOpen ? "expand-less" : "expand-more"}
                    size={20}
                    color={Colors.textSecondary}
                  />
                </View>
              </Pressable>

              {!category && (
                <View style={styles.validationError}>
                  <MaterialIcons
                    name="error"
                    size={14}
                    color={Colors.warning}
                  />
                  <Text style={styles.validationText}>
                    Please select a category
                  </Text>
                </View>
              )}
            </View>

            {/* Price Field */}
            <View style={styles.inputContainer}>
              <View style={styles.inputLabel}>
                <MaterialIcons
                  name="attach-money"
                  size={18}
                  color={Colors.text}
                />
                <Text style={styles.inputLabelText}>Price (₹) *</Text>
              </View>
              <TextInput
                value={price}
                onChangeText={(text) => setPrice(formatPrice(text))}
                placeholder="0.00"
                placeholderTextColor={Colors.textTertiary}
                keyboardType="decimal-pad"
                style={[
                  styles.input,
                  price && !isPriceValid() && styles.inputError,
                  isPriceValid() && styles.inputSuccess,
                ]}
              />
              {!isPriceValid() && price && (
                <View style={styles.validationError}>
                  <MaterialIcons name="error" size={14} color={Colors.error} />
                  <Text style={styles.validationText}>
                    Please enter a valid price greater than 0
                  </Text>
                </View>
              )}
              {isPriceValid() && (
                <View style={styles.pricePreview}>
                  <LinearGradient
                    colors={[Colors.success + "20", Colors.success + "10"]}
                    style={styles.pricePreviewGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <MaterialIcons
                      name="check-circle"
                      size={16}
                      color={Colors.success}
                    />
                    <Text style={styles.pricePreviewText}>
                      Price: ₹{Number(price).toLocaleString("en-IN")}
                    </Text>
                  </LinearGradient>
                </View>
              )}
            </View>

            {/* Quantity Field */}
            <View style={styles.inputContainer}>
              <View style={styles.inputLabel}>
                <MaterialIcons name="inventory" size={18} color={Colors.text} />
                <Text style={styles.inputLabelText}>Initial Quantity *</Text>
              </View>
              <TextInput
                value={quantity}
                onChangeText={(text) =>
                  setQuantity(text.replace(/[^0-9]/g, ""))
                }
                placeholder="0"
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
                    Please enter a valid quantity (non-negative)
                  </Text>
                </View>
              )}
              {isQuantityValid() && (
                <View style={styles.quantityPreview}>
                  <LinearGradient
                    colors={[Colors.primary + "20", Colors.primary + "10"]}
                    style={styles.quantityPreviewGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <MaterialIcons
                      name="inventory"
                      size={16}
                      color={Colors.primary}
                    />
                    <View style={styles.quantityPreviewContent}>
                      <Text style={styles.quantityPreviewLabel}>
                        Initial Stock
                      </Text>
                      <Text style={styles.quantityPreviewValue}>
                        {Number(quantity).toLocaleString("en-IN")} units
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.quantityStatus,
                        Number(quantity) === 0 && styles.quantityStatusZero,
                        Number(quantity) <= 10 && styles.quantityStatusLow,
                        Number(quantity) > 10 && styles.quantityStatusGood,
                      ]}
                    >
                      <MaterialIcons
                        name={
                          Number(quantity) === 0
                            ? "block"
                            : Number(quantity) <= 10
                              ? "warning"
                              : "check-circle"
                        }
                        size={12}
                        color={Colors.white}
                      />
                    </View>
                  </LinearGradient>
                </View>
              )}
            </View>
          </View>

          {/* Plant Preview */}
          {name.trim() && category && isPriceValid() && isQuantityValid() && (
            <View style={styles.previewCard}>
              <View style={styles.previewHeader}>
                <MaterialIcons
                  name="preview"
                  size={20}
                  color={Colors.textSecondary}
                />
                <Text style={styles.previewTitle}>Plant Preview</Text>
              </View>
              <View style={styles.previewContent}>
                <View style={styles.previewRow}>
                  <Text style={styles.previewLabel}>Name:</Text>
                  <Text style={styles.previewValue} numberOfLines={1}>
                    {name}
                  </Text>
                </View>
                <View style={styles.previewRow}>
                  <Text style={styles.previewLabel}>Category:</Text>
                  <View style={styles.categoryBadge}>
                    <MaterialIcons
                      name={getCategoryIcon(category)}
                      size={14}
                      color={Colors.primary}
                    />
                    <Text style={styles.categoryBadgeText}>{category}</Text>
                  </View>
                </View>
                <View style={styles.previewRow}>
                  <Text style={styles.previewLabel}>Price:</Text>
                  <Text style={styles.previewValue}>
                    ₹{Number(price).toLocaleString("en-IN")}
                  </Text>
                </View>
                <View style={styles.previewRow}>
                  <Text style={styles.previewLabel}>Initial Stock:</Text>
                  <Text
                    style={[
                      styles.previewValue,
                      Number(quantity) === 0 && styles.previewValueZero,
                      Number(quantity) <= 10 && styles.previewValueLow,
                    ]}
                  >
                    {Number(quantity).toLocaleString("en-IN")} units
                  </Text>
                </View>
                <View style={styles.previewEstimate}>
                  <MaterialIcons
                    name="calculate"
                    size={14}
                    color={Colors.textSecondary}
                  />
                  <Text style={styles.previewEstimateText}>
                    Estimated value: ₹
                    {(Number(price) * Number(quantity)).toLocaleString("en-IN")}
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
              onPress={handleCreate}
              disabled={!isFormValid()}
              style={({ pressed }) => [
                styles.createButton,
                !isFormValid() && styles.createButtonDisabled,
                pressed && styles.createButtonPressed,
                (mutation.isLoading || isSubmitting) &&
                  styles.createButtonLoading,
              ]}
            >
              <LinearGradient
                colors={
                  !isFormValid()
                    ? [Colors.border, Colors.borderLight]
                    : [Colors.success, "#34D399"]
                }
                style={styles.createGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {mutation.isLoading || isSubmitting ? (
                  <>
                    <MaterialIcons
                      name="hourglass-empty"
                      size={22}
                      color={Colors.white}
                    />
                    <Text style={styles.createButtonText}>Creating...</Text>
                  </>
                ) : (
                  <>
                    <MaterialIcons
                      name="add-circle"
                      size={22}
                      color={Colors.white}
                    />
                    <Text style={styles.createButtonText}>Add Plant</Text>
                  </>
                )}
              </LinearGradient>
            </Pressable>
          </View>

          {/* Validation Status */}
          {!isFormValid() && (
            <Text style={styles.hintText}>
              ⓘ Please fill all required fields with valid information
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
            <Text style={styles.helpTitle}>Tips for Adding Plants</Text>
            <Text style={styles.helpText}>
              • Ensure category matches the plant type{"\n"}• Price should be in
              Indian Rupees (₹){"\n"}• Initial quantity determines starting
              stock{"\n"}• Zero quantity indicates out of stock
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Category Dropdown - Outside ScrollView */}
      {categoryOpen && (
        <View style={styles.dropdownOverlay}>
          <Pressable
            style={styles.dropdownBackdrop}
            onPress={() => setCategoryOpen(false)}
          />
          <View style={styles.dropdownContainer}>
            <View style={styles.dropdownHeader}>
              <Text style={styles.dropdownTitle}>Select Category</Text>
              <Pressable
                onPress={() => setCategoryOpen(false)}
                style={styles.dropdownCloseButton}
              >
                <MaterialIcons name="close" size={20} color={Colors.text} />
              </Pressable>
            </View>
            <ScrollView
              style={styles.dropdownScroll}
              showsVerticalScrollIndicator={false}
            >
              {PLANT_CATEGORIES.map((cat) => (
                <Pressable
                  key={cat}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setCategory(cat);
                    setCategoryOpen(false);
                  }}
                  style={({ pressed }) => [
                    styles.dropdownOption,
                    category === cat && styles.dropdownOptionSelected,
                    pressed && styles.dropdownOptionPressed,
                  ]}
                >
                  <View style={styles.dropdownOptionContent}>
                    <View
                      style={[
                        styles.dropdownIconContainer,
                        category === cat &&
                          styles.dropdownIconContainerSelected,
                      ]}
                    >
                      <MaterialIcons
                        name={getCategoryIcon(cat)}
                        size={20}
                        color={category === cat ? Colors.white : Colors.text}
                      />
                    </View>
                    <View style={styles.dropdownDetails}>
                      <Text
                        style={[
                          styles.dropdownLabel,
                          category === cat && styles.dropdownLabelSelected,
                        ]}
                      >
                        {cat}
                      </Text>
                      <Text style={styles.dropdownDescription}>
                        {getCategoryDescription(cat)}
                      </Text>
                    </View>
                    {category === cat && (
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
          </View>
        </View>
      )}
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
    paddingBottom: BOTTOM_NAV_HEIGHT + Spacing.lg,
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
  categorySelector: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    overflow: "hidden" as const,
    minHeight: 50,
    justifyContent: "center",
  },
  categorySelectorPressed: {
    backgroundColor: Colors.surfaceDark,
  },
  categorySelectorOpen: {
    borderColor: Colors.primary,
  },
  categorySelectorContent: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    padding: Spacing.md,
  },
  categorySelected: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: Spacing.sm,
    flex: 1,
  },
  categorySelectedText: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: Colors.text,
    flex: 1,
  },
  categoryPlaceholder: {
    fontSize: 16,
    color: Colors.textTertiary,
    flex: 1,
  },
  // Dropdown overlay styles
  dropdownOverlay: {
    position: "absolute" as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  dropdownBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  dropdownContainer: {
    position: "absolute" as const,
    bottom: 0,
    left: 0,
    right: 0,
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
  dropdownIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  dropdownIconContainerSelected: {
    backgroundColor: Colors.primary,
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
    lineHeight: 18,
  },
  pricePreview: {
    marginTop: Spacing.sm,
  },
  pricePreviewGradient: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    padding: Spacing.md,
    borderRadius: 12,
    gap: Spacing.sm,
  },
  pricePreviewText: {
    fontSize: 14,
    color: Colors.success,
    fontWeight: "600" as const,
  },
  quantityPreview: {
    marginTop: Spacing.sm,
  },
  quantityPreviewGradient: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    padding: Spacing.md,
    borderRadius: 12,
    gap: Spacing.sm,
  },
  quantityPreviewContent: {
    flex: 1,
    gap: 2,
  },
  quantityPreviewLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  quantityPreviewValue: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: Colors.primary,
  },
  quantityStatus: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  quantityStatusZero: {
    backgroundColor: Colors.error,
  },
  quantityStatusLow: {
    backgroundColor: Colors.warning,
  },
  quantityStatusGood: {
    backgroundColor: Colors.success,
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
    minHeight: 24,
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
  previewValueZero: {
    color: Colors.error,
  },
  previewValueLow: {
    color: Colors.warning,
  },
  categoryBadge: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: Colors.primary + "20",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    maxWidth: 120,
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: Colors.primary,
    flexShrink: 1,
  },
  previewEstimate: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: Colors.surfaceDark,
    padding: Spacing.sm,
    borderRadius: 8,
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  previewEstimateText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: "500" as const,
    flex: 1,
  },
  actionsContainer: {
    flexDirection: "row" as const,
    gap: Spacing.md,
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
    marginBottom: 3 * Spacing.xl,
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
};
