import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { GerminationReadScreen } from "../../../components/modules/GerminationReadScreen";
import { Colors } from "../../../theme";

export default function StaffGerminationIndex() {
  const router = useRouter();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
      <GerminationReadScreen
        title="Germination"
        canCreate
        onCreatePress={() => router.push("/(staff)/germination/create")}
      />
    </SafeAreaView>
  );
}
