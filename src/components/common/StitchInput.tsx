import { ReactNode } from "react";
import {
  KeyboardTypeOptions,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextStyle,
  View,
  ViewStyle,
} from "react-native";

import { AdminTheme } from "../admin/theme";

type StitchInputProps = {
  label?: string;
  placeholder?: string;
  value?: string;
  onChangeText?: (text: string) => void;
  icon?: ReactNode;
  right?: ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
  inputContainerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
  labelStyle?: StyleProp<TextStyle>;
  multiline?: boolean;
  numberOfLines?: number;
  keyboardType?: KeyboardTypeOptions;
};

export default function StitchInput({
  label,
  placeholder,
  value,
  onChangeText,
  icon,
  right,
  containerStyle,
  inputContainerStyle,
  inputStyle,
  labelStyle,
  multiline,
  numberOfLines,
  keyboardType,
}: StitchInputProps) {
  return (
    <View style={containerStyle}>
      {label ? <Text style={[styles.label, labelStyle]}>{label}</Text> : null}
      <View style={[styles.inputWrap, inputContainerStyle]}>
        {icon ? <View style={styles.icon}>{icon}</View> : null}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={AdminTheme.colors.textSoft}
          style={[styles.input, multiline && styles.multilineInput, inputStyle]}
          multiline={multiline}
          numberOfLines={numberOfLines}
          keyboardType={keyboardType}
          textAlignVertical={multiline ? "top" : "center"}
        />
        {right ? <View style={styles.right}>{right}</View> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: AdminTheme.colors.textMuted,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: AdminTheme.spacing.sm,
    borderWidth: 1,
    borderColor: "rgba(22, 163, 74, 0.16)",
    borderRadius: AdminTheme.radius.xl,
    backgroundColor: "#F8FFF9",
    paddingHorizontal: AdminTheme.spacing.md,
    paddingVertical: 14,
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
  multilineInput: {
    minHeight: 88,
  },
  right: {
    marginLeft: AdminTheme.spacing.sm,
  },
});
