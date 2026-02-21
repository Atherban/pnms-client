import { SafeAreaView } from "react-native-safe-area-context";
import { CustomersModuleScreen } from "../../components/modules/CustomersModuleScreen";
import { Colors } from "../../theme";

export default function ViewerCustomers() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }} edges={["left", "right"]}>
      <CustomersModuleScreen title="Customers" canWrite={false} />
    </SafeAreaView>
  );
}
