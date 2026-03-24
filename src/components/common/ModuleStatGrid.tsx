import { MaterialIcons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import { AdminTheme } from "../admin/theme";

type Tone = "primary" | "success" | "warning" | "danger" | "info" | "neutral";

export type ModuleStatItem = {
  label: string;
  value: string | number;
  icon: keyof typeof MaterialIcons.glyphMap;
  tone?: Tone;
  helper?: string;
};

const toneConfig: Record<
  Tone,
  { cardBg: string; borderColor: string; iconBg: string; iconColor: string; accent: string }
> = {
  primary: {
    cardBg: "#EFFCF3",
    borderColor: "#CDEED7",
    iconBg: "rgba(22, 163, 74, 0.12)",
    iconColor: AdminTheme.colors.primary,
    accent: "#DCFCE7",
  },
  success: {
    cardBg: "#EFFCF3",
    borderColor: "#CDEED7",
    iconBg: "rgba(22, 163, 74, 0.12)",
    iconColor: AdminTheme.colors.success,
    accent: "#DCFCE7",
  },
  warning: {
    cardBg: "#FFF8E8",
    borderColor: "#FCE2A7",
    iconBg: "rgba(245, 158, 11, 0.14)",
    iconColor: AdminTheme.colors.warning,
    accent: "#FEF3C7",
  },
  danger: {
    cardBg: "#FFF1F1",
    borderColor: "#F7CFCF",
    iconBg: "rgba(239, 68, 68, 0.12)",
    iconColor: AdminTheme.colors.danger,
    accent: "#FEE2E2",
  },
  info: {
    cardBg: "#EEF8FF",
    borderColor: "#CDEBFA",
    iconBg: "rgba(14, 165, 233, 0.12)",
    iconColor: AdminTheme.colors.info,
    accent: "#E0F2FE",
  },
  neutral: {
    cardBg: "#F7F7F7",
    borderColor: "#E5E7EB",
    iconBg: "rgba(107, 114, 128, 0.12)",
    iconColor: AdminTheme.colors.textMuted,
    accent: "#E5E7EB",
  },
};

export default function ModuleStatGrid({ items }: { items: ModuleStatItem[] }) {
  return (
    <View style={styles.grid}>
      {items.map((item) => {
        const tone = toneConfig[item.tone || "primary"];
        return (
          <View
            key={item.label}
            style={[
              styles.card,
              { backgroundColor: tone.cardBg, borderColor: tone.borderColor },
            ]}
          >
            <View style={styles.header}>
              <View style={[styles.iconWrap, { backgroundColor: tone.iconBg }]}>
                <MaterialIcons name={item.icon} size={18} color={tone.iconColor} />
              </View>
              <View style={[styles.accentPill, { backgroundColor: tone.accent }]} />
            </View>
            <Text style={styles.value} numberOfLines={1}>
              {item.value}
            </Text>
            <Text style={styles.label} numberOfLines={1}>
              {item.label}
            </Text>
            {item.helper ? (
              <Text style={styles.helper} numberOfLines={1}>
                {item.helper}
              </Text>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: AdminTheme.spacing.sm,
  },
  card: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: "47%",
    minWidth: 148,
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
    ...AdminTheme.shadow.card,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  accentPill: {
    width: 28,
    height: 8,
    borderRadius: 999,
  },
  value: {
    fontSize: 18,
    fontWeight: "800",
    color: AdminTheme.colors.text,
  },
  label: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: "700",
    color: AdminTheme.colors.textMuted,
  },
  helper: {
    marginTop: 4,
    fontSize: 11,
    color: AdminTheme.colors.textSoft,
  },
});
