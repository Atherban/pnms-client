import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthStore } from "../../../stores/auth.store";
import { Colors, Spacing } from "../../../theme";
import { canWriteOperational } from "../../../utils/rbac";

export default function AdminSalesCreateInfo() {
  const router = useRouter();
  const role = useAuthStore((s) => s.user?.role);

  if (canWriteOperational(role)) {
    return (
      <SafeAreaView style={styles.container} edges={["left", "right"]}>
        <View style={styles.card}>
          <Text style={styles.title}>Use Staff Sales Create</Text>
          <Text style={styles.text}>
            Operational sales creation is configured for staff flow.
          </Text>
          <Pressable
            onPress={() => router.replace("/(staff)/sales/create")}
            style={styles.button}
          >
            <Text style={styles.buttonText}>Go to Staff Sales Create</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["left", "right"]}>
      <View style={styles.card}>
        <MaterialIcons name="lock-outline" size={48} color={Colors.warning} />
        <Text style={styles.title}>Sales Creation Is Staff-Only</Text>
        <Text style={styles.text}>
          As admin, you can review sales, profitability, and reports from the
          sales list and profit dashboard.
        </Text>
        <View style={styles.actions}>
          <Pressable
            onPress={() => router.replace("/(admin)/sales")}
            style={styles.button}
          >
            <Text style={styles.buttonText}>Open Sales History</Text>
          </Pressable>
          <Pressable
            onPress={() => router.replace("/(admin)/profit")}
            style={[styles.button, styles.secondaryButton]}
          >
            <Text style={[styles.buttonText, styles.secondaryButtonText]}>
              Open Profit Report
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = {
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    padding: Spacing.lg,
  },
  card: {
    width: "100%" as const,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    alignItems: "center" as const,
  },
  title: {
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
    color: Colors.text,
    fontSize: 20,
    fontWeight: "700" as const,
    textAlign: "center" as const,
  },
  text: {
    color: Colors.textSecondary,
    textAlign: "center" as const,
    lineHeight: 20,
  },
  actions: {
    width: "100%" as const,
    marginTop: Spacing.lg,
    gap: Spacing.sm,
  },
  button: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: Spacing.md,
    alignItems: "center" as const,
  },
  secondaryButton: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  buttonText: {
    color: Colors.white,
    fontWeight: "700" as const,
  },
  secondaryButtonText: {
    color: Colors.text,
  },
};
