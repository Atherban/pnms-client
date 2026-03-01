import { useMutation } from "@tanstack/react-query";
import { Link } from "expo-router";
import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AuthService } from "../../services/auth.service";
import { Colors, Radius, Spacing } from "../../theme";

export default function ForgotPasswordScreen() {
  const [identifier, setIdentifier] = useState("");

  const mutation = useMutation({
    mutationFn: async () => {
      const trimmed = identifier.trim();
      if (!trimmed) throw new Error("Phone number or email is required");
      const isPhone = /^\+?[\d\s-]{10,}$/.test(trimmed);
      return AuthService.forgotPassword({
        phoneNumber: isPhone ? trimmed.replace(/[^\d]/g, "") : undefined,
        email: isPhone ? undefined : trimmed,
      });
    },
    onSuccess: () => {
      Alert.alert("Request sent", "If account exists, reset instructions were sent.");
      setIdentifier("");
    },
    onError: (err: any) => Alert.alert("Failed", err?.message || "Please try again"),
  });

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={styles.content} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.card}>
          <Text style={styles.title}>Forgot Password</Text>
          <Text style={styles.subtitle}>Enter registered phone number or email</Text>
          <TextInput
            value={identifier}
            onChangeText={setIdentifier}
            style={styles.input}
            placeholder="Phone number or email"
            placeholderTextColor={Colors.textTertiary}
            autoCapitalize="none"
          />
          <Pressable style={styles.button} onPress={() => mutation.mutate()}>
            <Text style={styles.buttonText}>Send Reset Link / OTP</Text>
          </Pressable>
          <Link href="/(auth)/reset-password" style={styles.link}>Already have token/OTP? Reset now</Link>
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
  title: { color: Colors.text, fontWeight: "700", fontSize: 24 },
  subtitle: { color: Colors.textSecondary, marginBottom: Spacing.sm },
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
