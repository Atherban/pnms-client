import { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

import { AdminTheme } from "./theme";

type Props = {
  title: string;
  subtitle?: string;
  onBackPress?: () => void;
  actions?: ReactNode;
};

export default function AdminHeader({ title, subtitle, onBackPress, actions }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={styles.titleRow}>
          {onBackPress ? (
            <Pressable onPress={onBackPress} style={styles.backButton}>
              <MaterialIcons name="arrow-back" size={20} color={AdminTheme.colors.text} />
            </Pressable>
          ) : null}
          <View style={styles.titleWrap}>
            <Text style={styles.title}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
        </View>
        {actions ? <View style={styles.actions}>{actions}</View> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: AdminTheme.spacing.md,
    paddingTop: AdminTheme.spacing.md,
    paddingBottom: AdminTheme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: AdminTheme.colors.borderSoft,
    backgroundColor: AdminTheme.colors.background,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: AdminTheme.spacing.sm,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: AdminTheme.spacing.sm,
    flex: 1,
  },
  titleWrap: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: AdminTheme.colors.text,
  },
  subtitle: {
    marginTop: 2,
    fontSize: 12,
    color: AdminTheme.colors.textMuted,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: AdminTheme.colors.surface,
    borderWidth: 1,
    borderColor: AdminTheme.colors.border,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: AdminTheme.spacing.xs,
  },
});
