import { useLocalSearchParams } from "expo-router";
import { PlantDetailScreen } from "../../../components/modules/PlantDetailScreen";

export default function ViewerPlantDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <PlantDetailScreen id={id} title="Plant Details" canUpload={false} />;
}

