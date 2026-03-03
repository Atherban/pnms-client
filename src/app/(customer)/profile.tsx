import { MaterialIcons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import FixedHeader from "../../components/common/FixedHeader";
import { AuthService } from "../../services/auth.service";
import { CustomerService } from "../../services/customer.service";
import { PaymentService } from "../../services/payment.service";
import { SalesService } from "../../services/sales.service";
import { useAuthStore } from "../../stores/auth.store";
import { Colors } from "../../theme";
import { saveUser } from "../../utils/storage";

const BOTTOM_NAV_HEIGHT = 80;
const INDIAN_PHONE_PATTERN = /^(?:\+91|91)?[6-9]\d{9}$/;
const toNumber = (value: unknown) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};
const formatMoney = (amount: number) =>
  `₹${Math.round(amount).toLocaleString("en-IN")}`;
const formatCount = (value: number) =>
  Math.round(value).toLocaleString("en-IN");

// ==================== STATS CARD ====================

interface StatCardProps {
  label: string;
  value: string | number;
  icon: string;
  color: string;
}

const StatCard = ({ label, value, icon, color }: StatCardProps) => (
  <View style={[styles.statCard, { backgroundColor: `${color}08` }]}>
    <View style={[styles.statIcon, { backgroundColor: `${color}15` }]}>
      <MaterialIcons name={icon as any} size={18} color={color} />
    </View>
    <Text style={styles.statLabel}>{label}</Text>
    <Text style={[styles.statValue, { color }]}>{value}</Text>
  </View>
);

// ==================== PROFILE CARD ====================

interface ProfileCardProps {
  initials: string;
  name: string;
  email?: string;
  role: string;
}

const ProfileCard = ({ initials, name, email, role }: ProfileCardProps) => (
  <LinearGradient
    colors={[Colors.primary, Colors.primaryLight || Colors.primary]}
    style={styles.profileCard}
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 1 }}
  >
    <View style={styles.profileCardContent}>
      <View style={styles.profileHeader}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.avatarGlow} />
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{name}</Text>
          {email && <Text style={styles.profileEmail}>{email}</Text>}
          <View style={styles.roleBadge}>
            <MaterialIcons name="person" size={12} color={Colors.white} />
            <Text style={styles.roleText}>{role}</Text>
          </View>
        </View>
      </View>
    </View>
  </LinearGradient>
);

// ==================== FORM FIELD ====================

interface FormFieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  icon?: string;
  secureTextEntry?: boolean;
  multiline?: boolean;
  keyboardType?: "default" | "email-address" | "phone-pad";
}

const FormField = ({
  label,
  value,
  onChangeText,
  placeholder,
  icon,
  secureTextEntry,
  multiline,
  keyboardType = "default",
}: FormFieldProps) => {
  const isPasswordField = Boolean(secureTextEntry);
  const [isSecure, setIsSecure] = useState(isPasswordField);

  useEffect(() => {
    setIsSecure(isPasswordField);
  }, [isPasswordField]);

  return (
    <View style={styles.formField}>
      <View style={styles.formFieldHeader}>
        {icon && (
          <MaterialIcons
            name={icon as any}
            size={14}
            color={Colors.textSecondary}
          />
        )}
        <Text style={styles.formFieldLabel}>{label}</Text>
      </View>
      <View style={styles.formInputWrapper}>
        <TextInput
          style={[
            styles.formInput,
            isPasswordField && styles.formInputWithAction,
            multiline && styles.formInputMultiline,
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={Colors.textTertiary}
          secureTextEntry={isSecure}
          multiline={multiline}
          keyboardType={keyboardType}
        />
        {isPasswordField ? (
          <Pressable
            style={styles.formInputAction}
            onPress={() => setIsSecure((prev) => !prev)}
            hitSlop={8}
          >
            <MaterialIcons
              name={isSecure ? "visibility" : "visibility-off"}
              size={20}
              color={Colors.textSecondary}
            />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
};

// ==================== ACTION BUTTON ====================

interface ActionButtonProps {
  icon: string;
  label: string;
  onPress: () => void;
  color?: string;
}

const ActionButton = ({
  icon,
  label,
  onPress,
  color = Colors.primary,
}: ActionButtonProps) => (
  <Pressable
    style={({ pressed }) => [
      styles.actionButton,
      pressed && styles.actionButtonPressed,
    ]}
    onPress={onPress}
  >
    <View style={[styles.actionIcon, { backgroundColor: `${color}10` }]}>
      <MaterialIcons name={icon as any} size={20} color={color} />
    </View>
    <Text style={styles.actionLabel}>{label}</Text>
    <MaterialIcons
      name="chevron-right"
      size={20}
      color={Colors.textSecondary}
    />
  </Pressable>
);

// ==================== MAIN COMPONENT ====================

export default function CustomerProfileScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const updateAuthUser = useAuthStore((s) => s.updateUser);
  const [refreshing, setRefreshing] = useState(false);

  const [name, setName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [address, setAddress] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswordFields, setShowPasswordFields] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["customer-profile", user?.id],
    queryFn: CustomerService.getMyProfile,
  });
  const { data: statsData, refetch: refetchStats } = useQuery({
    queryKey: ["customer-profile-stats", user?.id, user?.phoneNumber, user?.nurseryId],
    queryFn: async () => {
      const [dueSummary, sales] = await Promise.all([
        PaymentService.getCustomerDueOverview({
          id: user?.id,
          phoneNumber: user?.phoneNumber,
          role: user?.role,
          nurseryId: user?.nurseryId,
        }).catch(() => ({
          total: 0,
          paid: 0,
          due: 0,
          partialCount: 0,
          pendingVerification: 0,
        })),
        SalesService.getAll({
          nurseryId: user?.nurseryId,
          customerId: user?.id,
          customerPhone: user?.phoneNumber,
        }).catch(() => []),
      ]);

      const rows = Array.isArray(sales) ? sales : [];
      const productKeys = new Set<string>();
      for (const sale of rows) {
        const items = Array.isArray((sale as any)?.items) ? (sale as any).items : [];
        for (const item of items) {
          const id = String(
            item?.inventory?._id ||
              item?.inventoryId ||
              item?.plantType?._id ||
              item?.name ||
              "",
          ).trim();
          if (id) productKeys.add(id);
        }
      }

      return {
        orders: rows.length,
        dues: Math.max(0, toNumber((dueSummary as any)?.due)),
        paid: Math.max(0, toNumber((dueSummary as any)?.paid)),
        products: productKeys.size,
      };
    },
  });

  useEffect(() => {
    if (!data) return;
    setName(data?.name || "");
    setMobileNumber(data?.mobileNumber || "");
    setAddress(data?.address || "");
  }, [data]);

  const initials = useMemo(() => {
    const label = (name || user?.name || "Customer").trim();
    const parts = label.split(" ").filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
    return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
  }, [name, user?.name]);

  const handleRefresh = async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Promise.all([refetch(), refetchStats()]);
    setRefreshing(false);
  };

  const saveProfileMutation = useMutation({
    mutationFn: async () => {
      const payload: {
        name?: string;
        mobileNumber?: string;
        address?: string;
      } = {};
      const nextName = name.trim();
      const nextMobile = mobileNumber.trim();
      const nextAddress = address.trim();

      if (!nextName || nextName.length < 2) {
        throw new Error("Please enter your full name");
      }
      if (nextMobile && !INDIAN_PHONE_PATTERN.test(nextMobile)) {
        throw new Error("Enter a valid Indian mobile number");
      }

      payload.name = nextName;
      payload.mobileNumber = nextMobile || undefined;
      payload.address = nextAddress || undefined;

      return CustomerService.updateMyProfile(payload);
    },
    onSuccess: async (response: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      const profile = response?.data ?? response;
      const nextName = String(profile?.name || name || "").trim();
      const nextPhone = String(
        profile?.mobileNumber || mobileNumber || "",
      ).trim();

      updateAuthUser({
        name: nextName,
        phoneNumber: nextPhone || undefined,
      });

      await saveUser({
        _id: user?.id,
        name: nextName,
        email: user?.email,
        role: user?.role,
        phoneNumber: nextPhone || undefined,
        nurseryId: user?.nurseryId,
        allowedNurseryIds: user?.allowedNurseryIds,
      });

      await queryClient.invalidateQueries({ queryKey: ["customer-profile"] });
      Alert.alert("✅ Success", "Profile details updated successfully.");
    },
    onError: (err: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("❌ Error", err?.message || "Please try again");
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async () => {
      if (!currentPassword.trim() || !newPassword.trim()) {
        throw new Error("Enter current and new password");
      }
      if (newPassword.length < 5) {
        throw new Error("New password should be at least 5 characters");
      }
      if (newPassword !== confirmPassword) {
        throw new Error("New password and confirm password do not match");
      }
      if (currentPassword === newPassword) {
        throw new Error("New password must be different from current password");
      }

      return AuthService.changePassword({
        currentPassword: currentPassword.trim(),
        newPassword: newPassword.trim(),
      });
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowPasswordFields(false);
      Alert.alert("✅ Success", "Your password has been changed successfully.");
    },
    onError: (err: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("❌ Error", err?.message || "Please try again");
    },
  });

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <FixedHeader
          title="My Profile"
          subtitle="Loading profile..."
          showBackButton
          onBackPress={() => router.back()}
        />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <FixedHeader
        title="My Profile"
        subtitle="Manage your account"
        showBackButton
        onBackPress={() => router.back()}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
      >
        {/* Profile Card */}
        <ProfileCard
          initials={initials}
          name={name || user?.name || "Customer"}
          email={user?.email}
          role="Customer"
        />

        {/* Stats Overview */}
        <View style={styles.statsGrid}>
          <StatCard
            label="Orders"
            value={statsData ? formatCount(statsData.orders) : "—"}
            icon="shopping-bag"
            color={Colors.primary}
          />
          <StatCard
            label="Dues"
            value={statsData ? formatMoney(statsData.dues) : "—"}
            icon="account-balance"
            color={Colors.warning}
          />
          <StatCard
            label="Paid"
            value={statsData ? formatMoney(statsData.paid) : "—"}
            icon="check-circle"
            color={Colors.success}
          />
          <StatCard
            label="Products"
            value={statsData ? formatCount(statsData.products) : "—"}
            icon="inventory"
            color={Colors.info}
          />
        </View>

        {/* Personal Details */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="person" size={18} color={Colors.primary} />
            <Text style={styles.cardTitle}>Personal Details</Text>
          </View>

          <FormField
            label="Full Name"
            value={name}
            onChangeText={setName}
            placeholder="Enter your full name"
            icon="person"
          />

          <FormField
            label="Mobile Number"
            value={mobileNumber}
            onChangeText={setMobileNumber}
            placeholder="Enter mobile number"
            icon="phone"
            keyboardType="phone-pad"
          />

          <FormField
            label="Address"
            value={address}
            onChangeText={setAddress}
            placeholder="Enter your address"
            icon="location-on"
            multiline
          />

          <Pressable
            style={[
              styles.saveButton,
              saveProfileMutation.isPending && styles.saveButtonDisabled,
            ]}
            onPress={() => saveProfileMutation.mutate()}
            disabled={saveProfileMutation.isPending}
          >
            <LinearGradient
              colors={[Colors.primary, Colors.primaryLight || Colors.primary]}
              style={styles.saveButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {saveProfileMutation.isPending ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <>
                  <MaterialIcons name="save" size={18} color={Colors.white} />
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                </>
              )}
            </LinearGradient>
          </Pressable>
        </View>

        {/* Password Section */}
        <View style={styles.card}>
          <Pressable
            style={styles.cardHeader}
            onPress={() => setShowPasswordFields(!showPasswordFields)}
          >
            <View style={styles.cardHeaderLeft}>
              <MaterialIcons name="lock" size={18} color={Colors.primary} />
              <Text style={styles.cardTitle}>Password & Security</Text>
            </View>
            <MaterialIcons
              name={
                showPasswordFields ? "keyboard-arrow-up" : "keyboard-arrow-down"
              }
              size={20}
              color={Colors.textSecondary}
            />
          </Pressable>

          {showPasswordFields && (
            <View style={styles.passwordFields}>
              <FormField
                label="Current Password"
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="Enter current password"
                icon="lock"
                secureTextEntry
              />

              <FormField
                label="New Password"
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Enter new password"
                icon="lock-outline"
                secureTextEntry
              />

              <FormField
                label="Confirm Password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm new password"
                icon="check-circle-outline"
                secureTextEntry
              />

              <Pressable
                style={[
                  styles.updateButton,
                  changePasswordMutation.isPending &&
                    styles.updateButtonDisabled,
                ]}
                onPress={() => changePasswordMutation.mutate()}
                disabled={changePasswordMutation.isPending}
              >
                <LinearGradient
                  colors={[Colors.success, "#059669"]}
                  style={styles.updateButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  {changePasswordMutation.isPending ? (
                    <ActivityIndicator size="small" color={Colors.white} />
                  ) : (
                    <>
                      <MaterialIcons
                        name="lock-reset"
                        size={18}
                        color={Colors.white}
                      />
                      <Text style={styles.updateButtonText}>
                        Update Password
                      </Text>
                    </>
                  )}
                </LinearGradient>
              </Pressable>
            </View>
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsCard}>
          <Text style={styles.actionsTitle}>Quick Actions</Text>

          <ActionButton
            icon="payments"
            label="Dues & Payments"
            onPress={() => router.push("/(customer)/dues" as any)}
            color={Colors.primary}
          />

          <ActionButton
            icon="notifications"
            label="Notifications"
            onPress={() => router.push("/(customer)/notifications" as any)}
            color={Colors.warning}
          />

          <ActionButton
            icon="history"
            label="Order History"
            onPress={() => router.push("/(customer)/products" as any)}
            color={Colors.success}
          />
        </View>

        {/* Logout Button */}
        <Pressable
          style={styles.logoutButton}
          onPress={() => {
            Alert.alert("Logout", "Are you sure you want to logout?", [
              { text: "Cancel", style: "cancel" },
              {
                text: "Logout",
                onPress: () => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  // Handle logout
                },
                style: "destructive",
              },
            ]);
          }}
        >
          <MaterialIcons name="logout" size={18} color={Colors.error} />
          <Text style={styles.logoutText}>Logout</Text>
        </Pressable>
      </ScrollView>
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

  // Stats Grid
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  statCard: {
    width: "48%",
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 11,
    color: "#6B7280",
    marginBottom: 2,
  },
  statValue: {
    fontSize: 15,
    fontWeight: "700",
  },

  // Profile Card
  profileCard: {
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  profileCardContent: {
    padding: 20,
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  avatarContainer: {
    position: "relative",
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.3)",
  },
  avatarGlow: {
    position: "absolute",
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.1)",
    zIndex: -1,
  },
  avatarText: {
    color: Colors.white,
    fontSize: 28,
    fontWeight: "700",
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.white,
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 13,
    color: "rgba(255,255,255,0.9)",
    marginBottom: 8,
  },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 4,
  },
  roleText: {
    color: Colors.white,
    fontSize: 11,
    fontWeight: "600",
  },

  // Card
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 12,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },

  // Form Field
  formField: {
    gap: 6,
  },
  formInputWrapper: {
    position: "relative",
  },
  formFieldHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginLeft: 4,
  },
  formFieldLabel: {
    fontSize: 11,
    fontWeight: "500",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  formInput: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: "#111827",
    backgroundColor: "#F9FAFB",
  },
  formInputWithAction: {
    paddingRight: 44,
  },
  formInputAction: {
    position: "absolute",
    right: 12,
    top: 12,
  },
  formInputMultiline: {
    minHeight: 80,
    textAlignVertical: "top",
  },

  // Save Button
  saveButton: {
    borderRadius: 12,
    overflow: "hidden",
    marginTop: 4,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 8,
  },
  saveButtonText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: "600",
  },

  // Password Fields
  passwordFields: {
    gap: 12,
    marginTop: 8,
  },

  // Update Button
  updateButton: {
    borderRadius: 12,
    overflow: "hidden",
    marginTop: 4,
  },
  updateButtonDisabled: {
    opacity: 0.5,
  },
  updateButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 8,
  },
  updateButtonText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: "600",
  },

  // Actions Card
  actionsCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 12,
  },
  actionsTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: "#F9FAFB",
  },
  actionButtonPressed: {
    backgroundColor: "#F3F4F6",
    transform: [{ scale: 0.98 }],
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  actionLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
    color: "#111827",
  },

  // Logout Button
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FEE2E2",
    backgroundColor: "#FEF2F2",
    marginTop: 8,
  },
  logoutText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.error,
  },
});
