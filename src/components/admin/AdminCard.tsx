import { ReactNode } from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";

import { AdminTheme } from "./theme";

type Props = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  padding?: number;
};

export default function AdminCard({ children, style, padding }: Props) {
  return (
    <View
      style={[
        styles.card,
        { padding: padding ?? AdminTheme.spacing.md },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: AdminTheme.colors.surface,
    borderRadius: AdminTheme.radius.lg,
    borderWidth: 1,
    borderColor: AdminTheme.colors.borderSoft,
    ...AdminTheme.shadow.card,
  },
});
