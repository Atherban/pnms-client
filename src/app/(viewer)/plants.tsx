import { SafeAreaView } from "react-native-safe-area-context";
import { PlantTypesViewScreen } from "../../components/modules/PlantTypesViewScreen";
import { Colors } from "../../theme";

export default function Plants() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }} edges={["left", "right"]}>
      <PlantTypesViewScreen title="Plant Types" routeGroup="viewer" />
    </SafeAreaView>
  );
}
