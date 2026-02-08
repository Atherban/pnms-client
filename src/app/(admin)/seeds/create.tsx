import { MaterialIcons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
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
import { SeedService } from "../../../services/seed.service";
import { Colors, Spacing } from "../../../theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const BOTTOM_NAV_HEIGHT = 80;

/* Backend enum values */
const SEED_CATEGORIES = ["VEGETABLE", "FLOWER", "FRUIT", "HERB"] as const;
type SeedCategory = (typeof SEED_CATEGORIES)[number];

const formatDate = (d: Date) => d.toISOString().split("T")[0];
const formatDisplayDate = (d: Date) =>
  d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

export default function CreateSeed() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [category, setCategory] = useState<SeedCategory | "">("");
  const [supplierName, setSupplierName] = useState("");
  const [totalPurchased, setTotalPurchased] = useState("");
  // Set purchase date to current date by default
  const [purchaseDate, setPurchaseDate] = useState<Date>(new Date());
  const [expiryDate, setExpiryDate] = useState<Date | null>(null);
  const [showPurchasePicker, setShowPurchasePicker] = useState(false);
  const [showExpiryPicker, setShowExpiryPicker] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const mutation = useMutation({
    mutationFn: SeedService.create,
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ["seeds"] });
      Alert.alert("Success", "Seed created successfully", [
        {
          text: "OK",
          onPress: () => router.replace("/(admin)/seeds"),
        },
      ]);
    },
    onError: (err: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Error", err?.message || "Failed to create seed");
      setIsSubmitting(false);
    },
    onSettled: () => {
      setIsSubmitting(false);
    },
  });

  const getCategoryIcon = (cat: SeedCategory) => {
    switch (cat) {
      case "VEGETABLE":
        return "grass";
      case "FLOWER":
        return "local-florist";
      case "FRUIT":
        return "cake";
      case "HERB":
        return "medical-services";
      default:
        return "spa";
    }
  };

  const getCategoryDescription = (cat: SeedCategory) => {
    switch (cat) {
      case "VEGETABLE":
        return "Vegetable seeds for gardening";
      case "FLOWER":
        return "Flowering plant seeds";
      case "FRUIT":
        return "Fruit-bearing plant seeds";
      case "HERB":
        return "Herbal and medicinal plant seeds";
      default:
        return "";
    }
  };

  const handleCreate = () => {
    if (!name.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert("Validation Error", "Seed name is required");
      return;
    }
    if (!category) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert("Validation Error", "Please select a category");
      return;
    }
    if (!supplierName.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert("Validation Error", "Supplier name is required");
      return;
    }

    const totalPurchasedValue = Number(totalPurchased);
    if (isNaN(totalPurchasedValue) || totalPurchasedValue <= 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert("Validation Error", "Please enter a valid quantity");
      return;
    }

    // Purchase date is always set (to current date by default), so no need to check
    // But we still need to check expiry date
    if (!expiryDate) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert("Validation Error", "Please select expiry date");
      return;
    }

    // Check if expiry date is after purchase date
    if (expiryDate <= purchaseDate) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert(
        "Validation Error",
        "Expiry date must be after purchase date",
      );
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsSubmitting(true);

    mutation.mutate({
      name: name.trim(),
      category,
      supplierName: supplierName.trim(),
      totalPurchased: totalPurchasedValue,
      purchaseDate: formatDate(purchaseDate),
      expiryDate: formatDate(expiryDate),
    });
  };

  const isFormValid = () => {
    const totalPurchasedValue = Number(totalPurchased);
    return (
      name.trim() &&
      category &&
      supplierName.trim() &&
      !isNaN(totalPurchasedValue) &&
      totalPurchasedValue > 0 &&
      purchaseDate && // Always true since we set it to current date
      expiryDate &&
      expiryDate > purchaseDate &&
      !isSubmitting
    );
  };

  const isQuantityValid = () => {
    const quantityValue = Number(totalPurchased);
    return !isNaN(quantityValue) && quantityValue > 0;
  };

  const isExpiryDateValid = () => {
    if (!expiryDate) return false;
    return expiryDate > purchaseDate;
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
          <Text style={styles.title}>Add New Seed</Text>
          <Text style={styles.subtitle}>Add seed to inventory</Text>
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
          {/* Seed Information Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="spa" size={22} color={Colors.text} />
              <Text style={styles.sectionTitle}>Seed Information</Text>
            </View>
            <Text style={styles.sectionDescription}>
              Enter the details for the new seed. All fields are required.
            </Text>

            {/* Name Field */}
            <View style={styles.inputContainer}>
              <View style={styles.inputLabel}>
                <MaterialIcons name="label" size={18} color={Colors.text} />
                <Text style={styles.inputLabelText}>Seed Name *</Text>
              </View>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Enter seed name"
                placeholderTextColor={Colors.textTertiary}
                style={styles.input}
              />
              {!name.trim() && (
                <View style={styles.validationError}>
                  <MaterialIcons name="error" size={14} color={Colors.error} />
                  <Text style={styles.validationText}>
                    Seed name is required
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

            {/* Supplier Field */}
            <View style={styles.inputContainer}>
              <View style={styles.inputLabel}>
                <MaterialIcons name="store" size={18} color={Colors.text} />
                <Text style={styles.inputLabelText}>Supplier Name *</Text>
              </View>
              <TextInput
                value={supplierName}
                onChangeText={setSupplierName}
                placeholder="Enter supplier name"
                placeholderTextColor={Colors.textTertiary}
                style={styles.input}
              />
              {!supplierName.trim() && (
                <View style={styles.validationError}>
                  <MaterialIcons name="error" size={14} color={Colors.error} />
                  <Text style={styles.validationText}>
                    Supplier name is required
                  </Text>
                </View>
              )}
            </View>

            {/* Quantity Field */}
            <View style={styles.inputContainer}>
              <View style={styles.inputLabel}>
                <MaterialIcons name="inventory" size={18} color={Colors.text} />
                <Text style={styles.inputLabelText}>Total Purchased *</Text>
              </View>
              <TextInput
                value={totalPurchased}
                onChangeText={(text) =>
                  setTotalPurchased(text.replace(/[^0-9]/g, ""))
                }
                placeholder="0"
                placeholderTextColor={Colors.textTertiary}
                keyboardType="number-pad"
                style={[
                  styles.input,
                  totalPurchased && !isQuantityValid() && styles.inputError,
                  isQuantityValid() && styles.inputSuccess,
                ]}
              />
              {!isQuantityValid() && totalPurchased && (
                <View style={styles.validationError}>
                  <MaterialIcons name="error" size={14} color={Colors.error} />
                  <Text style={styles.validationText}>
                    Please enter a valid quantity (greater than 0)
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
                        Total Stock
                      </Text>
                      <Text style={styles.quantityPreviewValue}>
                        {Number(totalPurchased).toLocaleString("en-IN")} units
                      </Text>
                    </View>
                  </LinearGradient>
                </View>
              )}
            </View>

            {/* Purchase Date Field */}
            <View style={styles.inputContainer}>
              <View style={styles.inputLabel}>
                <MaterialIcons
                  name="calendar-month"
                  size={18}
                  color={Colors.text}
                />
                <Text style={styles.inputLabelText}>Purchase Date *</Text>
              </View>

              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowPurchasePicker(true);
                }}
                style={({ pressed }) => [
                  styles.dateSelector,
                  pressed && styles.dateSelectorPressed,
                ]}
              >
                <View style={styles.dateSelectorContent}>
                  <View style={styles.dateSelected}>
                    <MaterialIcons
                      name="event"
                      size={20}
                      color={Colors.primary}
                    />
                    <Text style={styles.dateSelectedText}>
                      {formatDisplayDate(purchaseDate)}
                    </Text>
                  </View>
                  <MaterialIcons
                    name="calendar-today"
                    size={20}
                    color={Colors.textSecondary}
                  />
                </View>
              </Pressable>

              <View style={styles.dateInfo}>
                <MaterialIcons
                  name="info"
                  size={14}
                  color={Colors.textSecondary}
                />
                <Text style={styles.dateInfoText}>
                  Defaults to today's date
                </Text>
              </View>
            </View>

            {/* Expiry Date Field */}
            <View style={styles.inputContainer}>
              <View style={styles.inputLabel}>
                <MaterialIcons
                  name="event-busy"
                  size={18}
                  color={Colors.text}
                />
                <Text style={styles.inputLabelText}>Expiry Date *</Text>
              </View>

              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowExpiryPicker(true);
                }}
                style={({ pressed }) => [
                  styles.dateSelector,
                  pressed && styles.dateSelectorPressed,
                  !isExpiryDateValid() && expiryDate && styles.inputError,
                  isExpiryDateValid() && styles.inputSuccess,
                ]}
              >
                <View style={styles.dateSelectorContent}>
                  {expiryDate ? (
                    <View style={styles.dateSelected}>
                      <MaterialIcons
                        name="event-available"
                        size={20}
                        color={
                          isExpiryDateValid() ? Colors.success : Colors.error
                        }
                      />
                      <Text style={styles.dateSelectedText}>
                        {formatDisplayDate(expiryDate)}
                      </Text>
                    </View>
                  ) : (
                    <Text style={styles.datePlaceholder}>
                      Select expiry date
                    </Text>
                  )}
                  <MaterialIcons
                    name="calendar-today"
                    size={20}
                    color={Colors.textSecondary}
                  />
                </View>
              </Pressable>

              {!expiryDate && (
                <View style={styles.validationError}>
                  <MaterialIcons
                    name="error"
                    size={14}
                    color={Colors.warning}
                  />
                  <Text style={styles.validationText}>
                    Please select expiry date
                  </Text>
                </View>
              )}
              {expiryDate && !isExpiryDateValid() && (
                <View style={styles.validationError}>
                  <MaterialIcons name="error" size={14} color={Colors.error} />
                  <Text style={styles.validationText}>
                    Expiry date must be after purchase date (
                    {formatDisplayDate(purchaseDate)})
                  </Text>
                </View>
              )}
              {isExpiryDateValid() && (
                <View style={styles.dateStatus}>
                  <LinearGradient
                    colors={[Colors.success + "20", Colors.success + "10"]}
                    style={styles.dateStatusGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <MaterialIcons
                      name="check-circle"
                      size={16}
                      color={Colors.success}
                    />
                    <Text style={styles.dateStatusText}>
                      Valid expiry date (after {formatDisplayDate(purchaseDate)}
                      )
                    </Text>
                  </LinearGradient>
                </View>
              )}
            </View>
          </View>

          {/* Seed Preview */}
          {name.trim() &&
            category &&
            isQuantityValid() &&
            expiryDate &&
            isExpiryDateValid() && (
              <View style={styles.previewCard}>
                <View style={styles.previewHeader}>
                  <MaterialIcons
                    name="preview"
                    size={20}
                    color={Colors.textSecondary}
                  />
                  <Text style={styles.previewTitle}>Seed Preview</Text>
                </View>
                <View style={styles.previewContent}>
                  <View style={styles.previewRow}>
                    <Text style={styles.previewLabel}>Name:</Text>
                    <Text style={styles.previewValue}>{name}</Text>
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
                    <Text style={styles.previewLabel}>Supplier:</Text>
                    <Text style={styles.previewValue}>{supplierName}</Text>
                  </View>
                  <View style={styles.previewRow}>
                    <Text style={styles.previewLabel}>Total Purchased:</Text>
                    <Text style={styles.previewValue}>
                      {Number(totalPurchased).toLocaleString("en-IN")} units
                    </Text>
                  </View>
                  <View style={styles.previewRow}>
                    <Text style={styles.previewLabel}>Purchase Date:</Text>
                    <Text style={styles.previewValue}>
                      {formatDisplayDate(purchaseDate)}
                    </Text>
                  </View>
                  <View style={styles.previewRow}>
                    <Text style={styles.previewLabel}>Expiry Date:</Text>
                    <Text
                      style={[
                        styles.previewValue,
                        !isExpiryDateValid() && styles.previewValueError,
                        isExpiryDateValid() && styles.previewValueSuccess,
                      ]}
                    >
                      {formatDisplayDate(expiryDate)}
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
                    <Text style={styles.createButtonText}>Add Seed</Text>
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
            <Text style={styles.helpTitle}>Tips for Adding Seeds</Text>
            <Text style={styles.helpText}>
              • Ensure category matches the seed type{"\n"}• Expiry date must be
              after purchase date{"\n"}• Total purchased determines starting
              stock{"\n"}• Keep supplier information for reference
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
              {SEED_CATEGORIES.map((cat) => (
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

      {/* Date Pickers */}
      {showPurchasePicker && (
        <DateTimePicker
          value={purchaseDate}
          mode="date"
          display="calendar"
          onChange={(_, date) => {
            setShowPurchasePicker(false);
            if (date) {
              setPurchaseDate(date);
              // If expiry date exists and is before new purchase date, clear it
              if (expiryDate && date >= expiryDate) {
                setExpiryDate(null);
              }
            }
          }}
          minimumDate={new Date(2000, 0, 1)}
          maximumDate={new Date(2100, 11, 31)}
        />
      )}

      {showExpiryPicker && (
        <DateTimePicker
          value={
            expiryDate || new Date(purchaseDate.getTime() + 24 * 60 * 60 * 1000)
          }
          mode="date"
          display="calendar"
          onChange={(_, date) => {
            setShowExpiryPicker(false);
            if (date) {
              setExpiryDate(date);
            }
          }}
          minimumDate={new Date(purchaseDate.getTime() + 24 * 60 * 60 * 1000)}
          maximumDate={new Date(2100, 11, 31)}
        />
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
  // Date Selector Styles
  dateSelector: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    overflow: "hidden" as const,
    minHeight: 50,
    justifyContent: "center",
  },
  dateSelectorPressed: {
    backgroundColor: Colors.surfaceDark,
  },
  dateSelectorContent: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    padding: Spacing.md,
  },
  dateSelected: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: Spacing.sm,
    flex: 1,
  },
  dateSelectedText: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: Colors.text,
    flex: 1,
  },
  datePlaceholder: {
    fontSize: 16,
    color: Colors.textTertiary,
    flex: 1,
  },
  dateInfo: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: Spacing.xs,
    marginTop: Spacing.xs,
    paddingLeft: Spacing.xs,
  },
  dateInfoText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontStyle: "italic" as const,
  },
  dateStatus: {
    marginTop: Spacing.sm,
  },
  dateStatusGradient: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    padding: Spacing.md,
    borderRadius: 12,
    gap: Spacing.sm,
  },
  dateStatusText: {
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
  previewValueError: {
    color: Colors.error,
  },
  previewValueSuccess: {
    color: Colors.success,
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
    marginBottom: BOTTOM_NAV_HEIGHT + Spacing.xs,
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
