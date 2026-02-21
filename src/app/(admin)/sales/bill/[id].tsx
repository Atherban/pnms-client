import { useLocalSearchParams } from "expo-router";
import { SaleBillScreen } from "../../../../components/modules/SaleBillScreen";

export default function AdminSaleBillRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <SaleBillScreen id={id} routeGroup="admin" />;
}
