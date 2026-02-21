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
import { LabourService } from "../../services/labour.service";
import { Colors, Spacing } from "../../theme";
import type { Labour } from "../../types/labour.types";
import { formatErrorMessage } from "../../utils/error";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const BOTTOM_NAV_HEIGHT = 80;
const WORK_TYPE_OPTIONS = [
  "SEED_SOWING",
  "WATERING",
  "POTTING",
  "WEEDING",
  "FERTILIZING",
  "PACKING",
  "LOADING",
] as const;
type WorkType = (typeof WORK_TYPE_OPTIONS)[number];

interface LaboursModuleScreenProps {
  title: string;
  canWrite: boolean;
}

export function LaboursModuleScreen({
  title,
  canWrite,
}: LaboursModuleScreenProps) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [name, setName] = useState("");
  const [workType, setWorkType] = useState<WorkType | "">("");
  const [hoursWorked, setHoursWorked] = useState("");
  const [wagePerHour, setWagePerHour] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [editing, setEditing] = useState<Labour | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [isFormExpanded, setIsFormExpanded] = useState(false);
  const [showWorkTypeDropdown, setShowWorkTypeDropdown] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["labours"],
    queryFn: LabourService.getAll,
  });

  const labours = useMemo(() => (Array.isArray(data) ? data : []), [data]);

  /* ---------- Statistics ---------- */
  const stats = useMemo(() => {
    const totalRecords = labours.length;
    const totalHours = labours.reduce(
      (sum, item) => sum + (item.hoursWorked || 0),
      0,
    );
    const totalWage = labours.reduce(
      (sum, item) => sum + (item.hoursWorked || 0) * (item.wagePerHour || 0),
      0,
    );
    const averageWage = totalHours > 0 ? totalWage / totalHours : 0;
    const uniqueWorkers = new Set(labours.map((item) => item.name)).size;

    return {
      totalRecords,
      totalHours,
      totalWage,
      averageWage,
      uniqueWorkers,
    };
  }, [labours]);

  /* ---------- Filtering ---------- */
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return labours.filter(
      (labour) =>
        labour.name?.toLowerCase().includes(term) ||
        labour.workType?.toLowerCase().includes(term) ||
        labour.date?.toLowerCase().includes(term),
    );
  }, [labours, search]);

  const resetForm = () => {
    setName("");
    setWorkType("");
    setHoursWorked("");
    setWagePerHour("");
    const now = new Date();
    setDate(now.toISOString().slice(0, 10));
    setSelectedDate(now);
    setShowWorkTypeDropdown(false);
    setEditing(null);
    setIsFormExpanded(false);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error("Labour name is required");

      const hoursValue = hoursWorked ? Number(hoursWorked) : 0;
      const wageValue = wagePerHour ? Number(wagePerHour) : 0;

      if (hoursWorked && (isNaN(hoursValue) || hoursValue < 0)) {
        throw new Error("Please enter valid hours worked");
      }

      if (wagePerHour && (isNaN(wageValue) || wageValue < 0)) {
        throw new Error("Please enter valid wage per hour");
      }
      if (!workType) {
        throw new Error("Work type is required");
      }
      if (!WORK_TYPE_OPTIONS.includes(workType)) {
        throw new Error("Invalid work type selected");
      }

      const payload = {
        name: name.trim(),
        workType,
        hoursWorked: hoursValue || undefined,
        wagePerHour: wageValue || undefined,
        date: date.trim() || undefined,
      };

      if (editing) return LabourService.update(editing._id, payload);
      return LabourService.create(payload);
    },
    onSuccess: async () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await queryClient.invalidateQueries({ queryKey: ["labours"] });
      resetForm();
      setShowForm(false);
      Alert.alert(
        "Success",
        editing
          ? "Labour record updated successfully"
          : "Labour record created successfully",
      );
    },
    onError: (error: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Error", formatErrorMessage(error));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => LabourService.delete(id),
    onSuccess: async () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await queryClient.invalidateQueries({ queryKey: ["labours"] });
    },
    onError: (error: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Error", formatErrorMessage(error));
    },
  });

  const onEdit = (labour: Labour) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditing(labour);
    setName(labour.name ?? "");
    const editWorkType = (labour.workType ?? "") as WorkType | "";
    setWorkType(
      WORK_TYPE_OPTIONS.includes(editWorkType as WorkType) ? editWorkType : "",
    );
    setHoursWorked(
      labour.hoursWorked !== undefined ? String(labour.hoursWorked) : "",
    );
    setWagePerHour(
      labour.wagePerHour !== undefined ? String(labour.wagePerHour) : "",
    );
    const nextDate = labour.date ? new Date(labour.date) : new Date();
    setDate(nextDate.toISOString().slice(0, 10));
    setSelectedDate(nextDate);
    setShowWorkTypeDropdown(false);
    setShowForm(true);
    setIsFormExpanded(true);
  };

  const onDelete = (labour: Labour) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      "Delete Labour Record",
      `Are you sure you want to delete the labour record for "${labour.name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteMutation.mutate(labour._id),
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
      setWorkType("SEED_SOWING");
    }
    setShowForm((prev) => !prev);
  };

  const formatCurrency = (amount: number) =>
    `₹${amount.toLocaleString("en-IN")}`;

  const formatDate = (dateString: string) => {
    if (!dateString) return "—";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const handleDateConfirm = (picked: Date) => {
    setSelectedDate(picked);
    setDate(picked.toISOString().slice(0, 10));
    setShowDatePicker(false);
  };

  const isFormValid = () =>
    name.trim().length > 0 &&
    !!workType &&
    WORK_TYPE_OPTIONS.includes(workType) &&
    !!hoursWorked.trim() &&
    !!wagePerHour.trim();

  const workTypeLabel = (value: WorkType) =>
    value
      .toLowerCase()
      .split("_")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");

  const getWorkTypeIcon = (type?: string) => {
    if (!type) return "work";
    const lower = type.toLowerCase();
    if (lower === "seed_sowing") return "grass";
    if (lower === "watering") return "water-drop";
    if (lower === "potting") return "yard";
    if (lower === "weeding") return "spa";
    if (lower === "fertilizing") return "science";
    if (lower === "packing") return "inventory-2";
    if (lower === "loading") return "local-shipping";
    if (lower.includes("harvest") || lower.includes("pluck"))
      return "agriculture";
    if (lower.includes("plant") || lower.includes("sow")) return "grass";
    if (lower.includes("water") || lower.includes("irrigat")) return "water";
    if (lower.includes("prune") || lower.includes("trim")) return "content-cut";
    if (lower.includes("fertiliz") || lower.includes("compost"))
      return "science";
    if (lower.includes("clean")) return "cleaning-services";
    if (lower.includes("pack") || lower.includes("sort")) return "inventory";
    return "work";
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.center} edges={["left", "right"]}>
        <View style={styles.loadingCard}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading labour records...</Text>
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
          <Text style={styles.errorMessage}>
            {(error as any)?.message || "Failed to load labour records"}
          </Text>
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
            <View>
              <Text style={styles.headerTitle}>{title}</Text>
              <Text style={styles.headerSubtitle}>
                {stats.totalRecords} records • {stats.uniqueWorkers} workers
              </Text>
            </View>
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
                color={Colors.white}
              />
            </Pressable>
          )}
        </View>

        {/* Stats Cards */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View
              style={[
                styles.statIconContainer,
                { backgroundColor: Colors.primary },
              ]}
            >
              <MaterialIcons
                name="access-time"
                size={16}
                color={Colors.white}
              />
            </View>
            <View style={styles.statInfo}>
              <Text style={styles.statValue}>{stats.totalHours}</Text>
              <Text style={styles.statLabel}>Total Hours</Text>
            </View>
          </View>

          <View style={styles.statCard}>
            <View
              style={[
                styles.statIconContainer,
                { backgroundColor: Colors.success },
              ]}
            >
              <MaterialIcons
                name="currency-rupee"
                size={16}
                color={Colors.white}
              />
            </View>
            <View style={styles.statInfo}>
              <Text style={styles.statValue}>
                {formatCurrency(stats.totalWage)}
              </Text>
              <Text style={styles.statLabel}>Total Cost</Text>
            </View>
          </View>

          <View style={styles.statCard}>
            <View
              style={[
                styles.statIconContainer,
                { backgroundColor: Colors.warning },
              ]}
            >
              <MaterialIcons
                name="trending-up"
                size={16}
                color={Colors.white}
              />
            </View>
            <View style={styles.statInfo}>
              <Text style={styles.statValue}>
                {formatCurrency(stats.averageWage)}
              </Text>
              <Text style={styles.statLabel}>Avg Wage/Hr</Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      {/* Search Bar */}
      <View style={styles.searchSection}>
        <View style={styles.searchContainer}>
          <MaterialIcons name="search" size={20} color={Colors.textSecondary} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search by name, work type, or date..."
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
                {editing ? "Edit Labour Record" : "Add Labour Record"}
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
                <Text style={styles.inputLabelText}>Labour Name *</Text>
              </View>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Enter labour name"
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

            {/* Work Type Field */}
            <View style={styles.inputWrapper}>
              <View style={styles.inputLabel}>
                <MaterialIcons
                  name="work"
                  size={16}
                  color={Colors.textSecondary}
                />
                <Text style={styles.inputLabelText}>Work Type *</Text>
              </View>
              <Pressable
                onPress={() => setShowWorkTypeDropdown((prev) => !prev)}
                style={({ pressed }) => [
                  styles.input,
                  styles.dropdownTrigger,
                  !workType && name.length > 0 && styles.inputError,
                  pressed && styles.dateInputPressed,
                ]}
              >
                <Text
                  style={[
                    styles.dropdownTriggerText,
                    !workType && styles.dropdownPlaceholderText,
                  ]}
                >
                  {workType
                    ? workTypeLabel(workType as WorkType)
                    : "Select work type"}
                </Text>
                <MaterialIcons
                  name={
                    showWorkTypeDropdown
                      ? "keyboard-arrow-up"
                      : "keyboard-arrow-down"
                  }
                  size={20}
                  color={Colors.textSecondary}
                />
              </Pressable>
              {showWorkTypeDropdown && (
                <View style={styles.dropdownMenu}>
                  {WORK_TYPE_OPTIONS.map((option) => (
                    <Pressable
                      key={option}
                      onPress={() => {
                        setWorkType(option);
                        setShowWorkTypeDropdown(false);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                      style={({ pressed }) => [
                        styles.dropdownOption,
                        workType === option && styles.dropdownOptionSelected,
                        pressed && styles.dropdownOptionPressed,
                      ]}
                    >
                      <View style={styles.dropdownOptionLeft}>
                        <MaterialIcons
                          name={getWorkTypeIcon(option)}
                          size={16}
                          color={
                            workType === option
                              ? Colors.primary
                              : Colors.textSecondary
                          }
                        />
                        <Text
                          style={[
                            styles.dropdownOptionText,
                            workType === option && styles.dropdownOptionTextSelected,
                          ]}
                        >
                          {workTypeLabel(option)}
                        </Text>
                      </View>
                      {workType === option && (
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
              {!workType && name.length > 0 && (
                <Text style={styles.fieldError}>Work type is required</Text>
              )}
            </View>

            {/* Hours and Wage Row */}
            <View style={styles.rowContainer}>
              <View style={[styles.inputWrapper, styles.halfWidth]}>
                <View style={styles.inputLabel}>
                  <MaterialIcons
                    name="access-time"
                    size={16}
                    color={Colors.textSecondary}
                  />
                  <Text style={styles.inputLabelText}>Hours Worked</Text>
                </View>
                <TextInput
                  value={hoursWorked}
                  onChangeText={(text) =>
                    setHoursWorked(text.replace(/[^0-9.]/g, ""))
                  }
                  placeholder="0.0"
                  placeholderTextColor={Colors.textTertiary}
                  keyboardType="decimal-pad"
                  style={styles.input}
                />
              </View>

              <View style={[styles.inputWrapper, styles.halfWidth]}>
                <View style={styles.inputLabel}>
                  <MaterialIcons
                    name="currency-rupee"
                    size={16}
                    color={Colors.textSecondary}
                  />
                  <Text style={styles.inputLabelText}>Wage/Hour</Text>
                </View>
                <TextInput
                  value={wagePerHour}
                  onChangeText={(text) =>
                    setWagePerHour(text.replace(/[^0-9.]/g, ""))
                  }
                  placeholder="0.00"
                  placeholderTextColor={Colors.textTertiary}
                  keyboardType="decimal-pad"
                  style={styles.input}
                />
              </View>
            </View>

            {/* Cost Preview */}
            {hoursWorked &&
              wagePerHour &&
              Number(hoursWorked) > 0 &&
              Number(wagePerHour) > 0 && (
                <View style={styles.costPreview}>
                  <LinearGradient
                    colors={[Colors.success + "20", Colors.success + "10"]}
                    style={styles.costPreviewGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <MaterialIcons
                      name="calculate"
                      size={16}
                      color={Colors.success}
                    />
                    <Text style={styles.costPreviewLabel}>
                      Total Labour Cost:
                    </Text>
                    <Text style={styles.costPreviewValue}>
                      {formatCurrency(
                        Number(hoursWorked) * Number(wagePerHour),
                      )}
                    </Text>
                  </LinearGradient>
                </View>
              )}

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
                <Text style={styles.dateInputText}>{formatDate(date)}</Text>
                <MaterialIcons
                  name="calendar-today"
                  size={18}
                  color={Colors.textSecondary}
                />
              </Pressable>
            </View>

            {/* Form Actions */}
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
                <Text style={styles.cancelFormButtonText}>Cancel</Text>
              </Pressable>

              <Pressable
                disabled={saveMutation.isPending || !isFormValid()}
                onPress={() => saveMutation.mutate()}
                style={({ pressed }) => [
                  styles.saveFormButton,
                  (!isFormValid() || saveMutation.isPending) &&
                    styles.saveFormButtonDisabled,
                  pressed && styles.saveFormButtonPressed,
                ]}
              >
                <LinearGradient
                  colors={
                    !isFormValid() || saveMutation.isPending
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
                        {editing ? "Update" : "Save Record"}
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

      {/* Labour Records List */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        ListFooterComponent={<View style={styles.bottomSpacer} />}
        ListHeaderComponent={
          filtered.length > 0 ? (
            <View style={styles.listHeader}>
              <Text style={styles.listHeaderTitle}>Labour Records</Text>
              <Text style={styles.listHeaderCount}>
                {filtered.length} records
              </Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialIcons
              name="people-outline"
              size={64}
              color={Colors.textTertiary}
            />
            <Text style={styles.emptyTitle}>
              {search ? "No Results Found" : "No Labour Records"}
            </Text>
            <Text style={styles.emptyText}>
              {search
                ? "No labour records match your search criteria."
                : canWrite
                  ? "Tap the + button to add your first labour record."
                  : "No labour records available."}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const hours = Number(item.hoursWorked ?? 0);
          const wage = Number(item.wagePerHour ?? 0);
          const totalCost = hours * wage;
          const workTypeIcon = getWorkTypeIcon(item.workType);

          return (
            <View style={styles.labourCard}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <View style={styles.workerAvatar}>
                    <Text style={styles.workerInitials}>
                      {item.name?.charAt(0).toUpperCase() || "L"}
                    </Text>
                  </View>
                  <View style={styles.workerInfo}>
                    <Text style={styles.workerName}>{item.name}</Text>
                    {item.workType && (
                      <View style={styles.workTypeBadge}>
                        <MaterialIcons
                          name={workTypeIcon}
                          size={12}
                          color={Colors.primary}
                        />
                        <Text style={styles.workTypeText}>{item.workType}</Text>
                      </View>
                    )}
                  </View>
                </View>
                {canWrite && (
                  <Pressable
                    onPress={() => onEdit(item)}
                    style={({ pressed }) => [
                      styles.cardMenuButton,
                      pressed && styles.cardMenuButtonPressed,
                    ]}
                  >
                    <MaterialIcons
                      name="more-vert"
                      size={20}
                      color={Colors.textSecondary}
                    />
                  </Pressable>
                )}
              </View>

              <View style={styles.cardDetails}>
                {/* Hours and Wage */}
                <View style={styles.detailRow}>
                  <View style={styles.detailItem}>
                    <MaterialIcons
                      name="access-time"
                      size={14}
                      color={Colors.textSecondary}
                    />
                    <Text style={styles.detailLabel}>Hours:</Text>
                    <Text style={styles.detailValue}>{hours}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <MaterialIcons
                      name="currency-rupee"
                      size={14}
                      color={Colors.textSecondary}
                    />
                    <Text style={styles.detailLabel}>Wage/Hr:</Text>
                    <Text style={styles.detailValue}>{wage}</Text>
                  </View>
                </View>

                {/* Total Cost */}
                {totalCost > 0 && (
                  <View style={styles.totalCostContainer}>
                    <MaterialIcons
                      name="receipt"
                      size={14}
                      color={Colors.success}
                    />
                    <Text style={styles.totalCostLabel}>Total Cost:</Text>
                    <Text style={styles.totalCostValue}>
                      {formatCurrency(totalCost)}
                    </Text>
                  </View>
                )}

                {/* Date */}
                {item.date && (
                  <View style={styles.dateContainer}>
                    <MaterialIcons
                      name="calendar-today"
                      size={12}
                      color={Colors.textTertiary}
                    />
                    <Text style={styles.dateText}>{formatDate(item.date)}</Text>
                  </View>
                )}
              </View>

              {/* Actions */}
              {canWrite && (
                <View style={styles.cardActions}>
                  <Pressable
                    onPress={() => onEdit(item)}
                    style={({ pressed }) => [
                      styles.actionButton,
                      styles.editAction,
                      pressed && styles.actionButtonPressed,
                    ]}
                  >
                    <MaterialIcons
                      name="edit"
                      size={14}
                      color={Colors.primary}
                    />
                    <Text style={styles.editActionText}>Edit</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => onDelete(item)}
                    style={({ pressed }) => [
                      styles.actionButton,
                      styles.deleteAction,
                      pressed && styles.actionButtonPressed,
                    ]}
                  >
                    <MaterialIcons
                      name="delete-outline"
                      size={14}
                      color={Colors.error}
                    />
                    <Text style={styles.deleteActionText}>Delete</Text>
                  </Pressable>
                </View>
              )}
            </View>
          );
        }}
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
    marginBottom: Spacing.lg,
  },
  headerLeft: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: Spacing.md,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700" as const,
    color: Colors.white,
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.9)",
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  addButtonPressed: {
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    transform: [{ scale: 0.95 }],
  },
  // Stats Styles
  statsGrid: {
    flexDirection: "row" as const,
    gap: Spacing.sm,
  },
  statCard: {
    flex: 1,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 12,
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  statIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  statInfo: {
    flex: 1,
  },
  statValue: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: Colors.white,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 10,
    color: "rgba(255, 255, 255, 0.8)",
  },
  // Search Styles
  searchSection: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.background,
  },
  searchContainer: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 16,
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
  fieldError: {
    fontSize: 12,
    color: Colors.error,
    paddingHorizontal: Spacing.xs,
  },
  rowContainer: {
    flexDirection: "row" as const,
    gap: Spacing.md,
  },
  halfWidth: {
    flex: 1,
  },
  costPreview: {
    marginTop: Spacing.xs,
  },
  costPreviewGradient: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    padding: Spacing.md,
    borderRadius: 12,
    gap: Spacing.sm,
  },
  costPreviewLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  costPreviewValue: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: Colors.success,
  },
  formActions: {
    flexDirection: "row" as const,
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  cancelFormButton: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: Colors.surface,
    paddingVertical: Spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
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
  listHeader: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    paddingVertical: Spacing.sm,
  },
  listHeaderTitle: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: Colors.text,
  },
  listHeaderCount: {
    fontSize: 14,
    color: Colors.textSecondary,
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
  // Labour Card Styles
  labourCard: {
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
  cardHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    marginBottom: Spacing.md,
  },
  cardHeaderLeft: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: Spacing.md,
    flex: 1,
  },
  workerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary + "20",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  workerInitials: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: Colors.primary,
  },
  workerInfo: {
    flex: 1,
    gap: 4,
  },
  workerName: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: Colors.text,
  },
  workTypeBadge: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: Colors.primary + "10",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: 12,
    alignSelf: "flex-start" as const,
    gap: 4,
  },
  workTypeText: {
    fontSize: 11,
    fontWeight: "600" as const,
    color: Colors.primary,
  },
  cardMenuButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  cardMenuButtonPressed: {
    backgroundColor: Colors.surface,
  },
  cardDetails: {
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  detailRow: {
    flexDirection: "row" as const,
    gap: Spacing.lg,
  },
  detailItem: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
  },
  detailLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.text,
  },
  totalCostContainer: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: Colors.success + "10",
    padding: Spacing.sm,
    borderRadius: 8,
    gap: 6,
  },
  totalCostLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  totalCostValue: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: Colors.success,
  },
  dateContainer: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
  },
  dateText: {
    fontSize: 12,
    color: Colors.textTertiary,
  },
  cardActions: {
    flexDirection: "row" as const,
    justifyContent: "flex-end" as const,
    gap: Spacing.sm,
    paddingTop: Spacing.sm,
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
    gap: 6,
  },
  actionButtonPressed: {
    transform: [{ scale: 0.95 }],
    opacity: 0.8,
  },
  editAction: {
    backgroundColor: Colors.primary + "10",
  },
  editActionText: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: Colors.primary,
  },
  deleteAction: {
    backgroundColor: Colors.error + "10",
  },
  deleteActionText: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: Colors.error,
  },
};
