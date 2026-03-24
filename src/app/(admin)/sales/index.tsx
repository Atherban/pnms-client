import { SalesListScreen } from "../../../components/modules/SalesListScreen";

export default function AdminSalesIndexRoute() {
  return (
    <SalesListScreen
      title="Sales"
      routeGroup="admin"
      canCreate
    />
  );
}
