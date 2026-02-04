import { Text, View } from "react-native";
import { Colors, Spacing } from "../../theme";

export const ErrorView = ({ message }: { message: string }) => (
  <View style={{ padding: Spacing.md }}>
    <Text style={{ color: Colors.error }}>{message}</Text>
  </View>
);
