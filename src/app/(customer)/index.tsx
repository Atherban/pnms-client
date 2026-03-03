import { MaterialIcons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
  Alert,
  Dimensions,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  FadeInDown,
  FadeInUp,
  SlideInRight,
} from "react-native-reanimated";

import FixedHeader from "../../components/common/FixedHeader";
import { AuthService } from "../../services/auth.service";
import type { BannerItem } from "../../services/banner.service";
import type { CustomerDashboardOverview } from "../../services/customer-dashboard.service";
import { CustomerDashboardService } from "../../services/customer-dashboard.service";
import type { NurseryPublicProfile } from "../../types/public-profile.types";
import { useAuthStore } from "../../stores/auth.store";
import { Colors, Spacing } from "../../theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const BANNER_CARD_WIDTH = SCREEN_WIDTH - 40; // Full width minus padding
const BANNER_CARD_HEIGHT = 200;

const formatMoney = (amount: number) =>
  `₹${Math.round(amount).toLocaleString("en-IN")}`;

const formatCompactMoney = (amount: number) => {
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
  return `₹${amount}`;
};

const digitsOnly = (value?: string) => (value || "").replace(/[^\d]/g, "");
const formatCount = (value: number) =>
  Math.round(value).toLocaleString("en-IN");

// ==================== STAT CARD COMPONENT ====================

interface StatCardProps {
  icon: string;
  label: string;
  value: string | number;
  subValue?: string;
  color: string;
  gradient?: readonly [string, string];
  delay?: number;
}

const StatCard = ({
  icon,
  label,
  value,
  subValue,
  color,
  gradient,
  delay = 0,
}: StatCardProps) => (
  <Animated.View
    entering={FadeInDown.delay(delay).springify().damping(35)}
    style={styles.statCard}
  >
    <LinearGradient
      colors={gradient || [color + "15", color + "05"]}
      style={styles.statCardGradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <View
        style={[styles.statIconContainer, { backgroundColor: color + "20" }]}
      >
        <MaterialIcons name={icon as any} size={20} color={color} />
      </View>
      <View style={styles.statContent}>
        <Text style={styles.statLabel}>{label}</Text>
        <Text style={[styles.statValue, { color }]}>{value}</Text>
        {subValue && <Text style={styles.statSubValue}>{subValue}</Text>}
      </View>
    </LinearGradient>
  </Animated.View>
);

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
              banner.color || Colors.primary,
              (banner.color || Colors.primary) + "80",
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
                  color={Colors.white}
                />
              </View>
            ) : null}
          </BlurView>
        </>
      )}
    </Pressable>
  </Animated.View>
);

// ==================== PAYMENT SUMMARY CARD ====================

interface PaymentSummaryCardProps {
  dueSummary: {
    total: number;
    paid: number;
    due: number;
    partialCount: number;
    pendingVerification: number;
  };
  onViewDues: () => void;
}

const PaymentSummaryCard = ({
  dueSummary,
  onViewDues,
}: PaymentSummaryCardProps) => {
  const paidPercentage =
    dueSummary.total > 0 ? (dueSummary.paid / dueSummary.total) * 100 : 0;

  return (
    <Animated.View
      entering={FadeInUp.springify().damping(35)}
      style={styles.card}
    >
      <LinearGradient
        colors={[Colors.white, Colors.surface]}
        style={styles.cardGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleContainer}>
            <View
              style={[
                styles.cardIcon,
                { backgroundColor: Colors.primary + "10" },
              ]}
            >
              <MaterialIcons name="payments" size={20} color={Colors.primary} />
            </View>
            <Text style={styles.cardTitle}>Payment Khata</Text>
          </View>
          {dueSummary.pendingVerification > 0 && (
            <View
              style={[styles.badge, { backgroundColor: Colors.warning + "10" }]}
            >
              <Text style={[styles.badgeText, { color: Colors.warning }]}>
                {formatCompactMoney(dueSummary.pendingVerification)} pending verify
              </Text>
            </View>
          )}
        </View>

        <View style={styles.dueMainContainer}>
          <Text style={styles.dueLabel}>Pending Due</Text>
          <Text style={styles.dueAmount}>{formatMoney(dueSummary.due)}</Text>

          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.min(paidPercentage, 100)}%`,
                    backgroundColor:
                      paidPercentage < 30 ? Colors.error : Colors.warning,
                  },
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {paidPercentage.toFixed(1)}% paid
            </Text>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statBlock}>
            <MaterialIcons
              name="receipt"
              size={14}
              color={Colors.textSecondary}
            />
            <View style={styles.statBlockContent}>
              <Text style={styles.statBlockLabel}>Total Bill</Text>
              <Text style={styles.statBlockValue}>
                {formatCompactMoney(dueSummary.total)}
              </Text>
            </View>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statBlock}>
            <MaterialIcons
              name="check-circle"
              size={14}
              color={Colors.success}
            />
            <View style={styles.statBlockContent}>
              <Text style={styles.statBlockLabel}>Paid</Text>
              <Text style={[styles.statBlockValue, { color: Colors.success }]}>
                {formatCompactMoney(dueSummary.paid)}
              </Text>
            </View>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statBlock}>
            <MaterialIcons
              name="hourglass-empty"
              size={14}
              color={Colors.warning}
            />
            <View style={styles.statBlockContent}>
              <Text style={styles.statBlockLabel}>Pending</Text>
              <Text style={[styles.statBlockValue, { color: Colors.warning }]}>
                {formatCompactMoney(dueSummary.pendingVerification)}
              </Text>
            </View>
          </View>
        </View>

        <Pressable
          onPress={onViewDues}
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && styles.buttonPressed,
          ]}
        >
          <LinearGradient
            colors={[Colors.primary, Colors.primaryLight || Colors.primary]}
            style={styles.buttonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.buttonText}>Open Dues & Payments</Text>
            <MaterialIcons
              name="arrow-forward"
              size={18}
              color={Colors.white}
            />
          </LinearGradient>
        </Pressable>
      </LinearGradient>
    </Animated.View>
  );
};

// ==================== LIFECYCLE CARD ====================

interface LifecycleCardProps {
  lifecycle: {
    sown: number;
    germinated: number;
    discarded: number;
    pending: number;
  };
  onTrackProducts: () => void;
}

const LifecycleCard = ({ lifecycle, onTrackProducts }: LifecycleCardProps) => {
  const total =
    lifecycle.sown +
    lifecycle.germinated +
    lifecycle.discarded +
    lifecycle.pending;
  const germinationRate =
    lifecycle.sown > 0
      ? ((lifecycle.germinated / lifecycle.sown) * 100).toFixed(1)
      : "0";

  return (
    <Animated.View
      entering={FadeInUp.delay(100).springify().damping(35)}
      style={styles.card}
    >
      <LinearGradient
        colors={[Colors.white, Colors.surface]}
        style={styles.cardGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleContainer}>
            <View
              style={[
                styles.cardIcon,
                { backgroundColor: Colors.success + "10" },
              ]}
            >
              <MaterialIcons name="spa" size={20} color={Colors.success} />
            </View>
            <Text style={styles.cardTitle}>Seed Progress</Text>
          </View>
          <View
            style={[styles.badge, { backgroundColor: Colors.success + "10" }]}
          >
            <Text style={[styles.badgeText, { color: Colors.success }]}>
              {germinationRate}% rate
            </Text>
          </View>
        </View>

        <View style={styles.lifecycleGrid}>
          <View style={styles.lifecycleItem}>
            <View
              style={[
                styles.lifecycleIcon,
                { backgroundColor: Colors.primary + "10" },
              ]}
            >
              <MaterialIcons name="grass" size={16} color={Colors.primary} />
            </View>
            <Text style={styles.lifecycleValue}>
              {formatCount(lifecycle.sown)}
            </Text>
            <Text style={styles.lifecycleLabel}>Seeds Given</Text>
          </View>

          <View style={styles.lifecycleItem}>
            <View
              style={[
                styles.lifecycleIcon,
                { backgroundColor: Colors.success + "10" },
              ]}
            >
              <MaterialIcons name="spa" size={16} color={Colors.success} />
            </View>
            <Text style={styles.lifecycleValue}>
              {formatCount(lifecycle.germinated)}
            </Text>
            <Text style={styles.lifecycleLabel}>Germinated</Text>
          </View>

          <View style={styles.lifecycleItem}>
            <View
              style={[
                styles.lifecycleIcon,
                { backgroundColor: Colors.error + "10" },
              ]}
            >
              <MaterialIcons name="delete" size={16} color={Colors.error} />
            </View>
            <Text style={styles.lifecycleValue}>
              {formatCount(lifecycle.discarded)}
            </Text>
            <Text style={styles.lifecycleLabel}>Loss</Text>
          </View>

          <View style={styles.lifecycleItem}>
            <View
              style={[
                styles.lifecycleIcon,
                { backgroundColor: Colors.warning + "10" },
              ]}
            >
              <MaterialIcons name="pending" size={16} color={Colors.warning} />
            </View>
            <Text style={styles.lifecycleValue}>
              {formatCount(lifecycle.pending)}
            </Text>
            <Text style={styles.lifecycleLabel}>In Nursery</Text>
          </View>
        </View>

        <Pressable
          onPress={onTrackProducts}
          style={({ pressed }) => [
            styles.secondaryButton,
            pressed && styles.buttonPressed,
          ]}
        >
          <Text style={styles.secondaryButtonText}>View Seed Progress</Text>
          <MaterialIcons
            name="arrow-forward"
            size={16}
            color={Colors.primary}
          />
        </Pressable>
      </LinearGradient>
    </Animated.View>
  );
};

// ==================== CONTACT & PAYMENT CARD ====================

interface ContactCardProps {
  profile: NurseryPublicProfile;
  onPayWithUpi: () => void;
  onCopyUpi: () => void;
  onUploadProof: () => void;
  onSaveQr: () => void;
  onOpenWhatsApp: () => void;
  onCallPhone: (phone?: string) => void;
  onOpenEmail: (email?: string) => void;
  onOpenExternal: (url?: string) => void;
}

const ContactCard = ({
  profile,
  onPayWithUpi,
  onCopyUpi,
  onUploadProof,
  onSaveQr,
  onOpenWhatsApp,
  onCallPhone,
  onOpenEmail,
  onOpenExternal,
}: ContactCardProps) => {
  const paymentConfig = profile.paymentConfig || {};
  const contactDetails = Array.isArray(profile.contactDetails)
    ? profile.contactDetails
    : [];

  const primaryContact = contactDetails[0];
  const primaryPhone = profile.primaryPhone || primaryContact?.phoneNumber;
  const whatsappPhone = profile.whatsappPhone || primaryContact?.whatsappNumber;
  const primaryEmail = primaryContact?.email;

  const hasContactInfo =
    profile.upiId ||
    profile.qrImageUrl ||
    primaryPhone ||
    profile.secondaryPhone ||
    whatsappPhone ||
    primaryEmail ||
    paymentConfig.beneficiaryName ||
    paymentConfig.bankName ||
    paymentConfig.accountNumber ||
    paymentConfig.ifscCode ||
    paymentConfig.paymentNotes ||
    profile.website ||
    profile.facebook ||
    profile.instagram ||
    profile.youtube ||
    contactDetails.length > 0;

  return (
    <Animated.View
      entering={FadeInUp.delay(200).springify().damping(35)}
      style={styles.card}
    >
      <LinearGradient
        colors={[Colors.white, Colors.surface]}
        style={styles.cardGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleContainer}>
            <View
              style={[styles.cardIcon, { backgroundColor: Colors.info + "10" }]}
            >
              <MaterialIcons name="payments" size={20} color={Colors.info} />
            </View>
            <Text style={styles.cardTitle}>Pay & Contact</Text>
          </View>
        </View>

        {profile.qrImageUrl ? (
          <View style={styles.qrContainer}>
            <Image
              source={{ uri: profile.qrImageUrl }}
              style={styles.qrImage}
              contentFit="contain"
              transition={300}
            />
            <Text style={styles.qrHint}>Scan to pay</Text>
          </View>
        ) : null}

        {profile.upiId && (
          <View style={styles.upiContainer}>
            <MaterialIcons name="qr-code" size={16} color={Colors.primary} />
            <Text style={styles.upiText} numberOfLines={1}>
              {profile.upiId}
            </Text>
          </View>
        )}

        <View style={styles.buttonGrid}>
          <Pressable
            onPress={onPayWithUpi}
            style={({ pressed }) => [
              styles.gridButton,
              styles.primaryGridButton,
              pressed && styles.buttonPressed,
            ]}
          >
            <MaterialIcons name="payments" size={18} color={Colors.white} />
            <Text style={styles.gridButtonText}>Pay via UPI</Text>
          </Pressable>

          <Pressable
            onPress={onCopyUpi}
            style={({ pressed }) => [
              styles.gridButton,
              styles.outlineGridButton,
              pressed && styles.buttonPressed,
            ]}
          >
            <MaterialIcons
              name="content-copy"
              size={18}
              color={Colors.primary}
            />
            <Text style={styles.outlineGridButtonText}>Copy UPI</Text>
          </Pressable>
        </View>

        <View style={styles.buttonGrid}>
          <Pressable
            onPress={onUploadProof}
            style={({ pressed }) => [
              styles.gridButton,
              styles.outlineGridButton,
              pressed && styles.buttonPressed,
            ]}
          >
            <MaterialIcons
              name="upload-file"
              size={18}
              color={Colors.primary}
            />
            <Text style={styles.outlineGridButtonText}>Upload Proof</Text>
          </Pressable>

          <Pressable
            onPress={onSaveQr}
            style={({ pressed }) => [
              styles.gridButton,
              styles.outlineGridButton,
              pressed && styles.buttonPressed,
            ]}
          >
            <MaterialIcons name="save-alt" size={18} color={Colors.primary} />
            <Text style={styles.outlineGridButtonText}>Save QR</Text>
          </Pressable>
        </View>

        {hasContactInfo && (
          <View style={styles.contactInfo}>
            {primaryPhone && (
              <Pressable
                onPress={() => onCallPhone(primaryPhone)}
                style={styles.contactRow}
              >
                <MaterialIcons
                  name="phone"
                  size={14}
                  color={Colors.textSecondary}
                />
                <Text style={[styles.contactText, styles.linkText]}>
                  Call: {primaryPhone}
                </Text>
              </Pressable>
            )}
            {profile.secondaryPhone && (
              <Pressable
                onPress={() => onCallPhone(profile.secondaryPhone)}
                style={styles.contactRow}
              >
                <MaterialIcons
                  name="phone-android"
                  size={14}
                  color={Colors.textSecondary}
                />
                <Text style={[styles.contactText, styles.linkText]}>
                  Alt: {profile.secondaryPhone}
                </Text>
              </Pressable>
            )}
            {whatsappPhone && (
              <Pressable onPress={onOpenWhatsApp} style={styles.contactRow}>
                <MaterialIcons name="chat" size={14} color={Colors.success} />
                <Text style={[styles.contactText, styles.linkText]}>
                  WhatsApp: {whatsappPhone}
                </Text>
              </Pressable>
            )}
            {primaryEmail && (
              <Pressable
                onPress={() => onOpenEmail(primaryEmail)}
                style={styles.contactRow}
              >
                <MaterialIcons
                  name="email"
                  size={14}
                  color={Colors.textSecondary}
                />
                <Text style={[styles.contactText, styles.linkText]}>
                  Email: {primaryEmail}
                </Text>
              </Pressable>
            )}
          </View>
        )}

        {(paymentConfig.beneficiaryName ||
          paymentConfig.bankName ||
          paymentConfig.accountNumber ||
          paymentConfig.ifscCode) && (
          <View style={styles.detailsCard}>
            <Text style={styles.detailsTitle}>Bank & Payment Details</Text>
            {paymentConfig.beneficiaryName && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Beneficiary</Text>
                <Text style={styles.detailValue}>{paymentConfig.beneficiaryName}</Text>
              </View>
            )}
            {paymentConfig.bankName && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Bank</Text>
                <Text style={styles.detailValue}>{paymentConfig.bankName}</Text>
              </View>
            )}
            {paymentConfig.accountNumber && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Account</Text>
                <Text style={styles.detailValue}>{paymentConfig.accountNumber}</Text>
              </View>
            )}
            {paymentConfig.ifscCode && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>IFSC</Text>
                <Text style={styles.detailValue}>{paymentConfig.ifscCode}</Text>
              </View>
            )}
          </View>
        )}

        {contactDetails.length > 0 && (
          <View style={styles.detailsCard}>
            <Text style={styles.detailsTitle}>Contact Directory</Text>
            {contactDetails.map((contact) => (
              <View key={contact.id || `${contact.label}-${contact.phoneNumber}`} style={styles.contactDetailCard}>
                {contact.label ? (
                  <Text style={styles.contactDetailTitle}>{contact.label}</Text>
                ) : null}
                {contact.phoneNumber ? (
                  <Pressable
                    onPress={() => onCallPhone(contact.phoneNumber)}
                    style={styles.contactRow}
                  >
                    <MaterialIcons name="phone" size={14} color={Colors.textSecondary} />
                    <Text style={[styles.contactText, styles.linkText]}>
                      {contact.phoneNumber}
                    </Text>
                  </Pressable>
                ) : null}
                {contact.whatsappNumber ? (
                  <Pressable
                    onPress={() => onOpenExternal(`https://wa.me/${digitsOnly(contact.whatsappNumber)}`)}
                    style={styles.contactRow}
                  >
                    <MaterialIcons name="chat" size={14} color={Colors.success} />
                    <Text style={[styles.contactText, styles.linkText]}>
                      WhatsApp: {contact.whatsappNumber}
                    </Text>
                  </Pressable>
                ) : null}
                {contact.email ? (
                  <Pressable
                    onPress={() => onOpenEmail(contact.email)}
                    style={styles.contactRow}
                  >
                    <MaterialIcons name="email" size={14} color={Colors.textSecondary} />
                    <Text style={[styles.contactText, styles.linkText]}>{contact.email}</Text>
                  </Pressable>
                ) : null}
                {contact.address ? (
                  <View style={styles.contactRow}>
                    <MaterialIcons name="location-on" size={14} color={Colors.textSecondary} />
                    <Text style={styles.contactText}>{contact.address}</Text>
                  </View>
                ) : null}
              </View>
            ))}
          </View>
        )}

        {(profile.website || profile.facebook || profile.instagram || profile.youtube) && (
          <View style={styles.detailsCard}>
            <Text style={styles.detailsTitle}>Web & Social</Text>
            {profile.website && (
              <Pressable
                onPress={() => onOpenExternal(profile.website)}
                style={styles.contactRow}
              >
                <MaterialIcons name="language" size={14} color={Colors.textSecondary} />
                <Text style={[styles.contactText, styles.linkText]}>{profile.website}</Text>
              </Pressable>
            )}
            {profile.facebook && (
              <Pressable
                onPress={() => onOpenExternal(profile.facebook)}
                style={styles.contactRow}
              >
                <MaterialIcons name="facebook" size={14} color={Colors.textSecondary} />
                <Text style={[styles.contactText, styles.linkText]}>{profile.facebook}</Text>
              </Pressable>
            )}
            {profile.instagram && (
              <Pressable
                onPress={() => onOpenExternal(profile.instagram)}
                style={styles.contactRow}
              >
                <MaterialIcons name="photo-camera" size={14} color={Colors.textSecondary} />
                <Text style={[styles.contactText, styles.linkText]}>{profile.instagram}</Text>
              </Pressable>
            )}
            {profile.youtube && (
              <Pressable
                onPress={() => onOpenExternal(profile.youtube)}
                style={styles.contactRow}
              >
                <MaterialIcons name="smart-display" size={14} color={Colors.textSecondary} />
                <Text style={[styles.contactText, styles.linkText]}>{profile.youtube}</Text>
              </Pressable>
            )}
          </View>
        )}

        {(profile.notes || paymentConfig.paymentNotes) && (
          <View style={styles.notesContainer}>
            <MaterialIcons name="info" size={14} color={Colors.warning} />
            <Text style={styles.notesText}>
              {profile.notes || paymentConfig.paymentNotes}
            </Text>
          </View>
        )}

        <View style={styles.hintContainer}>
          <MaterialIcons
            name="info-outline"
            size={12}
            color={Colors.textTertiary}
          />
          <Text style={styles.hintText}>
            After payment, upload proof for verification
          </Text>
        </View>
      </LinearGradient>
    </Animated.View>
  );
};

// ==================== MAIN COMPONENT ====================

export default function CustomerDashboard() {
  const router = useRouter();
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

  const dueSummary =
    data?.dueSummary ||
    ({
      total: 0,
      paid: 0,
      due: 0,
      partialCount: 0,
      pendingVerification: 0,
    } as const);

  const lifecycle = data?.lifecycle || {
    sown: 0,
    germinated: 0,
    discarded: 0,
    pending: 0,
  };

  const profile = (data?.nurseryPublicProfile || {}) as NurseryPublicProfile;

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

  const payWithUpi = () => {
    const upiId = String(profile.upiId || "").trim();
    if (!upiId) {
      Alert.alert(
        "UPI not available",
        "Nursery has not configured a UPI ID yet.",
      );
      return;
    }

    const uri = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent("Nursery")}&tn=${encodeURIComponent("PNMS Payment")}`;
    Linking.openURL(uri).catch(() => {
      Alert.alert(
        "UPI app not found",
        "Please use the QR code or your UPI app manually.",
      );
    });
  };

  const openWhatsApp = () => {
    const phone = digitsOnly(profile.whatsappPhone || profile.primaryPhone);
    if (!phone) {
      Alert.alert("WhatsApp not available", "No WhatsApp number configured.");
      return;
    }
    const url = `https://wa.me/${phone}`;
    Linking.openURL(url).catch(() => {
      Alert.alert("Unable to open", "Could not open WhatsApp chat.");
    });
  };

  const openPhoneDialer = (phone?: string) => {
    const raw = String(phone || "").trim();
    if (!raw) {
      Alert.alert("Phone not available", "No phone number is configured.");
      return;
    }
    Linking.openURL(`tel:${raw}`).catch(() => {
      Alert.alert("Unable to call", "Could not open dialer.");
    });
  };

  const openEmail = (email?: string) => {
    const raw = String(email || "").trim();
    if (!raw) {
      Alert.alert("Email not available", "No email is configured.");
      return;
    }
    Linking.openURL(`mailto:${raw}`).catch(() => {
      Alert.alert("Unable to open", "Could not open email app.");
    });
  };

  const openExternalLink = (url?: string) => {
    const raw = String(url || "").trim();
    if (!raw) return;
    const normalized = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    Linking.openURL(normalized).catch(() => {
      Alert.alert("Unable to open", "Could not open this link.");
    });
  };

  const copyUpiId = async () => {
    const upiId = String(profile.upiId || "").trim();
    if (!upiId) {
      Alert.alert(
        "UPI not available",
        "Nursery has not configured a UPI ID yet.",
      );
      return;
    }
    try {
      const Clipboard = require("expo-clipboard");
      await Clipboard.setStringAsync(upiId);
      Alert.alert("Copied", "UPI ID copied to clipboard.");
    } catch {
      Alert.alert(
        "Copy unavailable",
        "Clipboard support is unavailable on this build.",
      );
    }
  };

  const saveOrShareQr = async () => {
    const qrUrl = String(profile.qrImageUrl || "").trim();
    if (!qrUrl) {
      Alert.alert(
        "QR not available",
        "Nursery has not uploaded a QR image yet.",
      );
      return;
    }
    try {
      const FileSystem = require("expo-file-system");
      const Sharing = require("expo-sharing");
      const ext = qrUrl.toLowerCase().includes(".png") ? "png" : "jpg";
      const fileUri = `${FileSystem.cacheDirectory}pnms_qr_${Date.now()}.${ext}`;
      await FileSystem.downloadAsync(qrUrl, fileUri);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          dialogTitle: "Save or share payment QR",
          mimeType: ext === "png" ? "image/png" : "image/jpeg",
          UTI: ext === "png" ? "public.png" : "public.jpeg",
        });
      } else if (Platform.OS === "web") {
        window.open(qrUrl, "_blank");
      } else {
        Alert.alert("Share unavailable", "Unable to open save/share dialog.");
      }
    } catch {
      Alert.alert("Unable to save", "Could not download QR image right now.");
    }
  };

  return (
    <View style={styles.container}>
      <FixedHeader
        title="Customer Dashboard"
        subtitle={`Welcome, ${user?.name || "Customer"}`}
        titleStyle={styles.headerTitle}
        userName={user?.name || "Customer"}
        userRoleLabel="Customer"
        onLogout={handleLogout}
        actions={
          <Pressable
            style={({ pressed }) => [
              styles.headerIconBtn,
              pressed && styles.headerIconBtnPressed,
            ]}
            onPress={() => refetch()}
          >
            <MaterialIcons
              name={isRefetching ? "sync" : "refresh"}
              size={20}
              color={Colors.white}
            />
          </Pressable>
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* Banners Section */}
        {Array.isArray(data?.banners) && data.banners.length > 0 ? (
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            decelerationRate="fast"
            snapToInterval={BANNER_CARD_WIDTH + Spacing.md}
            style={styles.bannerScroll}
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
        ) : (
          <Animated.View
            entering={FadeInDown.springify()}
            style={styles.emptyBanner}
          >
            <MaterialIcons
              name="campaign"
              size={32}
              color={Colors.textTertiary}
            />
            <Text style={styles.emptyBannerText}>
              No active offers right now
            </Text>
          </Animated.View>
        )}

        {/* Payment Summary Card */}
        <PaymentSummaryCard
          dueSummary={dueSummary}
          onViewDues={() => router.push("/(customer)/dues" as any)}
        />

        {/* Lifecycle Card */}
        <LifecycleCard
          lifecycle={lifecycle}
          onTrackProducts={() => router.push("/(customer)/seeds" as any)}
        />

        {/* Contact & Payment Card */}
        <ContactCard
          profile={profile}
          onPayWithUpi={payWithUpi}
          onCopyUpi={copyUpiId}
          onUploadProof={() => router.push("/(customer)/dues" as any)}
          onSaveQr={saveOrShareQr}
          onOpenWhatsApp={openWhatsApp}
          onCallPhone={openPhoneDialer}
          onOpenEmail={openEmail}
          onOpenExternal={openExternalLink}
        />

        {/* Loading Indicator */}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <MaterialIcons name="sync" size={20} color={Colors.primary} />
            <Text style={styles.loadingText}>Loading latest data...</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  headerTitle: {
    fontSize: 24,
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.32)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  headerIconBtnPressed: {
    backgroundColor: "rgba(255,255,255,0.2)",
    transform: [{ scale: 0.95 }],
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: 100,
    gap: Spacing.md,
  },

  // Banner Styles
  bannerScroll: {
    marginBottom: Spacing.sm,
  },
  bannerCard: {
    width: BANNER_CARD_WIDTH,
    marginRight: Spacing.md,
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
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
    color: Colors.white,
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
    color: Colors.white,
    fontWeight: "600",
    fontSize: 13,
  },
  emptyBanner: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
    backgroundColor: Colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 8,
  },
  emptyBannerText: {
    color: Colors.textSecondary,
    fontSize: 14,
  },

  // Card Styles
  card: {
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: Colors.white,
    shadowColor: Colors.shadow,
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
    borderColor: "#E5E7EB",
    backgroundColor: Colors.white,
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
    color: Colors.error,
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
    color: Colors.white,
    fontSize: 14,
    fontWeight: "600",
  },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 12,
    backgroundColor: "transparent",
    gap: Spacing.sm,
  },
  secondaryButtonText: {
    color: Colors.primary,
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
    color: Colors.primary,
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
    backgroundColor: Colors.primary,
  },
  outlineGridButton: {
    borderWidth: 1,
    borderColor: Colors.primary,
    backgroundColor: "transparent",
  },
  gridButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.white,
  },
  outlineGridButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.primary,
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
    backgroundColor: Colors.white,
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
    color: Colors.primary,
    textDecorationLine: "underline",
  },
  notesContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    backgroundColor: Colors.warning + "10",
    borderRadius: 8,
    padding: Spacing.sm,
    marginTop: Spacing.sm,
  },
  notesText: {
    flex: 1,
    fontSize: 12,
    color: Colors.warning,
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
