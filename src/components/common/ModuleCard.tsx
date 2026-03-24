import { type ReactNode } from "react";
import { StyleSheet, type ViewStyle } from "react-native";

import StitchCard from "./StitchCard";

type ModuleCardProps = {
  children: ReactNode;
  style?: ViewStyle;
  padding?: number;
  contentStyle?: ViewStyle;
};

export default function ModuleCard({
  children,
  style,
  padding,
  contentStyle,
}: ModuleCardProps) {
  return (
    <StitchCard
      style={[styles.card, style]}
      contentStyle={[styles.content, contentStyle, padding ? { padding } : undefined]}
    >
      {children}
    </StitchCard>
  );
}

const styles = StyleSheet.create({
  card: {
  },
  content: {
    flex: 1,
    padding: 16,
  },
});
