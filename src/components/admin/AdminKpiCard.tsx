import { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { AdminTheme } from "./theme";

type Tone = "primary" | "success" | "warning" | "danger" | "info" | "neutral";

type Props = {
  label: string;
  value: string;
  helper?: string;
  tone?: Tone;
  icon?: ReactNode;
};

const toneColors: Record<Tone, string> = {
  primary: AdminTheme.colors.primary,
  success: AdminTheme.colors.success,
  warning: AdminTheme.colors.warning,
  danger: AdminTheme.colors.danger,
  info: AdminTheme.colors.info,
  neutral: AdminTheme.colors.textMuted,
};

export default function AdminKpiCard({ label, value, helper, tone = "primary", icon }: Props) {
  const accent = toneColors[tone];
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.label}>{label}</Text>
        {icon ? (
          <View style={[styles.iconWrap, { backgroundColor: `${accent}1A` }]}>{icon}</View>
        ) : null}
      </View>
      <Text style={[styles.value, { color: accent }]}>{value}</Text>
      {helper ? <Text style={[styles.helper, { color: accent }]}>{helper}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex:1,
    backgroundColor: AdminTheme.colors.surface,
    borderRadius: AdminTheme.radius.lg,
    padding: AdminTheme.spacing.md,
    borderWidth: 1,
    borderColor: AdminTheme.colors.borderSoft,
    ...AdminTheme.shadow.card,
    gap: 6,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: AdminTheme.spacing.sm,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: AdminTheme.colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  value: {
    fontSize: 22,
    fontWeight: "800",
  },
  helper: {
    fontSize: 11,
    fontWeight: "700",
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
});
