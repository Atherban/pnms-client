import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors, Spacing } from "../theme";

export default function Unauthorized() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={["left", "right", "top"]}>
      <LinearGradient
        colors={[Colors.primary, Colors.primaryLight || Colors.primary]}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <MaterialIcons name="lock" size={26} color={Colors.white} />
        <Text style={styles.headerTitle}>Access Restricted</Text>
      </LinearGradient>

      <View style={styles.card}>
        <View style={styles.iconWrap}>
          <MaterialIcons name="gpp-bad" size={44} color={Colors.error} />
        </View>
        <Text style={styles.title}>You do not have permission</Text>
        <Text style={styles.message}>
          This section is not available for your current role. Please login with
          an authorized account.
        </Text>

        <Pressable
          onPress={() => router.replace("/(auth)/login")}
          style={({ pressed }) => [
            styles.actionButton,
            pressed && styles.actionButtonPressed,
          ]}
        >
          <LinearGradient
            colors={[Colors.primary, Colors.primaryLight || Colors.primary]}
            style={styles.actionButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <MaterialIcons name="login" size={18} color={Colors.white} />
            <Text style={styles.actionButtonText}>Go to Login</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = {
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  header: {
    borderRadius: 18,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  headerTitle: {
    color: Colors.white,
    fontSize: 20,
    fontWeight: "700" as const,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    padding: Spacing.lg,
    alignItems: "center" as const,
  },
  iconWrap: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: `${Colors.error}12`,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginBottom: Spacing.md,
  },
  title: {
    color: Colors.text,
    fontSize: 20,
    fontWeight: "700" as const,
    textAlign: "center" as const,
    marginBottom: Spacing.xs,
  },
  message: {
    color: Colors.textSecondary,
    textAlign: "center" as const,
    lineHeight: 20,
    marginBottom: Spacing.lg,
  },
  actionButton: {
    width: "100%" as const,
    borderRadius: 12,
    overflow: "hidden" as const,
  },
  actionButtonPressed: {
    opacity: 0.9,
  },
  actionButtonGradient: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 8,
    height: 46,
  },
  actionButtonText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: "700" as const,
  },
} as const;
