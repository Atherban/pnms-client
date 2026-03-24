// app/(staff)/seeds/create.tsx
import { MaterialIcons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { SafeAreaView } from "react-native-safe-area-context";
import EntityThumbnail from "../../../components/ui/EntityThumbnail";
import StitchHeader from "../../../components/common/StitchHeader";
import { PlantTypeService } from "../../../services/plant-type.service";
import { SeedService } from "../../../services/seed.service";
import { Colors } from "../../../theme";
import { PlantType } from "../../../types/plant.types";
import { formatErrorMessage } from "../../../utils/error";
import { resolveEntityImage } from "../../../utils/image";
import {
  QUANTITY_UNITS,
  formatQuantityUnit,
  normalizeQuantityUnit,
} from "../../../utils/units";

const BOTTOM_NAV_HEIGHT = 80;

// ==================== PLANT TYPE SELECTOR ====================

interface PlantTypeSelectorProps {
  plantTypes: PlantType[];
  selectedId: string;
  onSelect: (id: string) => void;
  testID?: string;
}

const PlantTypeSelector = ({
  plantTypes,
  selectedId,
  onSelect,
  testID,
}: PlantTypeSelectorProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const scrollViewRef = useRef<ScrollView>(null);

  const filteredPlantTypes = useMemo(() => {
    if (!searchQuery.trim()) return plantTypes;
    const term = searchQuery.toLowerCase().trim();
    return plantTypes.filter(
      (pt) =>
        pt.name?.toLowerCase().includes(term) ||
        pt.category?.toLowerCase().includes(term),
    );
  }, [plantTypes, searchQuery]);

  const handleSelect = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelect(id);
  };

  const renderItem = (item: PlantType) => {
    const isSelected = selectedId === item._id;
    return (
      <TouchableOpacity
        key={item._id}
        onPress={() => handleSelect(item._id)}
        style={[
          styles.plantTypeItem,
          isSelected && styles.plantTypeItemSelected,
        ]}
        activeOpacity={0.7}
        testID={`plant-type-${item._id}`}
      >
        <EntityThumbnail
          uri={resolveEntityImage(item)}
          label={item.name}
          size={44}
          iconName="spa"
          style={styles.plantTypeThumbnail}
        />
        <View style={styles.plantTypeInfo}>
          <Text style={styles.plantTypeName} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.plantTypeCategory} numberOfLines={1}>
            {item.category || "Uncategorized"}
          </Text>
        </View>
        {isSelected && (
          <View style={styles.plantTypeSelectedIcon}>
            <MaterialIcons
              name="check-circle"
              size={20}
              color={Colors.primary}
            />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.plantTypeContainer} testID={testID}>
      <View style={styles.plantTypeHeader}>
        <View style={styles.plantTypeSearchContainer}>
          <MaterialIcons name="search" size={18} color={Colors.textSecondary} />
          <TextInput
            style={styles.plantTypeSearchInput}
            placeholder="Search plant types..."
            placeholderTextColor={Colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            clearButtonMode="while-editing"
            testID="plant-type-search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery("")}
              style={styles.plantTypeSearchClear}
              activeOpacity={0.7}
              testID="clear-search"
            >
              <MaterialIcons
                name="close"
                size={16}
                color={Colors.textSecondary}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.plantTypeScrollView}
        contentContainerStyle={styles.plantTypeList}
        showsVerticalScrollIndicator={true}
        nestedScrollEnabled={true}
        keyboardShouldPersistTaps="handled"
        testID="plant-type-scroll"
      >
        {filteredPlantTypes.length === 0 ? (
          <View style={styles.plantTypeEmpty} testID="plant-type-empty">
            <MaterialIcons
              name="search-off"
              size={32}
              color={Colors.textTertiary}
            />
            <Text style={styles.plantTypeEmptyText}>No plant types found</Text>
          </View>
        ) : (
          filteredPlantTypes.map(renderItem)
        )}
      </ScrollView>
    </View>
  );
};

// ==================== FORM FIELD ====================

interface FormFieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  icon?: string;
  keyboardType?: "default" | "numeric" | "email-address" | "phone-pad";
  required?: boolean;
  multiline?: boolean;
  helperText?: string;
  editable?: boolean;
  onPress?: () => void;
  testID?: string;
}

const FormField = ({
  label,
  value,
  onChangeText,
  placeholder,
  icon,
  keyboardType = "default",
  required = false,
  multiline = false,
  helperText,
  editable = true,
  onPress,
  testID,
}: FormFieldProps) => {
  return (
    <View style={[styles.formField, !editable && styles.formFieldDisabled]}>
      <View style={styles.formFieldHeader}>
        <View style={styles.formLabelContainer}>
          {icon && (
            <MaterialIcons
              name={icon as any}
              size={16}
              color={Colors.textSecondary}
            />
          )}
          <Text style={styles.formLabel}>{label}</Text>
          {required && <Text style={styles.requiredStar}>*</Text>}
        </View>
        {helperText && <Text style={styles.helperText}>{helperText}</Text>}
      </View>

      {editable ? (
        <TextInput
          style={[styles.formInput, multiline && styles.formInputMultiline]}
          placeholder={placeholder}
          placeholderTextColor={Colors.textTertiary}
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          multiline={multiline}
          numberOfLines={multiline ? 3 : 1}
          editable={editable}
          testID={testID}
        />
      ) : (
        <TouchableOpacity
          onPress={onPress}
          style={styles.formInputTouchable}
          activeOpacity={0.7}
          testID={testID}
        >
          <Text
            style={[
              styles.formInputText,
              !value && styles.formInputPlaceholder,
            ]}
          >
            {value || placeholder}
          </Text>
          <MaterialIcons
            name="chevron-right"
            size={20}
            color={Colors.textSecondary}
          />
        </TouchableOpacity>
      )}
    </View>
  );
};

// ==================== LOADING STATE ====================

const LoadingState = () => (
  <View style={styles.centerContainer} testID="loading-state">
    <ActivityIndicator size="large" color={Colors.primary} />
    <Text style={styles.loadingText}>Loading plant types...</Text>
  </View>
);

// ==================== ERROR STATE ====================

const ErrorState = ({
  message,
  onRetry,
  onBack,
}: {
  message: string;
  onRetry: () => void;
  onBack: () => void;
}) => (
  <View style={styles.centerContainer} testID="error-state">
    <MaterialIcons name="error-outline" size={52} color={Colors.error} />
    <Text style={styles.errorTitle}>Failed to Load Plant Types</Text>
    <Text style={styles.errorMessage}>{message}</Text>
    <View style={styles.errorActions}>
      <TouchableOpacity
        onPress={onBack}
        style={styles.errorSecondaryAction}
        activeOpacity={0.7}
        testID="error-back-button"
      >
        <Text style={styles.errorSecondaryActionText}>Go Back</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={onRetry}
        style={styles.errorPrimaryAction}
        activeOpacity={0.7}
        testID="error-retry-button"
      >
        <Text style={styles.errorPrimaryActionText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  </View>
);

// ==================== MAIN COMPONENT ====================

export default function StaffSeedCreate() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Form state
  const [name, setName] = useState("");
  const [selectedPlantType, setSelectedPlantType] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [totalPurchased, setTotalPurchased] = useState("");
  const [isTotalPurchasedTouched, setIsTotalPurchasedTouched] = useState(false);
  const [quantityUnit, setQuantityUnit] = useState("SEEDS");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [showPurchaseDatePicker, setShowPurchaseDatePicker] = useState(false);
  const [showExpiryDatePicker, setShowExpiryDatePicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch plant types
  const { data, isLoading, error, refetch } = useQuery<PlantType[]>({
    queryKey: ["plant-types"],
    queryFn: PlantTypeService.getAll,
    staleTime: 60000,
    retry: 2,
  });

  const plantTypes = useMemo(() => (Array.isArray(data) ? data : []), [data]);
  const selectedPlantTypeData = useMemo(
    () => plantTypes.find((item) => item._id === selectedPlantType),
    [plantTypes, selectedPlantType],
  );

  useEffect(() => {
    if (!selectedPlantTypeData) {
      return;
    }
    setQuantityUnit(
      normalizeQuantityUnit(selectedPlantTypeData.expectedSeedUnit, "SEEDS"),
    );
    if (!isTotalPurchasedTouched) {
      const expectedQty = Number(selectedPlantTypeData.expectedSeedQtyPerBatch);
      if (Number.isFinite(expectedQty) && expectedQty > 0) {
        setTotalPurchased(String(Math.max(1, Math.round(expectedQty))));
      } else {
        setTotalPurchased("");
      }
    }
  }, [isTotalPurchasedTouched, selectedPlantTypeData]);

  // Format date for display
  const formatDisplayDate = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "";
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // Handle purchase date selection
  const handlePurchaseDateConfirm = (date: Date) => {
    setPurchaseDate(date.toISOString());
    setShowPurchaseDatePicker(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handlePurchaseDateCancel = () => {
    setShowPurchaseDatePicker(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // Handle expiry date selection
  const handleExpiryDateConfirm = (date: Date) => {
    setExpiryDate(date.toISOString());
    setShowExpiryDatePicker(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleExpiryDateCancel = () => {
    setShowExpiryDatePicker(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // Mutation
  const mutation = useMutation({
    mutationFn: (payload: {
      name: string;
      plantType: string;
      supplierName?: string;
      totalPurchased?: number;
      quantityUnit?: string;
      purchaseDate: string; // Now required
      expiryDate?: string;
    }) => SeedService.create(payload),
    onSuccess: async () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await queryClient.invalidateQueries({ queryKey: ["seeds"] });
      Alert.alert("Success", "Seed has been created successfully.", [
        {
          text: "OK",
          onPress: () => router.replace("/(staff)/seeds"),
          style: "default",
        },
      ]);
    },
    onError: (error: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Error", formatErrorMessage(error));
    },
    onSettled: () => {
      setIsSubmitting(false);
    },
  });

  // Handlers
  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const handlePlantTypeSelect = (plantTypeId: string) => {
    setIsTotalPurchasedTouched(false);
    setSelectedPlantType(plantTypeId);
  };

  const handleSave = () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      Alert.alert("Validation Error", "Seed name is required.");
      return;
    }

    if (!selectedPlantType) {
      Alert.alert("Validation Error", "Please select a plant type.");
      return;
    }

    if (!plantTypes.some((pt) => pt._id === selectedPlantType)) {
      Alert.alert("Validation Error", "Selected plant type is invalid.");
      return;
    }

    // Purchase date is required
    if (!purchaseDate) {
      Alert.alert("Validation Error", "Purchase date is required.");
      return;
    }

    // Validate purchase date format
    const purchaseDateObj = new Date(purchaseDate);
    if (isNaN(purchaseDateObj.getTime())) {
      Alert.alert("Validation Error", "Purchase date is invalid.");
      return;
    }

    const trimmedSupplier = supplierName.trim();
    const trimmedTotal = totalPurchased.trim();

    if (trimmedTotal) {
      const numericValue = Number(trimmedTotal);
      if (
        isNaN(numericValue) ||
        numericValue < 0 ||
        !Number.isInteger(numericValue)
      ) {
        Alert.alert(
          "Validation Error",
          "Purchased quantity must be a positive whole number.",
        );
        return;
      }
    }

    // Validate expiry date if provided
    if (expiryDate) {
      const expiryDateObj = new Date(expiryDate);
      if (isNaN(expiryDateObj.getTime())) {
        Alert.alert("Validation Error", "Expiry date is invalid.");
        return;
      }

      // Expiry date should be after purchase date
      if (expiryDateObj <= purchaseDateObj) {
        Alert.alert(
          "Validation Error",
          "Expiry date must be after purchase date.",
        );
        return;
      }
    }

    setIsSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    mutation.mutate({
      name: trimmedName,
      plantType: selectedPlantType,
      supplierName: trimmedSupplier || undefined,
      totalPurchased: trimmedTotal ? Number(trimmedTotal) : undefined,
      quantityUnit: normalizeQuantityUnit(quantityUnit, "SEEDS"),
      purchaseDate: purchaseDate, // Always send purchase date
      expiryDate: expiryDate || undefined,
    });
  };

  const handleCancel = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  // Loading state
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={["left", "right"]}>
        <LoadingState />
      </SafeAreaView>
    );
  }

  // Error state
  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={["left", "right"]}>
        <ErrorState
          message={
            (error as any)?.message ||
            "Unable to fetch plant types. Please try again."
          }
          onRetry={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            refetch();
          }}
          onBack={handleBack}
        />
      </SafeAreaView>
    );
  }

  const isPending = mutation.isPending || isSubmitting;
  const isValid =
    name.trim().length > 0 &&
    selectedPlantType.length > 0 &&
    purchaseDate.length > 0; // Purchase date is now required

  return (
    <SafeAreaView style={styles.container} edges={["left", "right"]}>
      <StitchHeader
        title="Create Seed"
        subtitle="Add a new seed to inventory"
        variant="solid"
        showBackButton
        onBackPress={handleBack}
      />

      {/* Form Content - ScrollView with all content including footer */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        testID="form-scroll-view"
      >
        <View style={styles.formCard}>
          {/* Basic Information Section */}
          <View style={styles.formSection}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderLeft}>
                <MaterialIcons name="info" size={20} color={Colors.primary} />
                <Text style={styles.sectionTitle}>Basic Information</Text>
              </View>
            </View>

            <FormField
              label="Seed Name"
              value={name}
              onChangeText={setName}
              placeholder="e.g., Tomato, Coriander, Marigold"
              icon="grass"
              required
              testID="seed-name-input"
            />

            <View style={styles.formField}>
              <View style={styles.formFieldHeader}>
                <View style={styles.formLabelContainer}>
                  <MaterialIcons
                    name="spa"
                    size={16}
                    color={Colors.textSecondary}
                  />
                  <Text style={styles.formLabel}>Plant Type</Text>
                  <Text style={styles.requiredStar}>*</Text>
                </View>
                {selectedPlantType && (
                  <View style={styles.selectedIndicator}>
                    <Text style={styles.selectedIndicatorText}>Selected</Text>
                    <MaterialIcons
                      name="check-circle"
                      size={14}
                      color={Colors.success}
                    />
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* Plant Type Selector */}
          <View style={styles.plantTypeSection}>
            <PlantTypeSelector
              plantTypes={plantTypes}
              selectedId={selectedPlantType}
              onSelect={handlePlantTypeSelect}
              testID="plant-type-selector"
            />
            {selectedPlantTypeData?.expectedSeedQtyPerBatch ? (
              <View style={styles.plantConfigNote}>
                <MaterialIcons name="info" size={14} color={Colors.info} />
                <Text style={styles.plantConfigNoteText}>
                  Plant setup: {selectedPlantTypeData.expectedSeedQtyPerBatch}{" "}
                  {formatQuantityUnit(
                    selectedPlantTypeData.expectedSeedUnit,
                    "SEEDS",
                  )}{" "}
                  per batch.
                </Text>
              </View>
            ) : null}
          </View>

          {/* Supplier Information Section */}
          <View style={styles.formSection}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderLeft}>
                <MaterialIcons
                  name="business"
                  size={20}
                  color={Colors.primary}
                />
                <Text style={styles.sectionTitle}>Supplier Information</Text>
              </View>
            </View>

            <FormField
              label="Supplier Name"
              value={supplierName}
              onChangeText={setSupplierName}
              placeholder="e.g., GreenField Seeds, AgroCorp"
              icon="business"
              helperText="Optional"
              testID="supplier-name-input"
            />
          </View>

          {/* Stock Information Section */}
          <View style={styles.formSection}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderLeft}>
                <MaterialIcons
                  name="inventory"
                  size={20}
                  color={Colors.primary}
                />
                <Text style={styles.sectionTitle}>Stock Information</Text>
              </View>
            </View>

            <FormField
              label={`Purchased Quantity (${formatQuantityUnit(quantityUnit, "SEEDS")})`}
              value={totalPurchased}
              onChangeText={(value) => {
                setIsTotalPurchasedTouched(true);
                setTotalPurchased(value);
              }}
              placeholder="e.g., 500"
              icon="shopping-cart"
              keyboardType="numeric"
              helperText="Optional - Total purchased amount"
              testID="purchased-quantity-input"
            />
            {!isTotalPurchasedTouched &&
            selectedPlantTypeData?.expectedSeedQtyPerBatch ? (
              <View style={styles.plantConfigNote}>
                <MaterialIcons name="auto-awesome" size={14} color={Colors.info} />
                <Text style={styles.plantConfigNoteText}>
                  Auto-filled from plant setup. You can edit this value if needed.
                </Text>
              </View>
            ) : null}

            <View style={styles.formField}>
              <View style={styles.formFieldHeader}>
                <View style={styles.formLabelContainer}>
                  <MaterialIcons
                    name="straighten"
                    size={16}
                    color={Colors.textSecondary}
                  />
                  <Text style={styles.formLabel}>Quantity Unit</Text>
                </View>
                {selectedPlantTypeData?.expectedSeedUnit ? (
                  <Text style={styles.helperText}>
                    Plant default:{" "}
                    {formatQuantityUnit(
                      selectedPlantTypeData.expectedSeedUnit,
                      "SEEDS",
                    )}
                  </Text>
                ) : null}
              </View>
              <View style={styles.unitPills}>
                {QUANTITY_UNITS.map((unit) => {
                  const isSelected = quantityUnit === unit;
                  return (
                    <TouchableOpacity
                      key={unit}
                      onPress={() => setQuantityUnit(unit)}
                      activeOpacity={0.8}
                      style={[
                        styles.unitPill,
                        isSelected && styles.unitPillSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.unitPillText,
                          isSelected && styles.unitPillTextSelected,
                        ]}
                      >
                        {formatQuantityUnit(unit, "SEEDS")}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Purchase Date - NEW & REQUIRED */}
            <FormField
              label="Purchase Date"
              value={formatDisplayDate(purchaseDate)}
              onChangeText={() => {}}
              placeholder="Select purchase date"
              icon="calendar-today"
              editable={false}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowPurchaseDatePicker(true);
              }}
              required
              testID="purchase-date-field"
            />

            {purchaseDate && (
              <View style={styles.dateNote} testID="purchase-date-note">
                <MaterialIcons
                  name="check-circle"
                  size={14}
                  color={Colors.success}
                />
                <Text style={[styles.dateNoteText, { color: Colors.success }]}>
                  Purchased on {formatDisplayDate(purchaseDate)}
                </Text>
              </View>
            )}
          </View>

          {/* Expiry Information Section */}
          <View style={styles.formSection}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderLeft}>
                <MaterialIcons name="event" size={20} color={Colors.primary} />
                <Text style={styles.sectionTitle}>Expiry Information</Text>
              </View>
            </View>

            <FormField
              label="Expiry Date"
              value={formatDisplayDate(expiryDate)}
              onChangeText={() => {}}
              placeholder="Select expiry date"
              icon="calendar-today"
              editable={false}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowExpiryDatePicker(true);
              }}
              helperText="Optional"
              testID="expiry-date-field"
            />

            {expiryDate && (
              <View style={styles.dateNote} testID="expiry-note">
                <MaterialIcons
                  name="check-circle"
                  size={14}
                  color={Colors.success}
                />
                <Text style={[styles.dateNoteText, { color: Colors.success }]}>
                  Expires on {formatDisplayDate(expiryDate)}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Footer Buttons - Now inside ScrollView at the bottom */}
        <View style={styles.footer} testID="form-footer">
          <TouchableOpacity
            onPress={handleCancel}
            style={styles.cancelButton}
            activeOpacity={0.7}
            disabled={isPending}
            testID="cancel-button"
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleSave}
            disabled={!isValid || isPending}
            style={[
              styles.saveButton,
              (!isValid || isPending) && styles.saveButtonDisabled,
            ]}
            activeOpacity={0.7}
            testID="save-button"
          >
            <LinearGradient
              colors={[Colors.primary, Colors.primaryLight || Colors.primary]}
              style={styles.saveGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {isPending ? (
                <>
                  <ActivityIndicator size="small" color={Colors.white} />
                  <Text style={styles.saveButtonText}>Creating...</Text>
                </>
              ) : (
                <>
                  <MaterialIcons
                    name="add-circle"
                    size={20}
                    color={Colors.white}
                  />
                  <Text style={styles.saveButtonText}>Create Seed</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Bottom padding for bottom navigation */}
        <View style={styles.bottomNavSpacer} />
      </ScrollView>

      {/* Purchase Date Picker Modal */}
      <DateTimePickerModal
        isVisible={showPurchaseDatePicker}
        mode="date"
        date={purchaseDate ? new Date(purchaseDate) : new Date()}
        maximumDate={new Date()} // Can't select future dates for purchase
        onConfirm={handlePurchaseDateConfirm}
        onCancel={handlePurchaseDateCancel}
        display={Platform.OS === "ios" ? "spinner" : "default"}
        testID="purchase-date-picker"
      />

      {/* Expiry Date Picker Modal */}
      <DateTimePickerModal
        isVisible={showExpiryDatePicker}
        mode="date"
        date={
          expiryDate
            ? new Date(expiryDate)
            : purchaseDate
              ? new Date(purchaseDate)
              : new Date()
        }
        minimumDate={purchaseDate ? new Date(purchaseDate) : new Date()} // Can't select before purchase date
        onConfirm={handleExpiryDateConfirm}
        onCancel={handleExpiryDateCancel}
        display={Platform.OS === "ios" ? "spinner" : "default"}
        testID="expiry-date-picker"
      />
    </SafeAreaView>
  );
}

// ==================== STYLES ====================

const styles = {
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },

  // Header Styles
  headerGradient: {
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  headerContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: "center" as const,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: Colors.white,
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.9)",
    fontWeight: "500" as const,
  },
  headerRight: {
    width: 40,
  },

  // Scroll Content
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  bottomNavSpacer: {
    height: BOTTOM_NAV_HEIGHT + 20,
  },

  // Center Container
  centerContainer: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: "#6B7280",
    fontWeight: "500" as const,
  },
  errorTitle: {
    marginTop: 14,
    fontSize: 17,
    fontWeight: "700" as const,
    color: "#111827",
  },
  errorMessage: {
    marginTop: 8,
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center" as const,
    lineHeight: 20,
    maxWidth: 320,
  },
  errorActions: {
    marginTop: 18,
    flexDirection: "row" as const,
    gap: 10,
  },
  errorPrimaryAction: {
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: Colors.primary,
  },
  errorPrimaryActionText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: "600" as const,
  },
  errorSecondaryAction: {
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: Colors.white,
  },
  errorSecondaryActionText: {
    color: "#374151",
    fontSize: 14,
    fontWeight: "600" as const,
  },

  // Form Card
  formCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden" as const,
    marginBottom: 24,
  },

  // Form Section
  formSection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  sectionHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    marginBottom: 16,
  },
  sectionHeaderLeft: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: "#111827",
  },

  // Form Field
  formField: {
    marginBottom: 16,
  },
  formFieldDisabled: {
    opacity: 0.8,
  },
  formFieldHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    marginBottom: 6,
  },
  formLabelContainer: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: "500" as const,
    color: "#374151",
  },
  requiredStar: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: Colors.error,
  },
  helperText: {
    fontSize: 11,
    color: "#6B7280",
  },
  unitPills: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: 8,
  },
  unitPill: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#F9FAFB",
  },
  unitPillSelected: {
    borderColor: Colors.primary,
    backgroundColor: `${Colors.primary}15`,
  },
  unitPillText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: "500" as const,
    textTransform: "capitalize" as const,
  },
  unitPillTextSelected: {
    color: Colors.primary,
    fontWeight: "700" as const,
  },
  formInput: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#111827",
    backgroundColor: Colors.white,
  },
  formInputMultiline: {
    minHeight: 80,
    textAlignVertical: "top" as const,
  },
  formInputTouchable: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: Colors.white,
  },
  formInputText: {
    fontSize: 15,
    color: "#111827",
  },
  formInputPlaceholder: {
    color: "#9CA3AF",
  },
  selectedIndicator: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
  },
  selectedIndicatorText: {
    fontSize: 11,
    color: Colors.success,
    fontWeight: "600" as const,
  },

  // Plant Type Section
  plantTypeSection: {
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  plantConfigNote: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    marginHorizontal: 16,
    marginBottom: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: `${Colors.info}12`,
  },
  plantConfigNoteText: {
    color: Colors.info,
    fontSize: 12,
    fontWeight: "500" as const,
    textTransform: "capitalize" as const,
    flex: 1,
  },
  plantTypeContainer: {
    flex: 1,
  },
  plantTypeHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  plantTypeSearchContainer: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: "#F9FAFB",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 10 : 0,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    height: 44,
  },
  plantTypeSearchInput: {
    flex: 1,
    fontSize: 14,
    color: "#111827",
    paddingVertical: 8,
    paddingHorizontal: 8,
    marginLeft: 4,
  },
  plantTypeSearchClear: {
    padding: 4,
  },
  plantTypeScrollView: {
    maxHeight: 300,
  },
  plantTypeList: {
    padding: 16,
    gap: 8,
  },
  plantTypeItem: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    padding: 12,
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 12,
  },
  plantTypeItemSelected: {
    borderColor: Colors.primary,
    backgroundColor: `${Colors.primary}05`,
  },
  plantTypeThumbnail: {
    borderRadius: 8,
  },
  plantTypeInfo: {
    flex: 1,
  },
  plantTypeName: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: "#111827",
    marginBottom: 2,
  },
  plantTypeCategory: {
    fontSize: 12,
    color: "#6B7280",
  },
  plantTypeSelectedIcon: {
    width: 32,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  plantTypeEmpty: {
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingVertical: 32,
    gap: 8,
  },
  plantTypeEmptyText: {
    fontSize: 14,
    color: "#6B7280",
  },

  // Date Note
  dateNote: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 4,
  },
  dateNoteText: {
    fontSize: 12,
    fontWeight: "500" as const,
  },

  // Footer
  footer: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    paddingHorizontal: 0,
    paddingVertical: 8,
    gap: 12,
    marginTop: "auto" as const,
    marginBottom: 0,
  },
  cancelButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: Colors.white,
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: "#6B7280",
  },
  saveButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    overflow: "hidden" as const,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveGradient: {
    flex: 1,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 8,
  },
  saveButtonText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: "600" as const,
  },
} as const;
