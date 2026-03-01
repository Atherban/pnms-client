import { MaterialIcons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  BannerItem,
  BannerPayload,
  BannerService,
} from "../../services/banner.service";
import { Colors } from "../../theme";
import FixedHeader from "../common/FixedHeader";

const BOTTOM_NAV_HEIGHT = 80;
const STATUS_FILTERS = ["ALL", "ACTIVE", "INACTIVE"] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];
type BannerRole = "SUPER_ADMIN" | "NURSERY_ADMIN";
const BANNER_WIDTH = 320;
const BANNER_HEIGHT = 160;

type BannerForm = {
  title: string;
  subtitle: string;
  cta: string;
  redirectUrl: string;
  priority: string;
  status: "ACTIVE" | "INACTIVE";
  startAt: string;
  endAt: string;
  imageUrl: string;
  imageFile?: { uri: string; name: string; type?: string };
};

type Props = {
  role: BannerRole;
  title: string;
  subtitle: string;
  queryKey: string[];
};

const defaultForm: BannerForm = {
  title: "",
  subtitle: "",
  cta: "",
  redirectUrl: "",
  priority: "0",
  status: "ACTIVE",
  startAt: "",
  endAt: "",
  imageUrl: "",
};

const toScope = (role: BannerRole) =>
  role === "SUPER_ADMIN" ? "GLOBAL_SUPER_ADMIN" : "NURSERY_ADMIN";

const toDateInput = (value?: string) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toISOString().slice(0, 10);
};

const formatDateInputLabel = (value: string) => {
  if (!value) return "Select date";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const toIsoDate = (value: string, endOfDay = false) => {
  const clean = value.trim();
  if (!clean) return undefined;

  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    return `${clean}T${endOfDay ? "23:59:59" : "00:00:00"}.000Z`;
  }

  const parsed = new Date(clean);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toISOString();
};

const formatDateTime = (value?: string) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;

  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (d.toDateString() === today.toDateString()) {
    return `Today, ${d.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })}`;
  } else if (d.toDateString() === yesterday.toDateString()) {
    return `Yesterday, ${d.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })}`;
  }

  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const toPayload = (form: BannerForm, role: BannerRole): BannerPayload => ({
  title: form.title.trim(),
  subtitle: form.subtitle.trim() || undefined,
  cta: form.cta.trim() || undefined,
  redirectUrl: form.redirectUrl.trim() || undefined,
  priority: Number(form.priority) || 0,
  status: form.status,
  scope: toScope(role),
  imageUrl: form.imageUrl.trim() || undefined,
  startAt: toIsoDate(form.startAt, false),
  endAt: toIsoDate(form.endAt, true),
});

const toForm = (banner: BannerItem): BannerForm => ({
  title: banner.title || "",
  subtitle: banner.subtitle || "",
  cta: banner.cta || "",
  redirectUrl: banner.redirectUrl || "",
  priority: String(banner.priority ?? 0),
  status: banner.status === "INACTIVE" ? "INACTIVE" : "ACTIVE",
  imageUrl: banner.imageUrl || "",
  startAt: toDateInput(banner.startAt),
  endAt: toDateInput(banner.endAt),
});

// ==================== STATS CARD ====================

interface StatsCardProps {
  total: number;
  active: number;
  inactive: number;
}

const StatsCard = ({ total, active, inactive }: StatsCardProps) => (
  <View style={styles.statsCard}>
    <View style={styles.statsRow}>
      <View style={styles.statItem}>
        <View
          style={[styles.statIcon, { backgroundColor: `${Colors.primary}10` }]}
        >
          <MaterialIcons name="campaign" size={16} color={Colors.primary} />
        </View>
        <View style={styles.statInfo}>
          <Text style={styles.statNumber}>{total}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
      </View>

      <View style={styles.statDivider} />

      <View style={styles.statItem}>
        <View
          style={[styles.statIcon, { backgroundColor: `${Colors.success}10` }]}
        >
          <MaterialIcons name="check-circle" size={16} color={Colors.success} />
        </View>
        <View style={styles.statInfo}>
          <Text style={styles.statNumber}>{active}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
      </View>

      <View style={styles.statDivider} />

      <View style={styles.statItem}>
        <View
          style={[
            styles.statIcon,
            { backgroundColor: `${Colors.textSecondary}10` },
          ]}
        >
          <MaterialIcons name="block" size={16} color={Colors.textSecondary} />
        </View>
        <View style={styles.statInfo}>
          <Text style={styles.statNumber}>{inactive}</Text>
          <Text style={styles.statLabel}>Inactive</Text>
        </View>
      </View>
    </View>
  </View>
);

// ==================== FILTER BAR ====================

interface FilterBarProps {
  search: string;
  onSearchChange: (text: string) => void;
  statusFilter: StatusFilter;
  onStatusChange: (status: StatusFilter) => void;
  resultCount: number;
}

const FilterBar = ({
  search,
  onSearchChange,
  statusFilter,
  onStatusChange,
  resultCount,
}: FilterBarProps) => (
  <View style={styles.filterCard}>
    <View style={styles.searchContainer}>
      <MaterialIcons name="search" size={18} color="#9CA3AF" />
      <TextInput
        value={search}
        onChangeText={onSearchChange}
        style={styles.searchInput}
        placeholder="Search banners..."
        placeholderTextColor="#9CA3AF"
      />
      {search.length > 0 && (
        <Pressable
          onPress={() => onSearchChange("")}
          style={styles.searchClear}
        >
          <MaterialIcons name="close" size={16} color="#9CA3AF" />
        </Pressable>
      )}
    </View>

    <View style={styles.filterRow}>
      <Text style={styles.filterLabel}>Status:</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterChips}
      >
        {STATUS_FILTERS.map((item) => {
          const active = statusFilter === item;
          return (
            <Pressable
              key={item}
              style={({ pressed }) => [
                styles.filterChip,
                active && styles.filterChipActive,
                pressed && styles.filterChipPressed,
              ]}
              onPress={() => onStatusChange(item)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  active && styles.filterChipTextActive,
                ]}
              >
                {item}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>

    {search.length > 0 && (
      <Text style={styles.searchResults}>
        Found {resultCount} {resultCount === 1 ? "banner" : "banners"}
      </Text>
    )}
  </View>
);

// ==================== BANNER CARD ====================

interface BannerCardProps {
  banner: BannerItem;
  onPress: () => void;
  onDelete: () => void;
}

const BannerCard = ({ banner, onPress, onDelete }: BannerCardProps) => {
  const isActive = banner.status === "ACTIVE";
  const now = new Date();
  const isExpired = banner.endAt && new Date(banner.endAt) < now;
  const isScheduled = banner.startAt && new Date(banner.startAt) > now;

  const getStatusBadge = () => {
    if (isExpired)
      return { label: "Expired", color: Colors.error, bg: "#FEF2F2" };
    if (isScheduled)
      return { label: "Scheduled", color: Colors.warning, bg: "#FFFBEB" };
    if (isActive)
      return { label: "Active", color: Colors.success, bg: "#ECFDF5" };
    return { label: "Inactive", color: Colors.textSecondary, bg: "#F3F4F6" };
  };

  const status = getStatusBadge();

  return (
    <Pressable
      style={({ pressed }) => [
        styles.bannerCard,
        pressed && styles.bannerCardPressed,
      ]}
      onPress={onPress}
    >
      {banner.imageUrl ? (
        <Image
          source={{ uri: banner.imageUrl }}
          style={styles.bannerImage}
          contentFit="cover"
        />
      ) : (
        <View style={styles.bannerImagePlaceholder}>
          <MaterialIcons name="campaign" size={24} color="#D1D5DB" />
        </View>
      )}

      <View style={styles.bannerContent}>
        <View style={styles.bannerHeader}>
          <View style={styles.bannerTitleRow}>
            <Text style={styles.bannerTitle} numberOfLines={1}>
              {banner.title}
            </Text>
            <View style={[styles.bannerStatus, { backgroundColor: status.bg }]}>
              <Text style={[styles.bannerStatusText, { color: status.color }]}>
                {status.label}
              </Text>
            </View>
          </View>

          {banner.subtitle && (
            <Text style={styles.bannerSubtitle} numberOfLines={2}>
              {banner.subtitle}
            </Text>
          )}
        </View>

        <View style={styles.bannerMeta}>
          <View style={styles.metaRow}>
            <MaterialIcons name="priority-high" size={12} color="#9CA3AF" />
            <Text style={styles.metaText}>
              Priority: {banner.priority ?? 0}
            </Text>
          </View>

          {banner.cta && (
            <View style={styles.metaRow}>
              <MaterialIcons name="call-to-action" size={12} color="#9CA3AF" />
              <Text style={styles.metaText}>CTA: {banner.cta}</Text>
            </View>
          )}

          {(banner.startAt || banner.endAt) && (
            <View style={styles.metaRow}>
              <MaterialIcons name="date-range" size={12} color="#9CA3AF" />
              <Text style={styles.metaText}>
                {banner.startAt ? formatDateTime(banner.startAt) : "No start"} →{" "}
                {banner.endAt ? formatDateTime(banner.endAt) : "No end"}
              </Text>
            </View>
          )}
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.deleteButton,
            pressed && styles.deleteButtonPressed,
          ]}
          onPress={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <MaterialIcons name="delete-outline" size={14} color={Colors.error} />
          <Text style={styles.deleteButtonText}>Delete</Text>
        </Pressable>
      </View>
    </Pressable>
  );
};

// ==================== BANNER FORM MODAL ====================

interface BannerFormModalProps {
  visible: boolean;
  onClose: () => void;
  form: BannerForm;
  editingId: string | null;
  onFormChange: (form: BannerForm) => void;
  onPickImage: () => void;
  onSave: () => void;
  onDatePickerOpen: (field: "startAt" | "endAt") => void;
  isSaving: boolean;
}

const BannerFormModal = ({
  visible,
  onClose,
  form,
  editingId,
  onFormChange,
  onPickImage,
  onSave,
  onDatePickerOpen,
  isSaving,
}: BannerFormModalProps) => {
  const isValid = form.title.trim().length > 0;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <Pressable style={styles.modalBackdrop} onPress={onClose} />
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderLeft}>
              <MaterialIcons
                name={editingId ? "edit" : "add-chart"}
                size={20}
                color={Colors.primary}
              />
              <Text style={styles.modalTitle}>
                {editingId ? "Edit Banner" : "Create New Banner"}
              </Text>
            </View>
            <Pressable onPress={onClose} style={styles.modalCloseButton}>
              <MaterialIcons name="close" size={20} color="#6B7280" />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.modalBody}
          >
            {/* Title */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>
                Title <Text style={styles.requiredStar}>*</Text>
              </Text>
              <TextInput
                value={form.title}
                onChangeText={(v) => onFormChange({ ...form, title: v })}
                style={styles.input}
                placeholder="Enter banner title"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            {/* Subtitle */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Description</Text>
              <TextInput
                value={form.subtitle}
                onChangeText={(v) => onFormChange({ ...form, subtitle: v })}
                style={[styles.input, styles.textArea]}
                placeholder="Enter banner description"
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Priority & Status Row */}
            <View style={styles.row}>
              <View style={[styles.fieldGroup, styles.flex]}>
                <Text style={styles.fieldLabel}>Priority</Text>
                <TextInput
                  value={form.priority}
                  onChangeText={(v) => onFormChange({ ...form, priority: v })}
                  style={styles.input}
                  placeholder="0"
                  keyboardType="numeric"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={[styles.fieldGroup, styles.flex]}>
                <Text style={styles.fieldLabel}>Status</Text>
                <Pressable
                  style={({ pressed }) => [
                    styles.statusButton,
                    pressed && styles.statusButtonPressed,
                  ]}
                  onPress={() =>
                    onFormChange({
                      ...form,
                      status: form.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
                    })
                  }
                >
                  <LinearGradient
                    colors={
                      form.status === "ACTIVE"
                        ? [Colors.success, "#059669"]
                        : ["#9CA3AF", "#6B7280"]
                    }
                    style={styles.statusGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <MaterialIcons
                      name={form.status === "ACTIVE" ? "check-circle" : "block"}
                      size={14}
                      color={Colors.white}
                    />
                    <Text style={styles.statusText}>{form.status}</Text>
                  </LinearGradient>
                </Pressable>
              </View>
            </View>

            {/* Date Range */}
            <View style={styles.row}>
              <View style={[styles.fieldGroup, styles.flex]}>
                <Text style={styles.fieldLabel}>Start Date</Text>
                <Pressable
                  style={({ pressed }) => [
                    styles.dateButton,
                    pressed && styles.dateButtonPressed,
                  ]}
                  onPress={() => onDatePickerOpen("startAt")}
                >
                  <MaterialIcons
                    name="calendar-today"
                    size={14}
                    color={Colors.primary}
                  />
                  <Text
                    style={
                      form.startAt ? styles.dateText : styles.datePlaceholder
                    }
                  >
                    {form.startAt
                      ? formatDateInputLabel(form.startAt)
                      : "Select start date"}
                  </Text>
                </Pressable>
              </View>

              <View style={[styles.fieldGroup, styles.flex]}>
                <Text style={styles.fieldLabel}>End Date</Text>
                <Pressable
                  style={({ pressed }) => [
                    styles.dateButton,
                    pressed && styles.dateButtonPressed,
                  ]}
                  onPress={() => onDatePickerOpen("endAt")}
                >
                  <MaterialIcons
                    name="calendar-today"
                    size={14}
                    color={Colors.primary}
                  />
                  <Text
                    style={
                      form.endAt ? styles.dateText : styles.datePlaceholder
                    }
                  >
                    {form.endAt
                      ? formatDateInputLabel(form.endAt)
                      : "Select end date"}
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* CTA & URL */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>CTA Button Text</Text>
              <TextInput
                value={form.cta}
                onChangeText={(v) => onFormChange({ ...form, cta: v })}
                style={styles.input}
                placeholder="e.g., Learn More, Shop Now"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Redirect URL</Text>
              <TextInput
                value={form.redirectUrl}
                onChangeText={(v) => onFormChange({ ...form, redirectUrl: v })}
                style={styles.input}
                placeholder="https://example.com"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="none"
              />
            </View>

            {/* Image Upload */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Banner Image</Text>
              <View style={styles.imageUploadRow}>
                <TextInput
                  value={form.imageUrl}
                  onChangeText={(v) =>
                    onFormChange({ ...form, imageUrl: v, imageFile: undefined })
                  }
                  style={[styles.input, styles.flex]}
                  placeholder="Image URL or pick from gallery"
                  placeholderTextColor="#9CA3AF"
                  autoCapitalize="none"
                />
                <Pressable
                  style={({ pressed }) => [
                    styles.uploadButton,
                    pressed && styles.uploadButtonPressed,
                  ]}
                  onPress={onPickImage}
                >
                  <MaterialIcons
                    name="photo-library"
                    size={18}
                    color={Colors.primary}
                  />
                </Pressable>
              </View>
              <Text style={styles.imageHint}>
                Recommended: 1200 x 600 px (2:1), JPG/PNG, under 2 MB
              </Text>
            </View>

            {/* Image Preview */}
            {form.imageUrl ? (
              <View style={styles.previewContainer}>
                <Image
                  source={{ uri: form.imageUrl }}
                  style={styles.previewImage}
                  contentFit="cover"
                />
                <Pressable
                  style={styles.removeImageButton}
                  onPress={() =>
                    onFormChange({
                      ...form,
                      imageUrl: "",
                      imageFile: undefined,
                    })
                  }
                >
                  <MaterialIcons name="close" size={16} color={Colors.error} />
                </Pressable>
              </View>
            ) : null}

            {/* Form Actions */}
            <View style={styles.modalActions}>
              <Pressable
                style={({ pressed }) => [
                  styles.modalCancelButton,
                  pressed && styles.modalCancelButtonPressed,
                ]}
                onPress={onClose}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.modalSaveButton,
                  (!isValid || isSaving) && styles.modalSaveButtonDisabled,
                  pressed && styles.modalSaveButtonPressed,
                ]}
                onPress={onSave}
                disabled={!isValid || isSaving}
              >
                <LinearGradient
                  colors={[
                    Colors.primary,
                    Colors.primaryLight || Colors.primary,
                  ]}
                  style={styles.modalSaveButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  {isSaving ? (
                    <ActivityIndicator size="small" color={Colors.white} />
                  ) : (
                    <>
                      <MaterialIcons
                        name={editingId ? "update" : "add"}
                        size={18}
                        color={Colors.white}
                      />
                      <Text style={styles.modalSaveButtonText}>
                        {editingId ? "Update Banner" : "Create Banner"}
                      </Text>
                    </>
                  )}
                </LinearGradient>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// ==================== EMPTY STATE ====================

interface EmptyStateProps {
  hasFilters: boolean;
  onClearFilters: () => void;
  onCreatePress: () => void;
}

const EmptyState = ({
  hasFilters,
  onClearFilters,
  onCreatePress,
}: EmptyStateProps) => (
  <View style={styles.emptyContainer}>
    <MaterialIcons name="campaign" size={48} color="#D1D5DB" />
    <Text style={styles.emptyTitle}>
      {hasFilters ? "No Banners Found" : "No Banners Yet"}
    </Text>
    <Text style={styles.emptyMessage}>
      {hasFilters
        ? "Try adjusting your search or filters"
        : "Create your first banner to start promoting"}
    </Text>
    {hasFilters ? (
      <Pressable onPress={onClearFilters} style={styles.emptyButton}>
        <Text style={styles.emptyButtonText}>Clear Filters</Text>
      </Pressable>
    ) : (
      <Pressable onPress={onCreatePress} style={styles.emptyCreateButton}>
        <LinearGradient
          colors={[Colors.primary, Colors.primaryLight || Colors.primary]}
          style={styles.emptyCreateButtonGradient}
        >
          <MaterialIcons name="add" size={18} color={Colors.white} />
          <Text style={styles.emptyCreateButtonText}>Create Banner</Text>
        </LinearGradient>
      </Pressable>
    )}
  </View>
);

// ==================== MAIN COMPONENT ====================

export default function BannerManagementScreen({
  role,
  title,
  subtitle,
  queryKey,
}: Props) {
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<BannerForm>(defaultForm);
  const [pickerField, setPickerField] = useState<"startAt" | "endAt" | null>(
    null,
  );
  const [isModalVisible, setIsModalVisible] = useState(false);
  const scope = toScope(role);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey,
    queryFn: () => BannerService.list({ scope }),
  });

  const rows = useMemo<BannerItem[]>(() => data ?? [], [data]);

  // Calculate stats
  const stats = useMemo(() => {
    const active = rows.filter((r) => r.status === "ACTIVE").length;
    const inactive = rows.filter((r) => r.status === "INACTIVE").length;
    return {
      total: rows.length,
      active,
      inactive,
    };
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows
      .filter((row: BannerItem) => {
        if (row.scope && row.scope !== scope) return false;
        if (statusFilter !== "ALL" && row.status !== statusFilter) return false;
        if (!q) return true;
        return [
          row.title,
          row.subtitle,
          row.cta,
          row.redirectUrl,
          row.nurseryId,
          row.status,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(q);
      })
      .sort(
        (a: BannerItem, b: BannerItem) =>
          Number(b.priority ?? 0) - Number(a.priority ?? 0),
      );
  }, [rows, scope, search, statusFilter]);

  const openCreateModal = () => {
    setEditingId(null);
    setForm(defaultForm);
    setIsModalVisible(true);
  };

  const openEditModal = (banner: BannerItem) => {
    setEditingId(banner.id);
    setForm(toForm(banner));
    setIsModalVisible(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const closeModal = () => {
    setIsModalVisible(false);
    setEditingId(null);
    setForm(defaultForm);
  };

  const createMutation = useMutation({
    mutationFn: () => {
      if (!form.title.trim()) throw new Error("Banner title is required");
      return BannerService.createWithImage(
        toPayload(form, role),
        form.imageFile,
      );
    },
    onSuccess: async () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      closeModal();
      await queryClient.invalidateQueries({ queryKey });
    },
    onError: (err: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("❌ Failed", err?.message || "Unable to create banner");
    },
  });

  const updateMutation = useMutation({
    mutationFn: () => {
      if (!editingId) throw new Error("Invalid banner");
      if (!form.title.trim()) throw new Error("Banner title is required");
      return BannerService.updateWithImage(
        editingId,
        toPayload(form, role),
        form.imageFile,
      );
    },
    onSuccess: async () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      closeModal();
      await queryClient.invalidateQueries({ queryKey });
    },
    onError: (err: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("❌ Failed", err?.message || "Unable to update banner");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => BannerService.remove(id),
    onSuccess: async () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await queryClient.invalidateQueries({ queryKey });
    },
    onError: (err: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("❌ Failed", err?.message || "Unable to delete banner");
    },
  });

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Permission required",
        "Please allow gallery access to upload banner image.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.85,
    });

    if (result.canceled || !result.assets?.length) return;
    const asset = result.assets[0];
    const name = asset.fileName || `banner_${Date.now()}.jpg`;

    setForm((prev) => ({
      ...prev,
      imageUrl: asset.uri,
      imageFile: {
        uri: asset.uri,
        name,
        type: asset.mimeType || "image/jpeg",
      },
    }));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await refetch();
    setRefreshing(false);
  };

  const handleClearFilters = () => {
    setSearch("");
    setStatusFilter("ALL");
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <FixedHeader title={title} subtitle="Loading..." />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading banners...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <FixedHeader
        title={title}
        subtitle={subtitle}
        actions={
          <View style={styles.headerActions}>
            <Pressable
              style={({ pressed }) => [
                styles.headerIconBtn,
                pressed && styles.headerIconBtnPressed,
              ]}
              onPress={handleRefresh}
            >
              <MaterialIcons
                name={refreshing ? "sync" : "refresh"}
                size={20}
                color={Colors.white}
              />
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.headerIconBtn,
                pressed && styles.headerIconBtnPressed,
              ]}
              onPress={openCreateModal}
            >
              <MaterialIcons name="add" size={20} color={Colors.white} />
            </Pressable>
          </View>
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
      >
        {/* Stats Card */}
        {rows.length > 0 && (
          <StatsCard
            total={stats.total}
            active={stats.active}
            inactive={stats.inactive}
          />
        )}

        {/* Filter Bar */}
        <FilterBar
          search={search}
          onSearchChange={setSearch}
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
          resultCount={filtered.length}
        />

        {/* Banners List */}
        <View style={styles.bannersSection}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderLeft}>
              <MaterialIcons name="campaign" size={18} color={Colors.primary} />
              <Text style={styles.sectionTitle}>Banners</Text>
            </View>
            <Text style={styles.sectionCount}>{filtered.length} total</Text>
          </View>

          {filtered.length === 0 ? (
            <EmptyState
              hasFilters={search.length > 0 || statusFilter !== "ALL"}
              onClearFilters={handleClearFilters}
              onCreatePress={openCreateModal}
            />
          ) : (
            <View style={styles.bannersList}>
              {filtered.map((banner: BannerItem) => (
                <BannerCard
                  key={banner.id}
                  banner={banner}
                  onPress={() => openEditModal(banner)}
                  onDelete={() =>
                    Alert.alert(
                      "Delete Banner",
                      "Are you sure you want to delete this banner?",
                      [
                        { text: "Cancel", style: "cancel" },
                        {
                          text: "Delete",
                          style: "destructive",
                          onPress: () => deleteMutation.mutate(banner.id),
                        },
                      ],
                    )
                  }
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Banner Form Modal */}
      <BannerFormModal
        visible={isModalVisible}
        onClose={closeModal}
        form={form}
        editingId={editingId}
        onFormChange={setForm}
        onPickImage={pickImage}
        onSave={() =>
          editingId ? updateMutation.mutate() : createMutation.mutate()
        }
        onDatePickerOpen={setPickerField}
        isSaving={isSaving}
      />

      {/* Date Picker Modal */}
      <DateTimePickerModal
        isVisible={Boolean(pickerField)}
        mode="date"
        date={(() => {
          if (!pickerField || !form[pickerField]) return new Date();
          const parsed = new Date(form[pickerField]);
          return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
        })()}
        onCancel={() => setPickerField(null)}
        onConfirm={(date) => {
          if (!pickerField) return;
          const value = date.toISOString().slice(0, 10);
          setForm((p) => ({ ...p, [pickerField]: value }));
          setPickerField(null);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },

  // Header
  headerTitle: {
    fontSize: 24,
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.34)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerIconBtnPressed: {
    backgroundColor: "rgba(255,255,255,0.1)",
    transform: [{ scale: 0.95 }],
  },

  // Center Container
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: "#6B7280",
  },

  // Content
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: BOTTOM_NAV_HEIGHT + 100,
    gap: 20,
  },

  // Stats Card
  statsCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  statInfo: {
    flex: 1,
  },
  statNumber: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "500",
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: "#E5E7EB",
    marginHorizontal: 12,
  },

  // Filter Bar
  filterCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 12,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    height: 48,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#111827",
    padding: 0,
  },
  searchClear: {
    padding: 4,
  },
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: "#374151",
  },
  filterChips: {
    gap: 8,
    paddingRight: 20,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
  },
  filterChipActive: {
    borderColor: Colors.primary,
    backgroundColor: `${Colors.primary}05`,
  },
  filterChipPressed: {
    transform: [{ scale: 0.96 }],
  },
  filterChipText: {
    fontSize: 12,
    color: "#374151",
    fontWeight: "500",
  },
  filterChipTextActive: {
    color: Colors.primary,
    fontWeight: "600",
  },
  searchResults: {
    fontSize: 12,
    color: "#6B7280",
  },

  // Banners Section
  bannersSection: {
    gap: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  sectionCount: {
    fontSize: 12,
    color: "#6B7280",
  },
  bannersList: {
    gap: 12,
  },

  // Banner Card
  bannerCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
  },
  bannerCardPressed: {
    backgroundColor: "#F9FAFB",
    transform: [{ scale: 0.98 }],
  },
  bannerImage: {
    width: "100%",
    height: 140,
  },
  bannerImagePlaceholder: {
    width: "100%",
    height: 140,
    backgroundColor: "#F9FAFB",
    alignItems: "center",
    justifyContent: "center",
  },
  bannerContent: {
    padding: 14,
    gap: 12,
  },
  bannerHeader: {
    gap: 6,
  },
  bannerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  bannerTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
    flex: 1,
  },
  bannerStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  bannerStatusText: {
    fontSize: 10,
    fontWeight: "600",
  },
  bannerSubtitle: {
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 18,
  },
  bannerMeta: {
    gap: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaText: {
    fontSize: 11,
    color: "#6B7280",
    flex: 1,
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: `${Colors.error}30`,
    backgroundColor: `${Colors.error}05`,
    marginTop: 4,
  },
  deleteButtonPressed: {
    transform: [{ scale: 0.96 }],
  },
  deleteButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.error,
  },

  // Empty State
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  emptyMessage: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    paddingHorizontal: 32,
  },
  emptyButton: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: `${Colors.primary}10`,
  },
  emptyButtonText: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: "600",
  },
  emptyCreateButton: {
    marginTop: 8,
    borderRadius: 12,
    overflow: "hidden",
  },
  emptyCreateButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 8,
  },
  emptyCreateButtonText: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: "600",
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "90%",
    paddingTop: 16,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  modalHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
  },
  modalBody: {
    gap: 16,
    paddingBottom: 20,
  },
  fieldGroup: {
    gap: 4,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: "#374151",
    marginLeft: 4,
  },
  requiredStar: {
    color: Colors.error,
  },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: "#111827",
    backgroundColor: "#F9FAFB",
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  flex: {
    flex: 1,
  },
  statusButton: {
    borderRadius: 12,
    overflow: "hidden",
  },
  statusButtonPressed: {
    transform: [{ scale: 0.98 }],
  },
  statusGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 6,
  },
  statusText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.white,
  },
  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#F9FAFB",
  },
  dateButtonPressed: {
    transform: [{ scale: 0.98 }],
  },
  dateText: {
    fontSize: 13,
    color: "#111827",
  },
  datePlaceholder: {
    fontSize: 13,
    color: "#9CA3AF",
  },
  imageUploadRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  uploadButton: {
    width: 46,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
    alignItems: "center",
    justifyContent: "center",
  },
  uploadButtonPressed: {
    transform: [{ scale: 0.96 }],
  },
  imageHint: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2,
    marginLeft: 4,
  },
  previewContainer: {
    position: "relative",
    alignSelf: "center",
  },
  previewImage: {
    width: BANNER_WIDTH,
    height: BANNER_HEIGHT,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  removeImageButton: {
    position: "absolute",
    top: -8,
    right: -8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  modalCancelButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
  },
  modalCancelButtonPressed: {
    transform: [{ scale: 0.98 }],
  },
  modalCancelButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },
  modalSaveButton: {
    flex: 2,
    borderRadius: 12,
    overflow: "hidden",
  },
  modalSaveButtonDisabled: {
    opacity: 0.5,
  },
  modalSaveButtonPressed: {
    transform: [{ scale: 0.98 }],
  },
  modalSaveButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 8,
  },
  modalSaveButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.white,
  },
});
