import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { SowingReadScreen } from "../../../components/modules/SowingReadScreen";
import { Colors } from "../../../theme";

export default function StaffSowingIndex() {
  const router = useRouter();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
      <SowingReadScreen
        title="Sowing"
        canCreate
        onCreatePress={() => router.push("/(staff)/sowing/create")}
      />
    </SafeAreaView>
  );
}
