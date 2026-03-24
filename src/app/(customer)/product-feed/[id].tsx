import { MaterialIcons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo } from "react";
import { Alert, Linking, RefreshControl, StyleSheet, Text, View } from "react-native";

import { CustomerActionButton } from "@/src/components/customer/CustomerActionButton";
import {
  CustomerCard,
  CustomerEmptyState,
  CustomerErrorState,
  CustomerScreen,
  SectionHeader,
  StatPill,
  StatusChip,
} from "@/src/components/common/StitchScreen";
import BannerCardImage from "@/src/components/ui/BannerCardImage";
import {
  ProductFeedResponse,
  ProductFeedService,
} from "@/src/services/product-feed.service";
import { NurseryPublicProfileService } from "@/src/services/nursery-public-profile.service";
import { useAuthStore } from "@/src/stores/auth.store";
import { CustomerColors, Spacing } from "@/src/theme";
import { resolveEntityImage, toImageUrl } from "@/src/utils/image";

const formatMoney = (amount?: number | null) =>
  typeof amount === "number"
    ? `₹${Math.round(amount).toLocaleString("en-IN")}`
    : "Price on request";

const formatCategoryLabel = (value?: string) => {
  const key = String(value || "").trim().toUpperCase();
  if (!key) return "-";
  if (key === "VEGETABLE") return "Vegetables";
  if (key === "FLOWER") return "Flowers";
  if (key === "FRUIT") return "Fruits";
  if (key === "HERB") return "Herbs";
  return key.charAt(0) + key.slice(1).toLowerCase();
};

const formatDate = (value?: string) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const normalizePhone = (value?: string) => (value || "").replace(/[^\d]/g, "");

export default function CustomerProductFeedDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const id = String(params.id || "");
  const user = useAuthStore((s) => s.user);

  const {
    data: feedData,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery<ProductFeedResponse>({
    queryKey: ["customer-product-feed", user?.nurseryId],
    enabled: Boolean(user),
    queryFn: () => ProductFeedService.getCustomerFeed(),
  });

  const { data: nurseryProfile } = useQuery({
    queryKey: ["nursery-public-profile", user?.nurseryId],
    enabled: Boolean(user?.nurseryId),
    queryFn: () => NurseryPublicProfileService.get(user?.nurseryId),
  });

  const product = useMemo(() => {
    if (!id) return undefined;
    const sections = Array.isArray(feedData?.sections) ? feedData?.sections : [];
    const sectionItems = sections.flatMap((section) => section.items || []);
    const rootItems = Array.isArray(feedData?.items) ? feedData?.items : [];
    const allItems = [...rootItems, ...sectionItems];
    return allItems.find((item) => String(item.id) === id);
  }, [feedData, id]);

  const availability = product?.availability || {
    available: 0,
    total: 0,
    unit: "UNITS",
    inStock: false,
  };
  const availableQty = Number(availability.available || 0);
  const totalQty = Number(availability.total || availableQty);
  const unit = String(availability.unit || "UNITS").replace(/_/g, " ");
  const inStock = availability.inStock && availableQty > 0;

  const imageUrls = useMemo(() => {
    if (!product) return [] as string[];
    const candidates = [product.image, resolveEntityImage(product)];
    const images = Array.isArray(product.images) ? product.images : [];
    for (const image of images) {
      candidates.push(
        image?.fileName || image?.imageUrl || image?.fileUrl || image?.url || image?.path,
      );
    }
    const resolved = candidates
      .map((value) => toImageUrl(typeof value === "string" ? value : undefined))
      .filter(Boolean) as string[];
    return Array.from(new Set(resolved));
  }, [product]);

  const nurseryName = String(nurseryProfile?.name || "Nursery").trim() || "Nursery";
  const phoneCandidate =
    nurseryProfile?.phoneNumber ||
    nurseryProfile?.whatsappPhone ||
    nurseryProfile?.primaryPhone ||
    nurseryProfile?.contactDetails?.[0]?.phoneNumber ||
    nurseryProfile?.contactDetails?.[0]?.whatsappNumber;
  const whatsappPhone = normalizePhone(phoneCandidate);

  const whatsappMessage = `Hello, I am interested in the following product from your nursery:\n\nProduct: ${
    product?.name || "Product"
  }\nCategory: ${formatCategoryLabel(product?.category)}\nPrice: ${formatMoney(
    product?.price ?? null,
  )}\n\nCould you please share more details?`;

const handleWhatsAppInquiry = async () => {
  if (!whatsappPhone) {
    Alert.alert("Contact unavailable", "Nursery phone number is not available.");
    return;
  }

  try {
    // Normalize phone number
    const phone = whatsappPhone.toString().replace(/\D/g, "");

    const encodedMessage = encodeURIComponent(whatsappMessage);

    const whatsappUrl = `https://wa.me/91${phone}?text=${encodedMessage}`;

    const supported = await Linking.canOpenURL(whatsappUrl);

    if (supported) {
      await Linking.openURL(whatsappUrl);
    } else {
      // fallback to web WhatsApp
      const fallbackUrl = `https://api.whatsapp.com/send?phone=91${phone}&text=${encodedMessage}`;
      await Linking.openURL(fallbackUrl);
    }
  } catch (error) {
    console.error("WhatsApp open error:", error);
    Alert.alert(
      "Unable to open WhatsApp",
      "Please make sure WhatsApp is installed on your device."
    );
  }
};
  const canInquiry = Boolean(whatsappPhone) && inStock;

  if (!id) {
    return (
      <CustomerScreen
        title="Product Details"
        subtitle="Invalid product request."
        onBackPress={() => router.back()}
      >
        <CustomerErrorState
          title="Product not available"
          message="This product link is incomplete or invalid."
          action={
            <CustomerActionButton
              label="Go Back"
              variant="secondary"
              onPress={() => router.back()}
            />
          }
        />
      </CustomerScreen>
    );
  }

  if (isLoading) {
    return (
      <CustomerScreen
        title="Product Details"
        subtitle="Loading product information..."
        onBackPress={() => router.back()}
      >
        <CustomerCard style={styles.loadingCard}>
          <Text style={styles.loadingText}>Loading product details...</Text>
        </CustomerCard>
      </CustomerScreen>
    );
  }

  if (!isLoading && !product) {
    return (
      <CustomerScreen
        title="Product Details"
        subtitle="Unable to load this product."
        onBackPress={() => router.back()}
      >
        <CustomerErrorState
          title="Product not found"
          message="This product is not available in the nursery feed right now."
          action={
            <CustomerActionButton
              label="Go Back"
              variant="secondary"
              onPress={() => router.back()}
            />
          }
        />
      </CustomerScreen>
    );
  }

  return (
    <CustomerScreen
      title="Product Details"
      subtitle={product?.name || "Product"}
      onBackPress={() => router.back()}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={refetch}
          colors={[CustomerColors.primary]}
          tintColor={CustomerColors.primary}
        />
      }
      footer={
        <View style={styles.footer}>
          <CustomerActionButton
            label="Generate WhatsApp Inquiry"
            onPress={handleWhatsAppInquiry}
            icon={<MaterialIcons name="chat" size={18} color={CustomerColors.white} />}
            disabled={!canInquiry}
          />
          {!whatsappPhone ? (
            <Text style={styles.footerHint}>Nursery contact not available.</Text>
          ) : !inStock ? (
            <Text style={styles.footerHint}>Product is currently out of stock.</Text>
          ) : null}
        </View>
      }
    >
      <CustomerCard style={styles.heroCard}>
        <BannerCardImage
          uri={imageUrls[0]}
          iconName="local-florist"
          minHeight={240}
          containerStyle={styles.heroImage}
        />
        {imageUrls.length > 1 ? (
          <View style={styles.galleryRow}>
            {imageUrls.slice(0, 6).map((uri) => (
              <Image
                key={uri}
                source={{ uri }}
                style={styles.galleryImage}
                contentFit="cover"
                transition={300}
              />
            ))}
          </View>
        ) : null}
        <View style={styles.heroBody}>
          <SectionHeader
            title={product?.name || "Product"}
            subtitle={[
              product?.type ? String(product.type) : "",
              formatCategoryLabel(product?.category),
            ]
              .filter(Boolean)
              .join(" • ")}
            trailing={
              <StatusChip
                label={inStock ? "In stock" : "Out of stock"}
                tone={inStock ? "success" : "default"}
              />
            }
          />
          <View style={styles.statRow}>
            <StatPill label="Price" value={formatMoney(product?.price ?? null)} />
            <StatPill label="Available" value={`${availableQty} ${unit}`} />
            <StatPill label="Total" value={`${totalQty} ${unit}`} />
          </View>
        </View>
      </CustomerCard>

      <CustomerCard>
        <SectionHeader
          title="Product details"
          subtitle="Category, metadata, and availability."
        />
        <View style={styles.detailList}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Category</Text>
            <Text style={styles.detailValue}>{formatCategoryLabel(product?.category)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Type</Text>
            <Text style={styles.detailValue}>{product?.type || "-"}</Text>
          </View>
          {product?.meta?.variety ? (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Variety</Text>
              <Text style={styles.detailValue}>{String(product.meta.variety)}</Text>
            </View>
          ) : null}
          {product?.meta?.supplierName ? (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Supplier</Text>
              <Text style={styles.detailValue}>{String(product.meta.supplierName)}</Text>
            </View>
          ) : null}
          {product?.meta?.expiryDate ? (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Expiry</Text>
              <Text style={styles.detailValue}>{formatDate(product.meta.expiryDate)}</Text>
            </View>
          ) : null}
        </View>
      </CustomerCard>

      <CustomerCard>
        <SectionHeader
          title="Nursery"
          subtitle="Contact the nursery for more details."
        />
        <View style={styles.nurseryRow}>
          <View style={styles.nurseryMeta}>
            <Text style={styles.nurseryName}>{nurseryName}</Text>
            <Text style={styles.nurseryContact}>
              {phoneCandidate ? String(phoneCandidate) : "Nursery contact not available"}
            </Text>
          </View>
          <MaterialIcons name="store" size={20} color={CustomerColors.primary} />
        </View>
      </CustomerCard>
    </CustomerScreen>
  );
}

const styles = StyleSheet.create({
  loadingCard: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.xl,
  },
  loadingText: {
    fontSize: 13,
    color: CustomerColors.textMuted,
    fontWeight: "600",
  },
  footer: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xs,
    gap: 6,
  },
  footerHint: {
    fontSize: 12,
    color: CustomerColors.textMuted,
    textAlign: "center",
    fontWeight: "600",
  },
  heroCard: {
    overflow: "hidden",
  },
  heroImage: {
    borderRadius: 20,
  },
  galleryRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    paddingTop: Spacing.sm,
  },
  galleryImage: {
    width: 68,
    height: 68,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: CustomerColors.border,
    backgroundColor: CustomerColors.surface,
  },
  heroBody: {
    paddingTop: Spacing.md,
    gap: Spacing.md,
  },
  statRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    flexWrap: "wrap",
  },
  detailList: {
    marginTop: Spacing.sm,
    gap: Spacing.sm,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  detailLabel: {
    fontSize: 12,
    color: CustomerColors.textMuted,
    fontWeight: "600",
  },
  detailValue: {
    fontSize: 13,
    color: CustomerColors.text,
    fontWeight: "700",
    flexShrink: 1,
    textAlign: "right",
  },
  nurseryRow: {
    marginTop: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderRadius: 16,
    backgroundColor: "rgba(15,189,73,0.08)",
    borderWidth: 1,
    borderColor: CustomerColors.borderStrong,
  },
  nurseryMeta: {
    flex: 1,
    gap: 4,
  },
  nurseryName: {
    fontSize: 14,
    fontWeight: "800",
    color: CustomerColors.text,
  },
  nurseryContact: {
    fontSize: 12,
    color: CustomerColors.textMuted,
    fontWeight: "600",
  },
});
