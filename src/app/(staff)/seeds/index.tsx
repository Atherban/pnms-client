import { SeedsListScreen } from "../../../components/modules/SeedsListScreen";

export default function StaffSeedsIndexRoute() {
  return (
    <SeedsListScreen
      title="Seed Inventory"
      routeGroup="staff"
      canWrite={true}
    />
  );
}
