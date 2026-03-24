import { MaterialIcons } from "@expo/vector-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import StitchHeader from "../../../components/common/StitchHeader";
import StitchCard from "../../../components/common/StitchCard";
import StitchSectionHeader from "../../../components/common/StitchSectionHeader";
import { AdminTheme } from "../../../components/admin/theme";
import { UserService } from "../../../services/user.service";
import { useAuthStore } from "../../../stores/auth.store";
import { formatErrorMessage } from "../../../utils/error";
import { isValidIndianUserPhone, normalizeIndianPhone } from "../../../utils/phone";
import { Colors } from "@/src/theme";

const BOTTOM_NAV_HEIGHT = 80;

export default function CreateUser() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);

  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [role, setRole] = useState<"NURSERY_ADMIN" | "STAFF" | "CUSTOMER">("STAFF");

  const mutation = useMutation({
    mutationFn: UserService.create,
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ["users"] });
      Alert.alert("Success", "User created successfully", [
        {
          text: "OK",
          onPress: () => router.replace("/(admin)/users"),
        },
      ]);
    },
    onError: (err: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Error", formatErrorMessage(err));
    },
  });

  const handleCreate = () => {
    if (!name.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert("Validation Error", "Full name is required");
      return;
    }

    if (!phoneNumber.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert("Validation Error", "Phone number is required");
      return;
    }

    if (!password.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert("Validation Error", "Password is required");
      return;
    }

    if (!isValidIndianUserPhone(phoneNumber.trim())) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert(
        "Validation Error",
        "Enter valid Indian phone: 9876543210, 919876543210, or +919876543210",
      );
      return;
    }

    if (email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        Alert.alert("Validation Error", "Please enter a valid email address");
        return;
      }
    }

    if (password.length < 5) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert(
        "Validation Error",
        "Password must be at least 5 characters long",
      );
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    mutation.mutate({
      name: name.trim(),
      phoneNumber: normalizeIndianPhone(phoneNumber.trim()),
      email: email.trim() ? email.trim().toLowerCase() : undefined,
      password: password.trim(),
      role,
      nurseryId: currentUser?.nurseryId,
    });
  };

  const getRoleDescription = (roleType: "NURSERY_ADMIN" | "STAFF" | "CUSTOMER") => {
    switch (roleType) {
      case "NURSERY_ADMIN":
        return "Full access to all features and settings";
      case "STAFF":
        return "Can manage inventory and process sales";
      case "CUSTOMER":
        return "Read-only access to view data";
      default:
        return "";
    }
  };

  const getRoleIcon = (roleType: "NURSERY_ADMIN" | "STAFF" | "CUSTOMER") => {
    switch (roleType) {
      case "NURSERY_ADMIN":
        return "security";
      case "STAFF":
        return "person";
      case "CUSTOMER":
        return "visibility";
      default:
        return "person";
    }
  };

  const isFormValid = () => {
    return (
      name.trim() &&
      phoneNumber.trim() &&
      password.trim() &&
      password.length >= 5 &&
      isValidIndianUserPhone(phoneNumber.trim()) &&
      (!email.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["left", "right"]}>
      <StitchHeader
        title="Create New User"
        subtitle="Add a new team member"
        onBackPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.back();
        }}
      />

      {/* Scrollable Content */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <StitchCard style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <MaterialIcons name="person-add-alt-1" size={22} color={AdminTheme.colors.primary} />
          </View>
          <View style={styles.heroContent}>
            <Text style={styles.heroTitle}>Create a user with a clear access level</Text>
            <Text style={styles.heroSubtitle}>
              Keep identity, security, and permissions aligned with the updated admin experience.
            </Text>
          </View>
        </StitchCard>

        {/* Form Card */}
        <View style={styles.formCard}>
          {/* User Information Section */}
          <View style={styles.section}>
            <StitchSectionHeader
              title="User Information"
              subtitle="Enter the primary identity and contact details for this account."
            />

            {/* Name Field */}
            <View style={styles.inputContainer}>
              <View style={styles.inputLabel}>
                <MaterialIcons name="badge" size={18} color={AdminTheme.colors.text} />
                <Text style={styles.inputLabelText}>Full Name *</Text>
              </View>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Enter full name"
                placeholderTextColor={AdminTheme.colors.textSoft}
                style={styles.input}
              />
              {!name.trim() && (
                <View style={styles.validationError}>
                  <MaterialIcons name="error" size={14} color={AdminTheme.colors.danger} />
                  <Text style={styles.validationText}>
                    Full name is required
                  </Text>
                </View>
              )}
            </View>

            {/* Phone Field */}
            <View style={styles.inputContainer}>
              <View style={styles.inputLabel}>
                <MaterialIcons name="phone" size={18} color={AdminTheme.colors.text} />
                <Text style={styles.inputLabelText}>Phone Number *</Text>
              </View>
              <TextInput
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                placeholder="9876543210 / +919876543210"
                placeholderTextColor={AdminTheme.colors.textSoft}
                keyboardType="phone-pad"
                style={[
                  styles.input,
                  phoneNumber.trim() &&
                    !isValidIndianUserPhone(phoneNumber.trim()) &&
                    styles.inputError,
                ]}
              />
              {!phoneNumber.trim() ? (
                <View style={styles.validationError}>
                  <MaterialIcons name="error" size={14} color={AdminTheme.colors.danger} />
                  <Text style={styles.validationText}>
                    Phone number is required
                  </Text>
                </View>
              ) : phoneNumber.trim() &&
                !isValidIndianUserPhone(phoneNumber.trim()) ? (
                <View style={styles.validationError}>
                  <MaterialIcons
                    name="error"
                    size={14}
                    color={AdminTheme.colors.warning}
                  />
                  <Text style={styles.validationText}>
                    Use 9876543210, 919876543210, or +919876543210
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Email Field */}
            <View style={styles.inputContainer}>
              <View style={styles.inputLabel}>
                <MaterialIcons name="email" size={18} color={AdminTheme.colors.text} />
                <Text style={styles.inputLabelText}>Email Address (Optional)</Text>
              </View>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="user@example.com"
                placeholderTextColor={AdminTheme.colors.textSoft}
                autoCapitalize="none"
                keyboardType="email-address"
                style={[
                  styles.input,
                  email.trim() &&
                    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) &&
                    styles.inputError,
                ]}
              />
            </View>

            {/* Password Field */}
            <View style={styles.inputContainer}>
              <View style={styles.inputLabel}>
                <MaterialIcons name="lock" size={18} color={AdminTheme.colors.text} />
                <Text style={styles.inputLabelText}>Password *</Text>
              </View>
              <View style={styles.passwordContainer}>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter password"
                  placeholderTextColor={AdminTheme.colors.textSoft}
                  secureTextEntry={!isPasswordVisible}
                  style={[
                    styles.passwordInput,
                    password && password.length < 6 && styles.inputError,
                  ]}
                />
                <Pressable
                  onPress={() => setIsPasswordVisible((prev) => !prev)}
                  hitSlop={8}
                  style={styles.passwordToggle}
                >
                  <MaterialIcons
                    name={isPasswordVisible ? "visibility-off" : "visibility"}
                    size={20}
                    color={AdminTheme.colors.textMuted}
                  />
                </Pressable>
              </View>

              {!password.trim() ? (
                <View style={styles.validationError}>
                  <MaterialIcons name="error" size={14} color={AdminTheme.colors.danger} />
                  <Text style={styles.validationText}>
                    Password is required
                  </Text>
                </View>
              ) : password.length < 6 ? (
                <View style={styles.validationError}>
                  <MaterialIcons
                    name="error"
                    size={14}
                    color={AdminTheme.colors.warning}
                  />
                  <Text style={styles.validationText}>
                    Password must be at least 5 characters
                  </Text>
                </View>
              ) : (
                <View style={styles.validationSuccess}>
                  <MaterialIcons
                    name="check-circle"
                    size={14}
                    color={AdminTheme.colors.success}
                  />
                  <Text style={styles.validationSuccessText}>
                    Password strength: {password.length < 8 ? "Good" : "Strong"}
                  </Text>
                </View>
              )}
            </View>

            {/* Password Strength Indicator */}
            {password.length > 0 && (
              <View style={styles.strengthIndicator}>
                <View
                  style={[
                    styles.strengthBar,
                    password.length >= 6 &&
                      password.length < 8 &&
                      styles.strengthBarMedium,
                    password.length >= 8 && styles.strengthBarStrong,
                    {
                      width: `${Math.min((password.length / 12) * 100, 100)}%`,
                    },
                  ]}
                />
                <Text style={styles.strengthText}>
                  {password.length < 6
                    ? "Weak"
                    : password.length < 8
                      ? "Good"
                      : "Strong"}
                </Text>
              </View>
            )}
          </View>

          {/* Role Selection Section */}
          <View style={styles.section}>
            <StitchSectionHeader
              title="User Role"
              subtitle="Choose the role that matches what this person should be allowed to do."
            />

            <View style={styles.roleGrid}>
              {(["NURSERY_ADMIN", "STAFF", "CUSTOMER"] as const).map((roleType) => (
                <Pressable
                  key={roleType}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setRole(roleType);
                  }}
                  style={({ pressed }) => [
                    styles.roleCard,
                    role === roleType && styles.roleCardSelected,
                    pressed && styles.roleCardPressed,
                  ]}
                >
                  <LinearGradient
                    colors={
                      role === roleType
                        ? roleType === "NURSERY_ADMIN"
                          ? [AdminTheme.colors.danger, "#F87171"]
                          : roleType === "STAFF"
                            ? [
                                AdminTheme.colors.primary,
                                AdminTheme.colors.primaryLight || AdminTheme.colors.primary,
                              ]
                            : [AdminTheme.colors.success, "#34D399"]
                        : [
                            AdminTheme.colors.surface,
                            AdminTheme.colors.surfaceLight || AdminTheme.colors.surface,
                          ]
                    }
                    style={styles.roleGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <View
                      style={[
                        styles.roleIconContainer,
                        role !== roleType && styles.roleIconContainerUnselected,
                      ]}
                    >
                      <MaterialIcons
                        name={getRoleIcon(roleType)}
                        size={24}
                        color={
                          role === roleType
                            ? AdminTheme.colors.surface
                            : AdminTheme.colors.textMuted
                        }
                      />
                    </View>

                    <Text
                      style={[
                        styles.roleTitle,
                        role === roleType && styles.roleTitleSelected,
                      ]}
                    >
                      {roleType}
                    </Text>

                    <Text
                      style={[
                        styles.roleDescription,
                        role === roleType && styles.roleDescriptionSelected,
                      ]}
                    >
                      {getRoleDescription(roleType)}
                    </Text>

                    {role === roleType && (
                      <View style={styles.roleSelectedIndicator}>
                        <MaterialIcons
                          name="check-circle"
                          size={16}
                          color={AdminTheme.colors.surface}
                        />
                      </View>
                    )}
                  </LinearGradient>
                </Pressable>
              ))}
            </View>

            {/* Role Permissions Summary */}
            <View style={styles.permissionsCard}>
              <View style={styles.permissionsHeader}>
                <MaterialIcons
                  name="info"
                  size={18}
                  color={AdminTheme.colors.textMuted}
                />
                <Text style={styles.permissionsTitle}>
                  {role} Permissions Summary
                </Text>
              </View>

              <View style={styles.permissionsList}>
                {role === "NURSERY_ADMIN" && (
                  <>
                    <View style={styles.permissionItem}>
                      <MaterialIcons
                        name="check"
                        size={14}
                        color={AdminTheme.colors.success}
                      />
                      <Text style={styles.permissionText}>
                        Full system access
                      </Text>
                    </View>
                    <View style={styles.permissionItem}>
                      <MaterialIcons
                        name="check"
                        size={14}
                        color={AdminTheme.colors.success}
                      />
                      <Text style={styles.permissionText}>User management</Text>
                    </View>
                    <View style={styles.permissionItem}>
                      <MaterialIcons
                        name="check"
                        size={14}
                        color={AdminTheme.colors.success}
                      />
                      <Text style={styles.permissionText}>
                        All inventory operations
                      </Text>
                    </View>
                    <View style={styles.permissionItem}>
                      <MaterialIcons
                        name="check"
                        size={14}
                        color={AdminTheme.colors.success}
                      />
                      <Text style={styles.permissionText}>
                        Reports and analytics
                      </Text>
                    </View>
                  </>
                )}

                {role === "STAFF" && (
                  <>
                    <View style={styles.permissionItem}>
                      <MaterialIcons
                        name="check"
                        size={14}
                        color={AdminTheme.colors.success}
                      />
                      <Text style={styles.permissionText}>Process sales</Text>
                    </View>
                    <View style={styles.permissionItem}>
                      <MaterialIcons
                        name="check"
                        size={14}
                        color={AdminTheme.colors.success}
                      />
                      <Text style={styles.permissionText}>
                        Manage inventory
                      </Text>
                    </View>
                    <View style={styles.permissionItem}>
                      <MaterialIcons
                        name="block"
                        size={14}
                        color={AdminTheme.colors.textSoft}
                      />
                      <Text style={styles.permissionText}>
                        No user management
                      </Text>
                    </View>
                    <View style={styles.permissionItem}>
                      <MaterialIcons
                        name="check"
                        size={14}
                        color={AdminTheme.colors.success}
                      />
                      <Text style={styles.permissionText}>View reports</Text>
                    </View>
                  </>
                )}

                {role === "CUSTOMER" && (
                  <>
                    <View style={styles.permissionItem}>
                      <MaterialIcons
                        name="check"
                        size={14}
                        color={AdminTheme.colors.success}
                      />
                      <Text style={styles.permissionText}>View inventory</Text>
                    </View>
                    <View style={styles.permissionItem}>
                      <MaterialIcons
                        name="check"
                        size={14}
                        color={AdminTheme.colors.success}
                      />
                      <Text style={styles.permissionText}>View sales data</Text>
                    </View>
                    <View style={styles.permissionItem}>
                      <MaterialIcons
                        name="block"
                        size={14}
                        color={AdminTheme.colors.textSoft}
                      />
                      <Text style={styles.permissionText}>
                        No modifications
                      </Text>
                    </View>
                    <View style={styles.permissionItem}>
                      <MaterialIcons
                        name="block"
                        size={14}
                        color={AdminTheme.colors.textSoft}
                      />
                      <Text style={styles.permissionText}>
                        No user management
                      </Text>
                    </View>
                  </>
                )}
              </View>
            </View>
          </View>

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
                color={AdminTheme.colors.textMuted}
              />
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>

            <Pressable
              onPress={handleCreate}
              disabled={mutation.isLoading || !isFormValid()}
              style={({ pressed }) => [
                styles.createButton,
                !isFormValid() && styles.createButtonDisabled,
                pressed && styles.createButtonPressed,
                mutation.isLoading && styles.createButtonLoading,
              ]}
            >
              <LinearGradient
                colors={

                     [AdminTheme.colors.success, "#34D399"]
                }
                style={styles.createGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {mutation.isLoading ? (
                  <>
                    <MaterialIcons
                      name="hourglass-empty"
                      size={22}
                      color={AdminTheme.colors.surface}
                    />
                    <Text style={styles.createButtonText}>Creating...</Text>
                  </>
                ) : (
                  <>
                    <MaterialIcons
                      name="person-add"
                      size={22}
                      color={AdminTheme.colors.surface}
                    />
                    <Text style={styles.createButtonText}>Create User</Text>
                  </>
                )}
              </LinearGradient>
            </Pressable>
          </View>

          {/* Validation Status */}
          {!isFormValid() && (
            <Text style={styles.hintText}>
              ⓘ Please fill all required fields with valid information
            </Text>
          )}
        </View>

        {/* Security Notice */}
        <View style={styles.securityNotice}>
          <MaterialIcons
            name="security"
            size={16}
            color={AdminTheme.colors.textMuted}
          />
          <Text style={styles.securityText}>
            User credentials will be encrypted and stored securely.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* -------------------- Styles -------------------- */

const styles = {
  container: {
    flex: 1,
    backgroundColor: AdminTheme.colors.background,
  },
  headerGradient: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingHorizontal: AdminTheme.spacing.lg,
    paddingTop: AdminTheme.spacing.lg,
    paddingBottom: AdminTheme.spacing.lg,
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
    marginLeft: AdminTheme.spacing.md,
  },
  title: {
    fontSize: 24,
    fontWeight: "700" as const,
    color: AdminTheme.colors.surface,
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
  scrollContent: {
    paddingHorizontal: AdminTheme.spacing.lg,
    paddingTop: AdminTheme.spacing.sm,
    paddingBottom: BOTTOM_NAV_HEIGHT + AdminTheme.spacing.lg,
    gap: AdminTheme.spacing.lg,
  },
  heroCard: {
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
    gap: AdminTheme.spacing.md,
  },
  heroIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: AdminTheme.colors.surfaceMuted,
  },
  heroContent: {
    flex: 1,
  },
  heroTitle: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: AdminTheme.colors.text,
  },
  heroSubtitle: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 19,
    color: AdminTheme.colors.textMuted,
  },
  formCard: {
    padding: AdminTheme.spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: 18,
  },
  section: {
    marginBottom: AdminTheme.spacing.xl,
  },
  inputContainer: {
    marginBottom: AdminTheme.spacing.lg,
  },
  inputLabel: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    marginBottom: AdminTheme.spacing.sm,
    gap: AdminTheme.spacing.sm,
  },
  inputLabelText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: AdminTheme.colors.text,
  },
  input: {
    borderWidth: 1,
    borderColor: AdminTheme.colors.border,
    borderRadius: 12,
    padding: AdminTheme.spacing.md,
    fontSize: 16,
    color: AdminTheme.colors.text,
    backgroundColor: AdminTheme.colors.surface,
  },
  inputError: {
    borderColor: AdminTheme.colors.warning,
    backgroundColor: AdminTheme.colors.warning + "10",
  },
  passwordContainer: {
    position: "relative" as const,
  },
  passwordInput: {
    borderWidth: 1,
    borderColor: AdminTheme.colors.border,
    borderRadius: 12,
    padding: AdminTheme.spacing.md,
    paddingRight: AdminTheme.spacing.xl,
    fontSize: 16,
    color: AdminTheme.colors.text,
    backgroundColor: AdminTheme.colors.surface,
  },
  passwordToggle: {
    position: "absolute" as const,
    right: AdminTheme.spacing.md,
    top: 0,
    bottom: 0,
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  validationError: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: AdminTheme.colors.danger + "10",
    padding: AdminTheme.spacing.sm,
    borderRadius: 8,
    gap: AdminTheme.spacing.sm,
    marginTop: AdminTheme.spacing.xs,
  },
  validationText: {
    fontSize: 13,
    color: AdminTheme.colors.danger,
    fontWeight: "500" as const,
    flex: 1,
  },
  validationSuccess: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: AdminTheme.colors.success + "10",
    padding: AdminTheme.spacing.sm,
    borderRadius: 8,
    gap: AdminTheme.spacing.sm,
    marginTop: AdminTheme.spacing.xs,
  },
  validationSuccessText: {
    fontSize: 13,
    color: AdminTheme.colors.success,
    fontWeight: "500" as const,
    flex: 1,
  },
  strengthIndicator: {
    height: 4,
    backgroundColor: AdminTheme.colors.border,
    borderRadius: 2,
    marginBottom: AdminTheme.spacing.sm,
    position: "relative" as const,
  },
  strengthBar: {
    position: "absolute" as const,
    height: "100%",
    borderRadius: 2,
    backgroundColor: AdminTheme.colors.danger,
  },
  strengthBarMedium: {
    backgroundColor: AdminTheme.colors.warning,
  },
  strengthBarStrong: {
    backgroundColor: AdminTheme.colors.success,
  },
  strengthText: {
    fontSize: 11,
    color: AdminTheme.colors.textSoft,
    textAlign: "right" as const,
    marginTop: 2,
  },
  roleGrid: {
    gap: AdminTheme.spacing.md,
    marginBottom: AdminTheme.spacing.lg,
  },
  roleCard: {
    borderRadius: 16,
    overflow: "hidden" as const,
    borderWidth: 2,
    borderColor: AdminTheme.colors.border,
  },
  roleCardSelected: {
    shadowColor: AdminTheme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  roleCardPressed: {
    transform: [{ scale: 0.98 }],
  },
  roleGradient: {
    padding: AdminTheme.spacing.lg,
    borderRadius: 14,
    position: "relative" as const,
  },
  roleIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginBottom: AdminTheme.spacing.md,
  },
  roleIconContainerUnselected: {
    backgroundColor: AdminTheme.colors.border,
  },
  roleTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: AdminTheme.colors.text,
    marginBottom: AdminTheme.spacing.xs,
  },
  roleTitleSelected: {
    color: AdminTheme.colors.surface,
  },
  roleDescription: {
    fontSize: 13,
    color: AdminTheme.colors.textMuted,
    lineHeight: 18,
  },
  roleDescriptionSelected: {
    color: "rgba(255, 255, 255, 0.9)",
  },
  roleSelectedIndicator: {
    position: "absolute" as const,
    top: AdminTheme.spacing.md,
    right: AdminTheme.spacing.md,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    borderRadius: 12,
    padding: 4,
  },
  permissionsCard: {
    backgroundColor: AdminTheme.colors.surface,
    borderRadius: 12,
    padding: AdminTheme.spacing.md,
    borderWidth: 1,
    borderColor: AdminTheme.colors.border,
  },
  permissionsHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    marginBottom: AdminTheme.spacing.sm,
    gap: AdminTheme.spacing.sm,
  },
  permissionsTitle: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: AdminTheme.colors.text,
  },
  permissionsList: {
    gap: AdminTheme.spacing.xs,
  },
  permissionItem: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: AdminTheme.spacing.sm,
  },
  permissionText: {
    fontSize: 13,
    color: AdminTheme.colors.textMuted,
  },
  actionsContainer: {
    flexDirection: "row" as const,
    gap: AdminTheme.spacing.md,
    marginBottom: AdminTheme.spacing.md,
  },
  cancelButton: {
    flex: 1,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: AdminTheme.colors.surface,
    padding: AdminTheme.spacing.lg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: AdminTheme.colors.border,
    gap: AdminTheme.spacing.sm,
  },
  cancelButtonPressed: {
    backgroundColor: AdminTheme.colors.surface,
    transform: [{ scale: 0.98 }],
  },
  cancelButtonText: {
    fontSize: 16,
    color: AdminTheme.colors.textMuted,
    fontWeight: "600" as const,
  },
  createButton: {
    backgroundColor: "red",
    flex: 2,
    borderRadius: 16,
    overflow: "hidden" as const,
    shadowColor: AdminTheme.colors.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  createButtonDisabled: {
    opacity: 0.6,
    shadowOpacity: 0,
    elevation: 0,
  },
  createButtonPressed: {
    transform: [{ scale: 0.98 }],
  },
  createButtonLoading: {
    opacity: 0.9,
  },
  createGradient: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    padding: AdminTheme.spacing.lg,
    gap: AdminTheme.spacing.sm,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: Colors.surface,
  },
  hintText: {
    fontSize: 14,
    color: AdminTheme.colors.textMuted,
    textAlign: "center" as const,
    fontStyle: "italic" as const,
  },
  securityNotice: {
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
    backgroundColor: AdminTheme.colors.surface,
    padding: AdminTheme.spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: AdminTheme.colors.border,
    gap: AdminTheme.spacing.md,
    marginBottom: 3 * AdminTheme.spacing.xl,
  },
  securityText: {
    flex: 1,
    fontSize: 12,
    color: AdminTheme.colors.textMuted,
    lineHeight: 16,
  },
};
