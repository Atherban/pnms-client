import { SafeAreaView } from "react-native-safe-area-context";
import CustomerSeedBatchCreateScreen from "@/src/components/modules/CustomerSeedBatchCreateScreen";
import { AdminTheme } from "@/src/components/admin/theme";

export default function AdminCustomerSeedBatchCreatePage() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: AdminTheme.colors.background }} edges={["left", "right"]}>
      <CustomerSeedBatchCreateScreen title="Create Customer Seed Batch" />
    </SafeAreaView>
  );
}
