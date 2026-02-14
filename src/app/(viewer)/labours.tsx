import { SafeAreaView } from "react-native-safe-area-context";
import { LaboursModuleScreen } from "../../components/modules/LaboursModuleScreen";
import { Colors } from "../../theme";

export default function ViewerLabours() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
      <LaboursModuleScreen title="Labours" canWrite={false} />
    </SafeAreaView>
  );
}
