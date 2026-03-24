import { ReactNode } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { useSegments } from "expo-router";
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from "react-native";

import { AdminTheme } from "../admin/theme";

type StitchCardProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  disabled?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  gradientColors?: readonly [string, string, ...string[]];
  borderColor?: string;
};

export default function StitchCard({
  children,
  style,
  onPress,
  disabled,
  contentStyle,
  gradientColors,
  borderColor,
}: StitchCardProps) {
  const segments = useSegments();
  const isStaffRoute = segments[0] === "(staff)";
  const resolvedGradientColors =
    gradientColors ||
    (isStaffRoute
      ? (["#F9FFF9", "#E4F8EA", "#D0F1DA"] as const)
      : (["#FFFFFF", AdminTheme.colors.primarySurface, AdminTheme.colors.primarySurfaceStrong] as const));

  const cardBody = (
    <LinearGradient
      colors={resolvedGradientColors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.card,
        isStaffRoute && styles.staffCard,
        borderColor ? { borderColor } : null,
        style,
      ]}
    >
      <View style={styles.innerGlow} />
      <View style={[styles.content, contentStyle]}>{children}</View>
    </LinearGradient>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled}
        style={({ pressed }) => [pressed && styles.pressed]}
      >
        {cardBody}
      </Pressable>
    );
  }

  return cardBody;
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: "rgba(22, 163, 74, 0.18)",
    borderRadius: AdminTheme.radius.lg,
    overflow: "hidden",
    ...AdminTheme.shadow.card,
  },
  staffCard: {
    borderColor: "rgba(22, 163, 74, 0.22)",
  },
  innerGlow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.24)",
  },
  content: {
    padding: AdminTheme.spacing.md,
    gap: AdminTheme.spacing.md,
  },
  pressed: {
    transform: [{ scale: 0.985 }],
    opacity: 0.96,
  },
});
