import { Text, View } from "react-native";
import { Spacing, Typography } from "../../theme";

export const EmptyState = ({ text }: { text: string }) => (
  <View style={{ padding: Spacing.lg, alignItems: "center" }}>
    <Text style={Typography.body as any}>{text}</Text>
  </View>
);
