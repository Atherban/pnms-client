import { SalesListScreen } from "../../../components/modules/SalesListScreen";

export default function StaffSalesIndexRoute() {
  return (
    <SalesListScreen
      title="Sales"
      routeGroup="staff"
      canCreate={true}
    />
  );
}
