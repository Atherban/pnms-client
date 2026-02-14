import { SafeAreaView } from "react-native-safe-area-context";
import { CustomersModuleScreen } from "../../../components/modules/CustomersModuleScreen";
import { Colors } from "../../../theme";

export default function StaffCustomers() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
      <CustomersModuleScreen title="Customers" canWrite={true} />
    </SafeAreaView>
  );
}
