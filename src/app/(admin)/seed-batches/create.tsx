import { SafeAreaView } from "react-native-safe-area-context";
import CustomerSeedBatchCreateScreen from "@/src/components/modules/CustomerSeedBatchCreateScreen";

export default function AdminCustomerSeedBatchCreatePage() {
  return (
    <SafeAreaView style={{ flex: 1 }} edges={["left", "right"]}>
      <CustomerSeedBatchCreateScreen title="Create Customer Seed Batch" />
    </SafeAreaView>
  );
}
