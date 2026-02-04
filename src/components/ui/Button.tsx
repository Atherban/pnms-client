import { Pressable, Text } from "react-native";
import { Colors, Radius, Spacing } from "../../theme";

interface Props {
  title: string;
  onPress: () => void;
  disabled?: boolean;
}

export const Button = ({ title, onPress, disabled }: Props) => (
  <Pressable
    onPress={onPress}
    disabled={disabled}
    style={({ pressed }) => ({
      backgroundColor: disabled
        ? Colors.border
        : pressed
          ? Colors.primary + "CC"
          : Colors.primary,
      padding: Spacing.md,
      borderRadius: Radius.md,
      alignItems: "center",
      zIndex: 10, // ensure above overlays
    })}
  >
    <Text style={{ color: "#FFF", fontWeight: "600" }}>{title}</Text>
  </Pressable>
);
