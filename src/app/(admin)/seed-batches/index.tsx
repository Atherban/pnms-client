import { SafeAreaView } from "react-native-safe-area-context";
import CustomerSeedBatchManagementScreen from "@/src/components/modules/CustomerSeedBatchManagementScreen";
import { AdminTheme } from "@/src/components/admin/theme";

export default function AdminSeedBatchScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: AdminTheme.colors.background }} edges={["left", "right"]}>
      <CustomerSeedBatchManagementScreen
        title="Seed Batch Management"
        roleLabel="Nursery Admin"
        createPath="/(admin)/seed-batches/create"
      />
    </SafeAreaView>
  );
}
