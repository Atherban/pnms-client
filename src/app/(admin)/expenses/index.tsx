import { SafeAreaView } from "react-native-safe-area-context";
import { ExpensesModuleScreen } from "../../../components/modules/ExpensesModuleScreen";
import { AdminTheme } from "../../../components/admin/theme";

export default function AdminExpenses() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: AdminTheme.colors.background }} edges={["left", "right"]}>
      <ExpensesModuleScreen title="Expenses" canWrite={false} />
    </SafeAreaView>
  );
}
