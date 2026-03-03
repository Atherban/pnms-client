// components/admin/KpiCard.tsx
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, Text, View } from "react-native";
import { Colors, Spacing } from "../../theme";

interface KpiCardProps {
  title: string;
  value: string;
  accent?: "positive" | "negative";
  icon?: string;
  color?: string;
  gradient?: readonly [string, string, ...string[]];
  onPress?: () => void;
}

export default function KpiCard({
  title,
  value,
  accent,
  icon = "📊",
  color = Colors.primary,
  gradient,
  onPress,
}: KpiCardProps) {
  const gradientColors: readonly [string, string, ...string[]] = gradient || [
    color + "40",
    color + "20",
    "transparent",
  ];

  return (
    <Pressable style={styles.container} onPress={onPress} disabled={!onPress}>
      {/* Gradient Background */}
      <LinearGradient
        colors={gradientColors}
        style={styles.gradientBackground}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Card Content */}
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View
            style={[styles.iconContainer, { backgroundColor: color + "20" }]}
          >
            <Text style={styles.icon}>{icon}</Text>
          </View>
          <Text style={styles.title}>{title}</Text>
        </View>

        {/* Value */}
        <Text
          style={[
            styles.value,
            accent === "positive" && styles.positiveValue,
            accent === "negative" && styles.negativeValue,
            { color },
          ]}
        >
          {value}
        </Text>

        {/* Trend Indicator (optional) */}
        {accent && (
          <View
            style={[
              styles.trendBadge,
              accent === "positive" && styles.trendBadgePositive,
              accent === "negative" && styles.trendBadgeNegative,
            ]}
          >
            <Text
              style={[
                styles.trendText,
                accent === "positive" && styles.trendTextPositive,
                accent === "negative" && styles.trendTextNegative,
              ]}
            >
              {accent === "positive" ? "↑ Growing" : "↓ Declining"}
            </Text>
          </View>
        )}

        {/* Decorative Elements */}
        <View style={styles.decorativeDot} />
        <View
          style={[styles.decorativeLine, { backgroundColor: color + "20" }]}
        />
      </View>
    </Pressable>
  );
}

const styles = {
  container: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: Spacing.lg,
    position: "relative" as const,
    overflow: "hidden" as const,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    height: 160, // Fixed height for consistency
  },
  gradientBackground: {
    position: "absolute" as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.4,
  },
  content: {
    position: "relative" as const,
    zIndex: 1,
  },
  header: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  icon: {
    fontSize: 20,
  },
  title: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.text,
    flex: 1,
  },
  value: {
    fontSize: 26,
    fontWeight: "800" as const,
    color: Colors.text,
    marginBottom: Spacing.xs,
    letterSpacing: -0.5,
  },
  positiveValue: {
    color: Colors.success,
  },
  negativeValue: {
    color: Colors.error,
  },
  trendBadge: {
    alignSelf: "flex-start" as const,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: 12,
    marginTop: Spacing.xs,
  },
  trendBadgePositive: {
    backgroundColor: Colors.success + "15",
  },
  trendBadgeNegative: {
    backgroundColor: Colors.error + "15",
  },
  trendText: {
    fontSize: 11,
    fontWeight: "700" as const,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
  },
  trendTextPositive: {
    color: Colors.success,
  },
  trendTextNegative: {
    color: Colors.error,
  },
  decorativeDot: {
    position: "absolute" as const,
    top: -8,
    right: -8,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.white,
    opacity: 0.2,
  },
  decorativeLine: {
    position: "absolute" as const,
    bottom: 0,
    left: Spacing.lg,
    right: Spacing.lg,
    height: 2,
    borderRadius: 1,
  },
};
