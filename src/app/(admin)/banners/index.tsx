import BannerManagementScreen from "../../../components/banners/BannerManagementScreen";

export default function AdminBannersScreen() {
  return (
    <BannerManagementScreen
      role="NURSERY_ADMIN"
      title="Nursery Banners"
      subtitle="Create and manage banners for your nursery customers"
      queryKey={["admin", "banners"]}
    />
  );
}
