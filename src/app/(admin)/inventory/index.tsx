import { InventoryListScreen } from "../../../components/modules/InventoryListScreen";

export default function AdminInventory() {
  return (
    <InventoryListScreen
      title="Inventory"
      routeGroup="admin"
      canCreate={false}
    />
  );
}
