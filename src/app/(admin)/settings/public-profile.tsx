import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
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

export default function AdminPublicProfileScreen() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const nurseryId = user?.nurseryId;
  const queryKey = useMemo(() => ["nursery-public-profile", nurseryId], [nurseryId]);

  const [paymentForm, setPaymentForm] = useState<PaymentForm>(emptyPaymentForm);
  const [paymentErrors, setPaymentErrors] = useState<FieldErrors>({});
  const [paymentQrFile, setPaymentQrFile] = useState<MultipartFile | null>(null);
  const [contacts, setContacts] = useState<NurseryPublicContact[]>([]);
  const [contactForm, setContactForm] = useState<ContactForm>(emptyContactForm);
  const [contactErrors, setContactErrors] = useState<FieldErrors>({});
  const [contactImageFile, setContactImageFile] = useState<MultipartFile | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingForm, setEditingForm] = useState<ContactForm>(emptyContactForm);
  const [editingErrors, setEditingErrors] = useState<FieldErrors>({});
  const [editingImageFile, setEditingImageFile] = useState<MultipartFile | null>(null);
  const [snack, setSnack] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [qrUploadingForId, setQrUploadingForId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!snack) return;
    const timer = setTimeout(() => setSnack(null), 2500);
    return () => clearTimeout(timer);
  }, [snack]);

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
      if (!editingId) throw new Error("Invalid contact.");
      const localErrors = validateContactForm(editingForm);
      setEditingErrors(localErrors);
      if (Object.keys(localErrors).length) throw new Error("Please fix contact form errors.");
      return NurseryPublicProfileService.updatePublicContact(
        { nurseryId, contactId: editingId, ...mapContactPayload(editingForm) },
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
      setEditingId(null);
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

  const startEdit = (item: NurseryPublicContact) => {
    setEditingId(item.id);
    setEditingForm(toContactForm(item));
    setEditingErrors({});
    setEditingImageFile(null);
  };

  const renderError = (errors: FieldErrors, key: string) =>
    errors[key] ? <Text style={styles.errorText}>{errors[key]}</Text> : null;

  return (
    <SafeAreaView style={styles.container} edges={["left", "right"]}>
      <FixedHeader
        title="Public Contact & Payment"
        subtitle="Customer-visible payment + contact details"
        titleStyle={styles.headerTitle}
      />

      <ScrollView contentContainerStyle={styles.content}>
        {snack ? (
          <View style={[styles.snack, snack.type === "error" ? styles.snackError : styles.snackSuccess]}>
            <Text style={styles.snackText}>{snack.text}</Text>
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Payment Settings</Text>
          <TextInput
            value={paymentForm.upiId}
            onChangeText={(v) => setPaymentForm((p) => ({ ...p, upiId: v }))}
            style={styles.input}
            placeholder="UPI ID"
            placeholderTextColor={Colors.textTertiary}
            autoCapitalize="none"
          />
          <TextInput
            value={paymentForm.beneficiaryName}
            onChangeText={(v) => setPaymentForm((p) => ({ ...p, beneficiaryName: v }))}
            style={styles.input}
            placeholder="Beneficiary name"
            placeholderTextColor={Colors.textTertiary}
          />
          <TextInput
            value={paymentForm.bankName}
            onChangeText={(v) => setPaymentForm((p) => ({ ...p, bankName: v }))}
            style={styles.input}
            placeholder="Bank name"
            placeholderTextColor={Colors.textTertiary}
          />
          <TextInput
            value={paymentForm.accountNumber}
            onChangeText={(v) => setPaymentForm((p) => ({ ...p, accountNumber: v }))}
            style={styles.input}
            placeholder="Account number"
            placeholderTextColor={Colors.textTertiary}
            keyboardType="number-pad"
          />
          <TextInput
            value={paymentForm.ifscCode}
            onChangeText={(v) => setPaymentForm((p) => ({ ...p, ifscCode: v.toUpperCase() }))}
            style={styles.input}
            placeholder="IFSC code"
            placeholderTextColor={Colors.textTertiary}
            autoCapitalize="characters"
          />
          {renderError(paymentErrors, "ifscCode")}
          <TextInput
            value={paymentForm.paymentNotes}
            onChangeText={(v) => setPaymentForm((p) => ({ ...p, paymentNotes: v }))}
            style={[styles.input, styles.notes]}
            placeholder="Payment notes"
            placeholderTextColor={Colors.textTertiary}
            multiline
          />

          <Pressable
            style={[styles.saveBtn, savePaymentMutation.isPending && styles.disabledBtn]}
            onPress={() => savePaymentMutation.mutate()}
            disabled={savePaymentMutation.isPending}
          >
            <Text style={styles.saveBtnText}>
              {savePaymentMutation.isPending ? "Saving..." : "Save Payment Settings"}
            </Text>
          </Pressable>

          <Text style={[styles.sectionSubTitle, { marginTop: Spacing.md }]}>Payment QR</Text>
          {data?.paymentConfig?.qrImageUrl ? (
            <Image
              source={{ uri: data.paymentConfig.qrImageUrl }}
              style={styles.previewImage}
              contentFit="contain"
            />
          ) : null}
          {paymentQrFile ? (
            <Image source={{ uri: paymentQrFile.uri }} style={styles.previewImage} contentFit="contain" />
          ) : null}
          <View style={styles.row}>
            <Pressable
              style={styles.secondaryBtn}
              onPress={async () => {
                const file = await pickImage();
                if (file) setPaymentQrFile(file);
              }}
            >
              <Text style={styles.secondaryBtnText}>Choose QR Image</Text>
            </Pressable>
            <Pressable
              style={[styles.secondaryBtn, paymentQrMutation.isPending && styles.disabledBtn]}
              onPress={() => paymentQrMutation.mutate()}
              disabled={paymentQrMutation.isPending || !paymentQrFile}
            >
              <Text style={styles.secondaryBtnText}>
                {paymentQrMutation.isPending ? "Uploading..." : "Upload/Replace QR"}
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Public Contacts</Text>
          <Text style={styles.sectionSubTitle}>Add Contact</Text>
          <TextInput
            value={contactForm.label}
            onChangeText={(v) => setContactForm((p) => ({ ...p, label: v }))}
            style={styles.input}
            placeholder="Label (e.g. Sales Desk)"
            placeholderTextColor={Colors.textTertiary}
          />
          <TextInput
            value={contactForm.phoneNumber}
            onChangeText={(v) => setContactForm((p) => ({ ...p, phoneNumber: v }))}
            style={styles.input}
            placeholder="Phone number"
            placeholderTextColor={Colors.textTertiary}
            keyboardType="phone-pad"
          />
          <TextInput
            value={contactForm.whatsappNumber}
            onChangeText={(v) => setContactForm((p) => ({ ...p, whatsappNumber: v }))}
            style={styles.input}
            placeholder="WhatsApp number"
            placeholderTextColor={Colors.textTertiary}
            keyboardType="phone-pad"
          />
          <TextInput
            value={contactForm.email}
            onChangeText={(v) => setContactForm((p) => ({ ...p, email: v }))}
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={Colors.textTertiary}
            autoCapitalize="none"
          />
          <TextInput
            value={contactForm.address}
            onChangeText={(v) => setContactForm((p) => ({ ...p, address: v }))}
            style={[styles.input, styles.notes]}
            placeholder="Address"
            placeholderTextColor={Colors.textTertiary}
            multiline
          />
          {renderError(contactErrors, "contact")}
          {renderError(contactErrors, "email")}
          <View style={styles.row}>
            <Pressable
              style={styles.secondaryBtn}
              onPress={async () => {
                const file = await pickImage();
                if (file) setContactImageFile(file);
              }}
            >
              <Text style={styles.secondaryBtnText}>Choose Contact Image</Text>
            </Pressable>
            <Pressable
              style={[styles.saveBtnSmall, createContactMutation.isPending && styles.disabledBtn]}
              onPress={() => createContactMutation.mutate()}
              disabled={createContactMutation.isPending}
            >
              <Text style={styles.saveBtnText}>
                {createContactMutation.isPending ? "Adding..." : "Add Contact"}
              </Text>
            </Pressable>
          </View>
          {contactImageFile ? (
            <Image source={{ uri: contactImageFile.uri }} style={styles.previewImage} contentFit="cover" />
          ) : null}

          <Text style={[styles.sectionSubTitle, { marginTop: Spacing.md }]}>Existing Contacts</Text>
          {!isLoading && contacts.length === 0 ? (
            <Text style={styles.emptyText}>No public contacts found.</Text>
          ) : null}
          {contacts.map((item) => (
            <View key={item.id} style={styles.contactCard}>
              <Text style={styles.contactTitle}>{item.label || "Untitled Contact"}</Text>
              {item.phoneNumber ? <Text style={styles.metaText}>Phone: {item.phoneNumber}</Text> : null}
              {item.whatsappNumber ? <Text style={styles.metaText}>WhatsApp: {item.whatsappNumber}</Text> : null}
              {item.email ? <Text style={styles.metaText}>Email: {item.email}</Text> : null}
              {item.address ? <Text style={styles.metaText}>Address: {item.address}</Text> : null}
              <View style={styles.previewRow}>
                {item.imageUrl ? <Image source={{ uri: item.imageUrl }} style={styles.contactImage} contentFit="cover" /> : null}
                {item.qrImageUrl ? <Image source={{ uri: item.qrImageUrl }} style={styles.contactImage} contentFit="contain" /> : null}
              </View>

              {editingId === item.id ? (
                <View style={styles.editBox}>
                  <TextInput
                    value={editingForm.label}
                    onChangeText={(v) => setEditingForm((p) => ({ ...p, label: v }))}
                    style={styles.input}
                    placeholder="Label"
                    placeholderTextColor={Colors.textTertiary}
                  />
                  <TextInput
                    value={editingForm.phoneNumber}
                    onChangeText={(v) => setEditingForm((p) => ({ ...p, phoneNumber: v }))}
                    style={styles.input}
                    placeholder="Phone number"
                    placeholderTextColor={Colors.textTertiary}
                    keyboardType="phone-pad"
                  />
                  <TextInput
                    value={editingForm.whatsappNumber}
                    onChangeText={(v) => setEditingForm((p) => ({ ...p, whatsappNumber: v }))}
                    style={styles.input}
                    placeholder="WhatsApp number"
                    placeholderTextColor={Colors.textTertiary}
                    keyboardType="phone-pad"
                  />
                  <TextInput
                    value={editingForm.email}
                    onChangeText={(v) => setEditingForm((p) => ({ ...p, email: v }))}
                    style={styles.input}
                    placeholder="Email"
                    placeholderTextColor={Colors.textTertiary}
                    autoCapitalize="none"
                  />
                  <TextInput
                    value={editingForm.address}
                    onChangeText={(v) => setEditingForm((p) => ({ ...p, address: v }))}
                    style={[styles.input, styles.notes]}
                    placeholder="Address"
                    placeholderTextColor={Colors.textTertiary}
                    multiline
                  />
                  {renderError(editingErrors, "contact")}
                  {renderError(editingErrors, "email")}
                  {editingImageFile ? (
                    <Image source={{ uri: editingImageFile.uri }} style={styles.previewImage} contentFit="cover" />
                  ) : null}
                  <View style={styles.row}>
                    <Pressable
                      style={styles.secondaryBtn}
                      onPress={async () => {
                        const file = await pickImage();
                        if (file) setEditingImageFile(file);
                      }}
                    >
                      <Text style={styles.secondaryBtnText}>Choose Image</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.saveBtnSmall, updateContactMutation.isPending && styles.disabledBtn]}
                      onPress={() => updateContactMutation.mutate()}
                      disabled={updateContactMutation.isPending}
                    >
                      <Text style={styles.saveBtnText}>
                        {updateContactMutation.isPending ? "Saving..." : "Save Changes"}
                      </Text>
                    </Pressable>
                  </View>
                  <Pressable style={styles.linkBtn} onPress={() => setEditingId(null)}>
                    <Text style={styles.linkBtnText}>Cancel Edit</Text>
                  </Pressable>
                </View>
              ) : (
                <View style={styles.rowWrap}>
                  <Pressable style={styles.actionBtn} onPress={() => startEdit(item)}>
                    <Text style={styles.actionBtnText}>Edit</Text>
                  </Pressable>
                  <Pressable
                    style={styles.actionBtn}
                    onPress={async () => {
                      const file = await pickImage();
                      if (!file) return;
                      contactQrMutation.mutate({ contactId: item.id, file });
                    }}
                    disabled={qrUploadingForId === item.id}
                  >
                    <Text style={styles.actionBtnText}>
                      {qrUploadingForId === item.id ? "Uploading..." : "Upload/Replace QR"}
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[styles.actionBtn, styles.deleteBtn]}
                    onPress={() =>
                      Alert.alert("Delete contact", "Do you want to delete this contact?", [
                        { text: "Cancel", style: "cancel" },
                        {
                          text: "Delete",
                          style: "destructive",
                          onPress: () => deleteContactMutation.mutate(item.id),
                        },
                      ])
                    }
                    disabled={deletingId === item.id}
                  >
                    <Text style={styles.actionBtnText}>
                      {deletingId === item.id ? "Deleting..." : "Delete"}
                    </Text>
                  </Pressable>
                </View>
              )}
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  headerTitle: { fontSize: 24 },
  content: { padding: Spacing.lg, paddingBottom: 130, gap: Spacing.md },
  snack: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  snackSuccess: { backgroundColor: "#DCFCE7" },
  snackError: { backgroundColor: "#FEE2E2" },
  snackText: { color: Colors.text, fontWeight: "700" },
  card: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: 14,
    padding: Spacing.md,
  },
  sectionTitle: { color: Colors.text, fontWeight: "700", fontSize: 16, marginBottom: Spacing.sm },
  sectionSubTitle: { color: Colors.text, fontWeight: "700", marginBottom: Spacing.sm, marginTop: Spacing.xs },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    color: Colors.text,
    backgroundColor: Colors.surfaceDark,
    marginBottom: Spacing.sm,
  },
  notes: { minHeight: 84, textAlignVertical: "top" },
  errorText: {
    color: Colors.error,
    fontSize: 12,
    marginBottom: Spacing.sm,
    marginTop: -4,
  },
  row: { flexDirection: "row", gap: Spacing.sm, alignItems: "center" },
  rowWrap: { flexDirection: "row", gap: Spacing.sm, alignItems: "center", flexWrap: "wrap", marginTop: Spacing.sm },
  previewRow: { flexDirection: "row", gap: Spacing.sm, marginTop: Spacing.xs },
  secondaryBtn: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.primary,
    alignItems: "center",
    paddingVertical: Spacing.sm,
    backgroundColor: "#EFF6FF",
  },
  secondaryBtnText: { color: Colors.primary, fontWeight: "700", fontSize: 12 },
  saveBtn: {
    borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: "center",
    paddingVertical: Spacing.md,
  },
  saveBtnSmall: {
    flex: 1,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.sm,
  },
  saveBtnText: { color: Colors.white, fontWeight: "700" },
  disabledBtn: { opacity: 0.7 },
  previewImage: {
    width: "100%",
    height: 140,
    borderRadius: 10,
    backgroundColor: Colors.surfaceDark,
    marginTop: Spacing.sm,
  },
  emptyText: { color: Colors.textSecondary, fontSize: 13 },
  contactCard: {
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: 12,
    padding: Spacing.sm,
    marginTop: Spacing.sm,
    backgroundColor: Colors.surfaceDark,
  },
  contactTitle: { color: Colors.text, fontWeight: "700" },
  metaText: { color: Colors.textSecondary, fontSize: 12, marginTop: 2 },
  contactImage: {
    width: 86,
    height: 86,
    borderRadius: 8,
    backgroundColor: Colors.surface,
  },
  editBox: { marginTop: Spacing.sm },
  actionBtn: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: Colors.primary,
  },
  actionBtnText: { color: Colors.white, fontWeight: "700", fontSize: 12 },
  deleteBtn: { backgroundColor: Colors.error },
  linkBtn: { alignSelf: "flex-start", marginTop: Spacing.sm },
  linkBtnText: { color: Colors.primary, fontWeight: "700" },
});
