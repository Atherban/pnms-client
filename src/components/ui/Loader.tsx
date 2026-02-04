import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Colors } from "../../theme";

interface LoaderProps {
  size?: "small" | "large" | number;
  color?: string;
  centered?: boolean;
}

export const Loader = ({
  size = "large",
  color = Colors.primary,
  centered = false,
}: LoaderProps) => {
  return (
    <View style={centered ? styles.centered : null}>
      <ActivityIndicator size={size} color={color} />
    </View>
  );
};

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
