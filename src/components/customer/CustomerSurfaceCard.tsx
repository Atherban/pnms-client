import { ReactNode } from "react";
import { Pressable, StyleProp, StyleSheet, ViewStyle } from "react-native";

import { CustomerCard } from "../common/StitchScreen";
import { CustomerColors, Radius, Spacing } from "../../theme";

type CustomerSurfaceCardProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  disabled?: boolean;
};

export function CustomerSurfaceCard({
  children,
  style,
  onPress,
  disabled,
}: CustomerSurfaceCardProps) {
  return (
    <CustomerCard onPress={onPress} disabled={disabled} style={[styles.card, style]}>
      {children}
    </CustomerCard>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    backgroundColor: CustomerColors.surface,
    borderWidth: 1,
    borderColor: CustomerColors.border,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 2,
  },
});
