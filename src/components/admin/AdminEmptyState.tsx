import { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { AdminTheme } from "./theme";

type Props = {
  title: string;
  message?: string;
  icon?: ReactNode;
};

export default function AdminEmptyState({ title, message, icon }: Props) {
  return (
    <View style={styles.container}>
      {icon ? <View style={styles.icon}>{icon}</View> : null}
      <Text style={styles.title}>{title}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    padding: AdminTheme.spacing.lg,
    gap: AdminTheme.spacing.sm,
  },
  icon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: `${AdminTheme.colors.primary}10`,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 16,
    fontWeight: "800",
    color: AdminTheme.colors.text,
  },
  message: {
    fontSize: 13,
    color: AdminTheme.colors.textMuted,
    textAlign: "center",
  },
});
