import { useLocalSearchParams } from "expo-router";
import { SeedDetailScreen } from "../../../components/modules/SeedDetailScreen";

export default function AdminSeedDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <SeedDetailScreen
      id={id}
      title="Seed Details"
      routeGroup="admin"
      canUpload={false}
    />
  );
}

