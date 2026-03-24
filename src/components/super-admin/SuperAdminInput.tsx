import { StyleProp, StyleSheet, TextStyle, ViewStyle } from "react-native";

import StitchInput from "../common/StitchInput";
import { SuperAdminTheme } from "./theme";

type Props = {
  label?: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  numberOfLines?: number;
  keyboardType?: "default" | "email-address" | "phone-pad" | "numeric";
  style?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
};

export default function SuperAdminInput({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
  numberOfLines,
  keyboardType,
  style,
  inputStyle,
}: Props) {
  return (
    <StitchInput
      label={label}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      multiline={multiline}
      numberOfLines={numberOfLines}
      keyboardType={keyboardType}
      containerStyle={style}
      labelStyle={styles.label}
      inputContainerStyle={styles.input}
      inputStyle={[multiline && styles.inputMultiline, inputStyle]}
    />
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 10,
    fontWeight: "700",
    color: SuperAdminTheme.colors.textSoft,
    textTransform: "uppercase",
    marginBottom: 6,
    letterSpacing: 0.6,
  },
  input: {
    backgroundColor: SuperAdminTheme.colors.surfaceMuted,
    borderRadius: SuperAdminTheme.radius.md,
    borderWidth: 1,
    borderColor: SuperAdminTheme.colors.border,
    paddingVertical: 12,
  },
  inputMultiline: {
    minHeight: 96,
  },
});
