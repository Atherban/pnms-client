import { useLocalSearchParams } from "expo-router";
import { SaleReturnScreen } from "../../../../components/modules/SaleReturnScreen";

export default function StaffSaleReturnRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <SaleReturnScreen saleId={id} routeGroup="staff" />;
}
