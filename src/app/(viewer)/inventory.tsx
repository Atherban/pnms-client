import { InventoryListScreen } from "../../components/modules/InventoryListScreen";

export default function ViewerInventory() {
  return (
    <InventoryListScreen
      title="Inventory"
      routeGroup="viewer"
      canCreate={false}
    />
  );
}
