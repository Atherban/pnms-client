import { useLocalSearchParams } from "expo-router";
import { SeedDetailScreen } from "../../../components/modules/SeedDetailScreen";

export default function StaffSeedDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <SeedDetailScreen
      id={id}
      title="Seed Details"
      routeGroup="staff"
      canUpload
    />
  );
}

