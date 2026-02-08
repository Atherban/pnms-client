import { useRouter } from "expo-router";
import { Text, View } from "react-native";
import { Button } from "../components";
import { Spacing } from "../theme";

export default function Unauthorized() {
  const router = useRouter();

  return (
    <View style={{ padding: Spacing.lg }}>
      <Text>You do not have permission to access this page.</Text>
      <Button title="Go Back" onPress={() => router.replace("/(auth)/login")} />
    </View>
  );
}
