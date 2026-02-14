// app/(staff)/germination/create.tsx
import { MaterialIcons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { GerminationService } from "../../../services/germination.service";
import { Sowing, SowingService } from "../../../services/sowing.service";
import { Colors } from "../../../theme";
import { formatErrorMessage } from "../../../utils/error";

const BOTTOM_NAV_HEIGHT = 80;

// ==================== UTILITY FUNCTIONS ====================

const formatNumber = (num: number): string => {
  return num.toLocaleString("en-IN");
};

const formatDate = (dateString?: string) => {
  if (!dateString) return "—";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "—";

  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return `Today, ${date.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })}`;
  } else if (date.toDateString() === yesterday.toDateString()) {
    return `Yesterday, ${date.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })}`;
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getSeedName = (sowing: Sowing): string => {
  if (typeof sowing.seedId === "object") {
    return sowing.seedId?.name || "Unknown Seed";
  }
  return "Unknown Seed";
};

const getPlantName = (sowing: Sowing): string => {
  if (typeof sowing.seedId === "object") {
    return (
      sowing.seedId?.plantType?.name ||
      sowing.plantType?.name ||
      "Unknown Plant"
    );
  }
  return sowing.plantType?.name || "Unknown Plant";
};

const getGerminatedSeeds = (sowing: Sowing): number => {
  const value = Number((sowing as any).quantityGerminated ?? 0);
  if (!Number.isFinite(value) || value < 0) return 0;
  return value;
};

const getPendingSeeds = (sowing: Sowing): Number => {
  const value = Number((sowing as any).quantityPendingGermination ?? 0);
  if (!Number.isFinite(value) || value < 0) return 0;
  return value;
};
const getGerminationRate = (sowing: Sowing): number => {
  const rate = Number((sowing as any).germinationRate);
  if (!isNaN(rate) && rate > 0) return rate;
  const germinatedSeeds = getGerminatedSeeds(sowing);
  if (germinatedSeeds > 0 && sowing.quantity > 0) {
    return Math.round((germinatedSeeds / sowing.quantity) * 100);
  }
  return 0;
};

// ==================== STATS CARD ====================

interface StatsCardProps {
  totalSowings: number;
  totalSeeds: number;
  completedSowings: number;
  pendingSowings: number;
}

const StatsCard = ({
  totalSowings,
  totalSeeds,
  completedSowings,
  pendingSowings,
}: StatsCardProps) => (
  <View style={styles.statsCard}>
    <View style={styles.statItem}>
      <View
        style={[
          styles.statIconContainer,
          { backgroundColor: `${Colors.primary}10` },
        ]}
      >
        <MaterialIcons name="list-alt" size={20} color={Colors.primary} />
      </View>
      <View style={styles.statContent}>
        <Text style={styles.statValue}>{formatNumber(totalSowings)}</Text>
        <Text style={styles.statLabel}>Sowings</Text>
      </View>
    </View>

    <View style={styles.statDivider} />

    <View style={styles.statItem}>
      <View
        style={[
          styles.statIconContainer,
          { backgroundColor: `${Colors.success}10` },
        ]}
      >
        <MaterialIcons name="check-circle" size={20} color={Colors.success} />
      </View>
      <View style={styles.statContent}>
        <Text style={styles.statValue}>{formatNumber(completedSowings)}</Text>
        <Text style={styles.statLabel}>Completed</Text>
      </View>
    </View>

    <View style={styles.statDivider} />

    <View style={styles.statItem}>
      <View
        style={[
          styles.statIconContainer,
          { backgroundColor: `${Colors.warning}10` },
        ]}
      >
        <MaterialIcons name="pending" size={20} color={Colors.warning} />
      </View>
      <View style={styles.statContent}>
        <Text style={styles.statValue}>{formatNumber(pendingSowings)}</Text>
        <Text style={styles.statLabel}>Pending</Text>
      </View>
    </View>
  </View>
);

// ==================== SOWING CARD ====================

interface SowingCardProps {
  sowing: Sowing;
  isSelected: boolean;
  onSelect: (id: string) => void;
  isDisabled?: boolean;
}

const SowingCard = ({
  sowing,
  isSelected,
  onSelect,
  isDisabled,
}: SowingCardProps) => {
  const seedName = getSeedName(sowing);
  const plantName = getPlantName(sowing);
  const quantity = sowing.quantity || 0;
  const germinated = getGerminatedSeeds(sowing);
  const remaining = Math.max(0, quantity - germinated);
  const rate = getGerminationRate(sowing);
  const hasGermination = germinated > 0;
  const isFullyGerminated = remaining <= 0;
  const date = formatDate(sowing.createdAt);

  const progressPercent =
    quantity > 0
      ? Math.min(100, Math.max(0, (germinated / quantity) * 100))
      : 0;

  return (
    <TouchableOpacity
      onPress={() => !isDisabled && !isFullyGerminated && onSelect(sowing._id)}
      style={[
        styles.sowingCard,
        isSelected && styles.sowingCardSelected,
        (isDisabled || isFullyGerminated) && styles.sowingCardDisabled,
      ]}
      activeOpacity={0.7}
      disabled={isDisabled || isFullyGerminated}
    >
      <View style={styles.sowingCardContent}>
        <View style={styles.sowingCardHeader}>
          <View style={styles.sowingCardHeaderLeft}>
            <View
              style={[
                styles.sowingIcon,
                {
                  backgroundColor: isSelected
                    ? `${Colors.success}20`
                    : isFullyGerminated
                      ? `${Colors.success}10`
                      : `${Colors.primary}10`,
                },
              ]}
            >
              <MaterialIcons
                name="grass"
                size={18}
                color={
                  isSelected
                    ? Colors.success
                    : isFullyGerminated
                      ? Colors.success
                      : Colors.primary
                }
              />
            </View>
            <View style={styles.sowingInfo}>
              <Text
                style={[
                  styles.sowingName,
                  isSelected && styles.sowingNameSelected,
                ]}
                numberOfLines={1}
              >
                {seedName}
              </Text>
              <View style={styles.plantContainer}>
                <MaterialIcons
                  name="arrow-forward"
                  size={10}
                  color={Colors.textTertiary}
                />
                <Text style={styles.plantName} numberOfLines={1}>
                  {plantName}
                </Text>
              </View>
            </View>
          </View>

          {isSelected && (
            <View style={styles.selectedBadge}>
              <MaterialIcons
                name="check-circle"
                size={18}
                color={Colors.success}
              />
            </View>
          )}
        </View>

        <View style={styles.sowingCardDetails}>
          <View style={styles.detailItem}>
            <MaterialIcons
              name="inventory"
              size={12}
              color={Colors.textSecondary}
            />
            <Text style={styles.detailText}>
              {formatNumber(quantity)} seeds
            </Text>
          </View>

          <View style={styles.detailDivider} />

          <View style={styles.detailItem}>
            <MaterialIcons
              name="schedule"
              size={12}
              color={Colors.textSecondary}
            />
            <Text style={styles.detailText}>{date}</Text>
          </View>
        </View>

        <View style={styles.sowingCardProgress}>
          <View style={styles.sowingProgressHeader}>
            <Text style={styles.sowingProgressLabel}>Germination</Text>
            <Text style={styles.sowingProgressValue}>
              {formatNumber(germinated)} / {formatNumber(quantity)}
            </Text>
          </View>
          <View style={styles.progressBarSmall}>
            <View
              style={[
                styles.progressFillSmall,
                {
                  width: `${progressPercent}%`,
                  backgroundColor: isFullyGerminated
                    ? Colors.success
                    : Colors.primary,
                },
              ]}
            />
          </View>
        </View>

        {isFullyGerminated && (
          <View
            style={[
              styles.completedBadge,
              { backgroundColor: `${Colors.success}10` },
            ]}
          >
            <MaterialIcons
              name="check-circle"
              size={12}
              color={Colors.success}
            />
            <Text
              style={[styles.completedBadgeText, { color: Colors.success }]}
            >
              Fully Germinated
            </Text>
          </View>
        )}

        {!isFullyGerminated && hasGermination && (
          <View
            style={[
              styles.germinationBadge,
              { backgroundColor: `${Colors.primary}10` },
            ]}
          >
            <MaterialIcons name="spa" size={12} color={Colors.primary} />
            <Text
              style={[styles.germinationBadgeText, { color: Colors.primary }]}
            >
              {rate}% germinated
            </Text>
          </View>
        )}
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
  disabled?: boolean;
  suffix?: string;
}

interface GerminationMetricProps {
  label: string;
  value: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  tone?: "neutral" | "success" | "warning";
}

const GerminationMetric = ({
  label,
  value,
  icon,
  tone = "neutral",
}: GerminationMetricProps) => {
  const toneStyles = {
    neutral: {
      card: styles.metricCardNeutral,
      iconWrap: styles.metricIconWrapNeutral,
      iconColor: Colors.primary,
      value: styles.metricValueNeutral,
    },
    success: {
      card: styles.metricCardSuccess,
      iconWrap: styles.metricIconWrapSuccess,
      iconColor: Colors.success,
      value: styles.metricValueSuccess,
    },
    warning: {
      card: styles.metricCardWarning,
      iconWrap: styles.metricIconWrapWarning,
      iconColor: Colors.warning,
      value: styles.metricValueWarning,
    },
  }[tone];

  return (
    <View style={[styles.metricCard, toneStyles.card]}>
      <View style={[styles.metricIconWrap, toneStyles.iconWrap]}>
        <MaterialIcons name={icon} size={14} color={toneStyles.iconColor} />
      </View>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, toneStyles.value]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
};

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
  disabled = false,
  suffix,
}: FormFieldProps) => {
  return (
    <View style={[styles.formField, disabled && styles.formFieldDisabled]}>
      <View style={styles.formFieldHeader}>
        <View style={styles.formLabelContainer}>
          {icon && (
            <MaterialIcons
              name={icon as any}
              size={16}
              color={disabled ? Colors.textTertiary : Colors.textSecondary}
            />
          )}
          <Text
            style={[
              styles.formLabel,
              disabled && { color: Colors.textTertiary },
            ]}
          >
            {label}
          </Text>
          {required && <Text style={styles.requiredStar}>*</Text>}
        </View>
        {helperText && <Text style={styles.helperText}>{helperText}</Text>}
      </View>

      <View style={styles.inputWrapper}>
        <TextInput
          style={[
            styles.formInput,
            error && styles.formInputError,
            disabled && styles.formInputDisabled,
            suffix && styles.formInputWithSuffix,
          ]}
          placeholder={placeholder}
          placeholderTextColor={Colors.textTertiary}
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          editable={!disabled}
        />
        {suffix && (
          <View style={styles.inputSuffix}>
            <Text style={styles.inputSuffixText}>{suffix}</Text>
          </View>
        )}
      </View>

      {error ? (
        <View style={styles.fieldErrorContainer}>
          <MaterialIcons name="error" size={14} color={Colors.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : max && value && !disabled ? (
        <View style={styles.hintContainer}>
          <MaterialIcons name="info" size={14} color={Colors.textTertiary} />
          <Text style={styles.hintText}>
            Maximum available: {formatNumber(max)} seeds
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
    <Text style={styles.loadingText}>Loading sowing records...</Text>
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
      <SafeAreaView edges={["top"]} style={styles.errorHeaderContent}>
        <TouchableOpacity
          onPress={onBack}
          style={styles.errorBackButton}
          activeOpacity={0.7}
        >
          <MaterialIcons name="arrow-back" size={20} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.errorHeaderTitle}>Record Germination</Text>
        <View style={styles.errorHeaderSpacer} />
      </SafeAreaView>
    </LinearGradient>

    <View style={styles.errorContainer}>
      <View style={styles.errorIconContainer}>
        <MaterialIcons name="error-outline" size={48} color={Colors.error} />
      </View>
      <Text style={styles.errorTitle}>Failed to Load Sowings</Text>
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

// ==================== EMPTY STATE ====================

interface EmptyStateProps {
  onCreatePress: () => void;
}

const EmptyState = ({ onCreatePress }: EmptyStateProps) => (
  <View style={styles.emptyContainer}>
    <View style={styles.emptyIconContainer}>
      <LinearGradient
        colors={[Colors.surface, Colors.background]}
        style={styles.emptyIconGradient}
      >
        <MaterialIcons name="inbox" size={48} color={Colors.textTertiary} />
      </LinearGradient>
    </View>
    <Text style={styles.emptyTitle}>No Sowing Records</Text>
    <Text style={styles.emptyMessage}>
      Create sowing activities first to track germination progress.
    </Text>
    <TouchableOpacity
      onPress={onCreatePress}
      style={styles.emptyButton}
      activeOpacity={0.7}
    >
      <LinearGradient
        colors={[Colors.success, "#059669"]}
        style={styles.emptyButtonGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <MaterialIcons name="add-circle" size={18} color={Colors.white} />
        <Text style={styles.emptyButtonText}>Record Sowing</Text>
      </LinearGradient>
    </TouchableOpacity>
  </View>
);

// ==================== MAIN COMPONENT ====================

export default function StaffGerminationCreate() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Form state
  const [selectedSowingId, setSelectedSowingId] = useState<string | null>(null);
  const [germinated, setGerminated] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch sowing records
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["staff-sowings"],
    queryFn: SowingService.getAll,
    staleTime: 30000,
    retry: 2,
  });

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  const sowings = useMemo<Sowing[]>(
    () => (Array.isArray(data) ? data : []),
    [data],
  );

  const selectedSowing = useMemo(
    () => sowings.find((s) => s._id === selectedSowingId),
    [sowings, selectedSowingId],
  );

  // Get germination data for selected sowing
  const totalSeeds = Number(selectedSowing?.quantity ?? 0);
  const alreadyGerminated = selectedSowing
    ? getGerminatedSeeds(selectedSowing)
    : 0;
  const remainingSeeds = Math.max(0, totalSeeds - alreadyGerminated);
  const isFullyGerminated = remainingSeeds <= 0;

  // Get available sowings (not fully germinated)
  const availableSowings = useMemo(
    () =>
      sowings.filter((s) => {
        const germinated = getGerminatedSeeds(s);
        return germinated < s.quantity;
      }),
    [sowings],
  );

  // Get completed sowings (fully germinated)
  const completedSowings = useMemo(
    () =>
      sowings.filter((s) => {
        const germinated = getGerminatedSeeds(s);
        return germinated >= s.quantity;
      }),
    [sowings],
  );

  // Reset input when sowing changes
  useEffect(() => {
    setGerminated("");
  }, [selectedSowingId]);

  const numericValue = Number(germinated);
  const isNumericValid =
    !isNaN(numericValue) && numericValue > 0 && numericValue <= remainingSeeds;

  const progressPercentage =
    remainingSeeds > 0 ? (numericValue / remainingSeeds) * 100 : 0;

  // Calculate stats
  const stats = useMemo(() => {
    const totalSowings = sowings.length;
    const totalSeeds = sowings.reduce((sum, s) => sum + (s.quantity || 0), 0);
    const completed = completedSowings.length;
    const pending = availableSowings.length;

    return {
      totalSowings,
      totalSeeds,
      completedSowings: completed,
      pendingSowings: pending,
    };
  }, [sowings, availableSowings, completedSowings]);

  // Validate before submission
  const validateGermination = useCallback(
    async (sowingId: string, requestedQty: number, fallbackSowing?: Sowing) => {
      const computeValidationFromSowing = (sowing: Sowing) => {
        const germinated = getGerminatedSeeds(sowing);
        const total = Number(sowing?.quantity ?? 0);
        const remaining = Math.max(0, total - germinated);

        if (remaining < requestedQty) {
          return {
            valid: false,
            message: `Insufficient seeds remaining. Only ${formatNumber(remaining)} seeds left to germinate.`,
            remaining,
          };
        }
        return { valid: true, remaining };
      };

      try {
        const latestSowing = await SowingService.getById(sowingId);
        return computeValidationFromSowing(latestSowing);
      } catch {
        // Fallback 1: fetch list and validate against the matching sowing.
        try {
          const latestSowings = await SowingService.getAll();
          const matched = latestSowings.find((s: Sowing) => s._id === sowingId);
          if (matched) {
            return computeValidationFromSowing(matched);
          }
        } catch {
          // Fallback 2 below.
        }

        // Fallback 2: use locally selected sowing to avoid blocking submission
        // when verification endpoints are unavailable.
        if (fallbackSowing) {
          return computeValidationFromSowing(fallbackSowing);
        }

        return {
          valid: true,
          remaining: Number.MAX_SAFE_INTEGER,
        };
      }
    },
    [],
  );

  // Mutation
  const mutation = useMutation({
    mutationFn: async () => {
      if (!selectedSowingId || !isNumericValid) {
        throw new Error("Invalid germination data");
      }

      const validation = await validateGermination(
        selectedSowingId,
        numericValue,
        selectedSowing,
      );
      if (!validation.valid) {
        throw new Error(validation.message);
      }

      return GerminationService.create({
        sowingId: selectedSowingId,
        germinatedSeeds: numericValue,
      });
    },
    onSuccess: async (response: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      const inventoryRef =
        response?.generatedInventory?._id ??
        response?.inventory?._id ??
        response?.inventoryId ??
        response?.data?.generatedInventory?._id ??
        null;

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["staff-sowings"] }),
        queryClient.invalidateQueries({ queryKey: ["inventory"] }),
        queryClient.invalidateQueries({ queryKey: ["staff-dashboard"] }),
      ]);

      const newRemaining = remainingSeeds - numericValue;
      const successMessage = inventoryRef
        ? `✅ Germination recorded successfully!\n\n` +
          `${formatNumber(numericValue)} seeds germinated from "${selectedSowing ? getSeedName(selectedSowing) : "Sowing"}"\n` +
          `${newRemaining > 0 ? `${formatNumber(newRemaining)} seeds remaining.` : "All seeds germinated!"}\n` +
          `Inventory batch: #${inventoryRef.slice(-6).toUpperCase()}`
        : `✅ Germination recorded successfully!\n\n` +
          `${formatNumber(numericValue)} seeds germinated.\n` +
          `${newRemaining > 0 ? `${formatNumber(newRemaining)} seeds remaining.` : "All seeds germinated!"}`;

      Alert.alert("Success", successMessage, [
        {
          text: "OK",
          onPress: () => router.back(),
          style: "default",
        },
      ]);
    },
    onError: (err: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

      if (
        err.message?.includes("Insufficient") ||
        err.message?.includes("remaining")
      ) {
        Alert.alert("⚠️ Insufficient Seeds", err.message, [
          {
            text: "Refresh Data",
            onPress: async () => {
              await refetch();
              setGerminated("");
            },
          },
          {
            text: "Cancel",
            style: "cancel",
          },
        ]);
      } else {
        Alert.alert("❌ Error", formatErrorMessage(err));
      }
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

  const handleSowingSelect = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedSowingId(id);
  };

  const handleSubmit = async () => {
    if (!selectedSowingId || !isNumericValid || isSubmitting) return;

    const validation = await validateGermination(
      selectedSowingId,
      numericValue,
      selectedSowing,
    );
    if (!validation.valid) {
      Alert.alert("⚠️ Insufficient Seeds", validation.message, [
        {
          text: "Refresh Data",
          onPress: async () => {
            await refetch();
            setGerminated("");
          },
        },
        {
          text: "Cancel",
          style: "cancel",
        },
      ]);
      return;
    }

    Alert.alert(
      "Confirm Germination",
      `Are you sure you want to record ${formatNumber(numericValue)} germinated seeds for "${selectedSowing ? getSeedName(selectedSowing) : "this sowing"}"?\n\n` +
        `This will create inventory for ${formatNumber(numericValue)} plants.\n` +
        `${formatNumber(remainingSeeds - numericValue)} seeds will remain.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: () => {
            setIsSubmitting(true);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            mutation.mutate();
          },
        },
      ],
    );
  };

  const handleCreateSowing = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push("/(staff)/sowing/create");
  };

  // Validation
  const getQuantityError = useCallback(() => {
    if (!germinated) return null;
    if (isNaN(numericValue)) return "Please enter a valid number";
    if (numericValue <= 0) return "Quantity must be greater than 0";
    if (numericValue > remainingSeeds) {
      return `Maximum available is ${formatNumber(remainingSeeds)} seeds`;
    }
    return null;
  }, [germinated, numericValue, remainingSeeds]);

  const quantityError = getQuantityError();
  const isValid = selectedSowingId && isNumericValid && !isFullyGerminated;
  const isPending = mutation.isPending || isSubmitting;

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <LoadingState />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <ErrorState
          message={
            (error as any)?.message ||
            "Unable to fetch sowing records. Please try again."
          }
          onRetry={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            refetch();
          }}
          onBack={handleBack}
        />
      </View>
    );
  }

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
              <Text style={styles.headerTitle}>Record Germination</Text>
              <Text style={styles.headerSubtitle}>
                {availableSowings.length}{" "}
                {availableSowings.length === 1 ? "sowing" : "sowings"} available
              </Text>
            </View>

            <View style={styles.headerRight} />
          </View>
        </SafeAreaView>
      </LinearGradient>

      {/* Stats Card */}
      {sowings.length > 0 && (
        <StatsCard
          totalSowings={stats.totalSowings}
          totalSeeds={stats.totalSeeds}
          completedSowings={stats.completedSowings}
          pendingSowings={stats.pendingSowings}
        />
      )}

      {/* Form Content with Keyboard Handling */}
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 16 : 0}
      >
        <FlatList
          data={availableSowings}
          keyExtractor={(item) => item._id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.listContent,
            selectedSowingId && styles.listContentWithForm,
          ]}
          ListHeaderComponent={
            <>
              {/* Sowings Section */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionHeaderLeft}>
                    <MaterialIcons
                      name="list-alt"
                      size={20}
                      color={Colors.primary}
                    />
                    <Text style={styles.sectionTitle}>Select Sowing</Text>
                    <Text style={styles.requiredStar}>*</Text>
                  </View>
                  {selectedSowingId && (
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

                {availableSowings.length === 0 ? (
                  <EmptyState onCreatePress={handleCreateSowing} />
                ) : null}
              </View>
            </>
          }
          renderItem={({ item }) => (
            <SowingCard
              sowing={item}
              isSelected={selectedSowingId === item._id}
              onSelect={handleSowingSelect}
              isDisabled={isPending}
            />
          )}
          ListFooterComponent={
            <>
              {/* Germination Input Section - Only show when sowing is selected and not fully germinated */}
              {selectedSowing && !isFullyGerminated && (
                <View style={styles.formSection}>
                  <View style={styles.sectionHeader}>
                    <View style={styles.sectionHeaderLeft}>
                      <MaterialIcons
                        name="spa"
                        size={20}
                        color={Colors.primary}
                      />
                      <Text style={styles.sectionTitle}>
                        Germination Details
                      </Text>
                      <Text style={styles.requiredStar}>*</Text>
                    </View>
                  </View>

                  {/* Selected Sowing Info */}
                  <View style={styles.selectedInfoCard}>
                    <View style={styles.selectedInfoRow}>
                      <MaterialIcons
                        name="grass"
                        size={16}
                        color={Colors.primary}
                      />
                      <Text style={styles.selectedInfoLabel}>Seed:</Text>
                      <Text style={styles.selectedInfoValue} numberOfLines={1}>
                        {getSeedName(selectedSowing)}
                      </Text>
                    </View>
                    <View style={styles.selectedInfoRow}>
                      <MaterialIcons
                        name="spa"
                        size={16}
                        color={Colors.success}
                      />
                      <Text style={styles.selectedInfoLabel}>Plant:</Text>
                      <Text style={styles.selectedInfoValue} numberOfLines={1}>
                        {getPlantName(selectedSowing)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.metricsSection}>
                    <Text style={styles.metricsTitle}>Seed Summary</Text>
                    <View style={styles.metricsGrid}>
                      <GerminationMetric
                        label="Total Sown"
                        value={`${formatNumber(totalSeeds)} seeds`}
                        icon="inventory-2"
                      />
                      <GerminationMetric
                        label="Already Germinated"
                        value={`${formatNumber(alreadyGerminated)} seeds`}
                        icon="check-circle"
                        tone="success"
                      />
                      <GerminationMetric
                        label="Remaining"
                        value={`${formatNumber(remainingSeeds)} seeds`}
                        icon="hourglass-bottom"
                        tone="warning"
                      />
                    </View>
                    <View style={styles.metricsHintRow}>
                      <MaterialIcons
                        name="tips-and-updates"
                        size={14}
                        color={Colors.primary}
                      />
                      <Text style={styles.metricsHintText}>
                        Enter only newly germinated seeds for this update.
                      </Text>
                    </View>
                  </View>

                  <FormField
                    label="Germinated Seeds"
                    value={germinated}
                    onChangeText={(text) =>
                      setGerminated(text.replace(/[^\d]/g, ""))
                    }
                    placeholder={`Enter quantity (max ${formatNumber(remainingSeeds)})`}
                    icon="spa"
                    keyboardType="numeric"
                    required
                    error={quantityError || undefined}
                    max={remainingSeeds}
                    disabled={isPending}
                    suffix="seeds"
                  />

                  {/* Progress Indicator */}
                  {germinated && !isNaN(numericValue) && (
                    <View style={styles.progressContainer}>
                      <View style={styles.progressHeader}>
                        <Text style={styles.progressLabel}>
                          This Germination
                        </Text>
                        <Text style={styles.progressValue}>
                          {formatNumber(numericValue)} /{" "}
                          {formatNumber(remainingSeeds)} (
                          {Math.min(progressPercentage, 100).toFixed(0)}%)
                        </Text>
                      </View>
                      <View style={styles.progressBar}>
                        <View
                          style={[
                            styles.progressFill,
                            {
                              width: `${Math.min(progressPercentage, 100)}%`,
                              backgroundColor: isNumericValid
                                ? Colors.success
                                : Colors.error,
                            },
                          ]}
                        />
                      </View>
                      {isNumericValid && (
                        <Text style={styles.progressHint}>
                          After this,{" "}
                          {formatNumber(remainingSeeds - numericValue)} seeds
                          will remain
                        </Text>
                      )}
                    </View>
                  )}

                  {/* Submit Button */}
                  <View style={styles.submitContainer}>
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
                            <ActivityIndicator
                              size="small"
                              color={Colors.white}
                            />
                            <Text style={styles.submitButtonText}>
                              Recording...
                            </Text>
                          </>
                        ) : (
                          <>
                            <MaterialIcons
                              name="check-circle"
                              size={20}
                              color={Colors.white}
                            />
                            <Text style={styles.submitButtonText}>
                              Record Germination
                            </Text>
                          </>
                        )}
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Fully Germinated Message */}
              {selectedSowing && isFullyGerminated && (
                <View style={styles.fullyGerminatedCard}>
                  <MaterialIcons
                    name="check-circle"
                    size={32}
                    color={Colors.success}
                  />
                  <Text style={styles.fullyGerminatedTitle}>
                    Fully Germinated
                  </Text>
                  <Text style={styles.fullyGerminatedMessage}>
                    All {formatNumber(totalSeeds)} seeds from this sowing have
                    already germinated.
                  </Text>
                  <TouchableOpacity
                    onPress={() => setSelectedSowingId(null)}
                    style={styles.fullyGerminatedButton}
                  >
                    <Text style={styles.fullyGerminatedButtonText}>
                      Select Another Sowing
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Bottom Spacer */}
              <View style={styles.bottomNavSpacer} />
            </>
          }
        />
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

  // Stats Card
  statsCard: {
    flexDirection: "row" as const,
    backgroundColor: Colors.white,
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 8,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  statItem: {
    flex: 1,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 12,
  },
  statIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: "#111827",
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "500" as const,
  },
  statDivider: {
    width: 1,
    backgroundColor: "#E5E7EB",
    marginHorizontal: 12,
  },

  // List Content
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: BOTTOM_NAV_HEIGHT + 20,
  },
  listContentWithForm: {
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

  // Section Styles
  section: {
    marginBottom: 16,
  },
  formSection: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 20,
    marginTop: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
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

  // Sowing Card
  sowingCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  sowingCardSelected: {
    borderColor: Colors.success,
    borderWidth: 2,
    backgroundColor: `${Colors.success}05`,
  },
  sowingCardDisabled: {
    opacity: 0.6,
    backgroundColor: "#F9FAFB",
  },
  sowingCardContent: {
    gap: 12,
  },
  sowingCardHeader: {
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
    justifyContent: "space-between" as const,
  },
  sowingCardHeaderLeft: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 12,
    flex: 1,
  },
  sowingIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  sowingInfo: {
    flex: 1,
  },
  sowingName: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: "#111827",
    marginBottom: 2,
  },
  sowingNameSelected: {
    color: Colors.success,
  },
  plantContainer: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
  },
  plantName: {
    fontSize: 12,
    color: "#6B7280",
    flex: 1,
  },
  selectedBadge: {
    marginLeft: 8,
  },
  sowingCardDetails: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    padding: 8,
  },
  detailItem: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    flex: 1,
  },
  detailText: {
    fontSize: 12,
    color: "#374151",
  },
  detailDivider: {
    width: 1,
    height: 16,
    backgroundColor: "#E5E7EB",
    marginHorizontal: 8,
  },
  sowingCardProgress: {
    gap: 4,
  },
  sowingProgressHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
  },
  sowingProgressLabel: {
    fontSize: 11,
    color: "#6B7280",
  },
  sowingProgressValue: {
    fontSize: 11,
    fontWeight: "600" as const,
    color: "#111827",
  },
  progressBarSmall: {
    height: 4,
    backgroundColor: "#E5E7EB",
    borderRadius: 2,
    overflow: "hidden" as const,
  },
  progressFillSmall: {
    height: "100%" as const,
    borderRadius: 2,
  },
  germinationBadge: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    alignSelf: "flex-start" as const,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  germinationBadgeText: {
    fontSize: 10,
    fontWeight: "600" as const,
  },
  completedBadge: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    alignSelf: "flex-start" as const,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  completedBadgeText: {
    fontSize: 10,
    fontWeight: "600" as const,
  },

  // Selected Info Card
  selectedInfoCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  selectedInfoRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    marginBottom: 6,
  },
  selectedInfoLabel: {
    fontSize: 12,
    color: "#6B7280",
    width: 50,
  },
  selectedInfoValue: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: "#111827",
    flex: 1,
  },

  // Metrics Section
  metricsSection: {
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 12,
    marginBottom: 16,
    gap: 10,
  },
  metricsTitle: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: "#475569",
  },
  metricsGrid: {
    flexDirection: "row" as const,
    gap: 8,
  },
  metricCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 10,
    minHeight: 82,
    justifyContent: "space-between" as const,
  },
  metricCardNeutral: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E5E7EB",
  },
  metricCardSuccess: {
    backgroundColor: "#F0FDF4",
    borderColor: "#BBF7D0",
  },
  metricCardWarning: {
    backgroundColor: "#FFFBEB",
    borderColor: "#FDE68A",
  },
  metricIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 999,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginBottom: 6,
  },
  metricIconWrapNeutral: {
    backgroundColor: `${Colors.primary}1A`,
  },
  metricIconWrapSuccess: {
    backgroundColor: `${Colors.success}1A`,
  },
  metricIconWrapWarning: {
    backgroundColor: `${Colors.warning}26`,
  },
  metricLabel: {
    fontSize: 11,
    color: "#64748B",
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 12,
    fontWeight: "700" as const,
    color: "#111827",
  },
  metricValueNeutral: {
    color: "#1E293B",
  },
  metricValueSuccess: {
    color: "#15803D",
  },
  metricValueWarning: {
    color: "#B45309",
  },
  metricsHintRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
  },
  metricsHintText: {
    flex: 1,
    fontSize: 11,
    color: "#475569",
    lineHeight: 15,
  },

  // Form Field
  formField: {
    marginBottom: 16,
  },
  formFieldDisabled: {
    opacity: 0.6,
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
  inputWrapper: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
  },
  formInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#111827",
    backgroundColor: Colors.white,
  },
  formInputWithSuffix: {
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
  },
  formInputError: {
    borderColor: Colors.error,
  },
  formInputDisabled: {
    backgroundColor: "#F9FAFB",
    color: "#6B7280",
  },
  inputSuffix: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderLeftWidth: 0,
    borderColor: "#E5E7EB",
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
  },
  inputSuffixText: {
    fontSize: 14,
    color: "#6B7280",
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

  // Progress Indicator
  progressContainer: {
    marginTop: 8,
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 12,
    color: "#6B7280",
  },
  progressValue: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: "#111827",
  },
  progressBar: {
    height: 8,
    backgroundColor: "#E5E7EB",
    borderRadius: 4,
    overflow: "hidden" as const,
    marginBottom: 6,
  },
  progressFill: {
    height: "100%" as const,
    borderRadius: 4,
  },
  progressHint: {
    fontSize: 11,
    color: "#6B7280",
    textAlign: "right" as const,
  },

  // Submit Button
  submitContainer: {
    marginTop: 8,
  },
  submitButton: {
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

  // Fully Germinated Card
  fullyGerminatedCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 24,
    marginTop: 8,
    marginBottom: 16,
    alignItems: "center" as const,
    borderWidth: 1,
    borderColor: Colors.success,
  },
  fullyGerminatedTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: Colors.success,
    marginTop: 12,
    marginBottom: 8,
  },
  fullyGerminatedMessage: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center" as const,
    marginBottom: 16,
    lineHeight: 20,
  },
  fullyGerminatedButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: Colors.primary + "10",
    borderRadius: 20,
  },
  fullyGerminatedButtonText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.primary,
  },

  // Bottom Spacer
  bottomNavSpacer: {
    height: BOTTOM_NAV_HEIGHT,
  },

  // Empty State
  emptyContainer: {
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 16,
    overflow: "hidden" as const,
  },
  emptyIconGradient: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: "#111827",
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center" as const,
    marginBottom: 20,
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  emptyButton: {
    borderRadius: 12,
    overflow: "hidden" as const,
  },
  emptyButtonGradient: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 8,
  },
  emptyButtonText: {
    color: Colors.white,
    fontSize: 14,
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
