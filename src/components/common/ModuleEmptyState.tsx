import { ReactNode } from "react";
import { StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";

import { AdminTheme } from "../admin/theme";
import StitchCard from "./StitchCard";

type ModuleEmptyStateProps = {
  icon?: ReactNode;
  title: string;
  message: string;
  action?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export default function ModuleEmptyState({
  icon,
  title,
  message,
  action,
  style,
}: ModuleEmptyStateProps) {
  return (
    <StitchCard style={[styles.card, style]}>
      {icon ? <View style={styles.iconWrap}>{icon}</View> : null}
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {action ? <View style={styles.actionWrap}>{action}</View> : null}
    </StitchCard>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: AdminTheme.spacing.xl,
    paddingHorizontal: AdminTheme.spacing.lg,
    gap: AdminTheme.spacing.sm,
  },
  iconWrap: {
    marginBottom: 2,
    alignItems: "center", 
    justifyContent:"center"
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: AdminTheme.colors.text,
    textAlign: "center",
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    color: AdminTheme.colors.textMuted,
    textAlign: "center",
  },
  actionWrap: {
    marginTop: AdminTheme.spacing.sm,
  },
});
