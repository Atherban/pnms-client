import { SalesListScreen } from "../../components/modules/SalesListScreen";

export default function ViewerSales() {
  return (
    <SalesListScreen
      title="Sales"
      routeGroup="viewer"
      canCreate={false}
    />
  );
}
