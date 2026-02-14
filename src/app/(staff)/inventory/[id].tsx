import { useLocalSearchParams } from "expo-router";
import { InventoryDetailScreen } from "../../../components/modules/InventoryDetailScreen";

export default function StaffInventoryDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <InventoryDetailScreen id={id} title="Inventory Details" />;
}
