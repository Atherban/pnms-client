import { MaterialIcons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { NurseryContactCard } from "../../components/customer/NurseryContactCard";
import { CustomerActionButton } from "../../components/customer/CustomerActionButton";
import { StitchHeaderActionButton } from "../../components/common/StitchHeader";
import {
  CustomerCard,
  CustomerEmptyState,
  CustomerScreen,
  SectionHeader,
  StatPill,
  StatusChip,
} from "../../components/common/StitchScreen";
import { AuthService } from "../../services/auth.service";
import { CustomerService } from "../../services/customer.service";
import { NurseryPublicProfileService } from "../../services/nursery-public-profile.service";
import { PaymentService } from "../../services/payment.service";
import { SalesService } from "../../services/sales.service";
import { useAuthStore } from "../../stores/auth.store";
import { CustomerColors, Spacing } from "../../theme";
import type { NurseryPublicProfile } from "../../types/public-profile.types";
import { saveUser } from "../../utils/storage";

const INDIAN_PHONE_PATTERN = /^(?:\+91|91)?[6-9]\d{9}$/;
const digitsOnly = (value?: string) => (value || "").replace(/[^\d]/g, "");
const toNumber = (value: unknown) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};
const formatMoney = (amount: number) => `₹${Math.round(amount).toLocaleString("en-IN")}`;
const formatCount = (value: number) => Math.round(value).toLocaleString("en-IN");

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = "default",
  multiline = false,
  secureTextEntry = false,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  keyboardType?: "default" | "email-address" | "phone-pad";
  multiline?: boolean;
  secureTextEntry?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={CustomerColors.textMuted}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        multiline={multiline}
        style={[styles.fieldInput, multiline && styles.fieldInputMultiline]}
      />
    </View>
  );
}

function ActionRow({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  title: string;
  subtitle?: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.actionRow, pressed && styles.actionRowPressed]}>
      <View style={styles.actionIcon}>
        <MaterialIcons name={icon} size={20} color={CustomerColors.primary} />
      </View>
      <View style={styles.actionTextWrap}>
        <Text style={styles.actionTitle}>{title}</Text>
        {subtitle ? <Text style={styles.actionSubtitle}>{subtitle}</Text> : null}
      </View>
      <MaterialIcons name="chevron-right" size={22} color={CustomerColors.textMuted} />
    </Pressable>
  );
}

export default function CustomerProfileScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const updateAuthUser = useAuthStore((s) => s.updateUser);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const [refreshing, setRefreshing] = useState(false);

  const [name, setName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [address, setAddress] = useState("");

  const [showPasswordFields, setShowPasswordFields] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["customer-profile", user?.id],
    queryFn: CustomerService.getMyProfile,
  });

  const { data: nurseryProfile } = useQuery({
    queryKey: ["customer-nursery-public-profile", user?.nurseryId],
    enabled: !!user?.nurseryId,
    queryFn: () => NurseryPublicProfileService.get(user?.nurseryId),
  });

  const { data: statsData, refetch: refetchStats } = useQuery({
    queryKey: ["customer-profile-stats", user?.id, user?.phoneNumber, user?.nurseryId],
    queryFn: async () => {
      const [dueSummary, sales] = await Promise.all([
        PaymentService.getCustomerDueOverview({
          id: user?.id,
          phoneNumber: user?.phoneNumber,
          role: user?.role,
          nurseryId: user?.nurseryId,
        }).catch(() => ({
          total: 0,
          paid: 0,
          due: 0,
          partialCount: 0,
          pendingVerification: 0,
        })),
        SalesService.getAll({
          nurseryId: user?.nurseryId,
          customerId: user?.id,
          customerPhone: user?.phoneNumber,
        }).catch(() => []),
      ]);

      const rows = Array.isArray(sales) ? sales : [];
      const productKeys = new Set<string>();
      for (const sale of rows) {
        const items = Array.isArray((sale as any)?.items) ? (sale as any).items : [];
        for (const item of items) {
          const id = String(
            item?.inventory?._id ||
              item?.inventoryId ||
              item?.plantType?._id ||
              item?.name ||
              "",
          ).trim();
          if (id) productKeys.add(id);
        }
      }

      return {
        orders: rows.length,
        dues: Math.max(0, toNumber((dueSummary as any)?.due)),
        paid: Math.max(0, toNumber((dueSummary as any)?.paid)),
        products: productKeys.size,
      };
    },
  });

  useEffect(() => {
    if (!data) return;
    setName(data?.name || "");
    setMobileNumber(data?.mobileNumber || "");
    setAddress(data?.address || "");
  }, [data]);

  const initials = useMemo(() => {
    const label = (name || user?.name || "Customer").trim();
    const parts = label.split(" ").filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
    return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
  }, [name, user?.name]);

  const handleRefresh = async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Promise.all([refetch(), refetchStats()]);
    setRefreshing(false);
  };

  const payWithUpi = () => {
    const upiId = String(nurseryProfile?.upiId || "").trim();
    if (!upiId) {
      Alert.alert("UPI not available", "Nursery has not configured a UPI ID yet.");
      return;
    }
    const uri = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent("Nursery")}&tn=${encodeURIComponent("PNMS Payment")}`;
    Linking.openURL(uri).catch(() => {
      Alert.alert("UPI app not found", "Please use the QR code or your UPI app manually.");
    });
  };

  const copyUpiId = async () => {
    const upiId = String(nurseryProfile?.upiId || "").trim();
    if (!upiId) {
      Alert.alert("UPI not available", "Nursery has not configured a UPI ID yet.");
      return;
    }
    try {
      const Clipboard = await import("expo-clipboard");
      await Clipboard.setStringAsync(upiId);
      Alert.alert("Copied", "UPI ID copied to clipboard.");
    } catch {
      Alert.alert("Copy unavailable", "Clipboard support is unavailable on this build.");
    }
  };

  const saveOrShareQr = async () => {
    const qrUrl = String(nurseryProfile?.qrImageUrl || "").trim();
    if (!qrUrl) {
      Alert.alert("QR not available", "Nursery has not uploaded a QR image yet.");
      return;
    }
    try {
      const FileSystem = await import("expo-file-system");
      const Sharing = await import("expo-sharing");
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

  const openWhatsApp = () => {
    const phone = digitsOnly(nurseryProfile?.whatsappPhone || nurseryProfile?.primaryPhone);
    if (!phone) {
      Alert.alert("WhatsApp not available", "No WhatsApp number configured.");
      return;
    }
    Linking.openURL(`https://wa.me/91${phone}`).catch(() => {
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

  const saveProfileMutation = useMutation({
    mutationFn: async () => {
      const payload: { name?: string; mobileNumber?: string; address?: string } = {};
      const nextName = name.trim();
      const nextMobile = mobileNumber.trim();
      const nextAddress = address.trim();

      if (!nextName || nextName.length < 2) {
        throw new Error("Please enter your full name");
      }
      if (nextMobile && !INDIAN_PHONE_PATTERN.test(nextMobile)) {
        throw new Error("Enter a valid Indian mobile number");
      }

      payload.name = nextName;
      payload.mobileNumber = nextMobile || undefined;
      payload.address = nextAddress || undefined;

      return CustomerService.updateMyProfile(payload);
    },
    onSuccess: async (response: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      const profile = response?.data ?? response;
      const nextName = String(profile?.name || name || "").trim();
      const nextPhone = String(profile?.mobileNumber || mobileNumber || "").trim();

      updateAuthUser({
        name: nextName,
        phoneNumber: nextPhone || undefined,
      });

      await saveUser({
        _id: user?.id,
        name: nextName,
        email: user?.email,
        role: user?.role,
        phoneNumber: nextPhone || undefined,
        nurseryId: user?.nurseryId,
        allowedNurseryIds: user?.allowedNurseryIds,
      });

      await queryClient.invalidateQueries({ queryKey: ["customer-profile"] });
      Alert.alert("Success", "Profile details updated successfully.");
    },
    onError: (err: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Error", err?.message || "Please try again");
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async () => {
      if (!currentPassword.trim() || !newPassword.trim()) {
        throw new Error("Enter current and new password");
      }
      if (newPassword.length < 5) {
        throw new Error("New password should be at least 5 characters");
      }
      if (newPassword !== confirmPassword) {
        throw new Error("New password and confirm password do not match");
      }
      if (currentPassword === newPassword) {
        throw new Error("New password must be different from current password");
      }

      return AuthService.changePassword({
        currentPassword: currentPassword.trim(),
        newPassword: newPassword.trim(),
      });
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowPasswordFields(false);
      Alert.alert("Success", "Your password has been changed successfully.");
    },
    onError: (err: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Error", err?.message || "Please try again");
    },
  });

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

  const nurseryProfileSafe = (nurseryProfile || {}) as NurseryPublicProfile;

  return (
    <CustomerScreen
      title="Profile"
      subtitle="Manage your account and nursery contact details."
      actions={
        <StitchHeaderActionButton
          iconName={isRefetching ? "sync" : "refresh"}
          onPress={() => handleRefresh()}
        />
      }
      refreshControl={
        <RefreshControl
          refreshing={refreshing || isRefetching}
          onRefresh={handleRefresh}
          colors={[CustomerColors.primary]}
          tintColor={CustomerColors.primary}
        />
      }
      footer={
        <CustomerActionButton
          label="Log Out"
          variant="secondary"
          onPress={handleLogout}
          icon={<MaterialIcons name="logout" size={18} color={CustomerColors.text} />}
        />
      }
    >
      <CustomerCard style={styles.heroCard}>
        <View style={styles.heroTop}>
          <View style={styles.avatarWrap}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.heroText}>
            <Text style={styles.heroName} numberOfLines={1}>
              {name || user?.name || "Customer"}
            </Text>
            {user?.email ? <Text style={styles.heroEmail}>{user.email}</Text> : null}
          </View>
          <StatusChip label="Customer" tone="info" />
        </View>

        <View style={styles.statsPills}>
          <StatPill label="Orders" value={statsData ? formatCount(statsData.orders) : "—"} />
          <StatPill label="Products" value={statsData ? formatCount(statsData.products) : "—"} />
          <StatPill label="Paid" value={statsData ? formatMoney(statsData.paid) : "—"} />
        </View>
        <View style={styles.statsPills}>
          <StatPill label="Dues" value={statsData ? formatMoney(statsData.dues) : "—"} />
          <StatPill label="Refresh" value={isLoading ? "..." : "OK"} />
        </View>
      </CustomerCard>

      <CustomerCard style={styles.sectionCard}>
        <SectionHeader title="Personal details" subtitle="These details are used for invoices and nursery contact." />

        {isLoading ? (
          <View style={styles.loadingInline}>
            <ActivityIndicator size="small" color={CustomerColors.primary} />
            <Text style={styles.loadingText}>Loading profile...</Text>
          </View>
        ) : null}

        {!isLoading && !data ? (
          <CustomerEmptyState
            title="Profile unavailable"
            message="We could not load your profile right now. Pull to refresh and try again."
            icon={<MaterialIcons name="error-outline" size={44} color={CustomerColors.danger} />}
          />
        ) : null}

        <Field
          label="Full name"
          value={name}
          onChangeText={setName}
          placeholder="Enter your full name"
        />
        <Field
          label="Mobile number"
          value={mobileNumber}
          onChangeText={setMobileNumber}
          placeholder="Enter mobile number"
          keyboardType="phone-pad"
        />
        <Field
          label="Address"
          value={address}
          onChangeText={setAddress}
          placeholder="Enter your address"
          multiline
        />

        <CustomerActionButton
          label={saveProfileMutation.isPending ? "Saving..." : "Save profile"}
          onPress={() => saveProfileMutation.mutate()}
          icon={<MaterialIcons name="check-circle" size={18} color={CustomerColors.white} />}
        />
      </CustomerCard>

      <CustomerCard style={styles.sectionCard}>
        <SectionHeader
          title="Password and security"
          subtitle="Update your password for this account."
          trailing={
            <CustomerActionButton
              label={showPasswordFields ? "Hide" : "Update"}
              variant="secondary"
              onPress={() => setShowPasswordFields((prev) => !prev)}
            />
          }
        />

        {showPasswordFields ? (
          <View style={styles.passwordBlock}>
            <Field
              label="Current password"
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholder="Enter current password"
              secureTextEntry
            />
            <Field
              label="New password"
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Enter new password"
              secureTextEntry
            />
            <Field
              label="Confirm password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirm new password"
              secureTextEntry
            />
            <CustomerActionButton
              label={changePasswordMutation.isPending ? "Updating..." : "Update password"}
              onPress={() => changePasswordMutation.mutate()}
              icon={<MaterialIcons name="lock" size={18} color={CustomerColors.white} />}
            />
          </View>
        ) : (
          <Text style={styles.collapsedHint}>Tap update to change your password.</Text>
        )}
      </CustomerCard>

      {user?.nurseryId ? (
        <NurseryContactCard
          profile={nurseryProfileSafe}
          onPayWithUpi={payWithUpi}
          onCopyUpi={copyUpiId}
          onUploadProof={() => router.push("/(customer)/dues" as any)}
          onSaveQr={saveOrShareQr}
          onOpenWhatsApp={openWhatsApp}
          onCallPhone={openPhoneDialer}
          onOpenEmail={openEmail}
          onOpenExternal={openExternalLink}
        />
      ) : null}

      <CustomerCard>
        <SectionHeader title="Quick actions" subtitle="Jump to common screens." />
        <View style={styles.actionsList}>
          <ActionRow
            icon="receipt-long"
            title="Payments"
            subtitle="Dues, proofs and verification"
            onPress={() => router.push("/(customer)/dues" as any)}
          />
          <ActionRow
            icon="local-florist"
            title="My Products"
            subtitle="Product-wise purchase history"
            onPress={() => router.push("/(customer)/products" as any)}
          />
          <ActionRow
            icon="inventory-2"
            title="Seed Progress"
            subtitle="Track seed batch lifecycle"
            onPress={() => router.push("/(customer)/seeds" as any)}
          />
          <ActionRow
            icon="notifications"
            title="Notifications"
            subtitle="Updates and reminders"
            onPress={() => router.push("/(customer)/notifications" as any)}
          />
        </View>
      </CustomerCard>
    </CustomerScreen>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    gap: Spacing.md,
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  avatarWrap: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: "rgba(15,189,73,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 18,
    fontWeight: "800",
    color: CustomerColors.primary,
  },
  heroText: {
    flex: 1,
    gap: 4,
  },
  heroName: {
    fontSize: 17,
    fontWeight: "800",
    color: CustomerColors.text,
  },
  heroEmail: {
    color: CustomerColors.textMuted,
  },
  statsPills: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  sectionCard: {
    gap: Spacing.md,
  },
  loadingInline: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  loadingText: {
    color: CustomerColors.textMuted,
  },
  field: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: CustomerColors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  fieldInput: {
    minHeight: 52,
    borderRadius: 16,
    paddingHorizontal: Spacing.md,
    backgroundColor: "rgba(15,189,73,0.05)",
    borderWidth: 1,
    borderColor: CustomerColors.borderStrong,
    color: CustomerColors.text,
  },
  fieldInputMultiline: {
    minHeight: 96,
    paddingTop: Spacing.md,
    textAlignVertical: "top",
  },
  passwordBlock: {
    gap: Spacing.md,
  },
  collapsedHint: {
    color: CustomerColors.textMuted,
    lineHeight: 20,
  },
  actionsList: {
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: 18,
    backgroundColor: "rgba(15,189,73,0.05)",
    borderWidth: 1,
    borderColor: CustomerColors.borderStrong,
  },
  actionRowPressed: {
    opacity: 0.95,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(15,189,73,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  actionTextWrap: {
    flex: 1,
    gap: 4,
  },
  actionTitle: {
    fontWeight: "800",
    color: CustomerColors.text,
  },
  actionSubtitle: {
    fontSize: 12,
    color: CustomerColors.textMuted,
  },
});
