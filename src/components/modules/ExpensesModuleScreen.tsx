import { MaterialIcons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useMemo, useState } from "react";
import DateTimePickerModal from "react-native-modal-datetime-picker";
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
import { ExpenseService } from "../../services/expense.service";
import { useAuthStore } from "../../stores/auth.store";
import { Colors, Spacing } from "../../theme";
import type { Expense } from "../../types/expense.types";
import { formatErrorMessage } from "../../utils/error";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const BOTTOM_NAV_HEIGHT = 80;
const EXPENSE_TYPE_OPTIONS = [
  "SEED",
  "FERTILIZER",
  "POT",
  "SOIL",
  "WATER",
  "ELECTRICITY",
  "TRANSPORT",
  "TOOLS",
  "OTHER",
] as const;
type ExpenseType = (typeof EXPENSE_TYPE_OPTIONS)[number];

interface ExpensesModuleScreenProps {
  title: string;
  canWrite: boolean;
}

export function ExpensesModuleScreen({
  title,
  canWrite,
}: ExpensesModuleScreenProps) {
  const queryClient = useQueryClient();
  const role = useAuthStore((state) => state.user?.role);
  const showStaffDetails = role === "NURSERY_ADMIN" || role === "SUPER_ADMIN";
  const canDeleteExpenses =
    role === "NURSERY_ADMIN" || role === "SUPER_ADMIN";
  const [search, setSearch] = useState("");
  const [type, setType] = useState<ExpenseType | "">("");
  const [description, setDescription] = useState("");
  const [purpose, setPurpose] = useState("");
  const [productDetails, setProductDetails] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [isFormExpanded, setIsFormExpanded] = useState(false);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["expenses"],
    queryFn: ExpenseService.getAll,
  });

  const expenses = useMemo(() => (Array.isArray(data) ? data : []), [data]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return expenses.filter(
      (expense) =>
        expense.type?.toLowerCase().includes(term) ||
        expense.description?.toLowerCase().includes(term) ||
        expense.purpose?.toLowerCase().includes(term) ||
        expense.productDetails?.toLowerCase().includes(term) ||
        (showStaffDetails && getPurchaserName(expense).toLowerCase().includes(term)),
    );
  }, [expenses, search, showStaffDetails]);

  // Calculate total expenses
  const totalExpenses = useMemo(() => {
    return filtered.reduce((sum, expense) => sum + (expense.amount || 0), 0);
  }, [filtered]);

  const contributorCount = useMemo(() => {
    const staffIds = new Set<string>();
    filtered.forEach((expense) => {
      const purchaser = expense.purchasedBy;
      if (purchaser && typeof purchaser === "object" && purchaser._id) {
        staffIds.add(purchaser._id);
      }
    });
    return staffIds.size;
  }, [filtered]);

  const resetForm = () => {
    setType("");
    setDescription("");
    setPurpose("");
    setProductDetails("");
    setAmount("");
    const now = new Date();
    setDate(now.toISOString().slice(0, 10));
    setSelectedDate(now);
    setShowTypeDropdown(false);
    setEditing(null);
    setIsFormExpanded(false);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!type) throw new Error("Type is required");
      if (!EXPENSE_TYPE_OPTIONS.includes(type)) {
        throw new Error("Invalid expense type selected");
      }
      const amountValue = Number(amount);
      if (isNaN(amountValue) || amountValue <= 0)
        throw new Error("Amount must be greater than 0");
      const payload = {
        type,
        description: description.trim() || undefined,
        purpose: purpose.trim() || undefined,
        productDetails: productDetails.trim() || undefined,
        amount: amountValue,
        date: date.trim() || undefined,
      };
      if (editing) return ExpenseService.update(editing._id, payload);
      return ExpenseService.create(payload);
    },
    onSuccess: async () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await queryClient.invalidateQueries({ queryKey: ["expenses"] });
      resetForm();
      setShowForm(false);
    },
    onError: (error: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Error", formatErrorMessage(error));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => ExpenseService.delete(id),
    onSuccess: async () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await queryClient.invalidateQueries({ queryKey: ["expenses"] });
    },
    onError: (error: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Error", formatErrorMessage(error));
    },
  });

  const onEdit = (expense: Expense) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditing(expense);
    const editType = (expense.type ?? "") as ExpenseType | "";
    setType(EXPENSE_TYPE_OPTIONS.includes(editType as ExpenseType) ? editType : "");
    setDescription(expense.description ?? "");
    setPurpose(expense.purpose ?? "");
    setProductDetails(expense.productDetails ?? "");
    setAmount(expense.amount ? String(expense.amount) : "");
    const nextDate = expense.date ? new Date(expense.date) : new Date();
    setDate(nextDate.toISOString().slice(0, 10));
    setSelectedDate(nextDate);
    setShowTypeDropdown(false);
    setShowForm(true);
    setIsFormExpanded(true);
  };

  const onDelete = (expense: Expense) => {
    if (!canDeleteExpenses) {
      Alert.alert(
        "Not Allowed",
        "Staff can create and update expenses, but cannot delete them.",
      );
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      "Delete Expense",
      `Are you sure you want to delete "${expense.type}" expense of ₹${expense.amount?.toLocaleString("en-IN")}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteMutation.mutate(expense._id),
        },
      ],
    );
  };

  const toggleForm = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (showForm) {
      resetForm();
    } else if (!editing) {
      const now = new Date();
      setDate(now.toISOString().slice(0, 10));
      setSelectedDate(now);
      setType("SEED");
    }
    setShowForm((prev) => !prev);
  };

  const formatCurrency = (value: number) => {
    return `₹${value.toLocaleString("en-IN")}`;
  };
  const formatExpenseTypeLabel = (value: ExpenseType) =>
    value
      .toLowerCase()
      .split("_")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");

  const isAmountValid = () => {
    const amountValue = Number(amount);
    return !isNaN(amountValue) && amountValue > 0;
  };

  const handleDateConfirm = (picked: Date) => {
    setSelectedDate(picked);
    setDate(picked.toISOString().slice(0, 10));
    setShowDatePicker(false);
  };

  const formatDateDisplay = (value: string) => {
    if (!value) return "";
    const parsed = new Date(value);
    if (isNaN(parsed.getTime())) return value;
    return parsed.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  function getPurchaserName(expense: Expense) {
    if (!expense.purchasedBy) return "Unknown staff";
    if (typeof expense.purchasedBy === "string") return expense.purchasedBy;
    return expense.purchasedBy.name || "Unknown staff";
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.center} edges={["left", "right"]}>
        <View style={styles.loadingCard}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading expenses...</Text>
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
            <MaterialIcons name="receipt" size={24} color={Colors.white} />
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

        {/* Summary Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Total Expenses</Text>
            <Text style={styles.statValue}>
              {formatCurrency(totalExpenses)}
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Count</Text>
            <Text style={styles.statValue}>{filtered.length}</Text>
          </View>
          {showStaffDetails && (
            <>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Staff</Text>
                <Text style={styles.statValue}>{contributorCount}</Text>
              </View>
            </>
          )}
        </View>
      </LinearGradient>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <MaterialIcons name="search" size={20} color={Colors.textSecondary} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder={
            showStaffDetails
              ? "Search by type, reason, product, staff..."
              : "Search by type, reason, product..."
          }
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
                name={editing ? "edit" : "add-chart"}
                size={20}
                color={Colors.primary}
              />
              <Text style={styles.formTitle}>
                {editing ? "Edit Expense" : "Add New Expense"}
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
            {/* Type Field */}
            <View style={styles.inputWrapper}>
              <View style={styles.inputLabel}>
                <MaterialIcons
                  name="category"
                  size={16}
                  color={Colors.textSecondary}
                />
                <Text style={styles.inputLabelText}>Expense Type *</Text>
              </View>
              <Pressable
                onPress={() => setShowTypeDropdown((prev) => !prev)}
                style={({ pressed }) => [
                  styles.input,
                  styles.dropdownTrigger,
                  !type && styles.inputError,
                  pressed && styles.dateInputPressed,
                ]}
              >
                <Text
                  style={[
                    styles.dropdownTriggerText,
                    !type && styles.dropdownPlaceholderText,
                  ]}
                >
                  {type
                    ? formatExpenseTypeLabel(type as ExpenseType)
                    : "Select expense type"}
                </Text>
                <MaterialIcons
                  name={
                    showTypeDropdown
                      ? "keyboard-arrow-up"
                      : "keyboard-arrow-down"
                  }
                  size={20}
                  color={Colors.textSecondary}
                />
              </Pressable>
              {showTypeDropdown && (
                <View style={styles.dropdownMenu}>
                  {EXPENSE_TYPE_OPTIONS.map((option) => (
                    <Pressable
                      key={option}
                      onPress={() => {
                        setType(option);
                        setShowTypeDropdown(false);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                      style={({ pressed }) => [
                        styles.dropdownOption,
                        type === option && styles.dropdownOptionSelected,
                        pressed && styles.dropdownOptionPressed,
                      ]}
                    >
                      <View style={styles.dropdownOptionLeft}>
                        <MaterialIcons
                          name={getExpenseIcon(option)}
                          size={16}
                          color={
                            type === option ? Colors.primary : Colors.textSecondary
                          }
                        />
                        <Text
                          style={[
                            styles.dropdownOptionText,
                            type === option && styles.dropdownOptionTextSelected,
                          ]}
                        >
                          {formatExpenseTypeLabel(option)}
                        </Text>
                      </View>
                      {type === option && (
                        <MaterialIcons
                          name="check-circle"
                          size={16}
                          color={Colors.primary}
                        />
                      )}
                    </Pressable>
                  ))}
                </View>
              )}
              {!type && <Text style={styles.fieldError}>Type is required</Text>}
            </View>

            {/* Amount Field */}
            <View style={styles.inputWrapper}>
              <View style={styles.inputLabel}>
                <MaterialIcons
                  name="currency-rupee"
                  size={16}
                  color={Colors.textSecondary}
                />
                <Text style={styles.inputLabelText}>Amount *</Text>
              </View>
              <TextInput
                value={amount}
                onChangeText={(text) => setAmount(text.replace(/[^0-9.]/g, ""))}
                placeholder="0.00"
                placeholderTextColor={Colors.textTertiary}
                keyboardType="decimal-pad"
                style={[
                  styles.input,
                  amount && !isAmountValid() && styles.inputError,
                  isAmountValid() && styles.inputSuccess,
                ]}
              />
              {!isAmountValid() && amount && (
                <Text style={styles.fieldError}>
                  Please enter a valid amount greater than 0
                </Text>
              )}
              {isAmountValid() && (
                <View style={styles.amountPreview}>
                  <LinearGradient
                    colors={[Colors.success + "20", Colors.success + "10"]}
                    style={styles.amountPreviewGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <MaterialIcons
                      name="check-circle"
                      size={16}
                      color={Colors.success}
                    />
                    <Text style={styles.amountPreviewText}>
                      Amount: {formatCurrency(Number(amount))}
                    </Text>
                  </LinearGradient>
                </View>
              )}
            </View>

            {/* Description Field */}
            <View style={styles.inputWrapper}>
              <View style={styles.inputLabel}>
                <MaterialIcons
                  name="description"
                  size={16}
                  color={Colors.textSecondary}
                />
                <Text style={styles.inputLabelText}>Description</Text>
              </View>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="Enter description (optional)"
                placeholderTextColor={Colors.textTertiary}
                multiline
                numberOfLines={2}
                style={[styles.input, styles.textArea]}
              />
            </View>

            {/* Purpose Field */}
            <View style={styles.inputWrapper}>
              <View style={styles.inputLabel}>
                <MaterialIcons
                  name="flag"
                  size={16}
                  color={Colors.textSecondary}
                />
                <Text style={styles.inputLabelText}>Purpose</Text>
              </View>
              <TextInput
                value={purpose}
                onChangeText={setPurpose}
                placeholder="Why this expense was made"
                placeholderTextColor={Colors.textTertiary}
                style={styles.input}
              />
            </View>

            {/* Product Details Field */}
            <View style={styles.inputWrapper}>
              <View style={styles.inputLabel}>
                <MaterialIcons
                  name="inventory-2"
                  size={16}
                  color={Colors.textSecondary}
                />
                <Text style={styles.inputLabelText}>Product Details</Text>
              </View>
              <TextInput
                value={productDetails}
                onChangeText={setProductDetails}
                placeholder="Item details, brand, quantity etc."
                placeholderTextColor={Colors.textTertiary}
                style={styles.input}
              />
            </View>

            {/* Date Field */}
            <View style={styles.inputWrapper}>
              <View style={styles.inputLabel}>
                <MaterialIcons
                  name="calendar-month"
                  size={16}
                  color={Colors.textSecondary}
                />
                <Text style={styles.inputLabelText}>Date</Text>
              </View>
              <Pressable
                onPress={() => setShowDatePicker(true)}
                style={({ pressed }) => [styles.input, styles.dateInput, pressed && styles.dateInputPressed]}
              >
                <Text style={styles.dateInputText}>{formatDateDisplay(date)}</Text>
                <MaterialIcons
                  name="calendar-today"
                  size={18}
                  color={Colors.textSecondary}
                />
              </Pressable>
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
                disabled={
                  saveMutation.isPending || !type || !isAmountValid()
                }
                onPress={() => saveMutation.mutate()}
                style={({ pressed }) => [
                  styles.saveFormButton,
                  (!type ||
                    !isAmountValid() ||
                    saveMutation.isPending) &&
                    styles.saveFormButtonDisabled,
                  pressed && styles.saveFormButtonPressed,
                ]}
              >
                <LinearGradient
                  colors={
                    !type || !isAmountValid() || saveMutation.isPending
                      ? [Colors.border, Colors.borderLight]
                      : [Colors.success, "#34D399"]
                  }
                  style={styles.saveFormGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  {saveMutation.isPending ? (
                    <>
                      <ActivityIndicator size="small" color={Colors.white} />
                      <Text style={styles.saveFormButtonText}>Saving...</Text>
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
      <DateTimePickerModal
        isVisible={showDatePicker}
        mode="date"
        date={selectedDate}
        onConfirm={handleDateConfirm}
        onCancel={() => setShowDatePicker(false)}
        maximumDate={new Date(2100, 11, 31)}
      />

      {/* Expenses List */}
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
              name="receipt-long"
              size={64}
              color={Colors.textTertiary}
            />
            <Text style={styles.emptyTitle}>
              {search ? "No Results Found" : "No Expenses Yet"}
            </Text>
            <Text style={styles.emptyText}>
              {search
                ? "No expenses match your search criteria."
                : canWrite
                  ? "Tap the + button to add your first expense."
                  : "No expenses available."}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.expenseCard}>
            <View style={styles.expenseCardHeader}>
              <View style={styles.expenseIconContainer}>
                <MaterialIcons
                  name={getExpenseIcon(item.type)}
                  size={24}
                  color={Colors.primary}
                />
              </View>
              <View style={styles.expenseInfo}>
                <View style={styles.expenseTypeRow}>
                  <Text style={styles.expenseType}>
                    {EXPENSE_TYPE_OPTIONS.includes(item.type as ExpenseType)
                      ? formatExpenseTypeLabel(item.type as ExpenseType)
                      : item.type}
                  </Text>
                  <Text style={styles.expenseAmount}>
                    {formatCurrency(item.amount || 0)}
                  </Text>
                </View>
                {item.description && (
                  <Text style={styles.expenseDescription} numberOfLines={1}>
                    {item.description}
                  </Text>
                )}
                {item.purpose && (
                  <Text style={styles.expensePurpose} numberOfLines={1}>
                    Purpose: {item.purpose}
                  </Text>
                )}
                {item.productDetails && (
                  <Text style={styles.expenseMetaText} numberOfLines={1}>
                    Product: {item.productDetails}
                  </Text>
                )}
                {showStaffDetails && (
                  <>
                    <View style={styles.expenseMetaRow}>
                      <MaterialIcons
                        name="person"
                        size={12}
                        color={Colors.textSecondary}
                      />
                      <Text style={styles.expenseMetaText} numberOfLines={1}>
                        Spent by: {getPurchaserName(item)}
                      </Text>
                    </View>
                  </>
                )}
                {item.date && (
                  <View style={styles.expenseDate}>
                    <MaterialIcons
                      name="calendar-today"
                      size={12}
                      color={Colors.textSecondary}
                    />
                    <Text style={styles.expenseDateText}>
                      {String(item.date).slice(0, 10)}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {canWrite && (
              <View style={styles.expenseActions}>
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
                {canDeleteExpenses && (
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
                )}
              </View>
            )}
          </View>
        )}
      />
    </SafeAreaView>
  );
}

// Helper function to get icon based on expense type
const getExpenseIcon = (type: string) => {
  const typeLower = type.toLowerCase();
  if (typeLower === "seed") return "grass";
  if (typeLower === "fertilizer") return "science";
  if (typeLower === "pot") return "yard";
  if (typeLower === "soil") return "terrain";
  if (typeLower === "water") return "water-drop";
  if (typeLower === "electricity" || typeLower === "electricty") return "bolt";
  if (typeLower === "transport") return "local-shipping";
  if (typeLower === "tools") return "build";
  if (typeLower === "other" || typeLower === "others") return "receipt";
  if (typeLower.includes("rent")) return "home";
  if (typeLower.includes("salary") || typeLower.includes("wage"))
    return "people";
  if (
    typeLower.includes("utility") ||
    typeLower.includes("electric") ||
    typeLower.includes("water")
  )
    return "bolt";
  if (typeLower.includes("supplies") || typeLower.includes("material"))
    return "inventory";
  if (typeLower.includes("transport") || typeLower.includes("fuel"))
    return "local-shipping";
  if (typeLower.includes("marketing") || typeLower.includes("ad"))
    return "campaign";
  if (typeLower.includes("maintenance") || typeLower.includes("repair"))
    return "build";
  if (typeLower.includes("insurance")) return "security";
  if (typeLower.includes("tax")) return "receipt";
  return "receipt";
};

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
    marginBottom: Spacing.lg,
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
  // Stats Styles
  statsContainer: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 16,
    padding: Spacing.md,
  },
  statItem: {
    flex: 1,
    alignItems: "center" as const,
  },
  statLabel: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.8)",
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: Colors.white,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
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
  dropdownTrigger: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
  },
  dropdownTriggerText: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: "500" as const,
  },
  dropdownPlaceholderText: {
    color: Colors.textTertiary,
    fontWeight: "400" as const,
  },
  dropdownMenu: {
    marginTop: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    backgroundColor: Colors.white,
    overflow: "hidden" as const,
  },
  dropdownOption: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  dropdownOptionLeft: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: Spacing.sm,
  },
  dropdownOptionSelected: {
    backgroundColor: Colors.primary + "10",
  },
  dropdownOptionPressed: {
    backgroundColor: Colors.surface,
  },
  dropdownOptionText: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: "500" as const,
  },
  dropdownOptionTextSelected: {
    color: Colors.primary,
    fontWeight: "700" as const,
  },
  dateInput: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
  },
  dateInputPressed: {
    opacity: 0.85,
  },
  dateInputText: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: "500" as const,
  },
  inputError: {
    borderColor: Colors.error,
  },
  inputSuccess: {
    borderColor: Colors.success,
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
  amountPreview: {
    marginTop: Spacing.xs,
  },
  amountPreviewGradient: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    padding: Spacing.sm,
    borderRadius: 8,
    gap: Spacing.sm,
  },
  amountPreviewText: {
    fontSize: 13,
    color: Colors.success,
    fontWeight: "600" as const,
  },
  formActions: {
    flexDirection: "row" as const,
    gap: Spacing.md,
    marginTop: Spacing.sm,
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
  // Expense Card Styles
  expenseCard: {
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
  expenseCardHeader: {
    flexDirection: "row" as const,
    gap: Spacing.md,
  },
  expenseIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.primary + "10",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  expenseInfo: {
    flex: 1,
    gap: 4,
  },
  expenseTypeRow: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
  },
  expenseType: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: Colors.text,
    flex: 1,
  },
  expenseAmount: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: Colors.error,
  },
  expenseDescription: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  expensePurpose: {
    fontSize: 13,
    color: Colors.text,
    fontWeight: "500" as const,
  },
  expenseMetaRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
  },
  expenseMetaText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  expenseMetaMuted: {
    fontSize: 11,
    color: Colors.textTertiary,
  },
  expenseDate: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
  },
  expenseDateText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  expenseActions: {
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
