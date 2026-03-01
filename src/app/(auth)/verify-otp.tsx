import { useMutation } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AuthService } from "../../services/auth.service";
import { PushNotificationService } from "../../services/push-notification.service";
import { useAuthStore } from "../../stores/auth.store";
import { Colors, Radius, Spacing } from "../../theme";

const resolveLandingRoute = (role?: string) => {
  if (role === "SUPER_ADMIN") return "/(super-admin)";
  if (role === "NURSERY_ADMIN") return "/(admin)";
  if (role === "STAFF") return "/(staff)";
  return "/(customer)";
};

export default function VerifyOtpScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ phoneNumber?: string; otpSessionId?: string }>();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [phoneNumber, setPhoneNumber] = useState(params.phoneNumber || "");
  const [otp, setOtp] = useState("");
  const [otpSessionId, setOtpSessionId] = useState(params.otpSessionId || "");

  const mutation = useMutation({
    mutationFn: () =>
      AuthService.verifyOtp({
        phoneNumber: phoneNumber.replace(/[^\d]/g, ""),
        code: otp.replace(/[^\d]/g, ""),
        otpSessionId: otpSessionId || undefined,
      }),
    onSuccess: async (res) => {
      setAuth(
        {
          id: res.user._id,
          name: res.user.name,
          email: res.user.email || "",
          role: res.user.role as any,
          phoneNumber: res.user.phoneNumber,
          nurseryId: res.user.nurseryId,
          allowedNurseryIds: res.user.allowedNurseryIds,
        },
        res.token,
      );
      await PushNotificationService.registerForPushNotificationsAsync(res.user._id);
      router.replace(resolveLandingRoute(res.user.role) as any);
    },
    onError: (err: any) => Alert.alert("Verification failed", err?.message || "Invalid OTP"),
  });

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={styles.content} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.card}>
          <Text style={styles.title}>Verify OTP</Text>
          <TextInput value={phoneNumber} onChangeText={setPhoneNumber} style={styles.input} placeholder="Phone number" keyboardType="phone-pad" placeholderTextColor={Colors.textTertiary} />
          <TextInput value={otpSessionId} onChangeText={setOtpSessionId} style={styles.input} placeholder="OTP Session ID (if required)" placeholderTextColor={Colors.textTertiary} />
          <TextInput value={otp} onChangeText={setOtp} style={styles.input} placeholder="OTP" keyboardType="number-pad" placeholderTextColor={Colors.textTertiary} secureTextEntry />
          <Pressable style={styles.button} onPress={() => mutation.mutate()}>
            <Text style={styles.buttonText}>Verify</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.primary },
  content: { flex: 1, justifyContent: "center", padding: Spacing.lg },
  card: { backgroundColor: Colors.white, borderRadius: 16, padding: Spacing.xl, gap: Spacing.sm },
  title: { color: Colors.text, fontWeight: "700", fontSize: 24 },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surfaceDark,
    color: Colors.text,
  },
  button: { backgroundColor: Colors.primary, borderRadius: Radius.lg, paddingVertical: Spacing.md, alignItems: "center" },
  buttonText: { color: Colors.white, fontWeight: "700" },
});
