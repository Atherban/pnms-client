import { SafeAreaView } from "react-native-safe-area-context";
import CustomerSeedBatchManagementScreen from "@/src/components/modules/CustomerSeedBatchManagementScreen";

export default function StaffSeedBatchScreen() {
  return (
    <SafeAreaView style={{ flex: 1 }} edges={["left", "right"]}>
      <CustomerSeedBatchManagementScreen
        title="Customer Seed Batches"
        roleLabel="Staff Operations"
        createPath="/(staff)/seed-batches/create"
      />
    </SafeAreaView>
  );
}
