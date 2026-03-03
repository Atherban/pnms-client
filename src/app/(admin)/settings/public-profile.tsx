import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Dimensions,
  Platform,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import FixedHeader from "../../../components/common/FixedHeader";
import { MultipartFile } from "../../../services/multipart-upload.service";
import { NurseryPublicProfileService } from "../../../services/nursery-public-profile.service";
import { useAuthStore } from "../../../stores/auth.store";
import { Colors, Spacing } from "../../../theme";
import type {
  NurseryPaymentConfig,
  NurseryPublicContact,
  NurseryPublicProfile,
} from "../../../types/public-profile.types";
import { MaterialIcons } from "@expo/vector-icons";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const BOTTOM_NAV_HEIGHT = 80;

type FieldErrors = Record<string, string>;

type PaymentForm = {
  upiId: string;
  beneficiaryName: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  paymentNotes: string;
};

type ContactForm = {
  label: string;
  phoneNumber: string;
  whatsappNumber: string;
  email: string;
  address: string;
};

const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/i;

const emptyPaymentForm: PaymentForm = {
  upiId: "",
  beneficiaryName: "",
  bankName: "",
  accountNumber: "",
  ifscCode: "",
  paymentNotes: "",
};

const emptyContactForm: ContactForm = {
  label: "",
  phoneNumber: "",
  whatsappNumber: "",
  email: "",
  address: "",
};

const toContactForm = (contact?: NurseryPublicContact): ContactForm => ({
  label: contact?.label || "",
  phoneNumber: contact?.phoneNumber || "",
  whatsappNumber: contact?.whatsappNumber || "",
  email: contact?.email || "",
  address: contact?.address || "",
});

const extractFieldErrors = (err: any): FieldErrors => {
  const details = err?.details ?? err?.response?.data?.details ?? err?.response?.data?.errors;
  const out: FieldErrors = {};
  if (!details) return out;

  if (Array.isArray(details)) {
    details.forEach((item) => {
      const field = item?.field || item?.path || item?.param;
      const message = item?.message || item?.msg;
      if (field && message) out[String(field)] = String(message);
    });
    return out;
  }

  if (typeof details === "object") {
    for (const [key, value] of Object.entries(details)) {
      if (typeof value === "string") out[key] = value;
      else if (Array.isArray(value) && value.length) out[key] = String(value[0]);
      else if (value && typeof value === "object" && "message" in value) {
        out[key] = String((value as any).message);
      }
    }
  }

  return out;
};

const validatePaymentForm = (form: PaymentForm): FieldErrors => {
  const errors: FieldErrors = {};
  if (form.ifscCode.trim() && !IFSC_REGEX.test(form.ifscCode.trim().toUpperCase())) {
    errors.ifscCode = "IFSC must be 4 letters + 0 + 6 alphanumeric characters.";
  }
  return errors;
};

const validateContactForm = (form: ContactForm): FieldErrors => {
  const errors: FieldErrors = {};
  const hasAnyReachableField = Boolean(
    form.phoneNumber.trim() ||
      form.whatsappNumber.trim() ||
      form.email.trim() ||
      form.address.trim(),
  );
  if (!hasAnyReachableField) {
    errors.contact = "Add at least one of phone, WhatsApp, email, or address.";
  }
  if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    errors.email = "Enter a valid email address.";
  }
  return errors;
};

const mapProfileToPaymentForm = (payment?: NurseryPaymentConfig): PaymentForm => ({
  upiId: payment?.upiId || "",
  beneficiaryName: payment?.beneficiaryName || "",
  bankName: payment?.bankName || "",
  accountNumber: payment?.accountNumber || "",
  ifscCode: payment?.ifscCode || "",
  paymentNotes: payment?.paymentNotes || "",
});

const mapContactPayload = (form: ContactForm) => ({
  label: form.label.trim() || undefined,
  phoneNumber: form.phoneNumber.trim() || undefined,
  whatsappNumber: form.whatsappNumber.trim() || undefined,
  email: form.email.trim() || undefined,
  address: form.address.trim() || undefined,
});

// ==================== SNACKBAR COMPONENT ====================

const Snackbar = ({ type, text, onDismiss }: { type: "success" | "error"; text: string; onDismiss: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 2500);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <BlurView
      intensity={90}
      tint={type === "success" ? "light" : "dark"}
      style={[styles.snackbar, type === "success" ? styles.snackSuccess : styles.snackError]}
    >
      <MaterialIcons
        name={type === "success" ? "check-circle" : "error-outline"}
        size={20}
        color={type === "success" ? "#059669" : "#DC2626"}
      />
      <Text style={[styles.snackbarText, { color: type === "success" ? "#059669" : "#DC2626" }]}>
        {text}
      </Text>
    </BlurView>
  );
};

// ==================== PAYMENT SECTION ====================

interface PaymentSectionProps {
  paymentForm: PaymentForm;
  setPaymentForm: (form: PaymentForm) => void;
  paymentErrors: FieldErrors;
  savePaymentMutation: any;
  paymentQrFile: MultipartFile | null;
  setPaymentQrFile: (file: MultipartFile | null) => void;
  paymentQrMutation: any;
  existingQrUrl?: string;
  pickImage: () => Promise<MultipartFile | null>;
}

const PaymentSection = ({
  paymentForm,
  setPaymentForm,
  paymentErrors,
  savePaymentMutation,
  paymentQrFile,
  setPaymentQrFile,
  paymentQrMutation,
  existingQrUrl,
  pickImage,
}: PaymentSectionProps) => {
  const renderError = (key: string) => 
    paymentErrors[key] ? <Text style={styles.errorText}>{paymentErrors[key]}</Text> : null;

  return (
    <View style={styles.card}>
      <View style={styles.sectionHeader}>
        <View style={[styles.sectionIcon, { backgroundColor: `${Colors.primary}10` }]}>
          <MaterialIcons name="payments" size={20} color={Colors.primary} />
        </View>
        <Text style={styles.sectionTitle}>Payment Settings</Text>
      </View>

      {/* UPI ID */}
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>UPI ID</Text>
        <View style={styles.inputContainer}>
          <MaterialIcons name="qr-code" size={18} color="#9CA3AF" />
          <TextInput
            value={paymentForm.upiId}
            onChangeText={(v) => setPaymentForm({ ...paymentForm, upiId: v })}
            style={styles.input}
            placeholder="e.g., nursery@okhdfcbank"
            placeholderTextColor="#9CA3AF"
            autoCapitalize="none"
          />
        </View>
      </View>

      {/* Beneficiary Name */}
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Beneficiary Name</Text>
        <View style={styles.inputContainer}>
          <MaterialIcons name="person" size={18} color="#9CA3AF" />
          <TextInput
            value={paymentForm.beneficiaryName}
            onChangeText={(v) => setPaymentForm({ ...paymentForm, beneficiaryName: v })}
            style={styles.input}
            placeholder="Account holder name"
            placeholderTextColor="#9CA3AF"
          />
        </View>
      </View>

      {/* Bank Details Row */}
      <View style={styles.row}>
        <View style={[styles.inputGroup, { flex: 1 }]}>
          <Text style={styles.inputLabel}>Bank Name</Text>
          <View style={styles.inputContainer}>
            <MaterialIcons name="account-balance" size={18} color="#9CA3AF" />
            <TextInput
              value={paymentForm.bankName}
              onChangeText={(v) => setPaymentForm({ ...paymentForm, bankName: v })}
              style={styles.input}
              placeholder="Bank name"
              placeholderTextColor="#9CA3AF"
            />
          </View>
        </View>

        <View style={[styles.inputGroup, { flex: 1 }]}>
          <Text style={styles.inputLabel}>Account Number</Text>
          <View style={styles.inputContainer}>
            <MaterialIcons name="credit-card" size={18} color="#9CA3AF" />
            <TextInput
              value={paymentForm.accountNumber}
              onChangeText={(v) => setPaymentForm({ ...paymentForm, accountNumber: v })}
              style={styles.input}
              placeholder="Account number"
              placeholderTextColor="#9CA3AF"
              keyboardType="number-pad"
            />
          </View>
        </View>
      </View>

      {/* IFSC Code */}
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>IFSC Code</Text>
        <View style={styles.inputContainer}>
          <MaterialIcons name="fingerprint" size={18} color="#9CA3AF" />
          <TextInput
            value={paymentForm.ifscCode}
            onChangeText={(v) => setPaymentForm({ ...paymentForm, ifscCode: v.toUpperCase() })}
            style={styles.input}
            placeholder="e.g., HDFC0001234"
            placeholderTextColor="#9CA3AF"
            autoCapitalize="characters"
          />
        </View>
        {renderError("ifscCode")}
      </View>

      {/* Payment Notes */}
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Payment Notes (Optional)</Text>
        <View style={[styles.inputContainer, styles.textAreaContainer]}>
          <MaterialIcons name="notes" size={18} color="#9CA3AF" style={styles.textAreaIcon} />
          <TextInput
            value={paymentForm.paymentNotes}
            onChangeText={(v) => setPaymentForm({ ...paymentForm, paymentNotes: v })}
            style={[styles.input, styles.textArea]}
            placeholder="Additional payment instructions..."
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>
      </View>

      {/* Save Button */}
      <Pressable
        style={({ pressed }) => [
          styles.primaryButton,
          savePaymentMutation.isPending && styles.buttonDisabled,
          pressed && styles.buttonPressed,
        ]}
        onPress={() => savePaymentMutation.mutate()}
        disabled={savePaymentMutation.isPending}
      >
        <LinearGradient
          colors={[Colors.primary, Colors.primaryLight || Colors.primary]}
          style={styles.buttonGradient}
        >
          {savePaymentMutation.isPending ? (
            <ActivityIndicator size="small" color={Colors.white} />
          ) : (
            <>
              <MaterialIcons name="save" size={18} color={Colors.white} />
              <Text style={styles.buttonText}>Save Payment Settings</Text>
            </>
          )}
        </LinearGradient>
      </Pressable>

      {/* QR Code Section */}
      <View style={styles.qrSection}>
        <Text style={styles.sectionSubtitle}>Payment QR Code</Text>
        
        {(existingQrUrl || paymentQrFile) && (
          <View style={styles.qrPreviewContainer}>
            <Image
              source={{ uri: paymentQrFile?.uri || existingQrUrl }}
              style={styles.qrPreview}
              contentFit="contain"
            />
          </View>
        )}

        <View style={styles.qrActions}>
          <Pressable
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]}
            onPress={async () => {
              const file = await pickImage();
              if (file) setPaymentQrFile(file);
            }}
          >
            <MaterialIcons name="image" size={16} color={Colors.primary} />
            <Text style={styles.secondaryButtonText}>Choose QR</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.primaryButtonSmall,
              (paymentQrMutation.isPending || !paymentQrFile) && styles.buttonDisabled,
              pressed && styles.buttonPressed,
            ]}
            onPress={() => paymentQrMutation.mutate()}
            disabled={paymentQrMutation.isPending || !paymentQrFile}
          >
            <LinearGradient
              colors={[Colors.primary, Colors.primaryLight || Colors.primary]}
              style={styles.buttonGradientSmall}
            >
              {paymentQrMutation.isPending ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <Text style={styles.buttonTextSmall}>Upload</Text>
              )}
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    </View>
  );
};

// ==================== CONTACT CARD ====================

interface ContactCardProps {
  contact: NurseryPublicContact;
  onEdit: (contact: NurseryPublicContact) => void;
  onDelete: (id: string) => void;
  onUploadQr: (id: string, file: MultipartFile) => void;
  isUploading: boolean;
  isDeleting: boolean;
  pickImage: () => Promise<MultipartFile | null>;
}

const ContactCard = ({
  contact,
  onEdit,
  onDelete,
  onUploadQr,
  isUploading,
  isDeleting,
  pickImage,
}: ContactCardProps) => {
  const handleQrUpload = async () => {
    const file = await pickImage();
    if (file) {
      onUploadQr(contact.id, file);
    }
  };

  return (
    <View style={styles.contactCard}>
      <View style={styles.contactHeader}>
        <View style={styles.contactHeaderLeft}>
          <View style={[styles.contactAvatar, { backgroundColor: `${Colors.primary}10` }]}>
            <Text style={styles.contactInitial}>
              {contact.label?.charAt(0).toUpperCase() || "C"}
            </Text>
          </View>
          <View style={styles.contactInfo}>
            <Text style={styles.contactTitle}>{contact.label || "Unnamed Contact"}</Text>
            {contact.phoneNumber && (
              <View style={styles.contactDetail}>
                <MaterialIcons name="phone" size={12} color="#6B7280" />
                <Text style={styles.contactDetailText}>{contact.phoneNumber}</Text>
              </View>
            )}
          </View>
        </View>
        <View style={styles.contactBadge}>
          <MaterialIcons name="qr-code" size={12} color={contact.qrImageUrl ? "#059669" : "#9CA3AF"} />
          <Text style={[styles.contactBadgeText, { color: contact.qrImageUrl ? "#059669" : "#9CA3AF" }]}>
            {contact.qrImageUrl ? "QR Ready" : "No QR"}
          </Text>
        </View>
      </View>

      {/* Contact Details */}
      <View style={styles.contactDetails}>
        {contact.whatsappNumber && (
          <View style={styles.contactDetailRow}>
            <MaterialIcons name="chat" size={12} color="#25D366" />
            <Text style={styles.contactDetailLabel}>WhatsApp:</Text>
            <Text style={styles.contactDetailValue}>{contact.whatsappNumber}</Text>
          </View>
        )}
        {contact.email && (
          <View style={styles.contactDetailRow}>
            <MaterialIcons name="email" size={12} color="#3B82F6" />
            <Text style={styles.contactDetailLabel}>Email:</Text>
            <Text style={styles.contactDetailValue}>{contact.email}</Text>
          </View>
        )}
        {contact.address && (
          <View style={styles.contactDetailRow}>
            <MaterialIcons name="location-on" size={12} color="#8B5CF6" />
            <Text style={styles.contactDetailLabel}>Address:</Text>
            <Text style={styles.contactDetailValue} numberOfLines={2}>
              {contact.address}
            </Text>
          </View>
        )}
      </View>

      {/* Images Preview */}
      {(contact.imageUrl || contact.qrImageUrl) && (
        <View style={styles.contactImages}>
          {contact.imageUrl && (
            <View style={styles.contactImageContainer}>
              <Image source={{ uri: contact.imageUrl }} style={styles.contactImage} contentFit="cover" />
            </View>
          )}
          {contact.qrImageUrl && (
            <View style={styles.contactImageContainer}>
              <Image source={{ uri: contact.qrImageUrl }} style={styles.contactImage} contentFit="contain" />
            </View>
          )}
        </View>
      )}

      {/* Actions */}
      <View style={styles.contactActions}>
        <Pressable
          style={({ pressed }) => [styles.contactAction, pressed && styles.buttonPressed]}
          onPress={() => onEdit(contact)}
        >
          <MaterialIcons name="edit" size={14} color={Colors.primary} />
          <Text style={styles.contactActionText}>Edit</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.contactAction, pressed && styles.buttonPressed]}
          onPress={handleQrUpload}
          disabled={isUploading}
        >
          {isUploading ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : (
            <>
              <MaterialIcons name="qr-code" size={14} color={Colors.primary} />
              <Text style={styles.contactActionText}>Upload QR</Text>
            </>
          )}
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.contactAction, styles.contactActionDelete, pressed && styles.buttonPressed]}
          onPress={() => {
            Alert.alert(
              "Delete Contact",
              `Are you sure you want to delete "${contact.label || "this contact"}"?`,
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Delete",
                  style: "destructive",
                  onPress: () => onDelete(contact.id),
                },
              ]
            );
          }}
          disabled={isDeleting}
        >
          {isDeleting ? (
            <ActivityIndicator size="small" color={Colors.error} />
          ) : (
            <>
              <MaterialIcons name="delete-outline" size={14} color={Colors.error} />
              <Text style={[styles.contactActionText, { color: Colors.error }]}>Delete</Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
};

// ==================== CONTACT FORM ====================

interface ContactFormProps {
  mode: "create" | "edit";
  form: ContactForm;
  setForm: (form: ContactForm) => void;
  errors: FieldErrors;
  imageFile: MultipartFile | null;
  setImageFile: (file: MultipartFile | null) => void;
  onSubmit: () => void;
  onCancel?: () => void;
  isPending: boolean;
  pickImage: () => Promise<MultipartFile | null>;
}

const ContactFormComponent = ({
  mode,
  form,
  setForm,
  errors,
  imageFile,
  setImageFile,
  onSubmit,
  onCancel,
  isPending,
  pickImage,
}: ContactFormProps) => {
  const renderError = (key: string) => 
    errors[key] ? <Text style={styles.errorText}>{errors[key]}</Text> : null;

  return (
    <View style={styles.contactForm}>
      <Text style={styles.formTitle}>{mode === "create" ? "Add New Contact" : "Edit Contact"}</Text>

      {/* Label */}
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Label (e.g., Sales Desk)</Text>
        <View style={styles.inputContainer}>
          <MaterialIcons name="label" size={18} color="#9CA3AF" />
          <TextInput
            value={form.label}
            onChangeText={(v) => setForm({ ...form, label: v })}
            style={styles.input}
            placeholder="Contact label"
            placeholderTextColor="#9CA3AF"
          />
        </View>
      </View>

      {/* Phone & WhatsApp Row */}
      <View style={styles.row}>
        <View style={[styles.inputGroup, { flex: 1 }]}>
          <Text style={styles.inputLabel}>Phone</Text>
          <View style={styles.inputContainer}>
            <MaterialIcons name="phone" size={18} color="#9CA3AF" />
            <TextInput
              value={form.phoneNumber}
              onChangeText={(v) => setForm({ ...form, phoneNumber: v })}
              style={styles.input}
              placeholder="Phone number"
              placeholderTextColor="#9CA3AF"
              keyboardType="phone-pad"
            />
          </View>
        </View>

        <View style={[styles.inputGroup, { flex: 1 }]}>
          <Text style={styles.inputLabel}>WhatsApp</Text>
          <View style={styles.inputContainer}>
            <MaterialIcons name="chat" size={18} color="#25D366" />
            <TextInput
              value={form.whatsappNumber}
              onChangeText={(v) => setForm({ ...form, whatsappNumber: v })}
              style={styles.input}
              placeholder="WhatsApp number"
              placeholderTextColor="#9CA3AF"
              keyboardType="phone-pad"
            />
          </View>
        </View>
      </View>

      {/* Email */}
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Email</Text>
        <View style={styles.inputContainer}>
          <MaterialIcons name="email" size={18} color="#9CA3AF" />
          <TextInput
            value={form.email}
            onChangeText={(v) => setForm({ ...form, email: v })}
            style={styles.input}
            placeholder="Email address"
            placeholderTextColor="#9CA3AF"
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>
        {renderError("email")}
      </View>

      {/* Address */}
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Address</Text>
        <View style={[styles.inputContainer, styles.textAreaContainer]}>
          <MaterialIcons name="location-on" size={18} color="#9CA3AF" style={styles.textAreaIcon} />
          <TextInput
            value={form.address}
            onChangeText={(v) => setForm({ ...form, address: v })}
            style={[styles.input, styles.textArea]}
            placeholder="Full address"
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>
      </View>

      {renderError("contact")}

      {/* Image Upload */}
      <View style={styles.imageUploadSection}>
        <Text style={styles.inputLabel}>Contact Image (Optional)</Text>
        {imageFile && (
          <View style={styles.imagePreviewContainer}>
            <Image source={{ uri: imageFile.uri }} style={styles.imagePreview} contentFit="cover" />
          </View>
        )}
        <Pressable
          style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]}
          onPress={async () => {
            const file = await pickImage();
            if (file) setImageFile(file);
          }}
        >
          <MaterialIcons name="image" size={16} color={Colors.primary} />
          <Text style={styles.secondaryButtonText}>
            {imageFile ? "Change Image" : "Choose Image"}
          </Text>
        </Pressable>
      </View>

      {/* Form Actions */}
      <View style={styles.formActions}>
        {mode === "edit" && onCancel && (
          <Pressable
            style={({ pressed }) => [styles.secondaryButton, styles.cancelButton, pressed && styles.buttonPressed]}
            onPress={onCancel}
            disabled={isPending}
          >
            <Text style={styles.secondaryButtonText}>Cancel</Text>
          </Pressable>
        )}
        <Pressable
          style={({ pressed }) => [
            styles.primaryButton,
            styles.submitButton,
            isPending && styles.buttonDisabled,
            pressed && styles.buttonPressed,
          ]}
          onPress={onSubmit}
          disabled={isPending}
        >
          <LinearGradient
            colors={[Colors.primary, Colors.primaryLight || Colors.primary]}
            style={styles.buttonGradient}
          >
            {isPending ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <>
                <MaterialIcons name={mode === "create" ? "add" : "save"} size={18} color={Colors.white} />
                <Text style={styles.buttonText}>
                  {mode === "create" ? "Add Contact" : "Save Changes"}
                </Text>
              </>
            )}
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
};

// ==================== MAIN COMPONENT ====================

export default function AdminPublicProfileScreen() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const nurseryId = user?.nurseryId;
  const queryKey = useMemo(() => ["nursery-public-profile", nurseryId], [nurseryId]);

  const [paymentForm, setPaymentForm] = useState<PaymentForm>(emptyPaymentForm);
  const [paymentErrors, setPaymentErrors] = useState<FieldErrors>({});
  const [paymentQrFile, setPaymentQrFile] = useState<MultipartFile | null>(null);
  const [contacts, setContacts] = useState<NurseryPublicContact[]>([]);
  const [snack, setSnack] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [qrUploadingForId, setQrUploadingForId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingContact, setEditingContact] = useState<NurseryPublicContact | null>(null);
  const [editingForm, setEditingForm] = useState<ContactForm>(emptyContactForm);
  const [editingErrors, setEditingErrors] = useState<FieldErrors>({});
  const [editingImageFile, setEditingImageFile] = useState<MultipartFile | null>(null);

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => NurseryPublicProfileService.get(nurseryId),
    enabled: Boolean(nurseryId),
  });

  useEffect(() => {
    if (!data) return;
    setPaymentForm(mapProfileToPaymentForm(data.paymentConfig));
    setContacts(Array.isArray(data.contactDetails) ? data.contactDetails : []);
  }, [data]);

  const updateCache = (updater: (prev: NurseryPublicProfile | undefined) => NurseryPublicProfile) => {
    queryClient.setQueryData(queryKey, (prev: NurseryPublicProfile | undefined) => updater(prev));
  };

  const pickImage = async (): Promise<MultipartFile | null> => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setSnack({ type: "error", text: "Please allow gallery access." });
      return null;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.85,
    });
    if (result.canceled || !result.assets?.length) return null;
    const asset = result.assets[0];
    return {
      uri: asset.uri,
      name: asset.fileName || `image_${Date.now()}.jpg`,
      type: asset.mimeType || "image/jpeg",
    };
  };

  const savePaymentMutation = useMutation({
    mutationFn: async () => {
      const localErrors = validatePaymentForm(paymentForm);
      setPaymentErrors(localErrors);
      if (Object.keys(localErrors).length) throw new Error("Please fix payment form errors.");

      return NurseryPublicProfileService.updatePaymentConfig({
        nurseryId,
        upiId: paymentForm.upiId.trim() || undefined,
        beneficiaryName: paymentForm.beneficiaryName.trim() || undefined,
        bankName: paymentForm.bankName.trim() || undefined,
        accountNumber: paymentForm.accountNumber.trim() || undefined,
        ifscCode: paymentForm.ifscCode.trim().toUpperCase() || undefined,
        paymentNotes: paymentForm.paymentNotes.trim() || undefined,
      });
    },
    onSuccess: (profile) => {
      setPaymentErrors({});
      updateCache((prev) => ({ ...(prev || profile), ...profile, contactDetails: prev?.contactDetails || profile.contactDetails || [] }));
      setSnack({ type: "success", text: "Payment settings saved." });
    },
    onError: (err: any) => {
      const fieldErrors = extractFieldErrors(err);
      if (Object.keys(fieldErrors).length) setPaymentErrors(fieldErrors);
      setSnack({ type: "error", text: err?.message || "Unable to save payment settings." });
    },
  });

  const paymentQrMutation = useMutation({
    mutationFn: async () => {
      if (!paymentQrFile) throw new Error("Select QR image first.");
      return NurseryPublicProfileService.uploadPaymentQrImage(nurseryId, paymentQrFile);
    },
    onSuccess: (result) => {
      setPaymentQrFile(null);
      updateCache((prev) => ({
        ...(prev || ({ nurseryId: nurseryId || "", updatedAt: new Date().toISOString() } as NurseryPublicProfile)),
        paymentConfig: {
          ...(prev?.paymentConfig || {}),
          ...mapProfileToPaymentForm(prev?.paymentConfig),
          qrImageUrl: result.qrImageUrl,
        },
        qrImageUrl: result.qrImageUrl,
      }));
      setSnack({ type: "success", text: "Payment QR updated." });
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (err: any) =>
      setSnack({ type: "error", text: err?.message || "Unable to upload payment QR." }),
  });

  const createContactMutation = useMutation({
    mutationFn: async () => {
      const localErrors = validateContactForm(contactForm);
      setContactErrors(localErrors);
      if (Object.keys(localErrors).length) throw new Error("Please fix contact form errors.");
      return NurseryPublicProfileService.createPublicContact(
        { nurseryId, ...mapContactPayload(contactForm) },
        contactImageFile || undefined,
      );
    },
    onSuccess: (created) => {
      setContactForm(emptyContactForm);
      setContactImageFile(null);
      setContactErrors({});
      setContacts((prev) => [created, ...prev]);
      updateCache((prev) => ({
        ...(prev || ({ nurseryId: nurseryId || "", updatedAt: new Date().toISOString() } as NurseryPublicProfile)),
        contactDetails: [created, ...(prev?.contactDetails || [])],
      }));
      setSnack({ type: "success", text: "Public contact added." });
    },
    onError: (err: any) => {
      const fieldErrors = extractFieldErrors(err);
      if (Object.keys(fieldErrors).length) setContactErrors(fieldErrors);
      setSnack({ type: "error", text: err?.message || "Unable to add contact." });
    },
  });

  const updateContactMutation = useMutation({
    mutationFn: async () => {
      if (!editingContact) throw new Error("Invalid contact.");
      const localErrors = validateContactForm(editingForm);
      setEditingErrors(localErrors);
      if (Object.keys(localErrors).length) throw new Error("Please fix contact form errors.");
      return NurseryPublicProfileService.updatePublicContact(
        { nurseryId, contactId: editingContact.id, ...mapContactPayload(editingForm) },
        editingImageFile || undefined,
      );
    },
    onSuccess: (updated) => {
      setContacts((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      updateCache((prev) => ({
        ...(prev || ({ nurseryId: nurseryId || "", updatedAt: new Date().toISOString() } as NurseryPublicProfile)),
        contactDetails: (prev?.contactDetails || []).map((item) =>
          item.id === updated.id ? updated : item,
        ),
      }));
      setEditingContact(null);
      setEditingForm(emptyContactForm);
      setEditingImageFile(null);
      setEditingErrors({});
      setSnack({ type: "success", text: "Public contact updated." });
    },
    onError: (err: any) => {
      const fieldErrors = extractFieldErrors(err);
      if (Object.keys(fieldErrors).length) setEditingErrors(fieldErrors);
      setSnack({ type: "error", text: err?.message || "Unable to update contact." });
    },
  });

  const contactQrMutation = useMutation({
    mutationFn: async (params: { contactId: string; file: MultipartFile }) => {
      setQrUploadingForId(params.contactId);
      return NurseryPublicProfileService.uploadPublicContactQrImage(
        nurseryId,
        params.contactId,
        params.file,
      );
    },
    onSuccess: (updated) => {
      setContacts((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      updateCache((prev) => ({
        ...(prev || ({ nurseryId: nurseryId || "", updatedAt: new Date().toISOString() } as NurseryPublicProfile)),
        contactDetails: (prev?.contactDetails || []).map((item) =>
          item.id === updated.id ? updated : item,
        ),
      }));
      setSnack({ type: "success", text: "Contact QR updated." });
    },
    onError: (err: any) =>
      setSnack({ type: "error", text: err?.message || "Unable to upload contact QR." }),
    onSettled: () => setQrUploadingForId(null),
  });

  const deleteContactMutation = useMutation({
    mutationFn: async (contactId: string) => {
      setDeletingId(contactId);
      await NurseryPublicProfileService.deletePublicContact(nurseryId, contactId);
      return contactId;
    },
    onSuccess: (contactId) => {
      setContacts((prev) => prev.filter((item) => item.id !== contactId));
      updateCache((prev) => ({
        ...(prev || ({ nurseryId: nurseryId || "", updatedAt: new Date().toISOString() } as NurseryPublicProfile)),
        contactDetails: (prev?.contactDetails || []).filter((item) => item.id !== contactId),
      }));
      setSnack({ type: "success", text: "Contact deleted." });
    },
    onError: (err: any) =>
      setSnack({ type: "error", text: err?.message || "Unable to delete contact." }),
    onSettled: () => setDeletingId(null),
  });

  const [contactForm, setContactForm] = useState<ContactForm>(emptyContactForm);
  const [contactErrors, setContactErrors] = useState<FieldErrors>({});
  const [contactImageFile, setContactImageFile] = useState<MultipartFile | null>(null);

  return (
    <View style={styles.container}>
      <FixedHeader
        title="Public Profile"
        subtitle="Manage payment and contact details visible to customers"
        titleStyle={styles.headerTitle}
      />

      {snack && (
        <Snackbar
          type={snack.type}
          text={snack.text}
          onDismiss={() => setSnack(null)}
        />
      )}

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Payment Section */}
        <PaymentSection
          paymentForm={paymentForm}
          setPaymentForm={setPaymentForm}
          paymentErrors={paymentErrors}
          savePaymentMutation={savePaymentMutation}
          paymentQrFile={paymentQrFile}
          setPaymentQrFile={setPaymentQrFile}
          paymentQrMutation={paymentQrMutation}
          existingQrUrl={data?.paymentConfig?.qrImageUrl}
          pickImage={pickImage}
        />

        {/* Contacts Section */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: `${Colors.primary}10` }]}>
              <MaterialIcons name="contacts" size={20} color={Colors.primary} />
            </View>
            <Text style={styles.sectionTitle}>Public Contacts</Text>
          </View>

          {/* Add Contact Form */}
          {!editingContact && (
            <ContactFormComponent
              mode="create"
              form={contactForm}
              setForm={setContactForm}
              errors={contactErrors}
              imageFile={contactImageFile}
              setImageFile={setContactImageFile}
              onSubmit={() => createContactMutation.mutate()}
              isPending={createContactMutation.isPending}
              pickImage={pickImage}
            />
          )}

          {/* Edit Contact Form */}
          {editingContact && (
            <ContactFormComponent
              mode="edit"
              form={editingForm}
              setForm={setEditingForm}
              errors={editingErrors}
              imageFile={editingImageFile}
              setImageFile={setEditingImageFile}
              onSubmit={() => updateContactMutation.mutate()}
              onCancel={() => {
                setEditingContact(null);
                setEditingForm(emptyContactForm);
                setEditingImageFile(null);
                setEditingErrors({});
              }}
              isPending={updateContactMutation.isPending}
              pickImage={pickImage}
            />
          )}

          {/* Contacts List */}
          <View style={styles.contactsList}>
            <Text style={styles.listTitle}>Existing Contacts</Text>
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
              </View>
            ) : contacts.length === 0 ? (
              <View style={styles.emptyContainer}>
                <MaterialIcons name="contacts" size={32} color="#9CA3AF" />
                <Text style={styles.emptyText}>No contacts added yet</Text>
              </View>
            ) : (
              contacts.map((contact) => (
                <ContactCard
                  key={contact.id}
                  contact={contact}
                  onEdit={(contact) => {
                    setEditingContact(contact);
                    setEditingForm(toContactForm(contact));
                  }}
                  onDelete={(id) => deleteContactMutation.mutate(id)}
                  onUploadQr={(id, file) => contactQrMutation.mutate({ contactId: id, file })}
                  isUploading={qrUploadingForId === contact.id}
                  isDeleting={deletingId === contact.id}
                  pickImage={pickImage}
                />
              ))
            )}
          </View>
        </View>
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
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: BOTTOM_NAV_HEIGHT + 20,
    gap: 16,
  },

  // Snackbar
  snackbar: {
    position: "absolute",
    top: 16,
    left: 20,
    right: 20,
    zIndex: 1000,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  snackSuccess: {
    borderColor: "#A7F3D0",
    backgroundColor: "rgba(236, 253, 245, 0.95)",
  },
  snackError: {
    borderColor: "#FECACA",
    backgroundColor: "rgba(254, 242, 242, 0.95)",
  },
  snackbarText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "500",
  },

  // Cards
  card: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 20,
  },
  sectionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  sectionSubtitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 12,
  },

  // Input Groups
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 6,
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 12,
    height: 48,
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: "#111827",
    padding: 0,
  },
  textAreaContainer: {
    height: "auto",
    minHeight: 80,
    alignItems: "flex-start",
    paddingTop: 12,
  },
  textArea: {
    height: 70,
    textAlignVertical: "top",
  },
  textAreaIcon: {
    marginTop: 2,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },

  // Buttons
  primaryButton: {
    borderRadius: 12,
    overflow: "hidden",
    marginTop: 8,
  },
  primaryButtonSmall: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    overflow: "hidden",
  },
  buttonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    gap: 8,
  },
  buttonGradientSmall: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: "600",
  },
  buttonTextSmall: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonPressed: {
    transform: [{ scale: 0.98 }],
  },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.primary,
    backgroundColor: "#EFF6FF",
  },
  secondaryButtonText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: "600",
  },
  cancelButton: {
    borderColor: "#E5E7EB",
    backgroundColor: Colors.white,
  },
  submitButton: {
    flex: 1,
  },

  // QR Section
  qrSection: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  qrPreviewContainer: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  qrPreview: {
    width: "100%",
    height: 140,
    borderRadius: 8,
  },
  qrActions: {
    flexDirection: "row",
    gap: 12,
  },

  // Contact Form
  contactForm: {
    marginBottom: 24,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  formTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 16,
  },
  imageUploadSection: {
    marginBottom: 16,
  },
  imagePreviewContainer: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  imagePreview: {
    width: "100%",
    height: 120,
    borderRadius: 8,
  },
  formActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },

  // Contacts List
  contactsList: {
    marginTop: 8,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 16,
  },
  loadingContainer: {
    paddingVertical: 32,
    alignItems: "center",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
    color: "#6B7280",
  },

  // Contact Card
  contactCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  contactHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  contactHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  contactAvatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  contactInitial: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.primary,
  },
  contactInfo: {
    flex: 1,
  },
  contactTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  contactDetail: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  contactDetailText: {
    fontSize: 12,
    color: "#6B7280",
  },
  contactBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    gap: 4,
  },
  contactBadgeText: {
    fontSize: 10,
    fontWeight: "600",
  },
  contactDetails: {
    marginBottom: 12,
    gap: 6,
  },
  contactDetailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  contactDetailLabel: {
    fontSize: 11,
    color: "#6B7280",
    width: 60,
  },
  contactDetailValue: {
    flex: 1,
    fontSize: 12,
    color: "#111827",
  },
  contactImages: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  contactImageContainer: {
    width: 70,
    height: 70,
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    overflow: "hidden",
  },
  contactImage: {
    width: "100%",
    height: "100%",
  },
  contactActions: {
    flexDirection: "row",
    gap: 8,
  },
  contactAction: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#EFF6FF",
  },
  contactActionDelete: {
    backgroundColor: "#FEF2F2",
  },
  contactActionText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.primary,
  },

  // Error Text
  errorText: {
    color: "#DC2626",
    fontSize: 11,
    marginTop: 4,
    marginLeft: 4,
  },
});