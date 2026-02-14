import { useLocalSearchParams } from "expo-router";
import { SaleDetailScreen } from "../../../components/modules/SaleDetailScreen";

export default function StaffSaleDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <SaleDetailScreen id={id} title="Sale" />;
}
