// app/(staff)/sowing/create.tsx
import { MaterialIcons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
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
import { SafeAreaView } from "react-native-safe-area-context";
import { CustomerService } from "../../../services/customer.service";
import { CustomerSeedBatchService } from "../../../services/customer-seed-batch.service";
import { Seed, SeedService } from "../../../services/seed.service";
import { SowingService } from "../../../services/sowing.service";
import { Colors } from "../../../theme";
import { formatErrorMessage } from "../../../utils/error";
import { formatQuantityUnit } from "../../../utils/units";

const BOTTOM_NAV_HEIGHT = 80;

// ==================== SEED CARD ====================

interface SeedCardProps {
  seed: Seed;
  isSelected: boolean;
  onSelect: (seed: Seed) => void;
}

const SeedCard = ({ seed, isSelected, onSelect }: SeedCardProps) => {
  const getSeedStock = (seed?: Seed) => {
    const totalPurchased = Number(seed?.totalPurchased ?? 0);
    const seedsUsed = Number(seed?.seedsUsed ?? 0);
    const discardedSeeds = Number(seed?.discardedSeeds ?? 0);
    return Math.max(0, totalPurchased - seedsUsed - discardedSeeds);
  };

  const stock = getSeedStock(seed);
  const quantityUnit = formatQuantityUnit(
    seed?.quantityUnit ?? seed?.plantType?.expectedSeedUnit,
    "SEEDS",
  );
  const isLowStock = stock <= 10 && stock > 0;
  const isOutOfStock = stock <= 0;

  return (
    <TouchableOpacity
      onPress={() => !isOutOfStock && onSelect(seed)}
      style={[
        styles.seedCard,
        isSelected && styles.seedCardSelected,
        isOutOfStock && styles.seedCardDisabled,
      ]}
      activeOpacity={0.7}
      disabled={isOutOfStock}
    >
      <View style={styles.seedCardContent}>
        <View style={styles.seedCardHeader}>
          <View style={styles.seedCardTitleContainer}>
            <View
              style={[
                styles.seedIcon,
                {
                  backgroundColor: isSelected
                    ? `${Colors.success}20`
                    : `${Colors.primary}10`,
                },
              ]}
            >
              <MaterialIcons
                name="grass"
                size={20}
                color={isSelected ? Colors.success : Colors.primary}
              />
            </View>
            <View style={styles.seedInfo}>
              <Text
                style={[styles.seedName, isSelected && styles.seedNameSelected]}
                numberOfLines={1}
              >
                {seed.name}
              </Text>
              {(seed.category || seed.plantType?.name) && (
                <Text style={styles.seedCategory} numberOfLines={1}>
                  {seed.category || seed.plantType?.name}
                </Text>
              )}
            </View>
          </View>

          {isSelected && (
            <View style={styles.selectedBadge}>
              <MaterialIcons
                name="check-circle"
                size={20}
                color={Colors.success}
              />
            </View>
          )}
        </View>

        <View style={styles.seedCardDetails}>
          <View style={styles.seedStock}>
            <MaterialIcons
              name="inventory"
              size={14}
              color={
                isOutOfStock
                  ? Colors.error
                  : isLowStock
                    ? Colors.warning
                    : Colors.success
              }
            />
            <Text
              style={[
                styles.seedStockText,
                isOutOfStock && { color: Colors.error },
                isLowStock && !isOutOfStock && { color: Colors.warning },
              ]}
            >
              Stock: {stock} {quantityUnit}
            </Text>
          </View>

          {isLowStock && !isOutOfStock && (
            <View
              style={[
                styles.stockBadge,
                { backgroundColor: `${Colors.warning}10` },
              ]}
            >
              <Text style={[styles.stockBadgeText, { color: Colors.warning }]}>
                Low Stock
              </Text>
            </View>
          )}

          {isOutOfStock && (
            <View
              style={[
                styles.stockBadge,
                { backgroundColor: `${Colors.error}10` },
              ]}
            >
              <Text style={[styles.stockBadgeText, { color: Colors.error }]}>
                Out of Stock
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
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
  helperText?: string;
  error?: string;
  max?: number;
  unitLabel?: string;
}

const FormField = ({
  label,
  value,
  onChangeText,
  placeholder,
  icon,
  keyboardType = "default",
  required = false,
  helperText,
  error,
  max,
  unitLabel,
}: FormFieldProps) => {
  return (
    <View style={styles.formField}>
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

      <TextInput
        style={[styles.formInput, error && styles.formInputError]}
        placeholder={placeholder}
        placeholderTextColor={Colors.textTertiary}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        editable={true}
      />

      {error ? (
        <View style={styles.fieldErrorContainer}>
          <MaterialIcons name="error" size={14} color={Colors.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : max && value ? (
        <View style={styles.hintContainer}>
          <MaterialIcons name="info" size={14} color={Colors.textTertiary} />
          <Text style={styles.hintText}>
            Maximum available: {max} {unitLabel || "units"}
          </Text>
        </View>
      ) : null}
    </View>
  );
};

// ==================== LOADING STATE ====================

const LoadingState = () => (
  <View style={styles.centerContainer}>
    <ActivityIndicator size="large" color={Colors.primary} />
    <Text style={styles.loadingText}>Loading seeds...</Text>
  </View>
);

// ==================== ERROR STATE ====================

interface ErrorStateProps {
  message: string;
  onRetry: () => void;
  onBack: () => void;
}

const ErrorState = ({ message, onRetry, onBack }: ErrorStateProps) => (
  <View style={styles.container}>
    <LinearGradient
      colors={[Colors.primary, Colors.primaryLight || Colors.primary]}
      style={styles.errorHeaderGradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
    >
      <View style={styles.errorHeaderContent}>
        <TouchableOpacity
          onPress={onBack}
          style={styles.errorBackButton}
          activeOpacity={0.7}
        >
          <MaterialIcons name="arrow-back" size={20} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.errorHeaderTitle}>Record Sowing</Text>
        <View style={styles.errorHeaderSpacer} />
      </View>
    </LinearGradient>

    <View style={styles.errorContainer}>
      <View style={styles.errorIconContainer}>
        <MaterialIcons name="error-outline" size={48} color={Colors.error} />
      </View>
      <Text style={styles.errorTitle}>Failed to Load Seeds</Text>
      <Text style={styles.errorMessage}>{message}</Text>
      <TouchableOpacity
        onPress={onRetry}
        style={styles.retryButton}
        activeOpacity={0.7}
      >
        <LinearGradient
          colors={[Colors.primary, Colors.primaryLight || Colors.primary]}
          style={styles.retryGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <MaterialIcons name="refresh" size={18} color={Colors.white} />
          <Text style={styles.retryButtonText}>Try Again</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  </View>
);

// ==================== MAIN COMPONENT ====================

export default function StaffSowingCreate() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Form state
  const [selectedSeedId, setSelectedSeedId] = useState<string | null>(null);
  const [selectedCustomerSeedBatchId, setSelectedCustomerSeedBatchId] = useState<string | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [showCustomerPicker, setShowCustomerPicker] = useState(false);
  const [quantity, setQuantity] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch seeds
  const {
    data: seedsData,
    isLoading: loadingSeeds,
    error: seedsError,
    refetch: refetchSeeds,
  } = useQuery({
    queryKey: ["staff-seeds"],
    queryFn: SeedService.getAll,
    staleTime: 60000,
    retry: 2,
  });
  const { data: customersData } = useQuery({
    queryKey: ["customers"],
    queryFn: CustomerService.getAll,
    staleTime: 60000,
    retry: 1,
  });
  const { data: customerSeedBatchesData } = useQuery({
    queryKey: ["customer-seed-batches"],
    queryFn: CustomerSeedBatchService.getAll,
    staleTime: 30000,
    retry: 1
  });

  const seeds = useMemo<Seed[]>(() => {
    if (!seedsData) return [];
    return Array.isArray(seedsData) ? seedsData : (seedsData.data ?? []);
  }, [seedsData]);
  const customers = useMemo(
    () => (Array.isArray(customersData) ? customersData : []),
    [customersData],
  );
  const selectedCustomer = useMemo(
    () => customers.find((c: any) => c?._id === selectedCustomerId),
    [customers, selectedCustomerId],
  );
  const customerSeedBatches = useMemo(
    () => (Array.isArray(customerSeedBatchesData) ? customerSeedBatchesData : []),
    [customerSeedBatchesData]
  );
  const farmerSeedBatches = useMemo(
    () =>
      customerSeedBatches.filter((batch: any) => {
        if (!selectedCustomerId) return false;
        const ownerId =
          typeof batch?.customerId === "object" ? batch.customerId?._id : batch?.customerId;
        const status = String(batch?.status || "").toUpperCase();
        return (
          String(ownerId || "") === String(selectedCustomerId) &&
          !["COLLECTED", "DISCARDED"].includes(status)
        );
      }),
    [customerSeedBatches, selectedCustomerId]
  );
  const selectedFarmerSeedBatch = useMemo(
    () => farmerSeedBatches.find((batch: any) => batch?._id === selectedCustomerSeedBatchId),
    [farmerSeedBatches, selectedCustomerSeedBatchId]
  );
  const filteredCustomers = useMemo(() => {
    const term = customerSearch.trim().toLowerCase();
    if (!term) return customers.slice(0, 20);
    return customers
      .filter((customer: any) => {
        const name = String(customer?.name || "").toLowerCase();
        const mobile = String(customer?.mobileNumber || "").toLowerCase();
        return name.includes(term) || mobile.includes(term);
      })
      .slice(0, 30);
  }, [customerSearch, customers]);

  const selectedSeed = useMemo(
    () => seeds?.find((s) => s._id === selectedSeedId),
    [seeds, selectedSeedId],
  );
  const isFarmerSeedMode = !!selectedCustomerSeedBatchId;
  const selectedSeedUnit = formatQuantityUnit(
    selectedSeed?.quantityUnit ??
      selectedSeed?.plantType?.expectedSeedUnit ??
      undefined,
    "SEEDS",
  );

  // Get seed stock
  const getSeedStock = (seed?: Seed) => {
    const totalPurchased = Number(seed?.totalPurchased ?? 0);
    const seedsUsed = Number(seed?.seedsUsed ?? 0);
    const discardedSeeds = Number(seed?.discardedSeeds ?? 0);
    return Math.max(0, totalPurchased - seedsUsed - discardedSeeds);
  };

  const farmerBatchRemaining = useMemo(() => {
    if (!selectedFarmerSeedBatch) return 0;
    return Math.max(
      Number(selectedFarmerSeedBatch?.seedQuantity || 0) -
        Number(selectedFarmerSeedBatch?.seedsSown || 0),
      0
    );
  }, [selectedFarmerSeedBatch]);

  const maxQuantity = isFarmerSeedMode ? farmerBatchRemaining : getSeedStock(selectedSeed);
  const numericQuantity = Number(quantity);
  const hasSourceSelected = isFarmerSeedMode || !!selectedSeedId;
  const isQuantityValid =
    !isNaN(numericQuantity) &&
    numericQuantity > 0 &&
    numericQuantity <= maxQuantity;

  // Create sowing mutation
  const mutation = useMutation({
    mutationFn: async () => {
      if (!hasSourceSelected || !isQuantityValid) {
        throw new Error("Invalid sowing data");
      }
      return SowingService.create({
        seedId: selectedSeedId || undefined,
        customerSeedBatchId: selectedCustomerSeedBatchId || undefined,
        quantity: numericQuantity,
        customerId: selectedCustomerId || undefined,
      });
    },
    onSuccess: async () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["staff-seeds"] }),
        queryClient.invalidateQueries({ queryKey: ["staff-sowings"] }),
        queryClient.invalidateQueries({ queryKey: ["customer-seed-batches"] }),
        queryClient.invalidateQueries({ queryKey: ["staff-dashboard"] }),
      ]);

      Alert.alert(
        "Success",
        selectedCustomerId
          ? "Sowing recorded for selected farmer. Inventory will be created after germination."
          : "Sowing recorded successfully. Inventory will be created after germination.",
        [
          {
            text: "OK",
            onPress: () => router.back(),
            style: "default",
          },
        ],
      );
    },
    onError: (err: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Error", formatErrorMessage(err));
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

  const handleSeedSelect = (seed: Seed) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedSeedId(seed._id);
    setSelectedCustomerSeedBatchId(null);
    const expected = Number(seed?.plantType?.expectedSeedQtyPerBatch);
    const stock = getSeedStock(seed);
    if (Number.isFinite(expected) && expected > 0 && stock > 0) {
      setQuantity(String(Math.min(Math.max(1, Math.round(expected)), stock)));
      return;
    }
    setQuantity("");
  };

  const handleSubmit = () => {
    if (!hasSourceSelected || !isQuantityValid || isSubmitting) return;

    setIsSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    mutation.mutate();
  };

  // Validation
  const getQuantityError = () => {
    if (!quantity) return null;
    if (numericQuantity <= 0) return "Quantity must be greater than 0";
    if (numericQuantity > maxQuantity)
      return `Maximum available is ${maxQuantity} ${selectedSeedUnit}`;
    return null;
  };

  const quantityError = getQuantityError();
  const isValid = hasSourceSelected && isQuantityValid;
  const isPending = mutation.isPending || isSubmitting;

  // Loading state
  if (loadingSeeds) {
    return (
      <SafeAreaView style={styles.container} edges={["left", "right"]}>
        <LoadingState />
      </SafeAreaView>
    );
  }

  // Error state
  if (seedsError) {
    return (
      <View style={styles.container}>
        <ErrorState
          message={
            (seedsError as any)?.message ||
            "Unable to fetch seeds. Please try again."
          }
          onRetry={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            refetchSeeds();
          }}
          onBack={handleBack}
        />
      </View>
    );
  }

  const availableSeeds = seeds.filter((s) => getSeedStock(s) > 0);

  return (
    <View style={styles.container}>
      {/* Fixed Blue Header */}
      <LinearGradient
        colors={[Colors.primary, Colors.primaryLight || Colors.primary]}
        style={styles.headerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerRow}>
            <TouchableOpacity
              onPress={handleBack}
              style={styles.backButton}
              activeOpacity={0.7}
            >
              <MaterialIcons name="arrow-back" size={24} color={Colors.white} />
            </TouchableOpacity>

            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle}>Record Sowing</Text>
              <Text style={styles.headerSubtitle}>
                {availableSeeds.length}{" "}
                {availableSeeds.length === 1 ? "seed" : "seeds"} available
              </Text>
            </View>

            <View style={styles.headerRight} />
          </View>
        </View>
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
          keyboardDismissMode="interactive"
        >
          <View style={styles.formCard}>
            {/* Seed Selection Section */}
            <View style={styles.formSection}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionHeaderLeft}>
                  <MaterialIcons
                    name="grass"
                    size={20}
                    color={Colors.primary}
                  />
                  <Text style={styles.sectionTitle}>Select Seed</Text>
                  <Text style={styles.requiredStar}>*</Text>
                </View>
                {selectedSeedId && (
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

              <View style={styles.seedsContainer}>
                {availableSeeds.length > 0 ? (
                  availableSeeds.map((seed) => (
                    <SeedCard
                      key={seed._id}
                      seed={seed}
                      isSelected={selectedSeedId === seed._id}
                      onSelect={handleSeedSelect}
                    />
                  ))
                ) : (
                  <View style={styles.emptySeedsContainer}>
                    <View style={styles.emptySeedsIconContainer}>
                      <MaterialIcons
                        name="grass"
                        size={32}
                        color={Colors.textTertiary}
                      />
                    </View>
                    <Text style={styles.emptySeedsTitle}>
                      No Seeds Available
                    </Text>
                    <Text style={styles.emptySeedsMessage}>
                      There are no seeds in stock. Please add seeds to inventory
                      first.
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Farmer Selection Section */}
            <View style={styles.formSection}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionHeaderLeft}>
                  <MaterialIcons
                    name="person"
                    size={20}
                    color={Colors.primary}
                  />
                  <Text style={styles.sectionTitle}>Farmer (Optional)</Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={() => setShowCustomerPicker((prev) => !prev)}
                activeOpacity={0.7}
                style={styles.customerSelector}
              >
                <View style={styles.customerSelectorContent}>
                  <Text style={styles.customerSelectorLabel}>
                    {selectedCustomer?.name || "Walk-in / Nursery Sowing"}
                  </Text>
                  <Text style={styles.customerSelectorMeta}>
                    {selectedCustomer?.mobileNumber || "No farmer selected"}
                  </Text>
                </View>
                <MaterialIcons
                  name={showCustomerPicker ? "expand-less" : "expand-more"}
                  size={22}
                  color={Colors.textSecondary}
                />
              </TouchableOpacity>

              {showCustomerPicker && (
                <View style={styles.customerPickerCard}>
                  <View style={styles.customerSearchWrap}>
                    <MaterialIcons name="search" size={16} color={Colors.textSecondary} />
                    <TextInput
                      value={customerSearch}
                      onChangeText={setCustomerSearch}
                      placeholder="Search farmer by name or mobile"
                      placeholderTextColor={Colors.textTertiary}
                      style={styles.customerSearchInput}
                    />
                  </View>

                  <TouchableOpacity
                    onPress={() => {
                      setSelectedCustomerId("");
                      setSelectedCustomerSeedBatchId(null);
                      setShowCustomerPicker(false);
                    }}
                    activeOpacity={0.7}
                    style={styles.customerOption}
                  >
                    <MaterialIcons
                      name={!selectedCustomerId ? "check-circle" : "radio-button-unchecked"}
                      size={16}
                      color={!selectedCustomerId ? Colors.success : Colors.textSecondary}
                    />
                    <Text style={styles.customerOptionText}>Walk-in / Nursery Sowing</Text>
                  </TouchableOpacity>

                  <ScrollView
                    style={styles.customerListScroll}
                    nestedScrollEnabled
                    keyboardShouldPersistTaps="handled"
                  >
                    {filteredCustomers.map((customer: any) => {
                      const isSelected = selectedCustomerId === customer._id;
                      return (
                        <TouchableOpacity
                          key={customer._id}
                          onPress={() => {
                            setSelectedCustomerId(customer._id);
                            setSelectedCustomerSeedBatchId(null);
                            setShowCustomerPicker(false);
                          }}
                          activeOpacity={0.7}
                          style={styles.customerOption}
                        >
                          <MaterialIcons
                            name={isSelected ? "check-circle" : "radio-button-unchecked"}
                            size={16}
                            color={isSelected ? Colors.success : Colors.textSecondary}
                          />
                          <View style={styles.customerOptionContent}>
                            <Text style={styles.customerOptionText}>{customer?.name || "Unnamed Farmer"}</Text>
                            {customer?.mobileNumber ? (
                              <Text style={styles.customerOptionMeta}>{customer.mobileNumber}</Text>
                            ) : null}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}
            </View>

            {selectedCustomerId && (
              <View style={styles.formSection}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionHeaderLeft}>
                    <MaterialIcons name="grain" size={20} color={Colors.primary} />
                    <Text style={styles.sectionTitle}>Farmer Seed Batch (Optional)</Text>
                  </View>
                </View>

                <View style={styles.customerPickerCard}>
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedCustomerSeedBatchId(null);
                    }}
                    activeOpacity={0.7}
                    style={styles.customerOption}
                  >
                    <MaterialIcons
                      name={!selectedCustomerSeedBatchId ? "check-circle" : "radio-button-unchecked"}
                      size={16}
                      color={!selectedCustomerSeedBatchId ? Colors.success : Colors.textSecondary}
                    />
                    <Text style={styles.customerOptionText}>Use Nursery Seed Inventory</Text>
                  </TouchableOpacity>

                  {farmerSeedBatches.length === 0 ? (
                    <Text style={styles.customerOptionMeta}>
                      No active farmer seed batches found for selected farmer.
                    </Text>
                  ) : (
                    farmerSeedBatches.map((batch: any) => {
                      const isSelected = selectedCustomerSeedBatchId === batch._id;
                      const plantName =
                        typeof batch?.plantTypeId === "object"
                          ? batch.plantTypeId?.name
                          : "Plant";
                      const remaining = Math.max(
                        Number(batch?.seedQuantity || 0) - Number(batch?.seedsSown || 0),
                        0
                      );
                      return (
                        <TouchableOpacity
                          key={batch._id}
                          onPress={() => {
                            setSelectedCustomerSeedBatchId(batch._id);
                            setSelectedSeedId(null);
                            const expected = Number(
                              typeof batch?.plantTypeId === "object"
                                ? batch.plantTypeId?.expectedSeedQtyPerBatch
                                : 0
                            );
                            if (Number.isFinite(expected) && expected > 0 && remaining > 0) {
                              setQuantity(String(Math.min(Math.max(1, Math.round(expected)), remaining)));
                            } else {
                              setQuantity("");
                            }
                          }}
                          activeOpacity={0.7}
                          style={styles.customerOption}
                        >
                          <MaterialIcons
                            name={isSelected ? "check-circle" : "radio-button-unchecked"}
                            size={16}
                            color={isSelected ? Colors.success : Colors.textSecondary}
                          />
                          <View style={styles.customerOptionContent}>
                            <Text style={styles.customerOptionText}>
                              {plantName || "Plant"} • Remaining {remaining}
                            </Text>
                            <Text style={styles.customerOptionMeta}>
                              Status: {batch?.status || "RECEIVED"}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })
                  )}
                </View>
              </View>
            )}

            {/* Quantity Section */}
            {(selectedSeed || selectedFarmerSeedBatch) && (
              <View style={styles.formSection}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionHeaderLeft}>
                    <MaterialIcons
                      name="numbers"
                      size={20}
                      color={Colors.primary}
                    />
                    <Text style={styles.sectionTitle}>Sowing Quantity</Text>
                    <Text style={styles.requiredStar}>*</Text>
                  </View>
                </View>

                <FormField
                  label="Quantity"
                  value={quantity}
                  onChangeText={(text) =>
                    setQuantity(text.replace(/[^\d]/g, ""))
                  }
                  placeholder={`Enter quantity (max ${maxQuantity} ${selectedSeedUnit})`}
                  icon="inventory"
                  keyboardType="numeric"
                  required
                  error={quantityError || undefined}
                  max={maxQuantity}
                  unitLabel={selectedSeedUnit}
                />
                {selectedSeed?.plantType?.expectedSeedQtyPerBatch ? (
                  <View style={styles.hintContainer}>
                    <MaterialIcons name="auto-awesome" size={12} color={Colors.info} />
                    <Text style={styles.hintText}>
                      Auto-selected from plant setup ({selectedSeed?.plantType?.expectedSeedQtyPerBatch} {selectedSeedUnit}).
                    </Text>
                  </View>
                ) : null}

                {(selectedSeed?.plantType?.name ||
                  (typeof selectedFarmerSeedBatch?.plantTypeId === "object" &&
                    selectedFarmerSeedBatch?.plantTypeId?.name)) && (
                  <View style={styles.seedInfoCard}>
                    <View style={styles.seedInfoRow}>
                      <MaterialIcons
                        name="spa"
                        size={14}
                        color={Colors.textSecondary}
                      />
                      <Text style={styles.seedInfoLabel}>Plant Type:</Text>
                      <Text style={styles.seedInfoValue}>
                        {selectedSeed?.plantType?.name ||
                          (typeof selectedFarmerSeedBatch?.plantTypeId === "object"
                            ? selectedFarmerSeedBatch?.plantTypeId?.name
                            : "-")}
                      </Text>
                    </View>
                    {selectedSeed?.supplierName && (
                      <View style={styles.seedInfoRow}>
                        <MaterialIcons
                          name="business"
                          size={14}
                          color={Colors.textSecondary}
                        />
                        <Text style={styles.seedInfoLabel}>Supplier:</Text>
                        <Text style={styles.seedInfoValue}>
                          {selectedSeed.supplierName}
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Footer Buttons */}
          <View style={styles.footer}>
            <TouchableOpacity
              onPress={handleBack}
              style={styles.cancelButton}
              activeOpacity={0.7}
              disabled={isPending}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleSubmit}
              disabled={!isValid || isPending}
              style={[
                styles.submitButton,
                (!isValid || isPending) && styles.submitButtonDisabled,
              ]}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={[Colors.success, "#059669"]}
                style={styles.submitGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {isPending ? (
                  <>
                    <ActivityIndicator size="small" color={Colors.white} />
                    <Text style={styles.submitButtonText}>Recording...</Text>
                  </>
                ) : (
                  <>
                    <MaterialIcons
                      name="check-circle"
                      size={20}
                      color={Colors.white}
                    />
                    <Text style={styles.submitButtonText}>Record Sowing</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Bottom Spacer for Navigation */}
          <View style={styles.bottomNavSpacer} />
        </ScrollView>
      </KeyboardAvoidingView>
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
    zIndex: 10,
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
    paddingBottom: BOTTOM_NAV_HEIGHT + 20,
  },
  bottomNavSpacer: {
    height: BOTTOM_NAV_HEIGHT,
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
  requiredStar: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: Colors.error,
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

  // Form Field
  formField: {
    marginBottom: 16,
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
  formInputError: {
    borderColor: Colors.error,
  },
  fieldErrorContainer: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
    marginTop: 6,
  },
  errorText: {
    fontSize: 12,
    color: Colors.error,
  },
  hintContainer: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
    marginTop: 6,
  },
  hintText: {
    fontSize: 12,
    color: "#6B7280",
  },
  customerSelector: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    backgroundColor: Colors.white,
  },
  customerSelectorContent: {
    flex: 1,
    paddingRight: 8,
  },
  customerSelectorLabel: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: "#111827",
  },
  customerSelectorMeta: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  customerPickerCard: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    backgroundColor: "#F9FAFB",
    padding: 10,
    gap: 8,
    maxHeight: 280,
  },
  customerListScroll: {
    maxHeight: 180,
  },
  customerSearchWrap: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: Colors.white,
  },
  customerSearchInput: {
    flex: 1,
    fontSize: 13,
    color: "#111827",
    padding: 0,
  },
  customerOption: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    backgroundColor: Colors.white,
  },
  customerOptionContent: {
    flex: 1,
  },
  customerOptionText: {
    fontSize: 13,
    color: "#111827",
    fontWeight: "500" as const,
  },
  customerOptionMeta: {
    marginTop: 2,
    fontSize: 11,
    color: "#6B7280",
  },

  // Seeds Container
  seedsContainer: {
    gap: 12,
  },

  // Seed Card
  seedCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden" as const,
  },
  seedCardSelected: {
    borderColor: Colors.success,
    borderWidth: 2,
    backgroundColor: `${Colors.success}05`,
  },
  seedCardDisabled: {
    opacity: 0.6,
    backgroundColor: "#F9FAFB",
  },
  seedCardContent: {
    padding: 16,
  },
  seedCardHeader: {
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
    justifyContent: "space-between" as const,
    marginBottom: 12,
  },
  seedCardTitleContainer: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 12,
    flex: 1,
  },
  seedIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  seedInfo: {
    flex: 1,
  },
  seedName: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: "#111827",
    marginBottom: 4,
  },
  seedNameSelected: {
    color: Colors.success,
  },
  seedCategory: {
    fontSize: 12,
    color: "#6B7280",
  },
  selectedBadge: {
    marginLeft: 8,
  },
  seedCardDetails: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    paddingLeft: 56,
  },
  seedStock: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
  },
  seedStockText: {
    fontSize: 13,
    color: "#374151",
  },
  stockBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  stockBadgeText: {
    fontSize: 10,
    fontWeight: "600" as const,
  },

  // Empty Seeds
  emptySeedsContainer: {
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  emptySeedsIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#F3F4F6",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginBottom: 16,
  },
  emptySeedsTitle: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: "#111827",
    marginBottom: 8,
  },
  emptySeedsMessage: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center" as const,
    lineHeight: 20,
  },

  // Seed Info Card
  seedInfoCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
  },
  seedInfoRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    marginBottom: 4,
  },
  seedInfoLabel: {
    fontSize: 12,
    color: "#6B7280",
    width: 60,
  },
  seedInfoValue: {
    fontSize: 13,
    fontWeight: "500" as const,
    color: "#111827",
    flex: 1,
  },

  // Footer
  footer: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    gap: 12,
    marginTop: "auto" as const,
    paddingTop: 12,
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
  submitButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    overflow: "hidden" as const,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitGradient: {
    flex: 1,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 8,
  },
  submitButtonText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: "600" as const,
  },

  // Error Header Styles
  errorHeaderGradient: {
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  errorHeaderContent: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  errorBackButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  errorHeaderTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "600" as const,
    color: Colors.white,
    textAlign: "center" as const,
  },
  errorHeaderSpacer: {
    width: 40,
  },

  // Error State
  errorContainer: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    padding: 24,
  },
  errorIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#FEF2F2",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "600" as const,
    color: "#DC2626",
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center" as const,
    marginBottom: 24,
    lineHeight: 20,
    paddingHorizontal: 24,
  },
  retryButton: {
    borderRadius: 12,
    overflow: "hidden" as const,
  },
  retryGradient: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingHorizontal: 24,
    paddingVertical: 12,
    gap: 8,
  },
  retryButtonText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: "600" as const,
  },
} as const;
