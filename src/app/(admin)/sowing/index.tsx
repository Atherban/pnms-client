import { SafeAreaView } from "react-native-safe-area-context";
import { SowingReadScreen } from "../../../components/modules/SowingReadScreen";
import { Colors } from "../../../theme";

export default function AdminSowing() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
      <SowingReadScreen title="Sowing" />
    </SafeAreaView>
  );
}
