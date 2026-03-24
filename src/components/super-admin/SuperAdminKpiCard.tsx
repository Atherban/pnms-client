import { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import StitchCard from "../common/StitchCard";
import { SuperAdminTheme } from "./theme";

type Props = {
  label: string;
  value: string | number;
  icon?: ReactNode;
  tone?: "primary" | "success" | "warning" | "neutral";
  helper?: string;
};

export default function SuperAdminKpiCard({
  label,
  value,
  icon,
  tone = "primary",
  helper,
}: Props) {
  const toneStyles = stylesByTone[tone];
  return (
    <StitchCard
      style={[styles.card, toneStyles.container]}
      contentStyle={styles.content}
      gradientColors={["#FFFFFF", "#F8FBF9", "#F1F7F3"]}
      borderColor={SuperAdminTheme.colors.borderSoft}
    >
      <View style={styles.header}>
        {icon ? <View style={[styles.iconWrap, toneStyles.iconWrap]}>{icon}</View> : null}
        <View style={styles.labelWrap}>
          <Text style={[styles.label, toneStyles.label]} numberOfLines={2}>
            {label}
          </Text>
        </View>
      </View>
      <Text style={styles.value} numberOfLines={1}>
        {value}
      </Text>
      {helper ? (
        <Text style={[styles.helper, toneStyles.helper]} numberOfLines={1}>
          {helper}
        </Text>
      ) : null}
    </StitchCard>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: 110,
  },
  content: {
    padding: SuperAdminTheme.spacing.md,
    justifyContent: "space-between",
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 8,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  labelWrap: {
    flex: 1,
    paddingTop: 2,
  },
  label: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    color: SuperAdminTheme.colors.textMuted,
  },
  value: {
    fontSize: 22,
    fontWeight: "800",
    color: SuperAdminTheme.colors.text,
  },
  helper: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: "600",
    color: SuperAdminTheme.colors.textSoft,
  },
});

const stylesByTone = {
  primary: StyleSheet.create({
    container: {},
    iconWrap: { backgroundColor: "rgba(15, 189, 73, 0.12)" },
    label: { color: SuperAdminTheme.colors.textMuted },
    helper: { color: SuperAdminTheme.colors.primary },
  }),
  success: StyleSheet.create({
    container: {},
    iconWrap: { backgroundColor: "rgba(22, 163, 74, 0.12)" },
    label: { color: SuperAdminTheme.colors.textMuted },
    helper: { color: SuperAdminTheme.colors.success },
  }),
  warning: StyleSheet.create({
    container: {},
    iconWrap: { backgroundColor: "rgba(245, 158, 11, 0.12)" },
    label: { color: SuperAdminTheme.colors.textMuted },
    helper: { color: SuperAdminTheme.colors.warning },
  }),
  neutral: StyleSheet.create({
    container: {},
    iconWrap: { backgroundColor: "rgba(148, 163, 184, 0.2)" },
    label: { color: SuperAdminTheme.colors.textMuted },
    helper: { color: SuperAdminTheme.colors.textSoft },
  }),
} as const;
