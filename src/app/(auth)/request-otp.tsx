import { useMutation } from "@tanstack/react-query";
import { Link, useRouter } from "expo-router";
import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AuthService } from "../../services/auth.service";
import { Colors, Radius, Spacing } from "../../theme";

export default function RequestOtpScreen() {
  const router = useRouter();
  const [phoneNumber, setPhoneNumber] = useState("");

  const mutation = useMutation({
    mutationFn: () => AuthService.requestOtp(phoneNumber.replace(/[^\d]/g, "")),
    onSuccess: (res) => {
      Alert.alert("OTP sent", res.message || "OTP sent to your phone", [
        {
          text: "Verify",
          onPress: () =>
            router.push({
              pathname: "/(auth)/verify-otp",
              params: { phoneNumber: phoneNumber.replace(/[^\d]/g, ""), otpSessionId: res.otpSessionId || "" },
            } as any),
        },
      ]);
    },
    onError: (err: any) => Alert.alert("Failed", err?.message || "Unable to request OTP"),
  });

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={styles.content} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.card}>
          <Text style={styles.title}>Request OTP</Text>
          <TextInput
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            style={styles.input}
            placeholder="Phone number"
            keyboardType="phone-pad"
            placeholderTextColor={Colors.textTertiary}
          />
          <Pressable style={styles.button} onPress={() => mutation.mutate()}>
            <Text style={styles.buttonText}>Send OTP</Text>
          </Pressable>
          <Link href="/(auth)/verify-otp" style={styles.link}>Go to verify OTP</Link>
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
  link: { color: Colors.primary, marginTop: 6 },
});
