import { SafeAreaView } from "react-native-safe-area-context";
import { PlantTypesViewScreen } from "../../../components/modules/PlantTypesViewScreen";
import { Colors } from "../../../theme";

export default function StaffPlants() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
      <PlantTypesViewScreen title="Plant Types" />
    </SafeAreaView>
  );
}
