import BannerManagementScreen from "../../../components/banners/BannerManagementScreen";

export default function SuperAdminBannersScreen() {
  return (
    <BannerManagementScreen
      role="SUPER_ADMIN"
      title="Advertisements"
      subtitle="Manage platform banners shown customers"
      queryKey={["super-admin", "banners"]}
    />
  );
}
