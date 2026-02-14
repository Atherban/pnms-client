import { useLocalSearchParams } from "expo-router";
import { InventoryDetailScreen } from "../../../components/modules/InventoryDetailScreen";

export default function ViewerInventoryDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <InventoryDetailScreen id={id} title="Inventory Details" />;
}
