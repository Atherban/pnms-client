import { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { moduleSectionTitle } from "./moduleStyles";

type ModuleSectionProps = {
  title: string;
  subtitle?: string;
  children?: ReactNode;
  style?: object;
};

export default function ModuleSection({ title, subtitle, children, style }: ModuleSectionProps) {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
  },
  header: {
    marginBottom: 8,
  },
  title: {
    ...moduleSectionTitle,
  },
  subtitle: {
    marginTop: 4,
    color: "rgba(0,0,0,0.6)",
    fontSize: 12,
  },
});
