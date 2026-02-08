import { MaterialIcons } from "@expo/vector-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Dimensions,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { UserService } from "../../../services/user.service";
import { Colors, Spacing } from "../../../theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const BOTTOM_NAV_HEIGHT = 80;

export default function CreateUser() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"ADMIN" | "STAFF" | "VIEWER">("STAFF");
  const [showPassword, setShowPassword] = useState(false);

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
      Alert.alert("Error", err?.message || "Failed to create user");
    },
  });

  const handleCreate = () => {
    if (!name.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert("Validation Error", "Full name is required");
      return;
    }

    if (!email.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert("Validation Error", "Email is required");
      return;
    }

    if (!password.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert("Validation Error", "Password is required");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert("Validation Error", "Please enter a valid email address");
      return;
    }

    // Password strength validation
    if (password.length < 6) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert(
        "Validation Error",
        "Password must be at least 6 characters long",
      );
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    mutation.mutate({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: password.trim(),
      role,
    });
  };

  const getRoleDescription = (roleType: "ADMIN" | "STAFF" | "VIEWER") => {
    switch (roleType) {
      case "ADMIN":
        return "Full access to all features and settings";
      case "STAFF":
        return "Can manage inventory and process sales";
      case "VIEWER":
        return "Read-only access to view data";
      default:
        return "";
    }
  };

  const getRoleIcon = (roleType: "ADMIN" | "STAFF" | "VIEWER") => {
    switch (roleType) {
      case "ADMIN":
        return "security";
      case "STAFF":
        return "person";
      case "VIEWER":
        return "visibility";
      default:
        return "person";
    }
  };

  const isFormValid = () => {
    return (
      name.trim() &&
      email.trim() &&
      password.trim() &&
      password.length >= 6 &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Fixed Header */}
      <LinearGradient
        colors={[Colors.primary, Colors.primaryLight || Colors.primary]}
        style={styles.headerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
          style={({ pressed }) => [
            styles.backButton,
            pressed && styles.backButtonPressed,
          ]}
        >
          <MaterialIcons name="arrow-back" size={20} color={Colors.white} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.title}>Create New User</Text>
          <Text style={styles.subtitle}>Add a new team member</Text>
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
          {/* User Information Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="person-add" size={22} color={Colors.text} />
              <Text style={styles.sectionTitle}>User Information</Text>
            </View>
            <Text style={styles.sectionDescription}>
              Enter the details for the new user account.
            </Text>

            {/* Name Field */}
            <View style={styles.inputContainer}>
              <View style={styles.inputLabel}>
                <MaterialIcons name="badge" size={18} color={Colors.text} />
                <Text style={styles.inputLabelText}>Full Name *</Text>
              </View>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Enter full name"
                placeholderTextColor={Colors.textTertiary}
                style={styles.input}
              />
              {!name.trim() && (
                <View style={styles.validationError}>
                  <MaterialIcons name="error" size={14} color={Colors.error} />
                  <Text style={styles.validationText}>
                    Full name is required
                  </Text>
                </View>
              )}
            </View>

            {/* Email Field */}
            <View style={styles.inputContainer}>
              <View style={styles.inputLabel}>
                <MaterialIcons name="email" size={18} color={Colors.text} />
                <Text style={styles.inputLabelText}>Email Address *</Text>
              </View>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="user@example.com"
                placeholderTextColor={Colors.textTertiary}
                autoCapitalize="none"
                keyboardType="email-address"
                style={[
                  styles.input,
                  email.trim() &&
                    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) &&
                    styles.inputError,
                ]}
              />
              {!email.trim() ? (
                <View style={styles.validationError}>
                  <MaterialIcons name="error" size={14} color={Colors.error} />
                  <Text style={styles.validationText}>
                    Email address is required
                  </Text>
                </View>
              ) : email.trim() &&
                !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ? (
                <View style={styles.validationError}>
                  <MaterialIcons
                    name="error"
                    size={14}
                    color={Colors.warning}
                  />
                  <Text style={styles.validationText}>
                    Please enter a valid email address
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Password Field */}
            <View style={styles.inputContainer}>
              <View style={styles.inputLabel}>
                <MaterialIcons name="lock" size={18} color={Colors.text} />
                <Text style={styles.inputLabelText}>Password *</Text>
              </View>
              <View style={styles.passwordContainer}>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter password"
                  placeholderTextColor={Colors.textTertiary}
                  secureTextEntry={!showPassword}
                  style={[
                    styles.passwordInput,
                    password && password.length < 6 && styles.inputError,
                  ]}
                />
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setShowPassword(!showPassword);
                  }}
                  style={styles.passwordToggle}
                >
                  <MaterialIcons
                    name={showPassword ? "visibility-off" : "visibility"}
                    size={20}
                    color={Colors.textSecondary}
                  />
                </Pressable>
              </View>

              {!password.trim() ? (
                <View style={styles.validationError}>
                  <MaterialIcons name="error" size={14} color={Colors.error} />
                  <Text style={styles.validationText}>
                    Password is required
                  </Text>
                </View>
              ) : password.length < 6 ? (
                <View style={styles.validationError}>
                  <MaterialIcons
                    name="error"
                    size={14}
                    color={Colors.warning}
                  />
                  <Text style={styles.validationText}>
                    Password must be at least 6 characters
                  </Text>
                </View>
              ) : (
                <View style={styles.validationSuccess}>
                  <MaterialIcons
                    name="check-circle"
                    size={14}
                    color={Colors.success}
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
            <View style={styles.sectionHeader}>
              <MaterialIcons
                name="admin-panel-settings"
                size={22}
                color={Colors.text}
              />
              <Text style={styles.sectionTitle}>User Role</Text>
            </View>
            <Text style={styles.sectionDescription}>
              Select the appropriate access level for this user.
            </Text>

            <View style={styles.roleGrid}>
              {(["ADMIN", "STAFF", "VIEWER"] as const).map((roleType) => (
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
                        ? roleType === "ADMIN"
                          ? [Colors.error, "#F87171"]
                          : roleType === "STAFF"
                            ? [
                                Colors.primary,
                                Colors.primaryLight || Colors.primary,
                              ]
                            : [Colors.success, "#34D399"]
                        : [
                            Colors.surface,
                            Colors.surfaceLight || Colors.surface,
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
                            ? Colors.white
                            : Colors.textSecondary
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
                          color={Colors.white}
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
                  color={Colors.textSecondary}
                />
                <Text style={styles.permissionsTitle}>
                  {role} Permissions Summary
                </Text>
              </View>

              <View style={styles.permissionsList}>
                {role === "ADMIN" && (
                  <>
                    <View style={styles.permissionItem}>
                      <MaterialIcons
                        name="check"
                        size={14}
                        color={Colors.success}
                      />
                      <Text style={styles.permissionText}>
                        Full system access
                      </Text>
                    </View>
                    <View style={styles.permissionItem}>
                      <MaterialIcons
                        name="check"
                        size={14}
                        color={Colors.success}
                      />
                      <Text style={styles.permissionText}>User management</Text>
                    </View>
                    <View style={styles.permissionItem}>
                      <MaterialIcons
                        name="check"
                        size={14}
                        color={Colors.success}
                      />
                      <Text style={styles.permissionText}>
                        All inventory operations
                      </Text>
                    </View>
                    <View style={styles.permissionItem}>
                      <MaterialIcons
                        name="check"
                        size={14}
                        color={Colors.success}
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
                        color={Colors.success}
                      />
                      <Text style={styles.permissionText}>Process sales</Text>
                    </View>
                    <View style={styles.permissionItem}>
                      <MaterialIcons
                        name="check"
                        size={14}
                        color={Colors.success}
                      />
                      <Text style={styles.permissionText}>
                        Manage inventory
                      </Text>
                    </View>
                    <View style={styles.permissionItem}>
                      <MaterialIcons
                        name="block"
                        size={14}
                        color={Colors.textTertiary}
                      />
                      <Text style={styles.permissionText}>
                        No user management
                      </Text>
                    </View>
                    <View style={styles.permissionItem}>
                      <MaterialIcons
                        name="check"
                        size={14}
                        color={Colors.success}
                      />
                      <Text style={styles.permissionText}>View reports</Text>
                    </View>
                  </>
                )}

                {role === "VIEWER" && (
                  <>
                    <View style={styles.permissionItem}>
                      <MaterialIcons
                        name="check"
                        size={14}
                        color={Colors.success}
                      />
                      <Text style={styles.permissionText}>View inventory</Text>
                    </View>
                    <View style={styles.permissionItem}>
                      <MaterialIcons
                        name="check"
                        size={14}
                        color={Colors.success}
                      />
                      <Text style={styles.permissionText}>View sales data</Text>
                    </View>
                    <View style={styles.permissionItem}>
                      <MaterialIcons
                        name="block"
                        size={14}
                        color={Colors.textTertiary}
                      />
                      <Text style={styles.permissionText}>
                        No modifications
                      </Text>
                    </View>
                    <View style={styles.permissionItem}>
                      <MaterialIcons
                        name="block"
                        size={14}
                        color={Colors.textTertiary}
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
                color={Colors.textSecondary}
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
                  !isFormValid()
                    ? [Colors.border, Colors.borderLight]
                    : [Colors.success, "#34D399"]
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
                      color={Colors.white}
                    />
                    <Text style={styles.createButtonText}>Creating...</Text>
                  </>
                ) : (
                  <>
                    <MaterialIcons
                      name="person-add"
                      size={22}
                      color={Colors.white}
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
            color={Colors.textSecondary}
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
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: BOTTOM_NAV_HEIGHT + Spacing.lg,
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
    marginBottom: Spacing.lg,
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
    marginBottom: Spacing.lg,
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
  inputError: {
    borderColor: Colors.warning,
    backgroundColor: Colors.warning + "10",
  },
  passwordContainer: {
    position: "relative" as const,
  },
  passwordInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: Spacing.md,
    paddingRight: 50,
    fontSize: 16,
    color: Colors.text,
    backgroundColor: Colors.surface,
  },
  passwordToggle: {
    position: "absolute" as const,
    right: Spacing.md,
    top: 0,
    bottom: 0,
    justifyContent: "center" as const,
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
  validationSuccess: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: Colors.success + "10",
    padding: Spacing.sm,
    borderRadius: 8,
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  validationSuccessText: {
    fontSize: 13,
    color: Colors.success,
    fontWeight: "500" as const,
    flex: 1,
  },
  strengthIndicator: {
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    marginBottom: Spacing.sm,
    position: "relative" as const,
  },
  strengthBar: {
    position: "absolute" as const,
    height: "100%",
    borderRadius: 2,
    backgroundColor: Colors.error,
  },
  strengthBarMedium: {
    backgroundColor: Colors.warning,
  },
  strengthBarStrong: {
    backgroundColor: Colors.success,
  },
  strengthText: {
    fontSize: 11,
    color: Colors.textTertiary,
    textAlign: "right" as const,
    marginTop: 2,
  },
  roleGrid: {
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  roleCard: {
    borderRadius: 16,
    overflow: "hidden" as const,
    borderWidth: 2,
    borderColor: Colors.borderLight,
  },
  roleCardSelected: {
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  roleCardPressed: {
    transform: [{ scale: 0.98 }],
  },
  roleGradient: {
    padding: Spacing.lg,
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
    marginBottom: Spacing.md,
  },
  roleIconContainerUnselected: {
    backgroundColor: Colors.surfaceDark,
  },
  roleTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  roleTitleSelected: {
    color: Colors.white,
  },
  roleDescription: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  roleDescriptionSelected: {
    color: "rgba(255, 255, 255, 0.9)",
  },
  roleSelectedIndicator: {
    position: "absolute" as const,
    top: Spacing.md,
    right: Spacing.md,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    borderRadius: 12,
    padding: 4,
  },
  permissionsCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  permissionsHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  permissionsTitle: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.text,
  },
  permissionsList: {
    gap: Spacing.xs,
  },
  permissionItem: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: Spacing.sm,
  },
  permissionText: {
    fontSize: 13,
    color: Colors.textSecondary,
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
  createButton: {
    flex: 2,
    borderRadius: 16,
    overflow: "hidden" as const,
    shadowColor: Colors.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  createButtonDisabled: {
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
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  createButtonText: {
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
  securityNotice: {
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.md,
    marginBottom: 3 * Spacing.xl,
  },
  securityText: {
    flex: 1,
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
};
