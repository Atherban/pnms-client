import { MaterialIcons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Dimensions,
  FlatList,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  FadeInDown,
  SlideInRight,
} from "react-native-reanimated";

import StitchHeader, { StitchHeaderActionButton } from "../../components/common/StitchHeader";
import {
  CustomerEmptyState,
  SectionHeader,
  StatusChip,
} from "../../components/common/StitchScreen";
import { CustomerFilterChip } from "../../components/customer/CustomerFilterChip";
import { CustomerSurfaceCard } from "../../components/customer/CustomerSurfaceCard";
import { AuthService } from "../../services/auth.service";
import type { BannerItem } from "../../services/banner.service";
import type { CustomerDashboardOverview } from "../../services/customer-dashboard.service";
import { CustomerDashboardService } from "../../services/customer-dashboard.service";
import {
  ProductFeedItem,
  ProductFeedResponse,
  ProductFeedService,
} from "../../services/product-feed.service";
import { useAuthStore } from "../../stores/auth.store";
import { CustomerColors, Spacing } from "../../theme";
import { ProductFeedCard } from "../../components/customer/ProductFeedCard";
import { CUSTOMER_BOTTOM_NAV_HEIGHT } from "../../components/navigation/SharedBottomNav";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const BANNER_CARD_WIDTH = SCREEN_WIDTH - 40; // Full width minus padding
const BANNER_CARD_HEIGHT = 200;
const FEED_HORIZONTAL_PADDING = Spacing.md * 2;
const FEED_COLUMN_GAP = Spacing.sm;

const normalizeCategoryKey = (value?: string) =>
  String(value || "").trim().toUpperCase();
const normalizePhone = (value?: string) => String(value || "").replace(/[^\d]/g, "");

const getWhatsAppUrl = (phone: string | undefined, message: string) => {
  const digits = normalizePhone(phone);
  if (!digits) return null;
  const normalizedPhone = digits.startsWith("91") ? digits : `91${digits}`;
  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;
};

// ==================== BANNER CARD COMPONENT ====================

interface BannerCardProps {
  banner: BannerItem;
  onPress: (banner: BannerItem) => void;
  index: number;
}

const BannerCard = ({ banner, onPress, index }: BannerCardProps) => (
  <Animated.View
    entering={SlideInRight.delay(index * 100)
      .springify()
      .damping(35)}
    style={styles.bannerCard}
  >
    <Pressable
      onPress={() => onPress(banner)}
      style={({ pressed }) => [
        styles.bannerPressable,
        pressed && styles.bannerPressed,
      ]}
    >
      {banner.imageUrl ? (
        <View style={styles.imageOnlyBannerContainer}>
          <Image
            source={{ uri: banner.imageUrl }}
            style={styles.bannerImage}
            contentFit="cover"
            transition={300}
          />
        </View>
      ) : (
        <>
          <LinearGradient
            colors={[
              banner.color || CustomerColors.primary,
              (banner.color || CustomerColors.primary) + "80",
            ]}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          <View style={styles.bannerGradientOverlay} />
          <BlurView intensity={40} tint="dark" style={styles.bannerContent}>
            <Text style={styles.bannerTitle}>{banner.title}</Text>
            {banner.subtitle ? (
              <Text style={styles.bannerSubtitle}>{banner.subtitle}</Text>
            ) : null}
            {banner.cta ? (
              <View style={styles.bannerCtaContainer}>
                <Text style={styles.bannerCta}>{banner.cta}</Text>
                <MaterialIcons
                  name="arrow-forward"
                  size={16}
                  color={CustomerColors.white}
                />
              </View>
            ) : null}
          </BlurView>
        </>
      )}
    </Pressable>
  </Animated.View>
);

// ==================== MAIN COMPONENT ====================

export default function CustomerDashboard() {
  const bannerScrollRef = useRef<ScrollView | null>(null);
  const [activeBannerIndex, setActiveBannerIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("ALL");
  const { width: viewportWidth } = useWindowDimensions();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  const { data, isLoading, isRefetching, refetch } = useQuery<
    CustomerDashboardOverview | undefined
  >({
    queryKey: ["customer-dashboard", user?.id, user?.phoneNumber],
    queryFn: () =>
      CustomerDashboardService.getOverview({
        id: user?.id,
        phoneNumber: user?.phoneNumber,
        role: user?.role,
        nurseryId: user?.nurseryId,
      }),
  });

  const {
    data: productFeedData,
    isLoading: loadingFeed,
    refetch: refetchFeed,
    isRefetching: refetchingFeed,
  } = useQuery<ProductFeedResponse>({
    queryKey: ["customer-product-feed", user?.nurseryId],
    queryFn: () => ProductFeedService.getCustomerFeed(),
  });

  const feedSections = Array.isArray(productFeedData?.sections)
    ? productFeedData.sections
    : [];
  const feedItems = Array.isArray(productFeedData?.items)
    ? productFeedData.items
    : [];

  const sectionItems = feedSections.flatMap((section) => section.items || []);
  const combinedFeedItems = [...sectionItems, ...feedItems].filter(Boolean);
  const dedupedFeedItems = combinedFeedItems.reduce((acc, item) => {
    const id = String(item?.id || "");
    if (id && acc.seen.has(id)) return acc;
    if (id) acc.seen.add(id);
    acc.items.push(item);
    return acc;
  }, {
    items: [] as typeof combinedFeedItems,
    seen: new Set<string>(),
  }).items;
  const normalizedSearch = searchQuery.trim().toLowerCase();
  const matchesSearch = (item: any) => {
    if (!normalizedSearch) return true;
    const name = String(item?.name || "").toLowerCase();
    const category = String(item?.category || "").toLowerCase();
    const variety = String(item?.meta?.variety || "").toLowerCase();
    return (
      name.includes(normalizedSearch) ||
      category.includes(normalizedSearch) ||
      variety.includes(normalizedSearch)
    );
  };

  const matchesCategory = (item: any) => {
    if (activeCategory === "ALL") return true;
    const normalizedCategory = normalizeCategoryKey(item?.category);
    if (activeCategory === "PLANTS") {
      return item?.type === "PLANT" || normalizedCategory === "PLANT" || normalizedCategory === "PLANTS";
    }
    if (activeCategory === "SEEDS") {
      return item?.type === "SEED" || normalizedCategory === "SEED" || normalizedCategory === "SEEDS";
    }
    if (activeCategory === "FLOWERS") {
      return normalizedCategory === "FLOWER" || normalizedCategory === "FLOWERS";
    }
    if (activeCategory === "VEGETABLES") {
      return normalizedCategory === "VEGETABLE" || normalizedCategory === "VEGETABLES";
    }
    return true;
  };

  const filteredItems = dedupedFeedItems.filter(
    (item) => matchesSearch(item) && matchesCategory(item),
  );

  const profile: CustomerDashboardOverview["nurseryPublicProfile"] =
    data?.nurseryPublicProfile ||
    ({
      nurseryId: String(user?.nurseryId || "default_nursery"),
      updatedAt: new Date().toISOString(),
    } as CustomerDashboardOverview["nurseryPublicProfile"]);
  const bannerCount = Array.isArray(data?.banners) ? data.banners.length : 0;
  const nurseryName = String(profile?.name || "Nursery").trim() || "Nursery";
  const nurserySubtitle = "Plants, seeds and nursery services";
  const hasAnyFeedItems = dedupedFeedItems.length > 0;
  const displayCount = filteredItems.length;
  const filterOptions = [
    { key: "ALL", label: "All" },
    { key: "PLANTS", label: "Plants" },
    { key: "SEEDS", label: "Seeds" },
    { key: "FLOWERS", label: "Flowers" },
    { key: "VEGETABLES", label: "Vegetables" },
  ];
  const feedListItems: Array<ProductFeedItem | { id: string; __skeleton: true }> = loadingFeed
    ? Array.from({ length: 6 }).map((_, idx) => ({
        id: `skeleton-${idx}`,
        __skeleton: true as const,
      }))
    : filteredItems;
  const cardWidth = Math.max(
    156,
    (viewportWidth - FEED_HORIZONTAL_PADDING - FEED_COLUMN_GAP) / 2,
  );
  const enquiryPhone =
    profile?.whatsappPhone ||
    profile?.phoneNumber ||
    profile?.primaryPhone ||
    profile?.contactDetails?.[0]?.whatsappNumber ||
    profile?.contactDetails?.[0]?.phoneNumber;

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          await AuthService.logout();
          clearAuth();
          router.replace("/(auth)/login");
        },
      },
    ]);
  };

  const handleBannerPress = (banner: BannerItem) => {
    if (banner.redirectUrl) {
      if (/^https?:\/\//i.test(banner.redirectUrl)) {
        Linking.openURL(banner.redirectUrl).catch(() => {
          Alert.alert("Invalid link", "Unable to open banner link.");
        });
      } else {
        router.push(banner.redirectUrl as any);
      }
    }
  };

  const handleProductEnquiry = async (item: ProductFeedItem) => {
    const message = `Hello, I am interested in this product from ${nurseryName}:\n\nProduct: ${
      item?.name || "Product"
    }\nCategory: ${String(item?.category || item?.type || "General")}\nPrice: ${
      typeof item?.price === "number"
        ? `₹${Math.round(item.price).toLocaleString("en-IN")}`
        : "Price on request"
    }\n\nPlease share more details.`;
    const whatsappUrl = getWhatsAppUrl(enquiryPhone, message);

    if (!whatsappUrl) {
      Alert.alert("Contact unavailable", "Nursery WhatsApp number is not available.");
      return;
    }

    try {
      const supported = await Linking.canOpenURL(whatsappUrl);
      if (supported) {
        await Linking.openURL(whatsappUrl);
        return;
      }

      const digits = normalizePhone(enquiryPhone);
      const normalizedPhone = digits.startsWith("91") ? digits : `91${digits}`;
      const fallbackUrl = `https://api.whatsapp.com/send?phone=${normalizedPhone}&text=${encodeURIComponent(message)}`;
      await Linking.openURL(fallbackUrl);
    } catch {
      Alert.alert("Unable to open enquiry", "Please make sure WhatsApp is available on your device.");
    }
  };

  useEffect(() => {
    if (bannerCount <= 1) {
      setActiveBannerIndex(0);
      return;
    }

    const timer = setInterval(() => {
      setActiveBannerIndex((current) => {
        const nextIndex = (current + 1) % bannerCount;
        bannerScrollRef.current?.scrollTo({
          x: nextIndex * (BANNER_CARD_WIDTH + Spacing.md),
          animated: true,
        });
        return nextIndex;
      });
    }, 4500);

    return () => clearInterval(timer);
  }, [bannerCount]);

  return (
    <View style={styles.container}>
      <StitchHeader
        variant="gradient"
        backgroundColor={CustomerColors.background}
        borderBottomColor={CustomerColors.border}
        title={nurseryName}
        subtitle={nurserySubtitle}
        brandImageUrl={profile?.logoImageUrl}
        brandImagePlacement="right"
        titleStyle={styles.headerTitle}
        userName={user?.name || "Customer"}
        userRoleLabel="Customer"
        onLogout={handleLogout}
        userActions={
          <StitchHeaderActionButton
            iconName={isRefetching || refetchingFeed ? "sync" : "refresh"}
            onPress={() => {
              refetch();
              refetchFeed();
            }}
          />
        }
      />

      <FlatList
        data={feedListItems}
        extraData={cardWidth}
        keyExtractor={(item, index) => String(item?.id || `feed-item-${index}`)}
        numColumns={2}
        columnWrapperStyle={styles.feedRow}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: Spacing.md + CUSTOMER_BOTTOM_NAV_HEIGHT + insets.bottom },
        ]}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            {/* Search Bar */}
            <View style={styles.searchWrap}>
              <MaterialIcons name="search" size={20} color={CustomerColors.textMuted} />
              <TextInput
                placeholder="Search plants, seeds, products"
                placeholderTextColor={CustomerColors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                style={styles.searchInput}
              />
              {searchQuery ? (
                <Pressable onPress={() => setSearchQuery("")} style={styles.searchClear}>
                  <MaterialIcons name="close" size={16} color={CustomerColors.textMuted} />
                </Pressable>
              ) : null}
            </View>

            {/* Banners Section */}
            {Array.isArray(data?.banners) && data.banners.length > 0 ? (
              <>
                <ScrollView
                  ref={bannerScrollRef}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  decelerationRate="fast"
                  snapToInterval={BANNER_CARD_WIDTH + Spacing.md}
                  style={styles.bannerScroll}
                  onMomentumScrollEnd={(event) => {
                    const offsetX = event.nativeEvent.contentOffset.x;
                    const nextIndex = Math.round(
                      offsetX / (BANNER_CARD_WIDTH + Spacing.md),
                    );
                    setActiveBannerIndex(nextIndex);
                  }}
                >
                  {data.banners.map((banner: BannerItem, index) => (
                    <BannerCard
                      key={banner.id}
                      banner={banner}
                      onPress={handleBannerPress}
                      index={index}
                    />
                  ))}
                </ScrollView>
                <View style={styles.bannerDots}>
                  {data.banners.map((banner: BannerItem, index) => (
                    <View
                      key={`${banner.id}-dot`}
                      style={[
                        styles.bannerDot,
                        index === activeBannerIndex && styles.bannerDotActive,
                      ]}
                    />
                  ))}
                </View>
              </>
            ) : (
              <Animated.View
                entering={FadeInDown.springify()}
                style={styles.emptyBanner}
              >
                <CustomerEmptyState
                  title="No active offers"
                  message="New nursery updates and offers will show up here."
                  icon={<MaterialIcons name="campaign" size={36} color={CustomerColors.textMuted} />}
                />
              </Animated.View>
            )}

            {/* Product Feed Header */}
            <Animated.View entering={FadeInDown.delay(120).springify().damping(35)}>
              <CustomerSurfaceCard style={styles.marketplaceSectionCard}>
                <SectionHeader
                  title="Available from this nursery"
                  subtitle="Plants, seeds, and inventory ready to order."
                  trailing={
                    <StatusChip
                      label={`${displayCount} item${displayCount !== 1 ? "s" : ""}`}
                      tone="info"
                    />
                  }
                />

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.filterBar}
                >
                  {filterOptions.map((filter) => (
                    <CustomerFilterChip
                      key={filter.key}
                      label={filter.label}
                      active={activeCategory === filter.key}
                      onPress={() => setActiveCategory(filter.key)}
                    />
                  ))}
                </ScrollView>
              </CustomerSurfaceCard>
            </Animated.View>

            {isLoading && (
              <View style={styles.loadingContainer}>
                <MaterialIcons name="sync" size={20} color={CustomerColors.primary} />
                <Text style={styles.loadingText}>Loading latest data...</Text>
              </View>
            )}
          </View>
        }
        renderItem={({ item }) => {
          if ("__skeleton" in item) {
            return (
              <View style={[styles.feedSkeletonCard, { minWidth: cardWidth, maxWidth: cardWidth }]}>
                <View style={styles.feedSkeletonMedia} />
                <View style={styles.feedSkeletonLine} />
                <View style={styles.feedSkeletonLineShort} />
              </View>
            );
          }
          const canNavigate = Boolean(item?.id);
          return (
            <ProductFeedCard
              item={item}
              style={[styles.feedCard, { minWidth: cardWidth, maxWidth: cardWidth }]}
              onEnquire={() => handleProductEnquiry(item)}
              onPress={
                canNavigate
                  ? () =>
                      router.push({
                        pathname: "/(customer)/product-feed/[id]",
                        params: { id: item.id },
                      } as any)
                  : undefined
              }
            />
          );
        }}
        ListEmptyComponent={
          !loadingFeed
            ? () => (
                <CustomerEmptyState
                  title={hasAnyFeedItems ? "No matches found" : "No products available"}
                  message={
                    hasAnyFeedItems
                      ? "Try another search or filter."
                      : "New items will appear here when they are ready."
                  }
                  icon={
                    <MaterialIcons
                      name={hasAnyFeedItems ? "search-off" : "inventory-2"}
                      size={36}
                      color={CustomerColors.textMuted}
                    />
                  }
                />
              )
            : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: CustomerColors.background,
  },
  headerTitle: {
    fontSize: 24,
  },
  listContent: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
  },
  listHeader: {
    gap: Spacing.md,
    paddingBottom: Spacing.md,
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: CustomerColors.border,
    backgroundColor: CustomerColors.white,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: CustomerColors.text,
  },
  searchClear: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: CustomerColors.border,
  },
  marketplaceSectionCard: {
    gap: Spacing.md,
    paddingBottom: Spacing.md,
  },
  filterBar: {
    gap: Spacing.sm,
    paddingRight: Spacing.sm,
  },
  feedRow: {
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
    alignItems: "stretch",
  },
  feedCard: {
    flex: 1,
    backgroundColor: CustomerColors.white
  },
  feedSkeletonCard: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: CustomerColors.border,
    backgroundColor: CustomerColors.white,
    padding: 14,
    gap: 12,
    minHeight: 260,
  },
  feedSkeletonMedia: {
    height: 148,
    borderRadius: 16,
    backgroundColor: CustomerColors.border,
  },
  feedSkeletonLine: {
    height: 12,
    borderRadius: 6,
    backgroundColor: CustomerColors.border,
  },
  feedSkeletonLineShort: {
    height: 10,
    borderRadius: 6,
    backgroundColor: CustomerColors.border,
    width: "70%",
  },
  paymentsCard: {
    gap: Spacing.md,
  },
  paymentsPills: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  progressWrap: {
    gap: 8,
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: CustomerColors.border,
    overflow: "hidden",
  },
  progressFillNew: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: CustomerColors.primary,
  },
  progressLabelNew: {
    fontSize: 12,
    color: CustomerColors.textMuted,
    textAlign: "right",
  },
  lifecycleCardNew: {
    gap: Spacing.md,
  },
  lifecyclePillsNew: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  lifecycleFooterNew: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  lifecycleMetaNew: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  lifecycleMetaTextNew: {
    color: CustomerColors.textMuted,
    fontWeight: "700",
  },

  // Banner Styles
  bannerScroll: {
    marginBottom: Spacing.sm,
  },
  bannerDots: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: Spacing.md,
  },
  bannerDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: CustomerColors.border,
  },
  bannerDotActive: {
    width: 22,
    backgroundColor: CustomerColors.primary,
  },
  bannerCard: {
    width: BANNER_CARD_WIDTH,
    marginRight: Spacing.md,
    borderRadius: 20,
    overflow: "hidden",
    
  },
  bannerPressable: {
    height: BANNER_CARD_HEIGHT,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  bannerPressed: {
    transform: [{ scale: 0.98 }],
  },
  bannerImage: {
    ...StyleSheet.absoluteFillObject,
    width: undefined,
    height: undefined,
  },
  imageOnlyBannerContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  bannerGradientOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  bannerContent: {
    padding: Spacing.lg,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  bannerTitle: {
    color: CustomerColors.white,
    fontWeight: "700",
    fontSize: 18,
    marginBottom: 2,
  },
  bannerSubtitle: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 13,
    lineHeight: 18,
  },
  bannerCtaContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: Spacing.sm,
  },
  bannerCta: {
    color: CustomerColors.white,
    fontWeight: "600",
    fontSize: 13,
  },
  emptyBanner: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
    backgroundColor: CustomerColors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: CustomerColors.borderStrong,
    gap: 8,
  },
  emptyBannerText: {
    color: CustomerColors.textMuted,
    fontSize: 14,
  },

  // Card Styles
  card: {
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: CustomerColors.borderStrong,
    backgroundColor: CustomerColors.surface,
    shadowColor: CustomerColors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardGradient: {
    padding: Spacing.lg,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
  },
  cardTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  cardIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "600",
  },

  // Stat Card Styles (for potential use)
  statCard: {
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: CustomerColors.borderStrong,
    backgroundColor: CustomerColors.surface,
  },
  statCardGradient: {
    padding: Spacing.md,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.sm,
  },
  statContent: {
    gap: 2,
  },
  statLabel: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700",
  },
  statSubValue: {
    fontSize: 11,
    color: "#9CA3AF",
  },

  // Payment Summary Styles
  dueMainContainer: {
    marginBottom: Spacing.md,
  },
  dueLabel: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 2,
  },
  dueAmount: {
    fontSize: 36,
    fontWeight: "700",
    color: CustomerColors.danger,
    marginBottom: Spacing.sm,
  },
  progressContainer: {
    gap: 4,
  },
  progressBar: {
    height: 6,
    backgroundColor: "#F3F4F6",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  progressText: {
    fontSize: 11,
    color: "#9CA3AF",
    textAlign: "right",
  },
  statsGrid: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
  },
  statBlock: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: 4,
  },
  statBlockContent: {
    flex: 1,
  },
  statBlockLabel: {
    fontSize: 10,
    color: "#9CA3AF",
    marginBottom: 2,
  },
  statBlockValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: "#E5E7EB",
    marginHorizontal: 4,
  },

  // Button Styles
  primaryButton: {
    borderRadius: 12,
    overflow: "hidden",
  },
  buttonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  buttonText: {
    color: CustomerColors.white,
    fontSize: 14,
    fontWeight: "600",
  },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    borderWidth: 1,
    borderColor: CustomerColors.primary,
    borderRadius: 12,
    backgroundColor: "transparent",
    gap: Spacing.sm,
  },
  secondaryButtonText: {
    color: CustomerColors.primary,
    fontSize: 14,
    fontWeight: "600",
  },
  buttonPressed: {
    transform: [{ scale: 0.98 }],
  },

  // Lifecycle Styles
  lifecycleGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  lifecycleItem: {
    flex: 1,
    minWidth: "45%",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: Spacing.sm,
    gap: 4,
  },
  lifecycleIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  lifecycleValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  lifecycleLabel: {
    fontSize: 11,
    color: "#6B7280",
  },

  // Contact Card Styles
  qrContainer: {
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  qrImage: {
    width: 160,
    height: 160,
    borderRadius: 12,
    backgroundColor: "#F9FAFB",
    marginBottom: 4,
  },
  qrHint: {
    fontSize: 11,
    color: "#9CA3AF",
  },
  upiContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    backgroundColor: "#F9FAFB",
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignSelf: "flex-start",
    marginBottom: Spacing.md,
  },
  upiText: {
    fontSize: 13,
    color: CustomerColors.primary,
    fontWeight: "500",
  },
  buttonGrid: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  gridButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 10,
    gap: Spacing.xs,
  },
  primaryGridButton: {
    backgroundColor: CustomerColors.primary,
  },
  outlineGridButton: {
    borderWidth: 1,
    borderColor: CustomerColors.primary,
    backgroundColor: "transparent",
  },
  gridButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: CustomerColors.white,
  },
  outlineGridButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: CustomerColors.primary,
  },
  contactInfo: {
    marginTop: Spacing.sm,
    gap: 6,
  },
  detailsCard: {
    marginTop: Spacing.sm,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    padding: Spacing.sm,
    gap: 6,
    backgroundColor: "#F9FAFB",
  },
  detailsTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 2,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  detailLabel: {
    fontSize: 12,
    color: "#6B7280",
  },
  detailValue: {
    fontSize: 12,
    color: "#111827",
    fontWeight: "600",
    flex: 1,
    textAlign: "right",
  },
  contactDetailCard: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    padding: Spacing.sm,
    gap: 4,
    backgroundColor: CustomerColors.surface,
  },
  contactDetailTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#111827",
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  contactText: {
    fontSize: 12,
    color: "#6B7280",
  },
  linkText: {
    color: CustomerColors.primary,
    textDecorationLine: "underline",
  },
  notesContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    backgroundColor: "rgba(245,158,11,0.10)",
    borderRadius: 8,
    padding: Spacing.sm,
    marginTop: Spacing.sm,
  },
  notesText: {
    flex: 1,
    fontSize: 12,
    color: CustomerColors.warning,
    fontWeight: "500",
  },
  hintContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  hintText: {
    flex: 1,
    fontSize: 11,
    color: "#9CA3AF",
    fontStyle: "italic",
  },

  // Loading Styles
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  loadingText: {
    fontSize: 13,
    color: "#6B7280",
  },
});
