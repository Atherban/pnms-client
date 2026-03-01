import { useMutation } from "@tanstack/react-query";
import { Link, useRouter } from "expo-router";
import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AuthService } from "../../services/auth.service";
import { Colors, Radius, Spacing } from "../../theme";

export default function ResetPasswordScreen() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const mutation = useMutation({
    mutationFn: async () => {
      if (newPassword.length < 6) throw new Error("Password must be at least 6 characters");
      return AuthService.resetPassword({
        token: token.trim() || undefined,
        phoneNumber: phoneNumber.trim() || undefined,
        otp: otp.trim() || undefined,
        newPassword,
      });
    },
    onSuccess: () => {
      Alert.alert("Password reset", "You can now log in with new password.", [
        { text: "Go to login", onPress: () => router.replace("/(auth)/login") },
      ]);
    },
    onError: (err: any) => Alert.alert("Reset failed", err?.message || "Please try again"),
  });

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={styles.content} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.card}>
          <Text style={styles.title}>Reset Password</Text>
          <TextInput value={token} onChangeText={setToken} style={styles.input} placeholder="Reset token (email flow)" placeholderTextColor={Colors.textTertiary} />
          <TextInput value={phoneNumber} onChangeText={setPhoneNumber} style={styles.input} placeholder="Phone number (OTP flow)" placeholderTextColor={Colors.textTertiary} keyboardType="phone-pad" />
          <TextInput value={otp} onChangeText={setOtp} style={styles.input} placeholder="OTP (if using phone)" placeholderTextColor={Colors.textTertiary} keyboardType="number-pad" />
          <TextInput value={newPassword} onChangeText={setNewPassword} style={styles.input} placeholder="New password" placeholderTextColor={Colors.textTertiary} secureTextEntry />

          <Pressable style={styles.button} onPress={() => mutation.mutate()}>
            <Text style={styles.buttonText}>Reset Password</Text>
          </Pressable>
          <Link href="/(auth)/login" style={styles.link}>Back to login</Link>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.primary },
  content: { flex: 1, justifyContent: "center", padding: Spacing.lg },
  card: { backgroundColor: Colors.white, borderRadius: 16, padding: Spacing.xl, gap: Spacing.sm },
  title: { color: Colors.text, fontWeight: "700", fontSize: 24, marginBottom: Spacing.xs },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceDark,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    color: Colors.text,
  },
  button: { backgroundColor: Colors.primary, borderRadius: Radius.lg, paddingVertical: Spacing.md, alignItems: "center" },
  buttonText: { color: Colors.white, fontWeight: "700" },
  link: { color: Colors.primary, marginTop: 6 },
});
