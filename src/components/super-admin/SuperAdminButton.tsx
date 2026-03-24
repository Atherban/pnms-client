import { ReactNode } from "react";
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from "react-native";

import { SuperAdminTheme } from "./theme";

type Variant = "primary" | "secondary" | "ghost" | "danger";

type Props = {
  label?: string;
  icon?: ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  variant?: Variant;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
};

export default function SuperAdminButton({
  label,
  icon,
  onPress,
  disabled,
  variant = "primary",
  style,
  textStyle,
}: Props) {
  const variantStyle = stylesByVariant[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        variantStyle.container,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}
    >
      {icon ? <View style={styles.icon}>{icon}</View> : null}
      {label ? (
        <Text
          style={[
            styles.label,
            variantStyle.label,
            disabled && styles.disabledLabel,
            textStyle,
          ]}
        >
          {label}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 44,
    paddingHorizontal: SuperAdminTheme.spacing.md,
    borderRadius: SuperAdminTheme.radius.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SuperAdminTheme.spacing.xs,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
  },
  icon: {
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.6,
  },
  disabledLabel: {
    opacity: 0.7,
  },
});

const stylesByVariant = {
  primary: StyleSheet.create({
    container: {
      backgroundColor: SuperAdminTheme.colors.primary,
      borderWidth: 1,
      borderColor: SuperAdminTheme.colors.primary,
    },
    label: {
      color: SuperAdminTheme.colors.surface,
    },
  }),
  secondary: StyleSheet.create({
    container: {
      backgroundColor: SuperAdminTheme.colors.surfaceMuted,
      borderWidth: 1,
      borderColor: SuperAdminTheme.colors.border,
    },
    label: {
      color: SuperAdminTheme.colors.text,
    },
  }),
  ghost: StyleSheet.create({
    container: {
      backgroundColor: "transparent",
      borderWidth: 1,
      borderColor: SuperAdminTheme.colors.border,
    },
    label: {
      color: SuperAdminTheme.colors.textMuted,
    },
  }),
  danger: StyleSheet.create({
    container: {
      backgroundColor: "#FEE2E2",
      borderWidth: 1,
      borderColor: "#FCA5A5",
    },
    label: {
      color: SuperAdminTheme.colors.danger,
    },
  }),
} as const;
