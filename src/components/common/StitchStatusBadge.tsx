import { StyleSheet, Text, View } from "react-native";

import { AdminTheme } from "../admin/theme";

type Tone = "neutral" | "success" | "warning" | "danger" | "info" | "inactive";

type StitchStatusBadgeProps = {
  label: string;
  tone?: Tone;
};

const toneMap: Record<Tone, { bg: string; text: string; border: string }> = {
  neutral: {
    bg: AdminTheme.colors.primarySoft,
    text: AdminTheme.colors.primaryDeep,
    border: "rgba(22,163,74,0.18)",
  },
  success: {
    bg: "#DCFCE7",
    text: AdminTheme.colors.primaryDeep,
    border: "rgba(22,163,74,0.24)",
  },
  warning: {
    bg: "#FEF3C7",
    text: "#B45309",
    border: "rgba(245,158,11,0.24)",
  },
  danger: {
    bg: "#FEE2E2",
    text: "#B91C1C",
    border: "rgba(239,68,68,0.24)",
  },
  info: {
    bg: "#DBF4FF",
    text: "#0369A1",
    border: "rgba(14,165,233,0.24)",
  },
  inactive: {
    bg: "#FEE2E2",
    text: "#B91C1C",
    border: "rgba(239,68,68,0.24)",
  },
};

export default function StitchStatusBadge({ label, tone = "neutral" }: StitchStatusBadgeProps) {
  const colors = toneMap[tone];
  return (
    <View style={[styles.badge, { backgroundColor: colors.bg, borderColor: colors.border }]}>
      <Text style={[styles.text, { color: colors.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    height: 24,
    width:"auto",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  text: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
});
