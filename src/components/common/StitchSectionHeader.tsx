import { ReactNode } from "react";
import { StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle } from "react-native";

import { AdminTheme } from "../admin/theme";

type StitchSectionHeaderProps = {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  trailing?: ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
  titleStyle?: StyleProp<TextStyle>;
  subtitleStyle?: StyleProp<TextStyle>;
};

export default function StitchSectionHeader({
  title,
  subtitle,
  action,
  trailing,
  containerStyle,
  titleStyle,
  subtitleStyle,
}: StitchSectionHeaderProps) {
  const accessory = trailing || action;
  return (
    <View style={[styles.row, containerStyle]}>
      <View style={styles.textWrap}>
        <Text style={[styles.title, titleStyle]}>{title}</Text>
        {subtitle ? <Text style={[styles.subtitle, subtitleStyle]}>{subtitle}</Text> : null}
      </View>
      {accessory ? <View>{accessory}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: AdminTheme.spacing.md,
    marginTop: AdminTheme.spacing.lg,
    marginBottom: AdminTheme.spacing.sm,
  },
  textWrap: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
    color: AdminTheme.colors.primaryDeep,
  },
  subtitle: {
    marginTop: 2,
    fontSize: 12,
    color: "#4B6A57",
  },
});
