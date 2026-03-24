import { SafeAreaView } from "react-native-safe-area-context";
import { SowingReadScreen } from "../../../components/modules/SowingReadScreen";
import { AdminTheme } from "../../../components/admin/theme";

export default function AdminSowing() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: AdminTheme.colors.background }} edges={["left", "right"]}>
      <SowingReadScreen title="Sowing" />
    </SafeAreaView>
  );
}
