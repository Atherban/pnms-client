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
import { useAuthStore } from "../../stores/auth.store";
import { Colors, Radius, Spacing } from "../../theme";
import { getLastEmail, saveLastEmail } from "../../utils/login.storage";
import { saveUser } from "../../utils/storage"; // IMPORTANT: Import saveUser

export default function Login() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* Load last email */
  useEffect(() => {
    getLastEmail().then((stored) => {
      if (stored) setEmail(stored);
    });
  }, []);

  const isFormValid = email.trim().length > 0 && password.length > 0;

  const handleLogin = async () => {
    if (!isFormValid || loading) return;

    setLoading(true);
    setError(null);

    try {
      const res = await AuthService.login({
        email,
        password,
      });

      if (!res || !res.token || !res.user) {
        throw new Error("Invalid login response");
      }

      // IMPORTANT: Save user to SecureStore
      await saveUser(res.user);
      await saveLastEmail(email);

      // IMPORTANT: Pass ALL user fields to setAuth including name
      setAuth(
        {
          id: res.user._id,
          name: res.user.name, // ← THIS WAS MISSING!
          email: res.user.email, // Also include email
          role: res.user.role,
        },
        res.token,
      );

      if (res.user.role === "ADMIN") {
        router.replace("/(admin)");
      } else if (res.user.role === "STAFF") {
        router.replace("/(staff)");
      } else {
        router.replace("/(viewer)");
      }
    } catch (err: any) {
      // console.error("Login error:", err);
      setError(
        err?.response?.data?.message || err?.message || "Invalid credentials",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.card}>
          <View style={styles.logoContainer}>
            <MaterialIcons name="spa" size={48} color={Colors.primary} />
            <Text style={styles.logoText}>PNMS</Text>
          </View>

          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>
            Sign in to continue to Plant Nursery Management System
          </Text>

          {/* Email */}
          <View style={styles.inputContainer}>
            <MaterialIcons
              name="email"
              size={20}
              color={Colors.textSecondary}
              style={styles.inputIcon}
            />
            <TextInput
              placeholder="Email"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              style={styles.input}
              placeholderTextColor={Colors.textTertiary}
            />
          </View>

          {/* Password */}
          <View style={styles.inputContainer}>
            <MaterialIcons
              name="lock"
              size={20}
              color={Colors.textSecondary}
              style={styles.inputIcon}
            />
            <TextInput
              placeholder="Password"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
              style={styles.input}
              placeholderTextColor={Colors.textTertiary}
            />
            <Pressable
              onPress={() => setShowPassword((v) => !v)}
              style={styles.passwordToggle}
            >
              <MaterialIcons
                name={showPassword ? "visibility-off" : "visibility"}
                size={22}
                color={Colors.textSecondary}
              />
            </Pressable>
          </View>

          {error && (
            <View style={styles.errorContainer}>
              <MaterialIcons
                name="error-outline"
                size={18}
                color={Colors.error}
              />
              <Text style={styles.error}>{error}</Text>
            </View>
          )}

          {loading ? (
            <View style={styles.loaderContainer}>
              <Loader />
            </View>
          ) : (
            <Pressable
              onPress={handleLogin}
              disabled={!isFormValid || loading}
              style={({ pressed }) => [
                styles.loginButton,
                (!isFormValid || loading) && styles.loginButtonDisabled,
                pressed && styles.loginButtonPressed,
              ]}
            >
              <Text style={styles.loginButtonText}>
                {loading ? "Signing in..." : "Sign In"}
              </Text>
            </Pressable>
          )}
        </View>

        <Text style={styles.footerText}>
          Plant Nursery Management System • v1.0.0
        </Text>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  keyboard: {
    flex: 1,
    justifyContent: "center",
    padding: Spacing.lg,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  logoText: {
    fontSize: 32,
    fontWeight: "700",
    color: Colors.primary,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: Spacing.xs,
    textAlign: "center",
  },
  subtitle: {
    color: Colors.textSecondary,
    marginBottom: Spacing.xl,
    textAlign: "center",
    lineHeight: 20,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    marginBottom: Spacing.md,
    backgroundColor: Colors.surfaceDark,
  },
  inputIcon: {
    marginLeft: Spacing.md,
  },
  input: {
    flex: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    color: Colors.text,
    fontSize: 16,
  },
  passwordToggle: {
    padding: Spacing.md,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.error + "10",
    padding: Spacing.md,
    borderRadius: Radius.md,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  error: {
    color: Colors.error,
    flex: 1,
    fontSize: 14,
  },
  loaderContainer: {
    alignItems: "center",
    padding: Spacing.md,
  },
  loginButton: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.sm,
  },
  loginButtonDisabled: {
    backgroundColor: Colors.disabled,
    opacity: 0.6,
  },
  loginButtonPressed: {
    backgroundColor: Colors.primaryDark,
    transform: [{ scale: 0.98 }],
  },
  loginButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: "600",
  },
  footerText: {
    marginTop: Spacing.xl,
    textAlign: "center",
    color: Colors.textTertiary,
    fontSize: 12,
    fontWeight: "500",
  },
});
