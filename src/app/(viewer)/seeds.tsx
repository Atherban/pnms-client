import { SeedsListScreen } from "../../components/modules/SeedsListScreen";

export default function ViewerSeedsRoute() {
  return (
    <SeedsListScreen
      title="Seed Inventory"
      routeGroup="viewer"
      canWrite={false}
    />
  );
}
