import { ReactNode } from "react";
import { StyleSheet } from "react-native";

import StitchHeader from "../common/StitchHeader";
import { SuperAdminTheme } from "./theme";

type Props = {
  title: string;
  subtitle?: string;
  onBackPress?: () => void;
  actions?: ReactNode;
};

export default function SuperAdminHeader({
  title,
  subtitle,
  onBackPress,
  actions,
}: Props) {
  return (
    <StitchHeader
      title={title}
      subtitle={subtitle}
      onBackPress={onBackPress}
      showBackButton={Boolean(onBackPress)}
      actions={actions}
      variant="gradient"
      backgroundColor={SuperAdminTheme.colors.background}
      borderBottomColor={SuperAdminTheme.colors.borderSoft}
      titleStyle={styles.title}
      subtitleStyle={styles.subtitle}
      containerStyle={styles.container}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    // paddingHorizontal: SuperAdminTheme.spacing.md,
    paddingBottom: SuperAdminTheme.spacing.md,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: SuperAdminTheme.colors.surface,
  },
  subtitle: {
    marginTop: 2,
    fontSize: 12,
    color: SuperAdminTheme.colors.surfaceMuted,
  },
});
