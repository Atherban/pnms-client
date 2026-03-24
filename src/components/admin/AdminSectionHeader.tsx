import { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { AdminTheme } from "./theme";

type Props = {
  title: string;
  subtitle?: string;
  action?: ReactNode;
};

export default function AdminSectionHeader({ title, subtitle, action }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.textWrap}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: AdminTheme.spacing.sm,
    marginBottom: AdminTheme.spacing.sm,
  },
  textWrap: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 14,
    fontWeight: "800",
    color: AdminTheme.colors.text,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  subtitle: {
    fontSize: 12,
    color: AdminTheme.colors.textMuted,
  },
  action: {
    flexDirection: "row",
    alignItems: "center",
    gap: AdminTheme.spacing.xs,
  },
});
