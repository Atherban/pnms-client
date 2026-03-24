import { ReactNode } from "react";
import { StyleSheet } from "react-native";

import StitchSectionHeader from "../common/StitchSectionHeader";
import { SuperAdminTheme } from "./theme";

type Props = {
  title: string;
  subtitle?: string;
  action?: ReactNode;
};

export default function SuperAdminSectionHeader({ title, subtitle, action }: Props) {
  return (
    <StitchSectionHeader
      title={title}
      subtitle={subtitle}
      action={action}
      containerStyle={styles.container}
      titleStyle={styles.title}
      subtitleStyle={styles.subtitle}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 0,
    marginBottom: 0,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: SuperAdminTheme.colors.text,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 12,
    color: SuperAdminTheme.colors.textMuted,
  },
});
