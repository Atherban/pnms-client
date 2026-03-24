import { MaterialIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";

import { CustomerActionButton } from "./CustomerActionButton";
import { CustomerCard } from "../common/StitchScreen";
import type { NurseryPublicProfile } from "../../types/public-profile.types";
import { CustomerColors, Spacing } from "../../theme";

const digitsOnly = (value?: string) => (value || "").replace(/[^\d]/g, "");

interface NurseryContactCardProps {
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

export function NurseryContactCard({
  profile,
  onPayWithUpi,
  onCopyUpi,
  onUploadProof,
  onSaveQr,
  onOpenWhatsApp,
  onCallPhone,
  onOpenEmail,
  onOpenExternal,
}: NurseryContactCardProps) {
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
      <CustomerCard style={styles.cardSurface}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleContainer}>
            <View
              style={[styles.cardIcon, { backgroundColor: "rgba(14,165,233,0.12)" }]}
            >
              <MaterialIcons name="payments" size={20} color={CustomerColors.info} />
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

        {profile.upiId ? (
          <View style={styles.upiContainer}>
            <MaterialIcons name="qr-code" size={16} color={CustomerColors.primary} />
            <Text style={styles.upiText} numberOfLines={1}>
              {profile.upiId}
            </Text>
          </View>
        ) : null}

        <View style={styles.buttonGrid}>
          <CustomerActionButton
            onPress={onPayWithUpi}
            style={[styles.gridButton, styles.primaryGridButton]}
            icon={<MaterialIcons name="payments" size={18} color={CustomerColors.white} />}
            label="Pay via UPI"
          />

          <CustomerActionButton
            onPress={onCopyUpi}
            variant="secondary"
            style={[styles.gridButton, styles.outlineGridButton]}
            icon={<MaterialIcons name="content-copy" size={18} color={CustomerColors.primary} />}
            label="Copy UPI"
          />
        </View>

        <View style={styles.buttonGrid}>
          <CustomerActionButton
            onPress={onUploadProof}
            variant="secondary"
            style={[styles.gridButton, styles.outlineGridButton]}
            icon={<MaterialIcons name="upload-file" size={18} color={CustomerColors.primary} />}
            label="Upload Proof"
          />

          <CustomerActionButton
            onPress={onSaveQr}
            variant="secondary"
            style={[styles.gridButton, styles.outlineGridButton]}
            icon={<MaterialIcons name="save-alt" size={18} color={CustomerColors.primary} />}
            label="Save QR"
          />
        </View>

        {hasContactInfo ? (
          <View style={styles.contactInfo}>
            {primaryPhone ? (
              <Pressable onPress={() => onCallPhone(primaryPhone)} style={styles.contactRow}>
                <MaterialIcons name="phone" size={14} color={CustomerColors.textMuted} />
                <Text style={[styles.contactText, styles.linkText]}>Call: {primaryPhone}</Text>
              </Pressable>
            ) : null}
            {profile.secondaryPhone ? (
              <Pressable
                onPress={() => onCallPhone(profile.secondaryPhone)}
                style={styles.contactRow}
              >
                <MaterialIcons name="phone-android" size={14} color={CustomerColors.textMuted} />
                <Text style={[styles.contactText, styles.linkText]}>
                  Alt: {profile.secondaryPhone}
                </Text>
              </Pressable>
            ) : null}
            {whatsappPhone ? (
              <Pressable onPress={onOpenWhatsApp} style={styles.contactRow}>
                <MaterialIcons name="chat" size={14} color={CustomerColors.success} />
                <Text style={[styles.contactText, styles.linkText]}>
                  WhatsApp: {whatsappPhone}
                </Text>
              </Pressable>
            ) : null}
            {primaryEmail ? (
              <Pressable onPress={() => onOpenEmail(primaryEmail)} style={styles.contactRow}>
                <MaterialIcons name="email" size={14} color={CustomerColors.textMuted} />
                <Text style={[styles.contactText, styles.linkText]}>
                  Email: {primaryEmail}
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {(paymentConfig.beneficiaryName ||
          paymentConfig.bankName ||
          paymentConfig.accountNumber ||
          paymentConfig.ifscCode) ? (
          <View style={styles.detailsCard}>
            <Text style={styles.detailsTitle}>Bank & Payment Details</Text>
            {paymentConfig.beneficiaryName ? (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Beneficiary</Text>
                <Text style={styles.detailValue}>{paymentConfig.beneficiaryName}</Text>
              </View>
            ) : null}
            {paymentConfig.bankName ? (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Bank</Text>
                <Text style={styles.detailValue}>{paymentConfig.bankName}</Text>
              </View>
            ) : null}
            {paymentConfig.accountNumber ? (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Account</Text>
                <Text style={styles.detailValue}>{paymentConfig.accountNumber}</Text>
              </View>
            ) : null}
            {paymentConfig.ifscCode ? (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>IFSC</Text>
                <Text style={styles.detailValue}>{paymentConfig.ifscCode}</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {contactDetails.length > 0 ? (
          <View style={styles.detailsCard}>
            <Text style={styles.detailsTitle}>Contact Directory</Text>
            {contactDetails.map((contact) => (
              <View
                key={contact.id || `${contact.label}-${contact.phoneNumber}`}
                style={styles.contactDetailCard}
              >
                {contact.label ? (
                  <Text style={styles.contactDetailTitle}>{contact.label}</Text>
                ) : null}
                {contact.phoneNumber ? (
                  <Pressable
                    onPress={() => onCallPhone(contact.phoneNumber)}
                    style={styles.contactRow}
                  >
                    <MaterialIcons name="phone" size={14} color={CustomerColors.textMuted} />
                    <Text style={[styles.contactText, styles.linkText]}>{contact.phoneNumber}</Text>
                  </Pressable>
                ) : null}
                {contact.whatsappNumber ? (
                  <Pressable
                    onPress={() =>
                      onOpenExternal(`https://wa.me/91${digitsOnly(contact.whatsappNumber)}`)
                    }
                    style={styles.contactRow}
                  >
                    <MaterialIcons name="chat" size={14} color={CustomerColors.success} />
                    <Text style={[styles.contactText, styles.linkText]}>
                      WhatsApp: {contact.whatsappNumber}
                    </Text>
                  </Pressable>
                ) : null}
                {contact.email ? (
                  <Pressable onPress={() => onOpenEmail(contact.email)} style={styles.contactRow}>
                    <MaterialIcons name="email" size={14} color={CustomerColors.textMuted} />
                    <Text style={[styles.contactText, styles.linkText]}>{contact.email}</Text>
                  </Pressable>
                ) : null}
                {contact.address ? (
                  <View style={styles.contactRow}>
                    <MaterialIcons name="location-on" size={14} color={CustomerColors.textMuted} />
                    <Text style={styles.contactText}>{contact.address}</Text>
                  </View>
                ) : null}
              </View>
            ))}
          </View>
        ) : null}

        {(profile.website || profile.facebook || profile.instagram || profile.youtube) ? (
          <View style={styles.detailsCard}>
            <Text style={styles.detailsTitle}>Web & Social</Text>
            {profile.website ? (
              <Pressable onPress={() => onOpenExternal(profile.website)} style={styles.contactRow}>
                <MaterialIcons name="language" size={14} color={CustomerColors.textMuted} />
                <Text style={[styles.contactText, styles.linkText]}>{profile.website}</Text>
              </Pressable>
            ) : null}
            {profile.facebook ? (
              <Pressable onPress={() => onOpenExternal(profile.facebook)} style={styles.contactRow}>
                <MaterialIcons name="facebook" size={14} color={CustomerColors.textMuted} />
                <Text style={[styles.contactText, styles.linkText]}>{profile.facebook}</Text>
              </Pressable>
            ) : null}
            {profile.instagram ? (
              <Pressable onPress={() => onOpenExternal(profile.instagram)} style={styles.contactRow}>
                <MaterialIcons name="photo-camera" size={14} color={CustomerColors.textMuted} />
                <Text style={[styles.contactText, styles.linkText]}>{profile.instagram}</Text>
              </Pressable>
            ) : null}
            {profile.youtube ? (
              <Pressable onPress={() => onOpenExternal(profile.youtube)} style={styles.contactRow}>
                <MaterialIcons name="smart-display" size={14} color={CustomerColors.textMuted} />
                <Text style={[styles.contactText, styles.linkText]}>{profile.youtube}</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {profile.notes || paymentConfig.paymentNotes ? (
          <View style={styles.notesContainer}>
            <MaterialIcons name="info" size={14} color={CustomerColors.warning} />
            <Text style={styles.notesText}>
              {profile.notes || paymentConfig.paymentNotes}
            </Text>
          </View>
        ) : null}

        <View style={styles.hintContainer}>
          <MaterialIcons name="info-outline" size={12} color={CustomerColors.textMuted} />
          <Text style={styles.hintText}>
            After payment, upload proof for verification
          </Text>
        </View>
      </CustomerCard>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
  },
  cardSurface: {
    borderRadius: 24,
  },
  cardHeader: {
    marginBottom: Spacing.md,
  },
  cardTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: CustomerColors.text,
  },
  qrContainer: {
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  qrImage: {
    width: 180,
    height: 180,
    borderRadius: 20,
    backgroundColor: CustomerColors.surface,
    borderWidth: 1,
    borderColor: CustomerColors.border,
  },
  qrHint: {
    marginTop: Spacing.sm,
    fontSize: 12,
    color: CustomerColors.textMuted,
  },
  upiContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: "rgba(15,189,73,0.08)",
    borderRadius: 14,
    marginBottom: Spacing.md,
  },
  upiText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: CustomerColors.text,
  },
  buttonGrid: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  gridButton: {
    flex: 1,
    minHeight: 48,
  },
  primaryGridButton: {},
  outlineGridButton: {},
  contactInfo: {
    gap: 8,
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  contactText: {
    flex: 1,
    fontSize: 13,
    color: CustomerColors.textMuted,
    lineHeight: 19,
  },
  linkText: {
    color: CustomerColors.primary,
    fontWeight: "600",
  },
  detailsCard: {
    marginTop: Spacing.sm,
    borderWidth: 1,
    borderColor: CustomerColors.borderStrong,
    borderRadius: 16,
    padding: Spacing.md,
    backgroundColor: "rgba(15,189,73,0.04)",
  },
  detailsTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: CustomerColors.text,
    marginBottom: Spacing.sm,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: Spacing.md,
    marginTop: 6,
  },
  detailLabel: {
    fontSize: 13,
    color: CustomerColors.textMuted,
  },
  detailValue: {
    flex: 1,
    textAlign: "right",
    fontSize: 13,
    fontWeight: "600",
    color: CustomerColors.text,
  },
  contactDetailCard: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: CustomerColors.borderStrong,
    gap: 6,
  },
  contactDetailTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: CustomerColors.text,
  },
  notesContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginTop: Spacing.md,
    padding: Spacing.sm,
    borderRadius: 12,
    backgroundColor: "rgba(245,158,11,0.12)",
  },
  notesText: {
    flex: 1,
    fontSize: 12,
    color: CustomerColors.textMuted,
    lineHeight: 18,
  },
  hintContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: Spacing.md,
  },
  hintText: {
    fontSize: 12,
    color: CustomerColors.textMuted,
    textAlign: "center",
  },
});
