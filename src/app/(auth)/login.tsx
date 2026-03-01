import { MaterialIcons } from "@expo/vector-icons";
import { Link, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
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
import { Colors, Radius, Spacing } from "../../theme";
import { getLastEmail, saveLastEmail } from "../../utils/login.storage";
import { saveUser } from "../../utils/storage";

type LoginMode = "phone" | "password";
type PhoneStep = "enter-phone" | "enter-otp";

const OTP_LENGTH = 6;
const RESEND_INTERVAL_SEC = 30;

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

  const [mode, setMode] = useState<LoginMode>("phone");
  const [phoneStep, setPhoneStep] = useState<PhoneStep>("enter-phone");
  const [identifier, setIdentifier] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSessionId, setOtpSessionId] = useState("");
  const [password, setPassword] = useState("");
  const [resendSeconds, setResendSeconds] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getLastEmail().then((stored) => {
      if (stored) setIdentifier(stored);
    });
  }, []);

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const timer = setInterval(() => {
      setResendSeconds((current) => Math.max(0, current - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendSeconds]);

  const normalizedPhone = useMemo(() => normalizePhone(phone), [phone]);
  const normalizedOtp = useMemo(() => normalizePhone(otp).slice(0, OTP_LENGTH), [otp]);

  const canRequestOtp = normalizedPhone.length >= 10 && !loading;
  const canVerifyOtp = normalizedOtp.length === OTP_LENGTH && otpSessionId.length > 0 && !loading;
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

  const requestOtp = async () => {
    if (!canRequestOtp) return;
    setError(null);
    setLoading(true);
    try {
      const response = await AuthService.requestOtp(normalizedPhone);
      setOtpSessionId(response.otpSessionId || "");
      setPhoneStep("enter-otp");
      setResendSeconds(RESEND_INTERVAL_SEC);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Unable to send OTP right now. Use password sign in.",
      );
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (!canVerifyOtp) return;
    setError(null);
    setLoading(true);
    try {
      const response = await AuthService.verifyOtp({
        phoneNumber: normalizedPhone,
        otp: normalizedOtp,
        otpSessionId,
      });
      await completeAuth(response, normalizedPhone);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Invalid OTP");
    } finally {
      setLoading(false);
    }
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
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.card}>
          <View style={styles.logoContainer}>
            <MaterialIcons name="spa" size={44} color={Colors.primary} />
            <Text style={styles.logoText}>PNMS</Text>
          </View>

          <Text style={styles.title}>Sign in</Text>
          <Text style={styles.subtitle}>Fast login for customers and staff</Text>

          <View style={styles.modeSwitch}>
            <Pressable
              onPress={() => {
                setMode("phone");
                setError(null);
              }}
              style={[styles.modeChip, mode === "phone" && styles.modeChipActive]}
            >
              <Text
                style={[styles.modeChipText, mode === "phone" && styles.modeChipTextActive]}
              >
                Phone OTP
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setMode("password");
                setError(null);
              }}
              style={[styles.modeChip, mode === "password" && styles.modeChipActive]}
            >
              <Text
                style={[
                  styles.modeChipText,
                  mode === "password" && styles.modeChipTextActive,
                ]}
              >
                Password
              </Text>
            </Pressable>
          </View>

          {mode === "phone" && phoneStep === "enter-phone" ? (
            <>
              <View style={styles.inputContainer}>
                <MaterialIcons
                  name="phone"
                  size={20}
                  color={Colors.textSecondary}
                  style={styles.inputIcon}
                />
                <TextInput
                  placeholder="Phone number"
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={setPhone}
                  style={styles.input}
                  placeholderTextColor={Colors.textTertiary}
                  maxLength={15}
                />
              </View>

              <Pressable
                onPress={requestOtp}
                disabled={!canRequestOtp}
                style={({ pressed }) => [
                  styles.loginButton,
                  !canRequestOtp && styles.loginButtonDisabled,
                  pressed && styles.loginButtonPressed,
                ]}
              >
                <Text style={styles.loginButtonText}>Send OTP</Text>
              </Pressable>
            </>
          ) : null}

          {mode === "phone" && phoneStep === "enter-otp" ? (
            <>
              <View style={styles.inputContainer}>
                <MaterialIcons
                  name="verified-user"
                  size={20}
                  color={Colors.textSecondary}
                  style={styles.inputIcon}
                />
                <TextInput
                  placeholder="Enter 6-digit OTP"
                  keyboardType="number-pad"
                  value={normalizedOtp}
                  onChangeText={setOtp}
                  style={styles.input}
                  placeholderTextColor={Colors.textTertiary}
                  maxLength={OTP_LENGTH}
                />
              </View>

              <Pressable
                onPress={verifyOtp}
                disabled={!canVerifyOtp}
                style={({ pressed }) => [
                  styles.loginButton,
                  !canVerifyOtp && styles.loginButtonDisabled,
                  pressed && styles.loginButtonPressed,
                ]}
              >
                <Text style={styles.loginButtonText}>Verify OTP</Text>
              </Pressable>

              <View style={styles.secondaryRow}>
                <Pressable
                  onPress={() => {
                    setPhoneStep("enter-phone");
                    setOtp("");
                    setOtpSessionId("");
                    setError(null);
                  }}
                >
                  <Text style={styles.secondaryLink}>Change number</Text>
                </Pressable>

                <Pressable
                  onPress={requestOtp}
                  disabled={resendSeconds > 0 || loading}
                >
                  <Text
                    style={[
                      styles.secondaryLink,
                      (resendSeconds > 0 || loading) && styles.secondaryLinkDisabled,
                    ]}
                  >
                    {resendSeconds > 0 ? `Resend in ${resendSeconds}s` : "Resend OTP"}
                  </Text>
                </Pressable>
              </View>
            </>
          ) : null}

          {mode === "password" ? (
            <>
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
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                  style={styles.input}
                  placeholderTextColor={Colors.textTertiary}
                />
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
              <View style={styles.authLinks}>
                <Link href="/(auth)/forgot-password" style={styles.secondaryLink}>
                  Forgot password?
                </Link>
                <Link href="/(auth)/request-otp" style={styles.secondaryLink}>
                  Use OTP screen
                </Link>
              </View>
            </>
          ) : null}

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

        <Text style={styles.footerText}>Plant Nursery Management System • v1.0.0</Text>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary,
  },
  keyboard: {
    flex: 1,
    justifyContent: "center",
    padding: Spacing.lg,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Spacing.xl,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  logoText: {
    fontSize: 30,
    fontWeight: "700",
    color: Colors.primary,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: Colors.text,
    textAlign: "center",
  },
  subtitle: {
    color: Colors.textSecondary,
    marginTop: 4,
    marginBottom: Spacing.lg,
    textAlign: "center",
  },
  modeSwitch: {
    flexDirection: "row",
    backgroundColor: Colors.surfaceDark,
    borderRadius: 12,
    padding: 4,
    marginBottom: Spacing.md,
  },
  modeChip: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: Spacing.sm,
    alignItems: "center",
  },
  modeChipActive: {
    backgroundColor: Colors.primary,
  },
  modeChipText: {
    color: Colors.textSecondary,
    fontWeight: "600",
  },
  modeChipTextActive: {
    color: Colors.white,
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
  loginButton: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.xs,
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
  secondaryRow: {
    marginTop: Spacing.md,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  authLinks: {
    marginTop: Spacing.sm,
    gap: 6,
  },
  secondaryLink: {
    color: Colors.primary,
    fontWeight: "600",
  },
  secondaryLinkDisabled: {
    color: Colors.textTertiary,
  },
  loaderContainer: {
    alignItems: "center",
    paddingTop: Spacing.md,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.error + "10",
    padding: Spacing.md,
    borderRadius: Radius.md,
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  error: {
    color: Colors.error,
    flex: 1,
    fontSize: 14,
  },
  footerText: {
    marginTop: Spacing.xl,
    textAlign: "center",
    color: Colors.surface,
    fontSize: 12,
    fontWeight: "500",
  },
});
