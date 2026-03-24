import { Pressable, StyleSheet, Text } from "react-native";

import { CustomerColors, Radius, Spacing } from "../../theme";

type CustomerFilterChipProps = {
  label: string;
  active?: boolean;
  onPress?: () => void;
};

export function CustomerFilterChip({
  label,
  active = false,
  onPress,
}: CustomerFilterChipProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        active && styles.active,
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.label, active && styles.labelActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: CustomerColors.borderStrong,
    backgroundColor: CustomerColors.white,
  },
  active: {
    backgroundColor: CustomerColors.primary,
    borderColor: CustomerColors.primary,
  },
  pressed: {
    opacity: 0.92,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: CustomerColors.textMuted,
  },
  labelActive: {
    color: CustomerColors.white,
  },
});
