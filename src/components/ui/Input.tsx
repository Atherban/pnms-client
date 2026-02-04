import { TextInput } from "react-native";
import { Colors, Radius, Spacing } from "../../theme";

export const Input = (props: any) => (
  <TextInput
    {...props}
    style={{
      borderWidth: 1,
      borderColor: Colors.border,
      borderRadius: Radius.sm,
      padding: Spacing.md,
      marginBottom: Spacing.sm,
    }}
  />
);
