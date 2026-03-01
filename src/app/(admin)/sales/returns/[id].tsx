import { useLocalSearchParams } from "expo-router";
import { SaleReturnScreen } from "../../../../components/modules/SaleReturnScreen";

export default function AdminSaleReturnRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <SaleReturnScreen saleId={id} routeGroup="admin" />;
}
