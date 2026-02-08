import { MaterialIcons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
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
import { SeedService } from "../../../services/seed.service";
import { Colors, Spacing } from "../../../theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const BOTTOM_NAV_HEIGHT = 80;

/* ---------- Date helpers (date-only safe) ---------- */
const toDateOnly = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate());

const formatDate = (d: Date) => toDateOnly(d).toISOString().split("T")[0];

const formatDisplayDate = (d: Date) =>
  d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

export default function EditSeed() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  /* ---------- Fetch seed ---------- */
  const { data, isLoading, error } = useQuery({
    queryKey: ["seed", id],
    queryFn: () => SeedService.getById(id as string),
    enabled: Boolean(id),
  });

  /* ---------- Normalize API response ---------- */
  const seed = useMemo(() => {
    if (!data) return null;
    return data.data ?? data;
  }, [data]);

  /* ---------- Form state ---------- */
  const [name, setName] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [expiryDate, setExpiryDate] = useState<Date | null>(null);
  const [showPicker, setShowPicker] = useState(false);

  /* ---------- Populate form safely ---------- */
  useEffect(() => {
    if (!seed) return;

    setName(seed.name ?? "");
    setSupplierName(seed.supplierName ?? "");
    setExpiryDate(seed.expiryDate ? new Date(seed.expiryDate) : null);
  }, [seed]);

  /* ---------- Date picker handler (Android safe) ---------- */
  const handleDatePick = (_: any, date?: Date) => {
    setShowPicker(false);
    if (!date) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpiryDate(date);
  };

  /* ---------- Save ---------- */
  const mutation = useMutation({
    mutationFn: (payload: any) => SeedService.update(id as string, payload),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ["seeds"] });
      queryClient.invalidateQueries({ queryKey: ["seed", id] });
      Alert.alert("Success", "Seed updated successfully", [
        { text: "OK", onPress: () => router.back() },
      ]);
    },
    onError: (err: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Error", err?.message || "Failed to update seed");
    },
  });

  const handleSave = () => {
    if (!id) return;

    if (!name.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert("Validation Error", "Seed name is required");
      return;
    }

    if (!expiryDate) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert("Validation Error", "Expiry date is required");
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    mutation.mutate({
      name: name.trim(),
      supplierName: supplierName.trim(),
      expiryDate: formatDate(expiryDate),
    });
  };

  /* ---------- Expiry status (date-only correct) ---------- */
  const today = toDateOnly(new Date());
  const expiry = expiryDate ? toDateOnly(expiryDate) : null;

  const isExpired = expiry ? expiry < today : false;

  const daysUntilExpiry = expiry
    ? Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    : null;

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
            <Text style={styles.title}>Edit Seed</Text>
            <Text style={styles.subtitle}>Loading seed details...</Text>
          </View>
          <View style={styles.headerSpacer} />
        </LinearGradient>

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading seed data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  /* ---------- Error ---------- */
  if (error || !seed) {
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
            <Text style={styles.title}>Edit Seed</Text>
            <Text style={styles.subtitle}>Unable to load data</Text>
          </View>
          <View style={styles.headerSpacer} />
        </LinearGradient>

        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={64} color={Colors.error} />
          <Text style={styles.errorTitle}>Failed to Load Seed</Text>
          <Text style={styles.errorMessage}>
            Unable to fetch seed details. Please try again.
          </Text>
          <Pressable onPress={() => router.back()} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

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
          <Text style={styles.title}>Edit Seed</Text>
          <Text style={styles.subtitle}>Update seed information</Text>
        </View>
        <View style={styles.headerSpacer} />
      </LinearGradient>

      {/* Scrollable Content */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Form Card */}
        <View style={styles.formCard}>
          {/* Seed Info Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="info" size={22} color={Colors.text} />
              <Text style={styles.sectionTitle}>Seed Information</Text>
            </View>
            <Text style={styles.sectionDescription}>
              Update the seed details below. Only edit what you want to change.
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
                placeholder="Edit seed name"
                placeholderTextColor={Colors.textTertiary}
                style={styles.input}
              />
              {!(name || "").trim() && (
                <View style={styles.validationError}>
                  <MaterialIcons name="error" size={14} color={Colors.error} />
                  <Text style={styles.validationText}>
                    Seed name is required
                  </Text>
                </View>
              )}
            </View>

            {/* Supplier Field */}
            <View style={styles.inputContainer}>
              <View style={styles.inputLabel}>
                <MaterialIcons name="business" size={18} color={Colors.text} />
                <Text style={styles.inputLabelText}>Supplier Name</Text>
              </View>
              <TextInput
                value={supplierName}
                onChangeText={setSupplierName}
                placeholder="Edit supplier name"
                placeholderTextColor={Colors.textTertiary}
                style={styles.input}
              />
            </View>

            {/* Expiry Date Field */}
            <View style={styles.inputContainer}>
              <View style={styles.inputLabel}>
                <MaterialIcons name="event" size={18} color={Colors.text} />
                <Text style={styles.inputLabelText}>Expiry Date *</Text>
              </View>
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowPicker(true);
                }}
                style={({ pressed }) => [
                  styles.dateButton,
                  pressed && styles.dateButtonPressed,
                ]}
              >
                <MaterialIcons
                  name="calendar-today"
                  size={20}
                  color={expiryDate ? Colors.success : Colors.textSecondary}
                />
                <Text
                  style={[
                    styles.dateText,
                    expiryDate && styles.dateTextSelected,
                    isExpired && styles.dateTextExpired,
                  ]}
                >
                  {expiryDate
                    ? formatDisplayDate(expiryDate)
                    : "Select expiry date"}
                </Text>
                <MaterialIcons
                  name="chevron-right"
                  size={20}
                  color={Colors.textTertiary}
                />
              </Pressable>

              {/* Date Status Info */}
              {expiryDate && (
                <View style={styles.dateStatus}>
                  <LinearGradient
                    colors={
                      isExpired
                        ? [Colors.error + "20", Colors.error + "10"]
                        : daysUntilExpiry! <= 30
                          ? [Colors.warning + "20", Colors.warning + "10"]
                          : [Colors.success + "20", Colors.success + "10"]
                    }
                    style={styles.dateStatusGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <MaterialIcons
                      name={
                        isExpired
                          ? "error"
                          : daysUntilExpiry! <= 30
                            ? "warning"
                            : "check-circle"
                      }
                      size={16}
                      color={
                        isExpired
                          ? Colors.error
                          : daysUntilExpiry! <= 30
                            ? Colors.warning
                            : Colors.success
                      }
                    />
                    <Text
                      style={[
                        styles.dateStatusText,
                        {
                          color: isExpired
                            ? Colors.error
                            : daysUntilExpiry! <= 30
                              ? Colors.warning
                              : Colors.success,
                        },
                      ]}
                    >
                      {isExpired
                        ? "Already expired"
                        : `Expires in ${daysUntilExpiry} day${daysUntilExpiry !== 1 ? "s" : ""}`}
                    </Text>
                  </LinearGradient>
                </View>
              )}

              {!expiryDate && (
                <View style={styles.validationError}>
                  <MaterialIcons
                    name="error"
                    size={14}
                    color={Colors.warning}
                  />
                  <Text style={styles.validationText}>
                    Expiry date is required
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Current Info Preview */}
          {seed && (
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
                  <Text style={styles.currentInfoValue}>{seed.name}</Text>
                </View>
                {seed.supplierName && (
                  <View style={styles.currentInfoRow}>
                    <Text style={styles.currentInfoLabel}>Supplier:</Text>
                    <Text style={styles.currentInfoValue}>
                      {seed.supplierName}
                    </Text>
                  </View>
                )}
                <View style={styles.currentInfoRow}>
                  <Text style={styles.currentInfoLabel}>Expiry:</Text>
                  <Text
                    style={[
                      styles.currentInfoValue,
                      new Date(seed.expiryDate) < new Date() &&
                        styles.currentInfoValueExpired,
                    ]}
                  >
                    {formatDisplayDate(new Date(seed.expiryDate))}
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
              onPress={handleSave}
              disabled={
                mutation.isLoading || !(name || "").trim() || !expiryDate
              }
              style={({ pressed }) => [
                styles.saveButton,
                (!(name || "").trim() || !expiryDate) &&
                  styles.saveButtonDisabled,
                pressed && styles.saveButtonPressed,
                mutation.isLoading && styles.saveButtonLoading,
              ]}
            >
              <LinearGradient
                colors={
                  !(name || "").trim() || !expiryDate
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
          {(!(name || "").trim() || !expiryDate) && (
            <Text style={styles.hintText}>
              ⓘ Please fill all required fields (*) to save changes
            </Text>
          )}
        </View>
      </ScrollView>

      {showPicker && (
        <DateTimePicker
          value={expiryDate ?? new Date()}
          mode="date"
          display="default"
          onChange={handleDatePick}
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
    paddingBottom: BOTTOM_NAV_HEIGHT + Spacing.xl,
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
    paddingBottom: BOTTOM_NAV_HEIGHT + 2 * Spacing.lg,
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
  },
  dateButton: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  dateButtonPressed: {
    backgroundColor: Colors.surfaceDark,
  },
  dateText: {
    flex: 1,
    fontSize: 16,
    color: Colors.textSecondary,
    fontWeight: "500" as const,
  },
  dateTextSelected: {
    color: Colors.text,
    fontWeight: "600" as const,
  },
  dateTextExpired: {
    color: Colors.error,
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
    fontWeight: "600" as const,
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
  currentInfoValueExpired: {
    color: Colors.error,
  },
  actionsContainer: {
    flexDirection: "row" as const,
    gap: Spacing.md,
    marginBottom: Spacing.md,
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
  },
};
