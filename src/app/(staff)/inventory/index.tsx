import { InventoryListScreen } from "../../../components/modules/InventoryListScreen";

export default function StaffInventory() {
  return (
    <InventoryListScreen
      title="Inventory"
      routeGroup="staff"
      canCreate={true}
    />
  );
}
