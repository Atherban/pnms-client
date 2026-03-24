import { ReactNode } from "react";
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";

import { CustomerColors, Radius, Spacing } from "../../theme";

type CustomerActionButtonProps = {
  label?: string;
  onPress?: () => void;
  icon?: ReactNode;
  variant?: "primary" | "secondary";
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
};

export function CustomerActionButton({
  label,
  onPress,
  icon,
  variant = "primary",
  style,
  disabled = false,
}: CustomerActionButtonProps) {
  const isPrimary = variant === "primary";

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        isPrimary ? styles.primary : styles.secondary,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}
    >
      {icon ? <View style={styles.iconWrap}>{icon}</View> : null}
      {label ? <Text
        style={[
          styles.label,
          isPrimary ? styles.primaryLabel : styles.secondaryLabel,
          disabled && styles.disabledLabel,
        ]}
      >
        {label}
      </Text>: null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  primary: {
    backgroundColor: CustomerColors.primary,
    borderWidth: 1,
    borderColor: CustomerColors.primary,
  },
  secondary: {
    backgroundColor: CustomerColors.white,
    borderWidth: 1,
    borderColor: CustomerColors.borderStrong,
  },
  pressed: {
    opacity: 0.92,
  },
  iconWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 15,
    fontWeight: "700",
  },
  primaryLabel: {
    color: CustomerColors.white,
  },
  secondaryLabel: {
    color: CustomerColors.text,
  },
  disabled: {
    opacity: 0.6,
  },
  disabledLabel: {
    color: CustomerColors.textMuted,
  },
});
