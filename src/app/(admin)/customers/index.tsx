import { SafeAreaView } from "react-native-safe-area-context";
import { CustomersModuleScreen } from "../../../components/modules/CustomersModuleScreen";
import { Colors } from "../../../theme";

export default function AdminCustomers() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
      <CustomersModuleScreen title="Customers" canWrite={false} />
    </SafeAreaView>
  );
}
