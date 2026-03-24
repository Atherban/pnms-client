import { SafeAreaView } from "react-native-safe-area-context";
import { LaboursModuleScreen } from "../../../components/modules/LaboursModuleScreen";
import { AdminTheme } from "../../../components/admin/theme";

export default function AdminLabours() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: AdminTheme.colors.background }} edges={["left", "right"]}>
      <LaboursModuleScreen title="Labours" canWrite={false} />
    </SafeAreaView>
  );
}
