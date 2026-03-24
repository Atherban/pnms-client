import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Loader } from "../../components";
import { AuthService } from "../../services/auth.service";
import { PushNotificationService } from "../../services/push-notification.service";
import { useAuthStore } from "../../stores/auth.store";
import { Colors, Spacing } from "../../theme";
import { getLastEmail, saveLastEmail } from "../../utils/login.storage";
import { saveUser } from "../../utils/storage";
import { AdminTheme } from "@/src/components/admin/theme";

const normalizePhone = (value: string) => value.replace(/[^\d]/g, "");

const resolveLandingRoute = (role?: string) => {
  if (role === "SUPER_ADMIN") return "/(super-admin)";
  if (role === "NURSERY_ADMIN") return "/(admin)";
  if (role === "STAFF") return "/(staff)";
  if (role === "CUSTOMER") return "/(customer)";
  return "/unauthorized";
};

export default function Login() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getLastEmail().then((stored) => {
      if (stored) setIdentifier(stored);
    });
  }, []);

  const canPasswordLogin = identifier.trim().length > 0 && password.length > 0 && !loading;

  const completeAuth = async (res: any, usedIdentifier: string) => {
    await saveUser(res.user);
    await saveLastEmail(usedIdentifier);

    setAuth(
      {
        id: res.user._id,
        name: res.user.name,
        email: res.user.email || "",
        role: res.user.role,
        phoneNumber: res.user.phoneNumber,
        nurseryId: res.user.nurseryId,
        allowedNurseryIds: res.user.allowedNurseryIds,
      },
      res.token,
    );

    await PushNotificationService.registerForPushNotificationsAsync(res.user._id);
    router.replace(resolveLandingRoute(res.user.role) as any);
  };

  const loginWithPassword = async () => {
    if (!canPasswordLogin) return;
    setError(null);
    setLoading(true);
    try {
      const trimmed = identifier.trim();
      const isPhone = /^\+?[\d\s-]{10,}$/.test(trimmed);
      const response = await AuthService.login({
        email: isPhone ? undefined : trimmed,
        phoneNumber: isPhone ? normalizePhone(trimmed) : undefined,
        password,
      });
      await completeAuth(response, trimmed);
    } catch (err: any) {
      setError(
        err?.response?.data?.message || err?.message || "Invalid credentials",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top","bottom"]}>
      <View style={styles.header}>

          <View style={styles.logoContainer}>
            <MaterialIcons name="spa" size={44} color={Colors.primary} />
            <Text style={styles.logoText}>PNMS</Text>
          </View>
          <Text style={styles.quoteText}>
Where every plant finds its home, and every task finds its place.</Text>
      </View>
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.card}>

          <Text style={styles.title}>Sign in</Text>
          <Text style={styles.subtitle}>Use your email/phone and password</Text>

          <View style={styles.inputContainer}>
            <MaterialIcons
              name="person"
              size={20}
              color={Colors.textSecondary}
              style={styles.inputIcon}
            />
            <TextInput
              placeholder="Email or phone"
              autoCapitalize="none"
              value={identifier}
              onChangeText={setIdentifier}
              style={styles.input}
              placeholderTextColor={Colors.textTertiary}
            />
          </View>

          <View style={styles.inputContainer}>
            <MaterialIcons
              name="lock"
              size={20}
              color={Colors.textSecondary}
              style={styles.inputIcon}
            />
            <TextInput
              placeholder="Password"
              secureTextEntry={!isPasswordVisible}
              value={password}
              onChangeText={setPassword}
              style={styles.input}
              placeholderTextColor={Colors.textTertiary}
            />
            <Pressable
              onPress={() => setIsPasswordVisible((prev) => !prev)}
              hitSlop={8}
              style={styles.passwordToggle}
            >
              <MaterialIcons
                name={isPasswordVisible ? "visibility-off" : "visibility"}
                size={20}
                color={Colors.textSecondary}
              />
            </Pressable>
          </View>

          <Pressable
            onPress={loginWithPassword}
            disabled={!canPasswordLogin}
            style={({ pressed }) => [
              styles.loginButton,
              !canPasswordLogin && styles.loginButtonDisabled,
              pressed && styles.loginButtonPressed,
            ]}
          >
            <Text style={styles.loginButtonText}>Sign In</Text>
          </Pressable>

          {loading ? (
            <View style={styles.loaderContainer}>
              <Loader />
            </View>
          ) : null}

          {error ? (
            <View style={styles.errorContainer}>
              <MaterialIcons name="error-outline" size={18} color={Colors.error} />
              <Text style={styles.error}>{error}</Text>
            </View>
          ) : null}
        </View>

      </KeyboardAvoidingView>
        <View style={styles.footerContainer}>
          <Text style={styles.footerText}>Plant Nursery Management System • v1.0.0</Text>
        </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AdminTheme.colors.borderSoft,
  },
  keyboard: {
    flex: 1,
    justifyContent: "center",
    padding: Spacing.lg,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Spacing.md,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  header:{
     width:"100%",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
    position:"absolute",
    top:40,
    left:0,
    right:0,
    height:200,
  },
  logoContainer: {
    width:"100%",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
  },
  logoText: {
    fontSize: 30,
    fontWeight: "700",
    color: Colors.primary,
  },
  quoteText:{
    width:"75%",
    color: Colors.textSecondary,
    marginTop: 10,
    textAlign: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: Colors.text,
    textAlign: "left",
  },
  subtitle: {
    color: Colors.textSecondary,
    marginTop: 4,
    marginBottom: Spacing.lg,
    textAlign: "left",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    backgroundColor: Colors.surfaceMuted,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    height: 52,
  },
  inputIcon: {
    marginRight: Spacing.sm,
  },
  input: {
    flex: 1,
    color: Colors.text,
    fontSize: 15,
    paddingRight: Spacing.xl,
  },
  passwordToggle: {
    position: "absolute",
    right: Spacing.md,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  loginButton: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    height: 50,
    marginTop: Spacing.sm,
  },
  loginButtonDisabled: {
    opacity: 0.55,
  },
  loginButtonPressed: {
    transform: [{ scale: 0.98 }],
  },
  loginButtonText: {
    color: Colors.white,
    fontWeight: "700",
    fontSize: 16,
  },
  loaderContainer: {
    marginTop: Spacing.md,
  },
  errorContainer: {
    marginTop: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    backgroundColor: `${Colors.error}10`,
    borderRadius: 12,
    padding: Spacing.sm,
  },
  error: {
    color: Colors.error,
    flex: 1,
    fontSize: 13,
  },
  footerText: {
    
    color: Colors.textMuted,
    marginTop: Spacing.lg,
    fontSize: 12,
    textAlign:"center"
   
  },
  footerContainer:{
    width:"100%",
    height:60,
    position: "absolute",
    bottom: 30,
    textAlign:"center",
    alignItems:"center",
    justifyContent:"center",
    backgroundColor:"Red"
  }
});
