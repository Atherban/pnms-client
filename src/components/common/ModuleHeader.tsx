import { ReactNode } from "react";
import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { AdminTheme } from "../admin/theme";
import { moduleHeaderSubtitle, moduleHeaderTitle } from "./moduleStyles";

type ModuleHeaderProps = {
  title: string;
  subtitle?: string;
  onBackPress?: () => void;
  actions?: ReactNode;
  iconName?: keyof typeof MaterialIcons.glyphMap;
  variant?: "gradient" | "solid";
};

export default function ModuleHeader({
  title,
  subtitle,
  onBackPress,
  actions,
  iconName,
  variant = "gradient",
}: ModuleHeaderProps) {
  const content = (
    <View style={styles.headerContent}>
      <View style={styles.left}>
        {onBackPress ? (
          <Pressable onPress={onBackPress} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={20} color={AdminTheme.colors.surface} />
          </Pressable>
        ) : null}
        {iconName ? (
          <View style={styles.iconWrap}>
            <MaterialIcons name={iconName} size={20} color={AdminTheme.colors.surface} />
          </View>
        ) : null}
        <View style={styles.titleWrap}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
      </View>
      {actions ? <View style={styles.actions}>{actions}</View> : null}
    </View>
  );

  if (variant === "solid") {
    return <View style={[styles.container, styles.solidContainer]}>{content}</View>;
  }

  return (
    <LinearGradient
      colors={[AdminTheme.colors.primary, AdminTheme.colors.primaryDark]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.container}
    >
      {content}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: AdminTheme.spacing.lg,
    paddingTop: AdminTheme.spacing.lg,
    paddingBottom: AdminTheme.spacing.lg,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  solidContainer: {
    backgroundColor: AdminTheme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: AdminTheme.colors.borderSoft,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: AdminTheme.spacing.md,
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    gap: AdminTheme.spacing.sm,
    flex: 1,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  titleWrap: {
    flex: 1,
  },
  title: {
    ...moduleHeaderTitle,
    color: AdminTheme.colors.surface,
  },
  subtitle: {
    ...moduleHeaderSubtitle,
    color: "rgba(255,255,255,0.85)",
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: AdminTheme.spacing.sm,
  },
});
