import { MaterialIcons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ModuleScreenFrame from "../common/ModuleScreenFrame";
import { SHARED_BOTTOM_NAV_HEIGHT } from "../navigation/SharedBottomNav";
import { CustomerService } from "../../services/customer.service";
import type { Customer } from "../../types/customer.types";
import { formatErrorMessage } from "../../utils/error";
import { AdminTheme } from "../admin/theme";
import ModuleEmptyState from "../common/ModuleEmptyState";
import { moduleSearchContainer } from "../common/moduleStyles";
import ModuleSearchBar from "../common/ModuleSearchBar";
import StitchCard from "../common/StitchCard";
import StitchSectionHeader from "../common/StitchSectionHeader";
import { Spacing } from "@/src/theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface CustomersModuleScreenProps {
  title: string;
  canWrite: boolean;
}

export function CustomersModuleScreen({
  title,
  canWrite,
}: CustomersModuleScreenProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [name, setName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [address, setAddress] = useState("");
  const [editing, setEditing] = useState<Customer | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [isFormExpanded, setIsFormExpanded] = useState(false);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["customers"],
    queryFn: CustomerService.getAll,
  });

  const customers = useMemo(() => (Array.isArray(data) ? data : []), [data]);
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return customers.filter(
      (customer) =>
        customer.name?.toLowerCase().includes(term) ||
        customer.mobileNumber?.toLowerCase().includes(term) ||
        customer.address?.toLowerCase().includes(term),
    );
  }, [customers, search]);

  const resetForm = () => {
    setName("");
    setMobileNumber("");
    setAddress("");
    setEditing(null);
    setIsFormExpanded(false);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error("Name is required");
      if (editing) {
        return CustomerService.update(editing._id, {
          name: name.trim(),
          mobileNumber: mobileNumber.trim() || undefined,
          address: address.trim() || undefined,
        });
      }
      return CustomerService.create({
        name: name.trim(),
        mobileNumber: mobileNumber.trim() || undefined,
        address: address.trim() || undefined,
      });
    },
    onSuccess: async () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await queryClient.invalidateQueries({ queryKey: ["customers"] });
      resetForm();
      setShowForm(false);
    },
    onError: (error: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Error", formatErrorMessage(error));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => CustomerService.delete(id),
    onSuccess: async () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
    onError: (error: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Error", formatErrorMessage(error));
    },
  });

  const onEdit = (customer: Customer) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditing(customer);
    setName(customer.name ?? "");
    setMobileNumber(customer.mobileNumber ?? "");
    setAddress(customer.address ?? "");
    setShowForm(true);
    setIsFormExpanded(true);
  };

  const onDelete = (customer: Customer) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      "Delete Customer",
      `Are you sure you want to delete "${customer.name}"? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteMutation.mutate(customer._id),
        },
      ],
    );
  };

  const toggleForm = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (showForm) {
      resetForm();
    }
    setShowForm((prev) => !prev);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.center} edges={["left", "right"]}>
        <View style={styles.loadingCard}>
          <ActivityIndicator size="large" color={AdminTheme.colors.primary} />
          <Text style={styles.loadingText}>Loading customers...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.center} edges={["left", "right"]}>
        <View style={styles.errorCard}>
          <MaterialIcons name="error-outline" size={48} color={AdminTheme.colors.danger} />
          <Text style={styles.errorTitle}>Failed to Load</Text>
          <Text style={styles.errorMessage}>{formatErrorMessage(error)}</Text>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              refetch();
            }}
            style={({ pressed }) => [
              styles.retryButton,
              pressed && styles.retryButtonPressed,
            ]}
          >
            <MaterialIcons name="refresh" size={20} color={AdminTheme.colors.surface} />
            <Text style={styles.retryButtonText}>Try Again</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <ModuleScreenFrame
      title={title}
      subtitle={`${filtered.length} customer${filtered.length !== 1 ? "s" : ""}`}
      onBackPress={() => router.back()}
      actions={
        canWrite ? (
          <Pressable
            onPress={toggleForm}
            style={({ pressed }) => [
              styles.addButton,
              pressed && styles.addButtonPressed,
            ]}
          >
            <MaterialIcons
              name={showForm ? "close" : "add"}
              size={20}
              color={AdminTheme.colors.surfaceMuted}
            />
          </Pressable>
        ) : null
      }
    >
      {/* Search Bar */}
      <ModuleSearchBar
        containerStyle={styles.searchContainer}
        inputContainerStyle={styles.searchInputWrap}
        value={search}
        onChangeText={setSearch}
        onClear={() => setSearch("")}
        placeholder="Search by name, mobile, address..."
      />

      {/* Form Bottom Sheet */}
      {canWrite && (
        <Modal
          visible={showForm}
          transparent
          animationType="fade"
          onRequestClose={() => {
            setShowForm(false);
            resetForm();
          }}
        >
          <Pressable
            style={styles.sheetOverlay}
            onPress={() => {
              setShowForm(false);
              resetForm();
            }}
          >
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : undefined}
              style={styles.sheetKeyboardWrap}
            >
              <Pressable style={styles.sheetContainer} onPress={() => {}}>
                <View style={styles.sheetHandle} />
                <View style={styles.formHeader}>
                  <View style={styles.formTitleContainer}>
                    <MaterialIcons
                      name={editing ? "edit" : "person-add"}
                      size={20}
                      color={AdminTheme.colors.primary}
                    />
                    <Text style={styles.formTitle}>
                      {editing ? "Edit Customer" : "Create Customer"}
                    </Text>
                  </View>
                  {isFormExpanded && (
                    <Pressable onPress={resetForm} style={styles.resetButton}>
                      <MaterialIcons
                        name="refresh"
                        size={18}
                        color={AdminTheme.colors.textMuted}
                      />
                    </Pressable>
                  )}
                </View>

                <ScrollView
                  style={styles.formScroll}
                  contentContainerStyle={styles.formContainer}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                >
                  {/* Name Field */}
                  <View style={styles.inputWrapper}>
                    <View style={styles.inputLabel}>
                      <MaterialIcons
                        name="person"
                        size={16}
                        color={AdminTheme.colors.textMuted}
                      />
                      <Text style={styles.inputLabelText}>Full Name *</Text>
                    </View>
                    <TextInput
                      value={name}
                      onChangeText={setName}
                      placeholder="Enter customer name"
                      placeholderTextColor={AdminTheme.colors.textSoft}
                      style={[
                        styles.input,
                        !name.trim() && name.length > 0 && styles.inputError,
                      ]}
                    />
                    {!name.trim() && name.length > 0 && (
                      <Text style={styles.fieldError}>Name is required</Text>
                    )}
                  </View>

                  {/* Mobile Field */}
                  <View style={styles.inputWrapper}>
                    <View style={styles.inputLabel}>
                      <MaterialIcons
                        name="phone"
                        size={16}
                        color={AdminTheme.colors.textMuted}
                      />
                      <Text style={styles.inputLabelText}>Mobile Number</Text>
                    </View>
                    <TextInput
                      value={mobileNumber}
                      onChangeText={setMobileNumber}
                      placeholder="Enter mobile number"
                      placeholderTextColor={AdminTheme.colors.textSoft}
                      keyboardType="phone-pad"
                      style={styles.input}
                    />
                  </View>

                  {/* Address Field */}
                  <View style={styles.inputWrapper}>
                    <View style={styles.inputLabel}>
                      <MaterialIcons
                        name="location-on"
                        size={16}
                        color={AdminTheme.colors.textMuted}
                      />
                      <Text style={styles.inputLabelText}>Address</Text>
                    </View>
                    <TextInput
                      value={address}
                      onChangeText={setAddress}
                      placeholder="Enter address"
                      placeholderTextColor={AdminTheme.colors.textSoft}
                      multiline
                      numberOfLines={2}
                      style={[styles.input, styles.textArea]}
                    />
                  </View>

                  {/* Action Buttons */}
                  <View style={styles.formActions}>
                    <Pressable
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setShowForm(false);
                        resetForm();
                      }}
                      style={({ pressed }) => [
                        styles.cancelFormButton,
                        pressed && styles.cancelFormButtonPressed,
                      ]}
                    >
                      <MaterialIcons
                        name="close"
                        size={18}
                        color={AdminTheme.colors.textMuted}
                      />
                      <Text style={styles.cancelFormButtonText}>Cancel</Text>
                    </Pressable>

                    <Pressable
                      disabled={saveMutation.isPending || !name.trim()}
                      onPress={() => saveMutation.mutate()}
                      style={({ pressed }) => [
                        styles.saveFormButton,
                        (!name.trim() || saveMutation.isPending) &&
                          styles.saveFormButtonDisabled,
                        pressed && styles.saveFormButtonPressed,
                      ]}
                    >
                      <View
                        style={[
                          styles.saveFormGradient,
                          {
                            backgroundColor:
                              !name.trim() || saveMutation.isPending
                                ? AdminTheme.colors.border
                                : AdminTheme.colors.success,
                          },
                        ]}
                      >
                        {saveMutation.isPending ? (
                          <>
                            <ActivityIndicator
                              size="small"
                              color={AdminTheme.colors.surface}
                            />
                            <Text style={styles.saveFormButtonText}>
                              Saving...
                            </Text>
                          </>
                        ) : (
                          <>
                            <MaterialIcons
                              name="check-circle"
                              size={18}
                              color={AdminTheme.colors.surface}
                            />
                            <Text style={styles.saveFormButtonText}>
                              {editing ? "Update" : "Save"}
                            </Text>
                          </>
                        )}
                      </View>
                    </Pressable>
                  </View>
                </ScrollView>
              </Pressable>
            </KeyboardAvoidingView>
          </Pressable>
        </Modal>
      )}

      <StitchSectionHeader containerStyle={{paddingHorizontal:Spacing.lg}} title="Customers" subtitle={`${filtered.length} customers`} />

      {/* Customers List */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        ListFooterComponent={<View style={styles.bottomSpacer} />}
        ListEmptyComponent={
          <ModuleEmptyState
            style={styles.emptyContainer}
            icon={
              <MaterialIcons
                name="people-outline"
                size={64}
                color={AdminTheme.colors.textSoft}
              />
            }
            title={search ? "No Results Found" : "No Customers Yet"}
            message={
              search
                ? "No customers match your search criteria."
                : canWrite
                  ? "Tap the + button to add your first customer."
                  : "No customers available."
            }
          />
        }
        renderItem={({ item }) => (
          <StitchCard style={styles.customerCard}>
            <View style={styles.customerCardHeader}>
              <View style={styles.customerAvatar}>
                <Text style={styles.customerAvatarText}>
                  {item.name?.charAt(0).toUpperCase() || "C"}
                </Text>
              </View>
              <View style={styles.customerInfo}>
                <Text style={styles.customerName}>{item.name}</Text>
                {item.mobileNumber && (
                  <View style={styles.customerDetail}>
                    <MaterialIcons
                      name="phone"
                      size={14}
                      color={AdminTheme.colors.textMuted}
                    />
                    <Text style={styles.customerDetailText}>
                      {item.mobileNumber}
                    </Text>
                  </View>
                )}
                {item.address && (
                  <View style={styles.customerDetail}>
                    <MaterialIcons
                      name="location-on"
                      size={14}
                      color={AdminTheme.colors.textMuted}
                    />
                    <Text style={styles.customerDetailText} numberOfLines={1}>
                      {item.address}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {canWrite && (
              <View style={styles.customerActions}>
                <Pressable
                  onPress={() => onEdit(item)}
                  style={({ pressed }) => [
                    styles.actionButton,
                    styles.editButton,
                    pressed && styles.actionButtonPressed,
                  ]}
                >
                  <MaterialIcons name="edit" size={16} color={AdminTheme.colors.primary} />
                  <Text style={styles.editButtonText}>Edit</Text>
                </Pressable>
                <Pressable
                  onPress={() => onDelete(item)}
                  style={({ pressed }) => [
                    styles.actionButton,
                    styles.deleteButton,
                    pressed && styles.actionButtonPressed,
                  ]}
                >
                  <MaterialIcons
                    name="delete-outline"
                    size={16}
                    color={AdminTheme.colors.danger}
                  />
                  <Text style={styles.deleteButtonText}>Delete</Text>
                </Pressable>
              </View>
            )}
          </StitchCard>
        )}
      />
    </ModuleScreenFrame>
  );
}

/* -------------------- Styles -------------------- */

const cardSurface = {
  borderWidth: 1,
  borderColor: AdminTheme.colors.borderSoft,
  borderRadius: AdminTheme.radius.lg,
  backgroundColor: AdminTheme.colors.surface,
  ...AdminTheme.shadow.card,
};

const styles = {
  container: {
    flex: 1,
    backgroundColor: AdminTheme.colors.background,
  },
  center: {
    flex: 1,
    justifyContent: "center" as const,
    alignItems: "center" as const,
    backgroundColor: AdminTheme.colors.background,
  },
  // Header Styles
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent:"center",
    alignItems:"center"
  },
  addButtonPressed: {
    transform: [{ scale: 0.95 }],
    backgroundColor: AdminTheme.colors.surface,
  },
  // Search Styles
  searchContainer: moduleSearchContainer,
  searchInputWrap: {
    flex: 1,
  },
  // Loading & Error States
  loadingCard: {
    ...cardSurface,
    backgroundColor: AdminTheme.colors.surface,
    padding: AdminTheme.spacing.xl,
    borderRadius: 20,
    alignItems: "center" as const,
    gap: AdminTheme.spacing.lg,
    shadowColor: AdminTheme.colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  loadingText: {
    fontSize: 16,
    color: AdminTheme.colors.textMuted,
    fontWeight: "500" as const,
  },
  errorCard: {
    ...cardSurface,
    backgroundColor: AdminTheme.colors.surface,
    padding: AdminTheme.spacing.xl,
    borderRadius: 20,
    alignItems: "center" as const,
    gap: AdminTheme.spacing.md,
    shadowColor: AdminTheme.colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    maxWidth: SCREEN_WIDTH - AdminTheme.spacing.xl * 2,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: AdminTheme.colors.danger,
    marginTop: AdminTheme.spacing.sm,
  },
  errorMessage: {
    fontSize: 14,
    color: AdminTheme.colors.textMuted,
    textAlign: "center" as const,
    marginBottom: AdminTheme.spacing.sm,
  },
  retryButton: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: AdminTheme.colors.primary,
    paddingHorizontal: AdminTheme.spacing.lg,
    paddingVertical: AdminTheme.spacing.md,
    borderRadius: 12,
    gap: AdminTheme.spacing.sm,
    marginTop: AdminTheme.spacing.sm,
  },
  retryButtonPressed: {
    backgroundColor: AdminTheme.colors.primaryDark,
    transform: [{ scale: 0.98 }],
  },
  retryButtonText: {
    color: AdminTheme.colors.surface,
    fontSize: 16,
    fontWeight: "600" as const,
  },
  // Form Styles
  sheetOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.35)",
    justifyContent: "flex-end" as const,
  },
  sheetKeyboardWrap: {
    flex: 1,
    justifyContent: "flex-end" as const,
  },
  sheetContainer: {
    backgroundColor: AdminTheme.colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "88%" as const,
    overflow: "hidden" as const,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: AdminTheme.colors.border,
    alignSelf: "center" as const,
    marginTop: AdminTheme.spacing.sm,
    marginBottom: AdminTheme.spacing.xs,
  },
  formScroll: {
    flexGrow: 0,
  },
  formHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    paddingHorizontal: AdminTheme.spacing.lg,
    paddingVertical: AdminTheme.spacing.md,
    backgroundColor: AdminTheme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: AdminTheme.colors.borderSoft,
  },
  formTitleContainer: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: AdminTheme.spacing.sm,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: AdminTheme.colors.text,
  },
  resetButton: {
    padding: AdminTheme.spacing.xs,
  },
  formContainer: {
    padding: AdminTheme.spacing.lg,
    gap: AdminTheme.spacing.md,
  },
  inputWrapper: {
    gap: AdminTheme.spacing.xs,
  },
  inputLabel: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: AdminTheme.spacing.xs,
    paddingHorizontal: AdminTheme.spacing.xs,
  },
  inputLabelText: {
    fontSize: 13,
    fontWeight: "500" as const,
    color: AdminTheme.colors.textMuted,
  },
  input: {
    borderWidth: 1,
    borderColor: AdminTheme.colors.border,
    borderRadius: 12,
    padding: AdminTheme.spacing.md,
    fontSize: 16,
    color: AdminTheme.colors.text,
    backgroundColor: AdminTheme.colors.surface,
    minHeight: 50,
  },
  inputError: {
    borderColor: AdminTheme.colors.danger,
  },
  fieldError: {
    fontSize: 12,
    color: AdminTheme.colors.danger,
    paddingHorizontal: AdminTheme.spacing.xs,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top" as const,
  },
  formActions: {
    flexDirection: "row" as const,
    gap: AdminTheme.spacing.md,
    marginTop: AdminTheme.spacing.sm,
    marginBottom: SHARED_BOTTOM_NAV_HEIGHT,
  },
  cancelFormButton: {
    flex: 1,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: AdminTheme.colors.surface,
    paddingVertical: AdminTheme.spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: AdminTheme.colors.borderSoft,
    gap: AdminTheme.spacing.sm,
  },
  cancelFormButtonPressed: {
    backgroundColor: AdminTheme.colors.surfaceStrong,
    transform: [{ scale: 0.98 }],
  },
  cancelFormButtonText: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: AdminTheme.colors.textMuted,
  },
  saveFormButton: {
    flex: 2,
    borderRadius: 12,
    overflow: "hidden" as const,
    shadowColor: AdminTheme.colors.success,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  saveFormButtonDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  saveFormButtonPressed: {
    transform: [{ scale: 0.98 }],
  },
  saveFormGradient: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingVertical: AdminTheme.spacing.md,
    gap: AdminTheme.spacing.sm,
  },
  saveFormButtonText: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: AdminTheme.colors.surface,
  },
  // List Styles
  listContent: {
    paddingHorizontal: AdminTheme.spacing.lg,
    paddingTop: AdminTheme.spacing.xs,
    paddingBottom: SHARED_BOTTOM_NAV_HEIGHT + AdminTheme.spacing.xl,
    flexGrow: 1,
  },
  bottomSpacer: {
    height: AdminTheme.spacing.sm,
  },
  emptyContainer: {
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingVertical: AdminTheme.spacing.xl * 2,
    gap: AdminTheme.spacing.md,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600" as const,
    color: AdminTheme.colors.text,
    marginTop: AdminTheme.spacing.md,
  },
  emptyText: {
    fontSize: 14,
    color: AdminTheme.colors.textMuted,
    textAlign: "center" as const,
    paddingHorizontal: AdminTheme.spacing.xl,
  },
  // Customer Card Styles
  customerCard: {
    ...cardSurface,
    backgroundColor: AdminTheme.colors.surface,
    borderRadius: 16,
    padding: AdminTheme.spacing.lg,
    marginBottom: AdminTheme.spacing.sm,
    borderWidth: 1,
    borderColor: AdminTheme.colors.borderSoft,
    shadowColor: AdminTheme.colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  customerCardHeader: {
    flexDirection: "row" as const,
    gap: AdminTheme.spacing.md,
  },
  customerAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: AdminTheme.colors.primary + "20",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  customerAvatarText: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: AdminTheme.colors.primary,
  },
  customerInfo: {
    flex: 1,
    gap: 4,
  },
  customerName: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: AdminTheme.colors.text,
    marginBottom: 2,
  },
  customerDetail: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: AdminTheme.spacing.xs,
  },
  customerDetailText: {
    fontSize: 13,
    color: AdminTheme.colors.textMuted,
    flex: 1,
  },
  customerActions: {
    flexDirection: "row" as const,
    justifyContent: "flex-end" as const,
    gap: AdminTheme.spacing.sm,
    marginTop: AdminTheme.spacing.md,
    paddingTop: AdminTheme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: AdminTheme.colors.borderSoft,
  },
  actionButton: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingHorizontal: AdminTheme.spacing.md,
    paddingVertical: AdminTheme.spacing.sm,
    minHeight: 40,
    borderRadius: 8,
    gap: AdminTheme.spacing.xs,
  },
  actionButtonPressed: {
    transform: [{ scale: 0.95 }],
    opacity: 0.8,
  },
  editButton: {
    backgroundColor: AdminTheme.colors.primary + "10",
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: AdminTheme.colors.primary,
  },
  deleteButton: {
    backgroundColor: AdminTheme.colors.danger + "10",
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: AdminTheme.colors.danger,
  },
};
