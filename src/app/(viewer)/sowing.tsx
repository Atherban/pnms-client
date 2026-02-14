import { SafeAreaView } from "react-native-safe-area-context";
import { SowingReadScreen } from "../../components/modules/SowingReadScreen";
import { Colors } from "../../theme";

export default function ViewerSowing() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
      <SowingReadScreen title="Sowing" />
    </SafeAreaView>
  );
}
