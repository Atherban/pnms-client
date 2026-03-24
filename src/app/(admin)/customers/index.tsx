import { SafeAreaView } from "react-native-safe-area-context";
import { CustomersModuleScreen } from "../../../components/modules/CustomersModuleScreen";
import { AdminTheme } from "../../../components/admin/theme";

export default function AdminCustomers() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: AdminTheme.colors.background }} edges={["left", "right"]}>
      <CustomersModuleScreen title="Customers" canWrite={false} />
    </SafeAreaView>
  );
}
