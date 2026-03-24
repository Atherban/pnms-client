import { Pressable, StyleSheet, Text } from "react-native";

import { AdminTheme } from "./theme";

type Props = {
  label: string;
  active?: boolean;
  onPress?: () => void;
};

export default function AdminPill({ label, active, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        active ? styles.active : styles.inactive,
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.text, active ? styles.textActive : styles.textInactive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: AdminTheme.radius.full,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  active: {
    backgroundColor: AdminTheme.colors.primary,
    borderColor: AdminTheme.colors.primary,
  },
  inactive: {
    backgroundColor: `${AdminTheme.colors.primary}10`,
    borderColor: `${AdminTheme.colors.primary}30`,
  },
  text: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  textActive: {
    color: AdminTheme.colors.surface,
  },
  textInactive: {
    color: AdminTheme.colors.primary,
  },
  pressed: {
    opacity: 0.85,
  },
});
