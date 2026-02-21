import { SafeAreaView } from "react-native-safe-area-context";
import { LaboursModuleScreen } from "../../../components/modules/LaboursModuleScreen";
import { Colors } from "../../../theme";

export default function StaffLabours() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }} edges={["left", "right"]}>
      <LaboursModuleScreen title="Labours" canWrite={true} />
    </SafeAreaView>
  );
}
