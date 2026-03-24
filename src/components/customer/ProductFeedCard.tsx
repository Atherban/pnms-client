import { MaterialIcons } from "@expo/vector-icons";
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";

import { StatusChip } from "../common/StitchScreen";
import BannerCardImage from "../ui/BannerCardImage";
import { CustomerActionButton } from "./CustomerActionButton";
import { CustomerSurfaceCard } from "./CustomerSurfaceCard";
import { Colors, CustomerColors, Radius, Spacing } from "../../theme";
import type { ProductFeedItem } from "../../services/product-feed.service";
import { resolveEntityImage } from "../../utils/image";
import { LinearGradient } from "react-native-svg";

type ProductFeedCardProps = {
  item: ProductFeedItem;
  onPress?: () => void;
  onEnquire?: () => void;
  style?: StyleProp<ViewStyle>;
};

const formatMoney = (amount?: number | null) =>
  typeof amount === "number"
    ? `₹${Math.round(amount).toLocaleString("en-IN")}`
    : "Price on request";

const formatUnit = (unit?: string) =>
  String(unit || "UNITS").replace(/_/g, " ").toLowerCase();

export function ProductFeedCard({
  item,
  onPress,
  onEnquire,
  style,
}: ProductFeedCardProps) {
  const description =
    "description" in item && typeof item.description === "string"
      ? item.description
      : undefined;
  const availability = item.availability || {
    available: 0,
    total: 0,
    unit: "UNITS",
    inStock: false,
  };

  const availableQty = Number(availability.available || 0);
  const isLowStock =
    availability.inStock && availableQty > 0 && availableQty <= 10;
  const stockLabel = availability.inStock
    ? isLowStock
      ? "Low Stock"
      : `${availableQty} ${formatUnit(availability.unit)} available`
    : "Out of Stock";
  const chipTone = availability.inStock
    ? isLowStock
      ? "warning"
      : "success"
    : "danger";
  const categoryLabel = String(item.category || item.type || "General").toUpperCase();
  const varietyLabel =
    typeof item.meta?.variety === "string" && item.meta.variety.trim()
      ? item.meta.variety.trim()
      : null;

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={[styles.card, style, !onPress && styles.cardDisabled]}
    >
      

      <BannerCardImage
        uri={resolveEntityImage(item)}
        iconName="photo"
        minHeight={148}
        resizeMode="cover"
        containerStyle={styles.image}
        />

      <View style={styles.body}>
        <View style={styles.headerRow}>
          <View>

          <Text style={styles.category} numberOfLines={1}>
            {categoryLabel}
          </Text>
          <Text style={styles.productName} numberOfLines={2}>
            {item.name}
          </Text>
          </View>
          <View style={styles.priceBlock}>
            <Text style={styles.priceLabel}>Price</Text>
            <Text style={styles.price}>{formatMoney(item.price ?? null)}</Text>
          </View>
        </View>

        <View style={styles.footer}>
          

          <View style={styles.actionRow}>

            <CustomerActionButton
              label="Enquire"
              onPress={onEnquire}
              variant="secondary"
              style={styles.cta}
              icon={
                <MaterialIcons
                name="chat-bubble-outline"
                size={16}
                color={CustomerColors.primary}
                />
              }
              />
          </View>
        </View>
      </View>
      
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    padding: 0,
    overflow: "hidden",
    
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: CustomerColors.border,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 2,
  },
  cardDisabled: {
    opacity: 0.98,
  },
  image: {
    width: "100%",
    minHeight: 132,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
  },
  body: {
    paddingHorizontal:Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
    flexGrow: 1,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent:"space-between",
    
  },
  category: {
    fontSize: 8,
    fontWeight: "700",
    textTransform: "uppercase",
    color: CustomerColors.textMuted,
  },
  productName: {
    fontSize: 17,
    fontWeight: "700",
    lineHeight: 22,
    color: CustomerColors.text,
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
    color: CustomerColors.textMuted,
    minHeight: 54,
  },
  footer: {
    gap: Spacing.sm,
    marginTop: "auto",
  },
  priceBlock: {
    gap: 2,
  },
  priceLabel: {
    fontSize: 8,
    fontWeight: "700",
    textTransform: "uppercase",
    color: CustomerColors.textMuted,
    textAlign:"right"
  },
  price: {
    fontSize: 20,
    fontWeight: "800",
    lineHeight: 24,
    color: CustomerColors.text,
    textAlign:"right"
  },
  metaWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: Spacing.xs,
  },
  metaPill: {
    maxWidth: "100%",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: CustomerColors.background,
    borderWidth: 1,
    borderColor: CustomerColors.border,
  },
  metaPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: CustomerColors.textMuted,
    textTransform: "capitalize",
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  inlineLink: {
    paddingVertical: 8,
    paddingRight: 4,
  },
  inlineLinkText: {
    fontSize: 13,
    fontWeight: "700",
    color: CustomerColors.primary,
  },
  cta: {
    minHeight: 40,
    paddingHorizontal: 14,
    width:"100%",
    
  },
});
