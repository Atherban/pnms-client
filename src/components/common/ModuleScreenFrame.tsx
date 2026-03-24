import { ReactNode } from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AdminTheme } from "../admin/theme";
import StitchHeader from "./StitchHeader";

type ModuleScreenFrameProps = {
  title: string;
  subtitle?: string;
  onBackPress?: () => void;
  actions?: ReactNode;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
};

export default function ModuleScreenFrame({
  title,
  subtitle,
  onBackPress,
  actions,
  children,
  style,
  contentStyle,
}: ModuleScreenFrameProps) {
  return (
    <SafeAreaView style={[styles.container, style]} edges={["left", "right"]}>
      <StitchHeader
        title={title}
        subtitle={subtitle}
        variant="gradient"
        showBackButton={Boolean(onBackPress)}
        onBackPress={onBackPress}
        actions={actions}
      />
      <View style={[styles.content, contentStyle]}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AdminTheme.colors.background,
  },
  content: {
    flex: 1,
  },
});
