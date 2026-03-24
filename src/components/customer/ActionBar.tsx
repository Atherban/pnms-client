import { ReactNode } from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useKeyboardVisible } from "../../hooks/useKeyboardVisible";
import { CUSTOMER_BOTTOM_NAV_HEIGHT } from "../navigation/SharedBottomNav";
import { CustomerColors, Spacing } from "../../theme";

export const ACTION_BAR_HEIGHT = 64;

type ActionBarProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function ActionBar({ children, style }: ActionBarProps) {
  const insets = useSafeAreaInsets();
  const isKeyboardVisible = useKeyboardVisible();

  if (isKeyboardVisible) {
    return null;
  }

  return (
    <View
      style={[
        styles.container,
        {
          paddingBottom: Spacing.sm + CUSTOMER_BOTTOM_NAV_HEIGHT + insets.bottom,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    backgroundColor: CustomerColors.background,
    borderTopWidth: 1,
    borderTopColor: CustomerColors.border,
    minHeight: ACTION_BAR_HEIGHT,
  },
});
