import { ReactNode } from "react";
import { StyleProp, StyleSheet, Text, TextInput, TextStyle, View, ViewStyle } from "react-native";

import { AdminTheme } from "./theme";

type Props = {
  label?: string;
  icon?: ReactNode;
  value?: string;
  placeholder?: string;
  onChangeText?: (text: string) => void;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
  rightElement?: ReactNode;
  multiline?: boolean;
};

export default function AdminInput({
  label,
  icon,
  value,
  placeholder,
  onChangeText,
  containerStyle,
  inputStyle,
  rightElement,
  multiline,
}: Props) {
  return (
    <View style={containerStyle}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.inputWrap}>
        {icon ? <View style={styles.icon}>{icon}</View> : null}
        <TextInput
          value={value}
          placeholder={placeholder}
          placeholderTextColor={AdminTheme.colors.textSoft}
          onChangeText={onChangeText}
          style={[
            styles.input,
            icon ? styles.inputWithIcon : null,
            multiline ? styles.multiline : null,
            inputStyle,
          ]}
          multiline={multiline}
        />
        {rightElement ? <View style={styles.right}>{rightElement}</View> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    marginBottom: 6,
    fontSize: 12,
    fontWeight: "700",
    color: AdminTheme.colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  inputWrap: {
    position: "relative",
    backgroundColor: AdminTheme.colors.surface,
    borderRadius: AdminTheme.radius.lg,
    borderWidth: 1,
    borderColor: AdminTheme.colors.borderSoft,
    paddingHorizontal: AdminTheme.spacing.md,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: AdminTheme.spacing.sm,
    shadowColor: AdminTheme.colors.text,
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  icon: {
    width: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: AdminTheme.colors.text,
    padding: 0,
  },
  inputWithIcon: {
    paddingLeft: 0,
  },
  right: {
    marginLeft: AdminTheme.spacing.sm,
  },
  multiline: {
    minHeight: 96,
    textAlignVertical: "top",
  },
});
