import { SafeAreaView } from "react-native-safe-area-context";
import CustomerSeedBatchManagementScreen from "@/src/components/modules/CustomerSeedBatchManagementScreen";

export default function AdminSeedBatchScreen() {
  return (
    <SafeAreaView style={{ flex: 1 }} edges={["left", "right"]}>
      <CustomerSeedBatchManagementScreen
        title="Seed Batch Management"
        roleLabel="Nursery Admin"
        createPath="/(admin)/seed-batches/create"
      />
    </SafeAreaView>
  );
}
