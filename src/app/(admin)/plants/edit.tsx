import { MaterialIcons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
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

export default function EditPlant() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const plantId =
    typeof params.id === "string"
      ? params.id
      : Array.isArray(params.id)
        ? params.id[0]
        : undefined;

  const router = useRouter();
  const queryClient = useQueryClient();

  /* ---------- Form state ---------- */
  const [name, setName] = useState("");
  const [category, setCategory] = useState<PlantCategory | "">("");
  const [price, setPrice] = useState("");
  const [categoryOpen, setCategoryOpen] = useState(false);

  /* ---------- Fetch plant ---------- */
  const { data, isLoading, error } = useQuery({
    queryKey: ["plant", plantId],
    queryFn: () => PlantService.getById(plantId!),
    enabled: !!plantId,
  });

  /* ---------- Populate form ---------- */
  useEffect(() => {
    if (data) {
      setName(data.name || "");
      // Ensure category matches the PlantCategory type
      const validCategory = PLANT_CATEGORIES.includes(
        data.category as PlantCategory,
      )
        ? (data.category as PlantCategory)
        : "";
      setCategory(validCategory);
      setPrice(data.price ? String(data.price) : "");
    }
  }, [data]);

  /* ---------- Update plant ---------- */
  const mutation = useMutation({
    mutationFn: (payload: { name: string; category: string; price: number }) =>
      PlantService.update(plantId!, payload),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ["plants"] });
      queryClient.invalidateQueries({ queryKey: ["plant", plantId] });
      Alert.alert("Success", "Plant updated successfully", [
        { text: "OK", onPress: () => router.back() },
      ]);
    },
    onError: (err: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Error", err?.message || "Failed to update plant");
    },
  });

  const handleSave = () => {
    if (!plantId) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert("Validation Error", "Plant ID is missing");
      return;
    }

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
    if (isNaN(priceValue) || priceValue < 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert("Validation Error", "Please enter a valid price");
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    mutation.mutate({
      name: name.trim(),
      category: category.trim(),
      price: priceValue,
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

  /* ---------- Loading ---------- */
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={[Colors.primary, Colors.primaryLight]}
          style={styles.headerGradient}
        >
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={20} color={Colors.white} />
          </Pressable>
          <View style={styles.headerText}>
            <Text style={styles.title}>Edit Plant</Text>
            <Text style={styles.subtitle}>Loading plant details...</Text>
          </View>
          <View style={styles.headerSpacer} />
        </LinearGradient>

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading plant data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  /* ---------- Error ---------- */
  if (error || !data) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={[Colors.primary, Colors.primaryLight]}
          style={styles.headerGradient}
        >
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={20} color={Colors.white} />
          </Pressable>
          <View style={styles.headerText}>
            <Text style={styles.title}>Edit Plant</Text>
            <Text style={styles.subtitle}>Unable to load data</Text>
          </View>
          <View style={styles.headerSpacer} />
        </LinearGradient>

        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={64} color={Colors.error} />
          <Text style={styles.errorTitle}>Failed to Load Plant</Text>
          <Text style={styles.errorMessage}>
            Unable to fetch plant details. Please try again.
          </Text>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.retryButton,
              pressed && styles.retryButtonPressed,
            ]}
          >
            <Text style={styles.retryButtonText}>Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  /* ---------- Price validation ---------- */
  const isPriceValid = () => {
    const priceValue = Number(price);
    return !isNaN(priceValue) && priceValue >= 0;
  };

  const formatPrice = (value: string) => {
    const num = value.replace(/[^0-9.]/g, "");
    return num;
  };

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
          <Text style={styles.title}>Edit Plant</Text>
          <Text style={styles.subtitle}>Update plant information</Text>
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
          {/* Plant Info Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="spa" size={22} color={Colors.text} />
              <Text style={styles.sectionTitle}>Plant Information</Text>
            </View>
            <Text style={styles.sectionDescription}>
              Update the plant details below. All fields are required.
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
                <MaterialIcons name="money" size={18} color={Colors.text} />
                <Text style={styles.inputLabelText}>Price (₹) *</Text>
              </View>
              <TextInput
                value={price}
                onChangeText={(text) => setPrice(formatPrice(text))}
                placeholder="Enter price in rupees"
                placeholderTextColor={Colors.textTertiary}
                keyboardType="decimal-pad"
                style={[
                  styles.input,
                  price && !isPriceValid() && styles.inputError,
                  isPriceValid() && Number(price) > 0 && styles.inputSuccess,
                ]}
              />
              {!isPriceValid() && (
                <View style={styles.validationError}>
                  <MaterialIcons name="error" size={14} color={Colors.error} />
                  <Text style={styles.validationText}>
                    Please enter a valid price (non-negative number)
                  </Text>
                </View>
              )}
              {isPriceValid() && Number(price) > 0 && (
                <View style={styles.priceStatus}>
                  <LinearGradient
                    colors={[Colors.success + "20", Colors.success + "10"]}
                    style={styles.priceStatusGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <MaterialIcons
                      name="check-circle"
                      size={16}
                      color={Colors.success}
                    />
                    <Text style={styles.priceStatusText}>
                      Price: ₹{Number(price).toLocaleString("en-IN")}
                    </Text>
                  </LinearGradient>
                </View>
              )}
            </View>
          </View>

          {/* Current Info Preview */}
          <View style={styles.currentInfoCard}>
            <View style={styles.currentInfoHeader}>
              <MaterialIcons
                name="history"
                size={20}
                color={Colors.textSecondary}
              />
              <Text style={styles.currentInfoTitle}>Current Values</Text>
            </View>
            <View style={styles.currentInfoContent}>
              <View style={styles.currentInfoRow}>
                <Text style={styles.currentInfoLabel}>Name:</Text>
                <Text style={styles.currentInfoValue}>{data.name}</Text>
              </View>
              <View style={styles.currentInfoRow}>
                <Text style={styles.currentInfoLabel}>Category:</Text>
                <View style={styles.categoryBadge}>
                  <MaterialIcons
                    name={getCategoryIcon(data.category as PlantCategory)}
                    size={14}
                    color={Colors.primary}
                  />
                  <Text style={styles.categoryBadgeText}>{data.category}</Text>
                </View>
              </View>
              <View style={styles.currentInfoRow}>
                <Text style={styles.currentInfoLabel}>Price:</Text>
                <Text style={styles.currentInfoValue}>
                  ₹{data.price?.toLocaleString("en-IN") || "0"}
                </Text>
              </View>
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
              onPress={handleSave}
              disabled={
                mutation.isLoading ||
                !name.trim() ||
                !category.trim() ||
                !isPriceValid()
              }
              style={({ pressed }) => [
                styles.saveButton,
                (!name.trim() || !category.trim() || !isPriceValid()) &&
                  styles.saveButtonDisabled,
                pressed && styles.saveButtonPressed,
                mutation.isLoading && styles.saveButtonLoading,
              ]}
            >
              <LinearGradient
                colors={
                  !name.trim() || !category.trim() || !isPriceValid()
                    ? [Colors.border, Colors.borderLight]
                    : [Colors.success, "#34D399"]
                }
                style={styles.saveGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {mutation.isLoading ? (
                  <ActivityIndicator color={Colors.white} size="small" />
                ) : (
                  <>
                    <MaterialIcons
                      name="check-circle"
                      size={22}
                      color={Colors.white}
                    />
                    <Text style={styles.saveButtonText}>Save Changes</Text>
                  </>
                )}
              </LinearGradient>
            </Pressable>
          </View>

          {/* Validation Status */}
          {(!name.trim() || !category.trim() || !isPriceValid()) && (
            <Text style={styles.hintText}>
              ⓘ Please fill all required fields (*) to save changes
            </Text>
          )}
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
  loadingContainer: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    padding: Spacing.xl,
    paddingBottom: BOTTOM_NAV_HEIGHT,
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
    paddingBottom: BOTTOM_NAV_HEIGHT + 2 * Spacing.xl,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: "700" as const,
    color: Colors.error,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  errorMessage: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: "center" as const,
    marginBottom: Spacing.xl,
    lineHeight: 22,
    paddingHorizontal: Spacing.xl,
  },
  retryButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    borderRadius: 16,
  },
  retryButtonPressed: {
    backgroundColor: Colors.primaryDark,
    transform: [{ scale: 0.98 }],
  },
  retryButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: "700" as const,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: BOTTOM_NAV_HEIGHT + 3 * Spacing.lg,
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
  // Category Selector Styles
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
  priceStatus: {
    marginTop: Spacing.sm,
  },
  priceStatusGradient: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    padding: Spacing.md,
    borderRadius: 12,
    gap: Spacing.sm,
  },
  priceStatusText: {
    fontSize: 14,
    color: Colors.success,
    fontWeight: "600" as const,
  },
  currentInfoCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  currentInfoHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  currentInfoTitle: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: Colors.text,
  },
  currentInfoContent: {
    gap: Spacing.sm,
  },
  currentInfoRow: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    minHeight: 24,
  },
  currentInfoLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: "500" as const,
  },
  currentInfoValue: {
    fontSize: 13,
    color: Colors.text,
    fontWeight: "600" as const,
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
  saveButton: {
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
  saveButtonDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  saveButtonPressed: {
    transform: [{ scale: 0.98 }],
  },
  saveButtonLoading: {
    opacity: 0.9,
  },
  saveGradient: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    padding: Spacing.lg,
    gap: Spacing.sm,
    flex: 1,
    minHeight: 56,
  },
  saveButtonText: {
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
};
