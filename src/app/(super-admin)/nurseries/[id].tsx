import { MaterialIcons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
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
import { SafeAreaView } from "react-native-safe-area-context";

import SuperAdminHeader from "../../../components/super-admin/SuperAdminHeader";
import { SHARED_BOTTOM_NAV_HEIGHT } from "../../../components/navigation/SharedBottomNav";
import { SuperAdminTheme } from "../../../components/super-admin/theme";
import { NurseryService } from "../../../services/nursery.service";
import { UserService } from "../../../services/user.service";
import { Colors } from "@/src/theme";

// ==================== INFO CARD ====================

interface InfoCardProps {
  nursery: any;
  phoneNumber: string;
  onPhoneNumberChange: (value: string) => void;
  onPhoneNumberSave: () => void;
  onStatusChange: (status: "ACTIVE" | "SUSPENDED") => void;
  onDeletePress: () => void;
  isStatusPending: boolean;
  isPhonePending: boolean;
}

const InfoCard = ({
  nursery,
  phoneNumber,
  onPhoneNumberChange,
  onPhoneNumberSave,
  onStatusChange,
  onDeletePress,
  isStatusPending,
  isPhonePending,
}: InfoCardProps) => {
  const isActive = nursery?.status === "ACTIVE";

  return (
    <View style={styles.infoCard}>
      <View style={styles.infoHeader}>
        <View style={styles.infoHeaderLeft}>
          <View
            style={[
              styles.infoIcon,
              {
                backgroundColor: isActive
                  ? `${SuperAdminTheme.colors.success}10`
                  : `${SuperAdminTheme.colors.danger}10`,
              },
            ]}
          >
            <MaterialIcons
              name="store"
              size={20}
              color={isActive ? SuperAdminTheme.colors.success : SuperAdminTheme.colors.danger}
            />
          </View>
          <View style={styles.infoTitleContainer}>
            <Text style={styles.infoTitle}>Nursery Information</Text>
            <View
              style={[
                styles.statusBadge,
                isActive ? styles.activeBadge : styles.suspendedBadge,
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  isActive ? styles.activeText : styles.suspendedText,
                ]}
              >
                {nursery?.status || "ACTIVE"}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.infoContent}>
        <View style={styles.infoRow}>
          <MaterialIcons name="qr-code" size={16} color="#9CA3AF" />
          <Text style={styles.infoLabel}>Code:</Text>
          <Text style={styles.infoValue}>{nursery?.code || "—"}</Text>
        </View>

        <View style={styles.infoRow}>
          <MaterialIcons name="location-on" size={16} color="#9CA3AF" />
          <Text style={styles.infoLabel}>Address:</Text>
          <Text style={styles.infoValue} numberOfLines={2}>
            {nursery?.address || "—"}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <MaterialIcons name="calendar-today" size={16} color="#9CA3AF" />
          <Text style={styles.infoLabel}>Created:</Text>
          <Text style={styles.infoValue}>
            {nursery?.createdAt
              ? new Date(nursery.createdAt).toLocaleDateString()
              : "—"}
          </Text>
        </View>

        <View style={styles.phoneSection}>
          <Text style={styles.phoneLabel}>Nursery Phone</Text>
          <View style={styles.phoneRow}>
            <TextInput
              value={phoneNumber}
              onChangeText={onPhoneNumberChange}
              style={styles.phoneInput}
              placeholder="Phone number (optional)"
              placeholderTextColor="#9CA3AF"
              keyboardType="phone-pad"
            />
            <Pressable
              style={({ pressed }) => [
                styles.phoneSaveButton,
                (!phoneNumber.trim() && !nursery?.phoneNumber) && styles.phoneSaveButtonDisabled,
                pressed && styles.phoneSaveButtonPressed,
              ]}
              onPress={onPhoneNumberSave}
              disabled={isPhonePending}
            >
              {isPhonePending ? (
                <ActivityIndicator size="small" color={SuperAdminTheme.colors.surface} />
              ) : (
                <Text style={styles.phoneSaveText}>Save</Text>
              )}
            </Pressable>
          </View>
          {!phoneNumber.trim() && !nursery?.phoneNumber ? (
            <Text style={styles.phoneHelper}>Optional field used for WhatsApp inquiries.</Text>
          ) : null}
        </View>
      </View>

      <View style={styles.actionButtons}>
        <Pressable
          style={({ pressed }) => [
            styles.actionButton,
            isActive && styles.actionButtonActive,
            pressed && styles.actionButtonPressed,
          ]}
          onPress={() => onStatusChange("ACTIVE")}
          disabled={isStatusPending || isActive}
        >
          <LinearGradient
            colors={
              isActive ? ["#E5E7EB", "#D1D5DB"] : [SuperAdminTheme.colors.success, "#059669"]
            }
            style={styles.actionGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            {isStatusPending ? (
              <ActivityIndicator
                size="small"
                color={isActive ? "#6B7280" : SuperAdminTheme.colors.surface}
              />
            ) : (
              <>
                <MaterialIcons
                  name="check-circle"
                  size={16}
                  color={isActive ? "#6B7280" : SuperAdminTheme.colors.surface}
                />
                <Text
                  style={[
                    styles.actionText,
                    isActive && styles.actionTextDisabled,
                  ]}
                >
                  Set Active
                </Text>
              </>
            )}
          </LinearGradient>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.actionButton,
            !isActive && styles.actionButtonDanger,
            pressed && styles.actionButtonPressed,
          ]}
          onPress={() => onStatusChange("SUSPENDED")}
          disabled={isStatusPending || !isActive}
        >
          <LinearGradient
            colors={
              !isActive ? ["#E5E7EB", "#D1D5DB"] : [SuperAdminTheme.colors.danger, "#DC2626"]
            }
            style={styles.actionGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            {isStatusPending ? (
              <ActivityIndicator
                size="small"
                color={!isActive ? "#6B7280" : SuperAdminTheme.colors.surface}
              />
            ) : (
              <>
                <MaterialIcons
                  name="block"
                  size={16}
                  color={!isActive ? "#6B7280" : SuperAdminTheme.colors.surface}
                />
                <Text
                  style={[
                    styles.actionText,
                    !isActive && styles.actionTextDisabled,
                  ]}
                >
                  Suspend
                </Text>
              </>
            )}
          </LinearGradient>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.deleteButton,
            pressed && styles.deleteButtonPressed,
          ]}
          onPress={onDeletePress}
        >
          <MaterialIcons name="delete-outline" size={18} color={SuperAdminTheme.colors.danger} />
          <Text style={styles.deleteText}>Delete</Text>
        </Pressable>
      </View>
    </View>
  );
};

// ==================== ADMIN SELECTOR ====================

interface AdminSelectorProps {
  admins: any[];
  selectedId: string;
  onSelect: (id: string) => void;
  search: string;
  onSearchChange: (text: string) => void;
  onAssign: () => void;
  isPending: boolean;
}

const AdminSelector = ({
  admins,
  selectedId,
  onSelect,
  search,
  onSearchChange,
  onAssign,
  isPending,
}: AdminSelectorProps) => {
  const selectedAdmin = admins.find((a) => a._id === selectedId);

  return (
    <View style={styles.selectorCard}>
      <View style={styles.selectorHeader}>
        <MaterialIcons
          name="admin-panel-settings"
          size={18}
          color={SuperAdminTheme.colors.primary}
        />
        <Text style={styles.selectorTitle}>Assign Nursery Admin</Text>
      </View>

      <View style={styles.searchContainer}>
        <MaterialIcons name="search" size={16} color="#9CA3AF" />
        <TextInput
          value={search}
          onChangeText={onSearchChange}
          style={styles.searchInput}
          placeholder="Search by name, phone or email..."
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

      <ScrollView
        style={styles.adminList}
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {admins.length === 0 ? (
          <View style={styles.emptyAdminContainer}>
            <MaterialIcons name="people" size={32} color="#D1D5DB" />
            <Text style={styles.emptyAdminTitle}>No Admins Available</Text>
            <Text style={styles.emptyAdminMessage}>
              {search
                ? "Try a different search term"
                : "No nursery admins found in the system"}
            </Text>
          </View>
        ) : (
          admins.slice(0, 30).map((admin) => {
            const isSelected = selectedId === admin._id;
            return (
              <Pressable
                key={admin._id}
                style={({ pressed }) => [
                  styles.adminRow,
                  isSelected && styles.adminRowSelected,
                  pressed && styles.adminRowPressed,
                ]}
                onPress={() => onSelect(admin._id)}
              >
                <View style={styles.adminRowLeft}>
                  <View
                    style={[
                      styles.adminAvatar,
                      {
                        backgroundColor: isSelected
                          ? `${SuperAdminTheme.colors.primary}20`
                          : "#F3F4F6",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.adminInitial,
                        isSelected && { color: SuperAdminTheme.colors.primary },
                      ]}
                    >
                      {admin.name?.charAt(0).toUpperCase() || "?"}
                    </Text>
                  </View>
                  <View style={styles.adminInfo}>
                    <Text style={styles.adminName}>{admin.name}</Text>
                    <Text style={styles.adminContact}>
                      {admin.phoneNumber || admin.email || "No contact"}
                    </Text>
                  </View>
                </View>
                {isSelected && (
                  <MaterialIcons
                    name="check-circle"
                    size={20}
                    color={SuperAdminTheme.colors.primary}
                  />
                )}
              </Pressable>
            );
          })
        )}
      </ScrollView>

      <Pressable
        style={({ pressed }) => [
          styles.assignButton,
          (!selectedId || isPending) && styles.assignButtonDisabled,
          pressed && styles.assignButtonPressed,
        ]}
        onPress={onAssign}
        disabled={!selectedId || isPending}
      >
        <LinearGradient
          colors={
            selectedId
              ? [SuperAdminTheme.colors.primary, SuperAdminTheme.colors.primaryDark || SuperAdminTheme.colors.primary]
              : ["#E5E7EB", "#D1D5DB"]
          }
          style={styles.assignGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          {isPending ? (
            <ActivityIndicator size="small" color={SuperAdminTheme.colors.surface} />
          ) : (
            <>
              <MaterialIcons
                name="add-task"
                size={18}
                color={selectedId ? SuperAdminTheme.colors.surface : "#9CA3AF"}
              />
              <Text
                style={[
                  styles.assignText,
                  !selectedId && styles.assignTextDisabled,
                ]}
              >
                {selectedAdmin
                  ? `Assign ${selectedAdmin.name}`
                  : "Select an admin to assign"}
              </Text>
            </>
          )}
        </LinearGradient>
      </Pressable>
    </View>
  );
};

interface CreateAdminCardProps {
  name: string;
  email: string;
  phoneNumber: string;
  password: string;
  onNameChange: (text: string) => void;
  onEmailChange: (text: string) => void;
  onPhoneNumberChange: (text: string) => void;
  onPasswordChange: (text: string) => void;
  onCreate: () => void;
  isPending: boolean;
}

const CreateAdminCard = ({
  name,
  email,
  phoneNumber,
  password,
  onNameChange,
  onEmailChange,
  onPhoneNumberChange,
  onPasswordChange,
  onCreate,
  isPending,
}: CreateAdminCardProps) => {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const isValid = Boolean(
    name.trim() &&
      password.trim().length >= 8 &&
      (email.trim() || phoneNumber.trim()),
  );

  return (
    <View style={styles.createAdminCard}>
      <View style={styles.selectorHeader}>
        <MaterialIcons name="person-add" size={18} color={SuperAdminTheme.colors.primary} />
        <Text style={styles.selectorTitle}>Create Nursery Admin</Text>
      </View>
      <View style={styles.createAdminFields}>
        <TextInput
          value={name}
          onChangeText={onNameChange}
          style={styles.input}
          placeholder="Admin name *"
          placeholderTextColor="#9CA3AF"
        />
        <TextInput
          value={email}
          onChangeText={onEmailChange}
          style={styles.input}
          placeholder="Admin email (or phone) *"
          placeholderTextColor="#9CA3AF"
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          value={phoneNumber}
          onChangeText={onPhoneNumberChange}
          style={styles.input}
          placeholder="Admin phone (or email) *"
          placeholderTextColor="#9CA3AF"
          keyboardType="phone-pad"
        />
        <View style={styles.passwordField}>
          <TextInput
            value={password}
            onChangeText={onPasswordChange}
            style={[styles.input, styles.passwordInput]}
            placeholder="Admin password (min 8 chars) *"
            placeholderTextColor="#9CA3AF"
            secureTextEntry={!isPasswordVisible}
            autoCapitalize="none"
          />
          <Pressable
            onPress={() => setIsPasswordVisible((prev) => !prev)}
            hitSlop={8}
            style={styles.passwordToggle}
          >
            <MaterialIcons
              name={isPasswordVisible ? "visibility-off" : "visibility"}
              size={18}
              color="#6B7280"
            />
          </Pressable>
        </View>
      </View>

      <Pressable
        style={({ pressed }) => [
          styles.assignButton,
          (!isValid || isPending) && styles.assignButtonDisabled,
          pressed && styles.assignButtonPressed,
        ]}
        onPress={onCreate}
        disabled={!isValid || isPending}
      >
        <LinearGradient
          colors={[SuperAdminTheme.colors.primary, SuperAdminTheme.colors.primaryDark || SuperAdminTheme.colors.primary]}
          style={styles.assignGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          {isPending ? (
            <ActivityIndicator size="small" color={SuperAdminTheme.colors.surface} />
          ) : (
            <>
              <MaterialIcons name="person-add-alt-1" size={18} color={SuperAdminTheme.colors.surface} />
              <Text style={styles.assignText}>Create and Assign Admin</Text>
            </>
          )}
        </LinearGradient>
      </Pressable>
    </View>
  );
};

// ==================== ASSIGNED ADMIN CARD ====================

interface AssignedAdminCardProps {
  admin: any;
  onSetPrimary: (id: string) => void;
  onRemove: (id: string) => void;
  isPrimaryPending?: boolean;
}

const AssignedAdminCard = ({
  admin,
  onSetPrimary,
  onRemove,
  isPrimaryPending,
}: AssignedAdminCardProps) => {
  const canSetPrimary = !admin.isPrimary;

  return (
    <View style={styles.assignedCard}>
      <View style={styles.assignedCardLeft}>
        <View
          style={[
            styles.assignedAvatar,
            {
              backgroundColor: admin.isPrimary
                ? `${SuperAdminTheme.colors.primary}10`
                : "#F3F4F6",
            },
          ]}
        >
          <Text
            style={[
              styles.assignedInitial,
              admin.isPrimary && { color: SuperAdminTheme.colors.primary },
            ]}
          >
            {admin.name?.charAt(0).toUpperCase() || "?"}
          </Text>
        </View>
        <View style={styles.assignedInfo}>
          <View style={styles.assignedNameRow}>
            <Text style={styles.assignedName}>
              {admin.name || "Nursery Admin"}
            </Text>
            {admin.isPrimary && (
              <View
                style={[
                  styles.primaryBadge,
                  { backgroundColor: `${SuperAdminTheme.colors.primary}10` },
                ]}
              >
                <MaterialIcons name="star" size={10} color={SuperAdminTheme.colors.primary} />
                <Text style={styles.primaryBadgeText}>Primary</Text>
              </View>
            )}
          </View>
          <Text style={styles.assignedContact}>
            {admin.phoneNumber || admin.email || "No contact"}
          </Text>
        </View>
      </View>

      <View style={styles.assignedActions}>
        {canSetPrimary && (
          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.primaryButtonPressed,
            ]}
            onPress={() => onSetPrimary(admin.adminUserId || admin.id)}
          >
            <MaterialIcons
              name="star-outline"
              size={14}
              color={SuperAdminTheme.colors.primary}
            />
            <Text style={styles.primaryButtonText}>Set Primary</Text>
          </Pressable>
        )}
        <Pressable
          style={({ pressed }) => [
            styles.removeButton,
            pressed && styles.removeButtonPressed,
          ]}
          onPress={() => onRemove(admin.adminUserId || admin.id)}
        >
          <MaterialIcons name="delete-outline" size={14} color={SuperAdminTheme.colors.danger} />
          <Text style={styles.removeButtonText}>Remove</Text>
        </Pressable>
      </View>
    </View>
  );
};

// ==================== DELETE CONFIRMATION MODAL ====================

interface DeleteModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  confirmText: string;
  onConfirmTextChange: (text: string) => void;
  isPending: boolean;
}

const DeleteModal = ({
  visible,
  onClose,
  onConfirm,
  confirmText,
  onConfirmTextChange,
  isPending,
}: DeleteModalProps) => {
  const isValid = confirmText.trim().toUpperCase() === "DELETE";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <MaterialIcons name="warning" size={24} color={SuperAdminTheme.colors.danger} />
            <Text style={styles.modalTitle}>Delete Nursery</Text>
          </View>

          <Text style={styles.modalMessage}>
            This action will perform a soft delete and disable all related
            users. This cannot be undone.
          </Text>

          <View style={styles.modalWarning}>
            <MaterialIcons
              name="error-outline"
              size={16}
              color={SuperAdminTheme.colors.warning}
            />
            <Text style={styles.modalWarningText}>
              Type <Text style={styles.modalHighlight}>DELETE</Text> to confirm
            </Text>
          </View>

          <TextInput
            value={confirmText}
            onChangeText={onConfirmTextChange}
            placeholder="Type DELETE"
            placeholderTextColor="#9CA3AF"
            style={styles.modalInput}
            autoCapitalize="characters"
          />

          <View style={styles.modalActions}>
            <Pressable
              style={({ pressed }) => [
                styles.modalCancel,
                pressed && styles.modalCancelPressed,
              ]}
              onPress={onClose}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.modalConfirm,
                (!isValid || isPending) && styles.modalConfirmDisabled,
                pressed && styles.modalConfirmPressed,
              ]}
              onPress={onConfirm}
              disabled={!isValid || isPending}
            >
              <LinearGradient
                colors={[SuperAdminTheme.colors.danger, "#DC2626"]}
                style={styles.modalConfirmGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {isPending ? (
                  <ActivityIndicator size="small" color={SuperAdminTheme.colors.surface} />
                ) : (
                  <Text style={styles.modalConfirmText}>Delete Nursery</Text>
                )}
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ==================== MAIN COMPONENT ====================

export default function SuperAdminNurseryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const [selectedAdminId, setSelectedAdminId] = useState("");
  const [searchAdmin, setSearchAdmin] = useState("");
  const [newAdminName, setNewAdminName] = useState("");
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminPhoneNumber, setNewAdminPhoneNumber] = useState("");
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [nurseryPhoneNumber, setNurseryPhoneNumber] = useState("");

  const {
    data: nursery,
    isLoading: loadingNursery,
    refetch: refetchNursery,
  } = useQuery({
    queryKey: ["super-admin", "nursery", id],
    queryFn: () => NurseryService.getById(String(id)),
    enabled: Boolean(id),
  });

  useEffect(() => {
    setNurseryPhoneNumber(String(nursery?.phoneNumber || ""));
  }, [nursery?.phoneNumber]);

  const {
    data: assignedAdmins,
    isLoading: loadingAssigned,
    refetch: refetchAssigned,
  } = useQuery({
    queryKey: ["super-admin", "nursery", id, "admins"],
    queryFn: () => NurseryService.listAdmins(String(id)),
    enabled: Boolean(id),
  });

  const { data: usersData } = useQuery({
    queryKey: ["super-admin", "users", "nursery-admins", id],
    queryFn: () => UserService.getAll(1, 300),
    enabled: Boolean(id),
  });

  const adminUsers = useMemo(
    () =>
      (usersData?.users || []).filter(
        (u) => u.role === "NURSERY_ADMIN" && u.isActive,
      ),
    [usersData],
  );

  const assignedIds = useMemo(
    () => new Set((assignedAdmins || []).map((a) => a.adminUserId || a.id)),
    [assignedAdmins],
  );

  const availableAdmins = useMemo(() => {
    const q = searchAdmin.trim().toLowerCase();
    return adminUsers.filter((user) => {
      if (assignedIds.has(user._id)) return false;
      if (!q) return true;
      return [user.name, user.phoneNumber, user.email]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [adminUsers, assignedIds, searchAdmin]);

  const assignMutation = useMutation({
    mutationFn: (args?: { adminUserId?: string; isPrimary?: boolean }) => {
      const adminUserId = args?.adminUserId || selectedAdminId;
      if (!id || !adminUserId) throw new Error("Select an admin first");
      return NurseryService.assignAdmin(String(id), {
        adminUserId,
        isPrimary: args?.isPrimary ?? !(assignedAdmins || []).length,
      });
    },
    onSuccess: async () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSelectedAdminId("");
      setSearchAdmin("");
      await queryClient.invalidateQueries({
        queryKey: ["super-admin", "nursery", id, "admins"],
      });
      Alert.alert("✅ Success", "Admin assigned to nursery successfully");
    },
    onError: (err: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("❌ Failed", err?.message || "Could not assign admin");
    },
  });

  const removeMutation = useMutation({
    mutationFn: (adminId: string) =>
      NurseryService.removeAdmin(String(id), adminId),
    onSuccess: async () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await queryClient.invalidateQueries({
        queryKey: ["super-admin", "nursery", id, "admins"],
      });
    },
    onError: (err: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("❌ Failed", err?.message || "Could not remove admin");
    },
  });

  const createAdminMutation = useMutation({
    mutationFn: async () => {
      if (!id) throw new Error("Nursery id is missing");
      if (!newAdminName.trim()) throw new Error("Admin name is required");
      if (!newAdminPassword.trim() || newAdminPassword.trim().length < 8) {
        throw new Error("Password must be at least 8 characters");
      }
      if (!newAdminEmail.trim() && !newAdminPhoneNumber.trim()) {
        throw new Error("Provide email or phone number");
      }

      const created = await UserService.create({
        name: newAdminName.trim(),
        email: newAdminEmail.trim() || undefined,
        phoneNumber: newAdminPhoneNumber.trim() || undefined,
        password: newAdminPassword.trim(),
        role: "NURSERY_ADMIN",
        nurseryId: String(id),
      });
      const adminUserId = String(
        (created as any)?._id || (created as any)?.id || "",
      );
      if (!adminUserId) {
        throw new Error("Created user id was not returned by server");
      }
      await NurseryService.assignAdmin(String(id), {
        adminUserId,
        isPrimary: !(assignedAdmins || []).length,
      });
      return adminUserId;
    },
    onSuccess: async () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setNewAdminName("");
      setNewAdminEmail("");
      setNewAdminPhoneNumber("");
      setNewAdminPassword("");
      await queryClient.invalidateQueries({
        queryKey: ["super-admin", "nursery", id, "admins"],
      });
      await queryClient.invalidateQueries({
        queryKey: ["super-admin", "users", "nursery-admins", id],
      });
      Alert.alert("✅ Success", "Nursery admin created and assigned.");
    },
    onError: (err: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        "❌ Failed",
        err?.message || "Could not create and assign admin",
      );
    },
  });

  const statusMutation = useMutation({
    mutationFn: (nextStatus: "ACTIVE" | "SUSPENDED") =>
      NurseryService.update(String(id), { status: nextStatus }),
    onSuccess: async () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await queryClient.invalidateQueries({
        queryKey: ["super-admin", "nursery", id],
      });
      await queryClient.invalidateQueries({
        queryKey: ["super-admin", "nurseries"],
      });
    },
    onError: (err: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("❌ Failed", err?.message || "Unable to update status");
    },
  });

  const phoneMutation = useMutation({
    mutationFn: () => {
      if (!id) throw new Error("Nursery id is missing");
      return NurseryService.update(String(id), {
        phoneNumber: nurseryPhoneNumber.trim() || undefined,
      });
    },
    onSuccess: async () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await queryClient.invalidateQueries({
        queryKey: ["super-admin", "nursery", id],
      });
      await queryClient.invalidateQueries({
        queryKey: ["super-admin", "nurseries"],
      });
      Alert.alert("✅ Updated", "Nursery phone number saved.");
    },
    onError: (err: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("❌ Failed", err?.message || "Unable to update phone number");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => NurseryService.remove(String(id)),
    onSuccess: async () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await queryClient.invalidateQueries({
        queryKey: ["super-admin", "nurseries"],
      });
      await queryClient.invalidateQueries({
        queryKey: ["super-admin-overview-v2"],
      });
      setShowDeleteModal(false);
      setDeleteConfirmText("");
      Alert.alert(
        "✅ Deleted",
        "Nursery was soft-deleted and related users were disabled.",
      );
      router.replace("/(super-admin)/nurseries");
    },
    onError: (err: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("❌ Failed", err?.message || "Unable to delete nursery");
    },
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Promise.all([refetchNursery(), refetchAssigned()]);
    setRefreshing(false);
  };

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  if (loadingNursery) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <SuperAdminHeader
          title="Nursery Details"
          subtitle="Loading..."
          onBackPress={handleBack}
          actions={
            <Pressable style={styles.headerIconBtn} onPress={handleRefresh}>
              <MaterialIcons name="refresh" size={20} color={Colors.surface} />
            </Pressable>
          }
        />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={SuperAdminTheme.colors.primary} />
          <Text style={styles.loadingText}>Loading nursery details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!nursery) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <SuperAdminHeader
          title="Nursery Details"
          subtitle="Not found"
          onBackPress={handleBack}
          actions={
            <Pressable style={styles.headerIconBtn} onPress={handleRefresh}>
              <MaterialIcons name="refresh" size={20} color={Colors.surface} />
            </Pressable>
          }
        />
        <View style={styles.centerContainer}>
          <MaterialIcons name="error-outline" size={48} color={SuperAdminTheme.colors.danger} />
          <Text style={styles.errorTitle}>Nursery Not Found</Text>
          <Text style={styles.errorMessage}>
            The nursery you&apos;re looking for doesn&apos;t exist.
          </Text>
          <Pressable onPress={handleBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <SuperAdminHeader
        title={nursery?.name || "Nursery Details"}
        subtitle="Manage nursery settings and admins"
        onBackPress={handleBack}
        actions={
          <Pressable style={styles.headerIconBtn} onPress={handleRefresh}>
            <MaterialIcons name="refresh" size={20} color={Colors.surface} />
          </Pressable>
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[SuperAdminTheme.colors.primary]}
            tintColor={SuperAdminTheme.colors.primary}
          />
        }
      >
        {/* Info Card */}
        <InfoCard
          nursery={nursery}
          phoneNumber={nurseryPhoneNumber}
          onPhoneNumberChange={setNurseryPhoneNumber}
          onPhoneNumberSave={() => phoneMutation.mutate()}
          onStatusChange={statusMutation.mutate}
          onDeletePress={() => setShowDeleteModal(true)}
          isStatusPending={statusMutation.isPending}
          isPhonePending={phoneMutation.isPending}
        />

        {/* Admin Selector */}
        <AdminSelector
          admins={availableAdmins}
          selectedId={selectedAdminId}
          onSelect={setSelectedAdminId}
          search={searchAdmin}
          onSearchChange={setSearchAdmin}
          onAssign={() => assignMutation.mutate(undefined)}
          isPending={assignMutation.isPending}
        />

        <CreateAdminCard
          name={newAdminName}
          email={newAdminEmail}
          phoneNumber={newAdminPhoneNumber}
          password={newAdminPassword}
          onNameChange={setNewAdminName}
          onEmailChange={setNewAdminEmail}
          onPhoneNumberChange={setNewAdminPhoneNumber}
          onPasswordChange={setNewAdminPassword}
          onCreate={() => createAdminMutation.mutate()}
          isPending={createAdminMutation.isPending}
        />

        {/* Assigned Admins */}
        <View style={styles.assignedSection}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderLeft}>
              <MaterialIcons name="people" size={18} color={SuperAdminTheme.colors.primary} />
              <Text style={styles.sectionTitle}>Assigned Admins</Text>
            </View>
            <Text style={styles.sectionCount}>
              {(assignedAdmins || []).length}
            </Text>
          </View>

          {loadingAssigned ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={SuperAdminTheme.colors.primary} />
              <Text style={styles.loadingSmallText}>Loading admins...</Text>
            </View>
          ) : (assignedAdmins || []).length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="people-outline" size={32} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>No Admins Assigned</Text>
              <Text style={styles.emptyMessage}>
                Assign an admin from the list above to manage this nursery.
              </Text>
            </View>
          ) : (
            <View style={styles.assignedList}>
              {(assignedAdmins || []).map((admin) => (
                <AssignedAdminCard
                  key={admin.id}
                  admin={admin}
                  onSetPrimary={(adminId) =>
                    assignMutation.mutate({
                      adminUserId: adminId,
                      isPrimary: true,
                    })
                  }
                  onRemove={(adminId) =>
                    Alert.alert(
                      "Remove Admin",
                      "Do you want to remove this admin assignment?",
                      [
                        { text: "Cancel", style: "cancel" },
                        {
                          text: "Remove",
                          style: "destructive",
                          onPress: () => removeMutation.mutate(adminId),
                        },
                      ],
                    )
                  }
                  isPrimaryPending={assignMutation.isPending}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Delete Confirmation Modal */}
      <DeleteModal
        visible={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setDeleteConfirmText("");
        }}
        onConfirm={() => deleteMutation.mutate()}
        confirmText={deleteConfirmText}
        onConfirmTextChange={setDeleteConfirmText}
        isPending={deleteMutation.isPending}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SuperAdminTheme.colors.surfaceMuted,
  },

  // Header
  headerTitle: {
    fontSize: 24,
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.34)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  headerIconBtnPressed: {
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
  errorTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#DC2626",
  },
  errorMessage: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    paddingHorizontal: 20,
  },
  backButton: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: SuperAdminTheme.colors.primary,
    borderRadius: 10,
  },
  backButtonText: {
    color: SuperAdminTheme.colors.surface,
    fontSize: 13,
    fontWeight: "600",
  },

  // Content
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: SHARED_BOTTOM_NAV_HEIGHT + 100,
    gap: 20,
  },

  // Info Card
  infoCard: {
    backgroundColor: SuperAdminTheme.colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 16,
  },
  infoHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  infoHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  infoIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  infoTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeBadge: {
    backgroundColor: "#ECFDF5",
  },
  suspendedBadge: {
    backgroundColor: "#FEF2F2",
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
  },
  activeText: {
    color: SuperAdminTheme.colors.success,
  },
  suspendedText: {
    color: SuperAdminTheme.colors.danger,
  },
  infoContent: {
    backgroundColor: SuperAdminTheme.colors.surfaceMuted,
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  infoLabel: {
    fontSize: 12,
    color: "#6B7280",
    width: 60,
  },
  infoValue: {
    flex: 1,
    fontSize: 12,
    fontWeight: "500",
    color: "#111827",
  },
  phoneSection: {
    marginTop: 4,
    gap: 8,
  },
  phoneLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  phoneRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  phoneInput: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 12,
    backgroundColor: "#FFFFFF",
    color: "#111827",
    fontSize: 13,
  },
  phoneSaveButton: {
    paddingHorizontal: 14,
    height: 40,
    borderRadius: 10,
    backgroundColor: SuperAdminTheme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  phoneSaveButtonDisabled: {
    opacity: 0.7,
  },
  phoneSaveButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  phoneSaveText: {
    color: SuperAdminTheme.colors.surface,
    fontWeight: "700",
    fontSize: 12,
  },
  phoneHelper: {
    fontSize: 11,
    color: "#9CA3AF",
  },
  actionButtons: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    flex: 1,
    borderRadius: 10,
    overflow: "hidden",
  },
  actionButtonActive: {
    opacity: 0.8,
  },
  actionButtonDanger: {
    opacity: 0.8,
  },
  actionButtonPressed: {
    transform: [{ scale: 0.98 }],
  },
  actionGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    gap: 6,
  },
  actionText: {
    fontSize: 12,
    fontWeight: "600",
    color: SuperAdminTheme.colors.surface,
  },
  actionTextDisabled: {
    color: "#6B7280",
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#FEE2E2",
    backgroundColor: "#FEF2F2",
  },
  deleteButtonPressed: {
    transform: [{ scale: 0.98 }],
  },
  deleteText: {
    fontSize: 12,
    fontWeight: "600",
    color: SuperAdminTheme.colors.danger,
  },

  // Admin Selector
  selectorCard: {
    backgroundColor: SuperAdminTheme.colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 12,
  },
  selectorHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  selectorTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: SuperAdminTheme.colors.surfaceMuted,
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    height: 44,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: "#111827",
    padding: 0,
  },
  searchClear: {
    padding: 4,
  },
  adminList: {
    maxHeight: 240,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    backgroundColor: SuperAdminTheme.colors.surfaceMuted,
  },
  adminRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  adminRowSelected: {
    backgroundColor: `${SuperAdminTheme.colors.primary}05`,
  },
  adminRowPressed: {
    backgroundColor: "#F3F4F6",
  },
  adminRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  adminAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  adminInitial: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },
  adminInfo: {
    flex: 1,
  },
  adminName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 2,
  },
  adminContact: {
    fontSize: 11,
    color: "#6B7280",
  },
  assignButton: {
    borderRadius: 12,
    overflow: "hidden",
  },
  assignButtonDisabled: {
    opacity: 0.5,
  },
  assignButtonPressed: {
    transform: [{ scale: 0.98 }],
  },
  assignGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 8,
  },
  assignText: {
    fontSize: 13,
    fontWeight: "600",
    color: SuperAdminTheme.colors.surface,
  },
  assignTextDisabled: {
    color: "#9CA3AF",
  },
  emptyAdminContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
    gap: 8,
  },
  emptyAdminTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
  },
  emptyAdminMessage: {
    fontSize: 11,
    color: "#6B7280",
    textAlign: "center",
    paddingHorizontal: 20,
  },
  createAdminCard: {
    backgroundColor: SuperAdminTheme.colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 12,
  },
  createAdminFields: {
    gap: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 13,
    color: "#111827",
    backgroundColor: SuperAdminTheme.colors.surfaceMuted,
  },
  passwordField: {
    position: "relative",
  },
  passwordInput: {
    paddingRight: 42,
  },
  passwordToggle: {
    position: "absolute",
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },

  // Assigned Section
  assignedSection: {
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
  assignedList: {
    gap: 8,
  },
  assignedCard: {
    backgroundColor: SuperAdminTheme.colors.surface,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 10,
  },
  assignedCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  assignedAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  assignedInitial: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6B7280",
  },
  assignedInfo: {
    flex: 1,
  },
  assignedNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  assignedName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  primaryBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 2,
  },
  primaryBadgeText: {
    fontSize: 9,
    fontWeight: "600",
    color: SuperAdminTheme.colors.primary,
  },
  assignedContact: {
    fontSize: 11,
    color: "#6B7280",
  },
  assignedActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: `${SuperAdminTheme.colors.primary}10`,
  },
  primaryButtonPressed: {
    transform: [{ scale: 0.96 }],
  },
  primaryButtonText: {
    fontSize: 11,
    fontWeight: "600",
    color: SuperAdminTheme.colors.primary,
  },
  removeButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#FEF2F2",
  },
  removeButtonPressed: {
    transform: [{ scale: 0.96 }],
  },
  removeButtonText: {
    fontSize: 11,
    fontWeight: "600",
    color: SuperAdminTheme.colors.danger,
  },

  // Loading
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
    backgroundColor: SuperAdminTheme.colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 8,
  },
  loadingSmallText: {
    fontSize: 12,
    color: "#6B7280",
  },

  // Empty Container
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
    backgroundColor: SuperAdminTheme.colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 8,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  emptyMessage: {
    fontSize: 11,
    color: "#6B7280",
    textAlign: "center",
    paddingHorizontal: 24,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: SuperAdminTheme.colors.surface,
    borderRadius: 20,
    padding: 20,
    gap: 16,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  modalMessage: {
    fontSize: 13,
    color: "#4B5563",
    lineHeight: 18,
  },
  modalWarning: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFFBEB",
    padding: 10,
    borderRadius: 10,
  },
  modalWarningText: {
    fontSize: 12,
    color: "#374151",
  },
  modalHighlight: {
    fontWeight: "700",
    color: SuperAdminTheme.colors.warning,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: "#111827",
    backgroundColor: SuperAdminTheme.colors.surfaceMuted,
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
  },
  modalCancel: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: SuperAdminTheme.colors.surfaceMuted,
  },
  modalCancelPressed: {
    transform: [{ scale: 0.98 }],
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },
  modalConfirm: {
    flex: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  modalConfirmDisabled: {
    opacity: 0.5,
  },
  modalConfirmPressed: {
    transform: [{ scale: 0.98 }],
  },
  modalConfirmGradient: {
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  modalConfirmText: {
    fontSize: 14,
    fontWeight: "600",
    color: SuperAdminTheme.colors.surface,
  },
});
