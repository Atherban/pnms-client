import { StyleSheet, Text, View } from "react-native";

import { AdminTheme } from "./theme";

type Tone = "success" | "warning" | "danger" | "info" | "neutral";

type Props = {
  label: string;
  tone?: Tone;
};

const toneStyles = {
  success: {
    background: `${AdminTheme.colors.success}1A`,
    text: AdminTheme.colors.success,
  },
  warning: {
    background: `${AdminTheme.colors.warning}1A`,
    text: AdminTheme.colors.warning,
  },
  danger: {
    background: `${AdminTheme.colors.danger}1A`,
    text: AdminTheme.colors.danger,
  },
  info: {
    background: `${AdminTheme.colors.info}1A`,
    text: AdminTheme.colors.info,
  },
  neutral: {
    background: AdminTheme.colors.surfaceMuted,
    text: AdminTheme.colors.textMuted,
  },
} as const;

export default function AdminStatusBadge({ label, tone = "neutral" }: Props) {
  const style = toneStyles[tone];
  return (
    <View style={[styles.badge, { backgroundColor: style.background }]}>
      <Text style={[styles.text, { color: style.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: AdminTheme.radius.full,
    alignSelf: "flex-start",
  },
  text: {
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});
