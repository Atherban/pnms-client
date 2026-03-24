import { SafeAreaView } from "react-native-safe-area-context";
import { GerminationReadScreen } from "../../../components/modules/GerminationReadScreen";
import { AdminTheme } from "../../../components/admin/theme";

export default function AdminGermination() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: AdminTheme.colors.background }} edges={["left", "right"]}>
      <GerminationReadScreen title="Germination" />
    </SafeAreaView>
  );
}
