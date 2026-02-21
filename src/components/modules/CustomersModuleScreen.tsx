import { MaterialIcons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
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
import { CustomerService } from "../../services/customer.service";
import { Colors, Spacing } from "../../theme";
import type { Customer } from "../../types/customer.types";
import { formatErrorMessage } from "../../utils/error";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const BOTTOM_NAV_HEIGHT = 80;

interface CustomersModuleScreenProps {
  title: string;
  canWrite: boolean;
}

export function CustomersModuleScreen({
  title,
  canWrite,
}: CustomersModuleScreenProps) {
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
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading customers...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.center} edges={["left", "right"]}>
        <View style={styles.errorCard}>
          <MaterialIcons name="error-outline" size={48} color={Colors.error} />
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
            <MaterialIcons name="refresh" size={20} color={Colors.white} />
            <Text style={styles.retryButtonText}>Try Again</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["left", "right"]}>
      {/* Header with Gradient */}
      <LinearGradient
        colors={[Colors.primary, Colors.primaryLight || Colors.primary]}
        style={styles.headerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <MaterialIcons name="people" size={24} color={Colors.white} />
            <Text style={styles.headerTitle}>{title}</Text>
          </View>
          {canWrite && (
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
                color={Colors.primary}
              />
            </Pressable>
          )}
        </View>
        <Text style={styles.headerSubtitle}>
          {filtered.length} customer{filtered.length !== 1 ? "s" : ""}
        </Text>
      </LinearGradient>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <MaterialIcons name="search" size={20} color={Colors.textSecondary} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name, mobile, address..."
          placeholderTextColor={Colors.textTertiary}
          style={styles.searchInput}
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch("")} style={styles.clearButton}>
            <MaterialIcons
              name="close"
              size={20}
              color={Colors.textSecondary}
            />
          </Pressable>
        )}
      </View>

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
                      color={Colors.primary}
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
                        color={Colors.textSecondary}
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
                        color={Colors.textSecondary}
                      />
                      <Text style={styles.inputLabelText}>Full Name *</Text>
                    </View>
                    <TextInput
                      value={name}
                      onChangeText={setName}
                      placeholder="Enter customer name"
                      placeholderTextColor={Colors.textTertiary}
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
                        color={Colors.textSecondary}
                      />
                      <Text style={styles.inputLabelText}>Mobile Number</Text>
                    </View>
                    <TextInput
                      value={mobileNumber}
                      onChangeText={setMobileNumber}
                      placeholder="Enter mobile number"
                      placeholderTextColor={Colors.textTertiary}
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
                        color={Colors.textSecondary}
                      />
                      <Text style={styles.inputLabelText}>Address</Text>
                    </View>
                    <TextInput
                      value={address}
                      onChangeText={setAddress}
                      placeholder="Enter address"
                      placeholderTextColor={Colors.textTertiary}
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
                        color={Colors.textSecondary}
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
                      <LinearGradient
                        colors={
                          !name.trim() || saveMutation.isPending
                            ? [Colors.border, Colors.borderLight]
                            : [Colors.success, "#34D399"]
                        }
                        style={styles.saveFormGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                      >
                        {saveMutation.isPending ? (
                          <>
                            <ActivityIndicator
                              size="small"
                              color={Colors.white}
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
                              color={Colors.white}
                            />
                            <Text style={styles.saveFormButtonText}>
                              {editing ? "Update" : "Save"}
                            </Text>
                          </>
                        )}
                      </LinearGradient>
                    </Pressable>
                  </View>
                </ScrollView>
              </Pressable>
            </KeyboardAvoidingView>
          </Pressable>
        </Modal>
      )}

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
          <View style={styles.emptyContainer}>
            <MaterialIcons
              name="people-outline"
              size={64}
              color={Colors.textTertiary}
            />
            <Text style={styles.emptyTitle}>
              {search ? "No Results Found" : "No Customers Yet"}
            </Text>
            <Text style={styles.emptyText}>
              {search
                ? "No customers match your search criteria."
                : canWrite
                  ? "Tap the + button to add your first customer."
                  : "No customers available."}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.customerCard}>
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
                      color={Colors.textSecondary}
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
                      color={Colors.textSecondary}
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
                  <MaterialIcons name="edit" size={16} color={Colors.primary} />
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
                    color={Colors.error}
                  />
                  <Text style={styles.deleteButtonText}>Delete</Text>
                </Pressable>
              </View>
            )}
          </View>
        )}
      />
    </SafeAreaView>
  );
}

/* -------------------- Styles -------------------- */

const styles = {
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  center: {
    flex: 1,
    justifyContent: "center" as const,
    alignItems: "center" as const,
    backgroundColor: Colors.background,
  },
  // Header Styles
  headerGradient: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.lg,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    marginBottom: Spacing.xs,
  },
  headerLeft: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: Spacing.sm,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700" as const,
    color: Colors.white,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.9)",
    fontWeight: "500" as const,
    marginLeft: Spacing.sm + 24,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.white,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  addButtonPressed: {
    transform: [{ scale: 0.95 }],
    backgroundColor: Colors.surface,
  },
  // Search Styles
  searchContainer: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 16,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
    minHeight: 50,
  },
  searchInput: {
    flex: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    fontSize: 16,
    color: Colors.text,
  },
  clearButton: {
    padding: Spacing.xs,
  },
  // Loading & Error States
  loadingCard: {
    backgroundColor: Colors.white,
    padding: Spacing.xl,
    borderRadius: 20,
    alignItems: "center" as const,
    gap: Spacing.lg,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.textSecondary,
    fontWeight: "500" as const,
  },
  errorCard: {
    backgroundColor: Colors.white,
    padding: Spacing.xl,
    borderRadius: 20,
    alignItems: "center" as const,
    gap: Spacing.md,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    maxWidth: SCREEN_WIDTH - Spacing.xl * 2,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: Colors.error,
    marginTop: Spacing.sm,
  },
  errorMessage: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center" as const,
    marginBottom: Spacing.sm,
  },
  retryButton: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: 12,
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  retryButtonPressed: {
    backgroundColor: Colors.primaryDark,
    transform: [{ scale: 0.98 }],
  },
  retryButtonText: {
    color: Colors.white,
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
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "88%" as const,
    overflow: "hidden" as const,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: "center" as const,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  formScroll: {
    flexGrow: 0,
  },
  formHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  formTitleContainer: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: Spacing.sm,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: Colors.text,
  },
  resetButton: {
    padding: Spacing.xs,
  },
  formContainer: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  inputWrapper: {
    gap: Spacing.xs,
  },
  inputLabel: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: Spacing.xs,
    paddingHorizontal: Spacing.xs,
  },
  inputLabelText: {
    fontSize: 13,
    fontWeight: "500" as const,
    color: Colors.textSecondary,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: Spacing.md,
    fontSize: 16,
    color: Colors.text,
    backgroundColor: Colors.white,
    minHeight: 50,
  },
  inputError: {
    borderColor: Colors.error,
  },
  fieldError: {
    fontSize: 12,
    color: Colors.error,
    paddingHorizontal: Spacing.xs,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top" as const,
  },
  formActions: {
    flexDirection: "row" as const,
    gap: Spacing.md,
    marginTop: Spacing.sm,
    marginBottom: BOTTOM_NAV_HEIGHT,
  },
  cancelFormButton: {
    flex: 1,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: Colors.surface,
    paddingVertical: Spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    gap: Spacing.sm,
  },
  cancelFormButtonPressed: {
    backgroundColor: Colors.surfaceDark,
    transform: [{ scale: 0.98 }],
  },
  cancelFormButtonText: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: Colors.textSecondary,
  },
  saveFormButton: {
    flex: 2,
    borderRadius: 12,
    overflow: "hidden" as const,
    shadowColor: Colors.success,
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
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  saveFormButtonText: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: Colors.white,
  },
  // List Styles
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xs,
    paddingBottom: BOTTOM_NAV_HEIGHT + Spacing.xl,
    flexGrow: 1,
  },
  bottomSpacer: {
    height: Spacing.sm,
  },
  emptyContainer: {
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingVertical: Spacing.xl * 2,
    gap: Spacing.md,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600" as const,
    color: Colors.text,
    marginTop: Spacing.md,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center" as const,
    paddingHorizontal: Spacing.xl,
  },
  // Customer Card Styles
  customerCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  customerCardHeader: {
    flexDirection: "row" as const,
    gap: Spacing.md,
  },
  customerAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.primary + "20",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  customerAvatarText: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: Colors.primary,
  },
  customerInfo: {
    flex: 1,
    gap: 4,
  },
  customerName: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: Colors.text,
    marginBottom: 2,
  },
  customerDetail: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: Spacing.xs,
  },
  customerDetailText: {
    fontSize: 13,
    color: Colors.textSecondary,
    flex: 1,
  },
  customerActions: {
    flexDirection: "row" as const,
    justifyContent: "flex-end" as const,
    gap: Spacing.sm,
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  actionButton: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    minHeight: 40,
    borderRadius: 8,
    gap: Spacing.xs,
  },
  actionButtonPressed: {
    transform: [{ scale: 0.95 }],
    opacity: 0.8,
  },
  editButton: {
    backgroundColor: Colors.primary + "10",
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.primary,
  },
  deleteButton: {
    backgroundColor: Colors.error + "10",
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.error,
  },
};
