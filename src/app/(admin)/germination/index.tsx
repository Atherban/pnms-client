import { SafeAreaView } from "react-native-safe-area-context";
import { GerminationReadScreen } from "../../../components/modules/GerminationReadScreen";
import { Colors } from "../../../theme";

export default function AdminGermination() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
      <GerminationReadScreen title="Germination" />
    </SafeAreaView>
  );
}
