import { SeedsListScreen } from "../../../components/modules/SeedsListScreen";

export default function AdminSeedsIndexRoute() {
  return (
    <SeedsListScreen
      title="Seed Inventory"
      routeGroup="admin"
      canWrite={false}
    />
  );
}
