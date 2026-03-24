import { ReactNode } from "react";
import { StyleProp, ViewStyle } from "react-native";

import StitchCard from "../common/StitchCard";
import { SuperAdminTheme } from "./theme";

type Props = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  padding?: number;
};

export default function SuperAdminCard({ children, style, padding }: Props) {
  return (
    <StitchCard
      style={style}
      // contentStyle={{ padding: padding ?? SuperAdminTheme.spacing.md }}
      // gradientColors={["#FFFFFF", "#F7FAF8", "#EEF6F1"]}
      borderColor={SuperAdminTheme.colors.borderSoft}
    >
      {children}
    </StitchCard>
  );
}
