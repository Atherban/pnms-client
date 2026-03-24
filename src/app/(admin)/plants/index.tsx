import { SafeAreaView } from "react-native-safe-area-context";
import { PlantTypesViewScreen } from "../../../components/modules/PlantTypesViewScreen";
import { AdminTheme } from "../../../components/admin/theme";

export default function AdminPlants() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: AdminTheme.colors.background }} edges={["left", "right"]}>
      <PlantTypesViewScreen title="Plant Types" canWrite routeGroup="admin" />
    </SafeAreaView>
  );
}
