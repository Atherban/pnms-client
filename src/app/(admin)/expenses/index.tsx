import { SafeAreaView } from "react-native-safe-area-context";
import { ExpensesModuleScreen } from "../../../components/modules/ExpensesModuleScreen";
import { Colors } from "../../../theme";

export default function AdminExpenses() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
      <ExpensesModuleScreen title="Expenses" canWrite={false} />
    </SafeAreaView>
  );
}
