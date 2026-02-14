// app/(staff)/seeds/edit.tsx
import { MaterialIcons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { SafeAreaView } from "react-native-safe-area-context";
import { SeedService } from "../../../services/seed.service";
import { Colors, Spacing } from "../../../theme";
import { formatErrorMessage } from "../../../utils/error";

const BOTTOM_NAV_HEIGHT = 80;

interface SeedEditModel {
  _id: string;
  name: string;
  supplierName?: string;
  totalPurchased?: number;
  expiryDate?: string;
}

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
  numberOfLines?: number;
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
  numberOfLines = 1,
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
          numberOfLines={numberOfLines}
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
  <View style={styles.centerContainer}>
    <ActivityIndicator size="large" color={Colors.primary} />
    <Text style={styles.loadingText}>Loading seed details...</Text>
  </View>
);

// ==================== ERROR STATE ====================

const ErrorState = ({
  message,
  onBack,
}: {
  message: string;
  onBack: () => void;
}) => (
  <View style={styles.centerContainer}>
    <MaterialIcons name="error-outline" size={52} color={Colors.error} />
    <Text style={styles.errorTitle}>Failed to Load Seed</Text>
    <Text style={styles.errorMessage}>{message}</Text>
    <TouchableOpacity onPress={onBack} style={styles.errorAction}>
      <Text style={styles.errorActionText}>Go Back</Text>
    </TouchableOpacity>
  </View>
);

// ==================== MAIN COMPONENT ====================

export default function StaffSeedEdit() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ id?: string; _id?: string }>();

  // Extract seed ID from params (handle both id and _id)
  const seedId = params.id || params._id;

  // Form state
  const [name, setName] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [totalPurchased, setTotalPurchased] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Refs for change tracking
  const initialValuesRef = useRef({
    name: "",
    supplierName: "",
    totalPurchased: "",
    expiryDate: "",
  });
  const isInitializedRef = useRef(false);

  // Fetch seed data
  const { data, isLoading, error, refetch } = useQuery<SeedEditModel>({
    queryKey: ["seed", seedId],
    queryFn: () => SeedService.getById(seedId as string),
    enabled: !!seedId,
    staleTime: 30000,
    retry: 2,
  });

  // Reset form when seed ID changes
  useEffect(() => {
    // Reset all state
    setName("");
    setSupplierName("");
    setTotalPurchased("");
    setExpiryDate("");
    isInitializedRef.current = false;
  }, [seedId]);

  // Populate form with seed data
  useEffect(() => {
    if (!data || isInitializedRef.current) return;

    const nextValues = {
      name: data.name ?? "",
      supplierName: data.supplierName ?? "",
      totalPurchased:
        data.totalPurchased != null ? String(data.totalPurchased) : "",
      expiryDate: data.expiryDate ?? "",
    };

    initialValuesRef.current = nextValues;
    setName(nextValues.name);
    setSupplierName(nextValues.supplierName);
    setTotalPurchased(nextValues.totalPurchased);
    setExpiryDate(nextValues.expiryDate);
    isInitializedRef.current = true;
  }, [data]);

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

  const isExpired = (dateString: string) => {
    if (!dateString) return false;
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return false;
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    return endOfDay.getTime() < Date.now();
  };

  // Handle date selection
  const handleDateConfirm = (date: Date) => {
    setExpiryDate(date.toISOString());
    setShowDatePicker(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleDateCancel = () => {
    setShowDatePicker(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // Mutation
  const mutation = useMutation({
    mutationFn: (payload: {
      name?: string;
      supplierName?: string;
      totalPurchased?: number;
      expiryDate?: string;
    }) => SeedService.update(seedId as string, payload),
    onSuccess: async () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await queryClient.invalidateQueries({ queryKey: ["seeds"] });
      await queryClient.invalidateQueries({ queryKey: ["seed", seedId] });
      Alert.alert("Success", "Seed has been updated successfully.", [
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
  });

  // Handlers
  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const handleSave = () => {
    if (!seedId) {
      Alert.alert("Error", "Missing seed ID. Please open this record again.");
      return;
    }

    const trimmedName = name.trim();
    if (!trimmedName) {
      Alert.alert("Validation Error", "Seed name is required.");
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

    const payload: {
      name?: string;
      supplierName?: string;
      totalPurchased?: number;
      expiryDate?: string;
    } = {};

    if (trimmedName !== initialValuesRef.current.name) {
      payload.name = trimmedName;
    }

    if (trimmedSupplier !== initialValuesRef.current.supplierName) {
      payload.supplierName = trimmedSupplier || undefined;
    }

    if (trimmedTotal !== initialValuesRef.current.totalPurchased) {
      payload.totalPurchased = trimmedTotal ? Number(trimmedTotal) : undefined;
    }

    if (expiryDate !== initialValuesRef.current.expiryDate) {
      payload.expiryDate = expiryDate || undefined;
    }

    if (Object.keys(payload).length === 0) {
      Alert.alert("No Changes", "No changes were made to update.");
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    mutation.mutate(payload);
  };

  const handleCancel = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  // Loading state
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <LoadingState />
      </SafeAreaView>
    );
  }

  // Error states
  if (!seedId) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <ErrorState
          message="Missing seed ID. Please open the seed from the list and try again."
          onBack={handleBack}
        />
      </SafeAreaView>
    );
  }

  if (error || !data) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <ErrorState
          message={
            (error as any)?.message ||
            "Unable to fetch seed details. Please try again."
          }
          onBack={handleBack}
        />
      </SafeAreaView>
    );
  }

  const isPending = mutation.isPending;
  const isValid = name.trim().length > 0;

  return (
    <View style={styles.container}>
      {/* Fixed Blue Header */}
      <LinearGradient
        colors={[Colors.primary, Colors.primaryLight || Colors.primary]}
        style={styles.headerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <SafeAreaView edges={["top"]} style={styles.headerContent}>
          <View style={styles.headerRow}>
            <TouchableOpacity
              onPress={handleBack}
              style={styles.backButton}
              activeOpacity={0.7}
            >
              <MaterialIcons name="arrow-back" size={24} color={Colors.white} />
            </TouchableOpacity>

            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle}>Edit Seed</Text>
              <Text style={styles.headerSubtitle} numberOfLines={1}>
                {name || "Update seed information"}
              </Text>
            </View>

            <View style={styles.headerRight} />
          </View>
        </SafeAreaView>
      </LinearGradient>

      {/* Form Content with Keyboard Handling */}
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 16 : 0}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
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

              <FormField
                label="Supplier"
                value={supplierName}
                onChangeText={setSupplierName}
                placeholder="e.g., GreenField Seeds, AgroCorp"
                icon="business"
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
                label="Purchased Quantity"
                value={totalPurchased}
                onChangeText={setTotalPurchased}
                placeholder="e.g., 500"
                icon="shopping-cart"
                keyboardType="numeric"
                helperText="Total seeds purchased"
                testID="purchased-quantity-input"
              />
            </View>

            {/* Expiry Information Section */}
            <View style={styles.formSection}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionHeaderLeft}>
                  <MaterialIcons
                    name="event"
                    size={20}
                    color={Colors.primary}
                  />
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
                  setShowDatePicker(true);
                }}
                testID="expiry-date-field"
              />

              {expiryDate && (
                <View style={styles.expiryNote}>
                  <MaterialIcons
                    name={isExpired(expiryDate) ? "error" : "check-circle"}
                    size={14}
                    color={
                      isExpired(expiryDate) ? Colors.error : Colors.success
                    }
                  />
                  <Text
                    style={[
                      styles.expiryNoteText,
                      {
                        color: isExpired(expiryDate)
                          ? Colors.error
                          : Colors.success,
                      },
                    ]}
                  >
                    {isExpired(expiryDate)
                      ? "This seed has expired"
                      : `Expires on ${formatDisplayDate(expiryDate)}`}
                  </Text>
                </View>
              )}
            </View>
          </View>
          {/*  Footer with Actions */}
          <View style={styles.footer}>
            <TouchableOpacity
              onPress={handleCancel}
              style={styles.cancelButton}
              activeOpacity={0.7}
              disabled={isPending}
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
                    <Text style={styles.saveButtonText}>Saving...</Text>
                  </>
                ) : (
                  <>
                    <MaterialIcons name="save" size={20} color={Colors.white} />
                    <Text style={styles.saveButtonText}>Save Changes</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Date Picker Modal */}
      <DateTimePickerModal
        isVisible={showDatePicker}
        mode="date"
        date={expiryDate ? new Date(expiryDate) : new Date()}
        onConfirm={handleDateConfirm}
        onCancel={handleDateCancel}
        minimumDate={new Date()}
        display={Platform.OS === "ios" ? "spinner" : "default"}
      />
    </View>
  );
}

// ==================== STYLES ====================

const styles = {
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  keyboardView: {
    flex: 1,
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
    maxWidth: 200,
    textAlign: "center" as const,
  },
  headerRight: {
    width: 40,
  },

  // Scroll Content
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: BOTTOM_NAV_HEIGHT + 80,
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
  errorAction: {
    marginTop: 18,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: Colors.primary,
  },
  errorActionText: {
    color: Colors.white,
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

  // Expiry Note
  expiryNote: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 4,
  },
  expiryNoteText: {
    fontSize: 12,
    fontWeight: "500" as const,
  },

  // Footer
  footer: {
    // position: "absolute" as const,
    // bottom: 0,
    // left: 0,
    // right: 0,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    // paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
    marginBottom: BOTTOM_NAV_HEIGHT + Spacing.xl,
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
