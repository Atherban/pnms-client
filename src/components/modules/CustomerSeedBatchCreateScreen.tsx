import { MaterialIcons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useState, useMemo } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { CustomerSeedBatchService } from "@/src/services/customer-seed-batch.service";
import { CustomerService } from "@/src/services/customer.service";
import { PlantTypeService } from "@/src/services/plant-type.service";
import { Colors, Spacing } from "@/src/theme";

type Props = {
  title: string;
};

type SelectionMode = "customer" | "plant";

const formatDateLabel = (value?: string) => {
  if (!value) return "Select expected ready date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export default function CustomerSeedBatchCreateScreen({ title }: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectionMode, setSelectionMode] = useState<SelectionMode | null>(null);

  const { data: customersData, isLoading: isLoadingCustomers } = useQuery({
    queryKey: ["customers"],
    queryFn: CustomerService.getAll,
  });

  const { data: plantsData, isLoading: isLoadingPlants } = useQuery({
    queryKey: ["plant-types"],
    queryFn: PlantTypeService.getAll,
  });

  const customers = useMemo(
    () => (Array.isArray(customersData) ? customersData : []),
    [customersData]
  );

  const plants = useMemo(
    () => (Array.isArray(plantsData) ? plantsData : []),
    [plantsData]
  );

  const [customerId, setCustomerId] = useState<string>("");
  const [plantTypeId, setPlantTypeId] = useState<string>("");
  const [seedQuantity, setSeedQuantity] = useState("");
  const [serviceChargeEstimate, setServiceChargeEstimate] = useState("");
  const [discountAmount, setDiscountAmount] = useState("");
  const [expectedReadyDate, setExpectedReadyDate] = useState("");
  const [showExpectedDatePicker, setShowExpectedDatePicker] = useState(false);

  const selectedCustomer = useMemo(
    () => customers.find((c: any) => c._id === customerId),
    [customers, customerId]
  );

  const selectedPlant = useMemo(
    () => plants.find((p: any) => (p._id || p.id) === plantTypeId),
    [plants, plantTypeId]
  );

  const filteredCustomers = useMemo(() => {
    if (!searchQuery) return customers.slice(0, 20);
    const query = searchQuery.toLowerCase();
    return customers
      .filter(
        (c: any) =>
          c.name?.toLowerCase().includes(query) ||
          c.mobileNumber?.includes(query)
      )
      .slice(0, 20);
  }, [customers, searchQuery]);

  const filteredPlants = useMemo(() => {
    if (!searchQuery) return plants.slice(0, 20);
    const query = searchQuery.toLowerCase();
    return plants
      .filter(
        (p: any) =>
          p.name?.toLowerCase().includes(query) ||
          p.category?.toLowerCase().includes(query)
      )
      .slice(0, 20);
  }, [plants, searchQuery]);

  const mutation = useMutation({
    mutationFn: () =>
      CustomerSeedBatchService.create({
        customerId,
        plantTypeId,
        seedQuantity: Number(seedQuantity || 0),
        serviceChargeEstimate: Number(serviceChargeEstimate || 0),
        discountAmount: Number(discountAmount || 0),
        expectedReadyDate: expectedReadyDate || undefined,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["customer-seed-batches"] });
      Alert.alert("✅ Success", "Customer seed batch created successfully.");
      router.back();
    },
    onError: (error: any) => {
      Alert.alert(
        "❌ Creation Failed",
        error?.response?.data?.message || error?.message || "Unable to create batch"
      );
    },
  });

  const isValid =
    customerId &&
    plantTypeId &&
    Number(seedQuantity) > 0;

  const handleBack = () => {
    if (selectionMode) {
      setSelectionMode(null);
      setSearchQuery("");
    } else {
      router.back();
    }
  };

  const handleSelectCustomer = (id: string) => {
    setCustomerId(id);
    setSelectionMode(null);
    setSearchQuery("");
  };

  const handleSelectPlant = (id: string) => {
    setPlantTypeId(id);
    setSelectionMode(null);
    setSearchQuery("");
  };

  const isPending = mutation.isPending;

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={[Colors.primary, Colors.primaryLight || Colors.primary]}
        style={styles.headerGradient}
      >
        <View style={styles.headerContent}>
          <Pressable onPress={handleBack} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={22} color={Colors.white} />
          </Pressable>
          <Text style={styles.headerTitle}>
            {selectionMode
              ? selectionMode === "customer"
                ? "Select Customer"
                : "Select Plant"
              : title}
          </Text>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {selectionMode ? (
            // Selection View
            <View style={styles.selectionContainer}>
              {/* Search Bar */}
              <View style={styles.searchContainer}>
                <MaterialIcons name="search" size={20} color={Colors.textSecondary} />
                <TextInput
                  style={styles.searchInput}
                  placeholder={`Search ${selectionMode}s...`}
                  placeholderTextColor={Colors.textTertiary}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoFocus
                />
                {searchQuery.length > 0 && (
                  <Pressable onPress={() => setSearchQuery("")} style={styles.searchClear}>
                    <MaterialIcons name="close" size={18} color={Colors.textSecondary} />
                  </Pressable>
                )}
              </View>

              {/* Results */}
              {selectionMode === "customer" && (
                <>
                  {isLoadingCustomers ? (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator size="large" color={Colors.primary} />
                      <Text style={styles.loadingText}>Loading customers...</Text>
                    </View>
                  ) : (
                    <View style={styles.resultsList}>
                      {filteredCustomers.map((customer: any) => (
                        <Pressable
                          key={customer._id}
                          onPress={() => handleSelectCustomer(customer._id)}
                          style={styles.resultItem}
                        >
                          <View style={styles.resultItemLeft}>
                            <View style={styles.resultIcon}>
                              <MaterialIcons name="person" size={20} color={Colors.primary} />
                            </View>
                            <View>
                              <Text style={styles.resultName}>{customer.name}</Text>
                              {customer.mobileNumber && (
                                <Text style={styles.resultDetail}>{customer.mobileNumber}</Text>
                              )}
                            </View>
                          </View>
                          <MaterialIcons name="chevron-right" size={20} color={Colors.textSecondary} />
                        </Pressable>
                      ))}
                      {filteredCustomers.length === 0 && (
                        <View style={styles.emptyResults}>
                          <MaterialIcons name="search-off" size={40} color={Colors.textTertiary} />
                          <Text style={styles.emptyResultsText}>No customers found</Text>
                        </View>
                      )}
                    </View>
                  )}
                </>
              )}

              {selectionMode === "plant" && (
                <>
                  {isLoadingPlants ? (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator size="large" color={Colors.primary} />
                      <Text style={styles.loadingText}>Loading plants...</Text>
                    </View>
                  ) : (
                    <View style={styles.resultsList}>
                      {filteredPlants.map((plant: any) => {
                        const plantId = plant._id || plant.id;
                        return (
                          <Pressable
                            key={plantId}
                            onPress={() => handleSelectPlant(plantId)}
                            style={styles.resultItem}
                          >
                            <View style={styles.resultItemLeft}>
                              <View style={styles.resultIcon}>
                                <MaterialIcons name="spa" size={20} color={Colors.success} />
                              </View>
                              <View>
                                <Text style={styles.resultName}>{plant.name}</Text>
                                {plant.category && (
                                  <Text style={styles.resultDetail}>{plant.category}</Text>
                                )}
                              </View>
                            </View>
                            <MaterialIcons name="chevron-right" size={20} color={Colors.textSecondary} />
                          </Pressable>
                        );
                      })}
                      {filteredPlants.length === 0 && (
                        <View style={styles.emptyResults}>
                          <MaterialIcons name="search-off" size={40} color={Colors.textTertiary} />
                          <Text style={styles.emptyResultsText}>No plants found</Text>
                        </View>
                      )}
                    </View>
                  )}
                </>
              )}
            </View>
          ) : (
            // Form View
            <View style={styles.formContainer}>
              {/* Selected Customer */}
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Customer</Text>
                {selectedCustomer ? (
                  <Pressable
                    onPress={() => setSelectionMode("customer")}
                    style={styles.selectedItem}
                  >
                    <View style={styles.selectedItemLeft}>
                      <View style={[styles.selectedIcon, { backgroundColor: Colors.primary + "10" }]}>
                        <MaterialIcons name="person" size={20} color={Colors.primary} />
                      </View>
                      <View>
                        <Text style={styles.selectedName}>{selectedCustomer.name}</Text>
                        {selectedCustomer.mobileNumber && (
                          <Text style={styles.selectedDetail}>{selectedCustomer.mobileNumber}</Text>
                        )}
                      </View>
                    </View>
                    <MaterialIcons name="edit" size={18} color={Colors.textSecondary} />
                  </Pressable>
                ) : (
                  <Pressable
                    onPress={() => setSelectionMode("customer")}
                    style={styles.selectButton}
                  >
                    <MaterialIcons name="person-add" size={20} color={Colors.primary} />
                    <Text style={styles.selectButtonText}>Select Customer</Text>
                  </Pressable>
                )}
              </View>

              {/* Selected Plant */}
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Plant Type</Text>
                {selectedPlant ? (
                  <Pressable
                    onPress={() => setSelectionMode("plant")}
                    style={styles.selectedItem}
                  >
                    <View style={styles.selectedItemLeft}>
                      <View style={[styles.selectedIcon, { backgroundColor: Colors.success + "10" }]}>
                        <MaterialIcons name="spa" size={20} color={Colors.success} />
                      </View>
                      <View>
                        <Text style={styles.selectedName}>{selectedPlant.name}</Text>
                        {selectedPlant.category && (
                          <Text style={styles.selectedDetail}>{selectedPlant.category}</Text>
                        )}
                      </View>
                    </View>
                    <MaterialIcons name="edit" size={18} color={Colors.textSecondary} />
                  </Pressable>
                ) : (
                  <Pressable
                    onPress={() => setSelectionMode("plant")}
                    style={styles.selectButton}
                  >
                    <MaterialIcons name="spa" size={20} color={Colors.success} />
                    <Text style={styles.selectButtonText}>Select Plant Type</Text>
                  </Pressable>
                )}
              </View>

              {/* Form Fields */}
              <View style={styles.formSection}>
                <Text style={styles.inputLabel}>Seed Quantity *</Text>
                <View style={styles.inputContainer}>
                  <MaterialIcons name="inventory" size={20} color={Colors.textSecondary} />
                  <TextInput
                    value={seedQuantity}
                    onChangeText={(value) => setSeedQuantity(value.replace(/[^\d]/g, ""))}
                    keyboardType="numeric"
                    placeholder="e.g. 1000"
                    placeholderTextColor={Colors.textTertiary}
                    style={styles.input}
                  />
                </View>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.inputLabel}>Service Charge Estimate (₹)</Text>
                <View style={styles.inputContainer}>
                  <MaterialIcons name="currency-rupee" size={20} color={Colors.textSecondary} />
                  <TextInput
                    value={serviceChargeEstimate}
                    onChangeText={(value) => setServiceChargeEstimate(value.replace(/[^\d.]/g, ""))}
                    keyboardType="numeric"
                    placeholder="e.g. 1200"
                    placeholderTextColor={Colors.textTertiary}
                    style={styles.input}
                  />
                </View>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.inputLabel}>Discount Amount (₹)</Text>
                <View style={styles.inputContainer}>
                  <MaterialIcons name="discount" size={20} color={Colors.textSecondary} />
                  <TextInput
                    value={discountAmount}
                    onChangeText={(value) => setDiscountAmount(value.replace(/[^\d.]/g, ""))}
                    keyboardType="numeric"
                    placeholder="e.g. 200"
                    placeholderTextColor={Colors.textTertiary}
                    style={styles.input}
                  />
                </View>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.inputLabel}>Expected Ready Date</Text>
                <Pressable
                  onPress={() => setShowExpectedDatePicker(true)}
                  style={styles.inputContainer}
                >
                  <MaterialIcons name="calendar-today" size={20} color={Colors.textSecondary} />
                  <Text
                    style={
                      expectedReadyDate
                        ? styles.dateInputValue
                        : styles.dateInputPlaceholder
                    }
                  >
                    {formatDateLabel(expectedReadyDate)}
                  </Text>
                  {expectedReadyDate ? (
                    <Pressable
                      onPress={(event) => {
                        event.stopPropagation();
                        setExpectedReadyDate("");
                      }}
                      style={styles.dateClearButton}
                    >
                      <MaterialIcons name="close" size={18} color={Colors.textSecondary} />
                    </Pressable>
                  ) : null}
                </Pressable>
              </View>

              {/* Summary */}
              {selectedCustomer && selectedPlant && Number(seedQuantity) > 0 && (
                <View style={styles.summaryContainer}>
                  <Text style={styles.summaryTitle}>Summary</Text>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Customer</Text>
                    <Text style={styles.summaryValue}>{selectedCustomer.name}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Plant</Text>
                    <Text style={styles.summaryValue}>{selectedPlant.name}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Seed Quantity</Text>
                    <Text style={styles.summaryValue}>{Number(seedQuantity).toLocaleString("en-IN")} seeds</Text>
                  </View>
                  {Number(serviceChargeEstimate) > 0 && (
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Service Charge</Text>
                      <Text style={styles.summaryValue}>₹{Number(serviceChargeEstimate).toLocaleString("en-IN")}</Text>
                    </View>
                  )}
                  {Number(discountAmount) > 0 && (
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Discount</Text>
                      <Text style={[styles.summaryValue, { color: Colors.success }]}>
                        -₹{Number(discountAmount).toLocaleString("en-IN")}
                      </Text>
                    </View>
                  )}
                  {expectedReadyDate && (
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Ready By</Text>
                      <Text style={styles.summaryValue}>{expectedReadyDate}</Text>
                    </View>
                  )}
                </View>
              )}

              {/* Submit Button */}
              <Pressable
                disabled={!isValid || isPending}
                onPress={() => mutation.mutate()}
                style={[styles.submitButton, (!isValid || isPending) && styles.submitButtonDisabled]}
              >
                {isPending ? (
                  <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                  <>
                    <MaterialIcons name="add-circle" size={20} color={Colors.white} />
                    <Text style={styles.submitButtonText}>Create Seed Batch</Text>
                  </>
                )}
              </Pressable>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
      <DateTimePickerModal
        isVisible={showExpectedDatePicker}
        mode="date"
        date={expectedReadyDate ? new Date(expectedReadyDate) : new Date()}
        onCancel={() => setShowExpectedDatePicker(false)}
        onConfirm={(date) => {
          setExpectedReadyDate(date.toISOString().slice(0, 10));
          setShowExpectedDatePicker(false);
        }}
      />
    </View>
  );
}

const styles = {
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  keyboardView: {
    flex: 1,
  },

  // Header
  headerGradient: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: Spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  headerTitle: {
    color: Colors.white,
    fontSize: 20,
    fontWeight: "700" as const,
    flex: 1,
  },

  // Scroll Content
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: 100,
  },

  // Selection View
  selectionContainer: {
    gap: Spacing.md,
  },
  searchContainer: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: Colors.white,
    borderRadius: 12,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    height: 50,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    padding: 0,
  },
  searchClear: {
    padding: Spacing.xs,
  },
  resultsList: {
    gap: Spacing.sm,
  },
  resultItem: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  resultItemLeft: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: Spacing.md,
    flex: 1,
  },
  resultIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surface,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  resultName: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: Colors.text,
    marginBottom: 2,
  },
  resultDetail: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  loadingContainer: {
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingVertical: Spacing.xl,
    gap: Spacing.md,
  },
  loadingText: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  emptyResults: {
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingVertical: Spacing.xl * 2,
    gap: Spacing.md,
  },
  emptyResultsText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },

  // Form View
  formContainer: {
    gap: Spacing.lg,
  },
  section: {
    gap: Spacing.xs,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.textSecondary,
    marginLeft: 4,
    marginBottom: 2,
  },
  selectButton: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: "dashed" as const,
    gap: Spacing.sm,
  },
  selectButtonText: {
    fontSize: 14,
    fontWeight: "500" as const,
    color: Colors.text,
  },
  selectedItem: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  selectedItemLeft: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: Spacing.md,
    flex: 1,
  },
  selectedIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  selectedName: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: Colors.text,
    marginBottom: 2,
  },
  selectedDetail: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  formSection: {
    gap: Spacing.xs,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "500" as const,
    color: Colors.textSecondary,
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: Colors.white,
    borderRadius: 12,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    height: 50,
    gap: Spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    padding: 0,
  },
  dateInputValue: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
  },
  dateInputPlaceholder: {
    flex: 1,
    fontSize: 15,
    color: Colors.textTertiary,
  },
  dateClearButton: {
    padding: 2,
  },

  // Summary
  summaryContainer: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: Spacing.md,
    marginTop: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  summaryRow: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    paddingVertical: Spacing.xs,
  },
  summaryLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: Colors.text,
  },

  // Submit Button
  submitButton: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: Spacing.md,
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  submitButtonDisabled: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  submitButtonText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: "600" as const,
  },
} as const;
