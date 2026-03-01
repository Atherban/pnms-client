import BannerManagementScreen from "../../../components/banners/BannerManagementScreen";

export default function SuperAdminBannersScreen() {
  return (
    <BannerManagementScreen
      role="SUPER_ADMIN"
      title="Global Advertisements"
      subtitle="Manage platform banners shown to all customers"
      queryKey={["super-admin", "banners"]}
    />
  );
}
