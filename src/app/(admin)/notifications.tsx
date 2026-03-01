import { MaterialIcons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import FixedHeader from "../../components/common/FixedHeader";
import { CustomerService } from "../../services/customer.service";
import { NotificationService } from "../../services/notification.service";
import { useAuthStore } from "../../stores/auth.store";
import { Colors, Spacing } from "../../theme";

export default function AdminNotificationsScreen() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<"ALL" | "CUSTOMER" | "STAFF">("ALL");
  const [productStatusTag, setProductStatusTag] = useState<
    | "SOWN"
    | "GERMINATED"
    | "READY"
    | "DISCARDED"
    | "PAYMENT_PENDING"
    | "PAYMENT_VERIFIED"
    | "PAYMENT_REJECTED"
    | ""
  >("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [reminderEveryDays, setReminderEveryDays] = useState("7");

  const { data, refetch, isRefetching } = useQuery({
    queryKey: ["notifications", "admin"],
    queryFn: () => NotificationService.list("CUSTOMER_NURSERY_ADMIN"),
  });

  const { data: customerData } = useQuery({
    queryKey: ["customers", "notification-targets"],
    queryFn: CustomerService.getAll,
  });

  const customers = useMemo(
    () => (Array.isArray(customerData) ? customerData : []),
    [customerData],
  );

  const selectedCustomer = useMemo(
    () => customers.find((item: any) => item?._id === selectedCustomerId),
    [customers, selectedCustomerId],
  );

  const filteredCustomers = useMemo(() => {
    if (audience !== "CUSTOMER") return [];
    const q = customerSearch.trim().toLowerCase();
    const list = q
      ? customers.filter((customer: any) => {
          const id = String(customer?._id || "").toLowerCase();
          const name = String(customer?.name || "").toLowerCase();
          const phone = String(customer?.mobileNumber || "").toLowerCase();
          return id.includes(q) || name.includes(q) || phone.includes(q);
        })
      : customers;
    return list.slice(0, 8);
  }, [audience, customerSearch, customers]);

  const createMutation = useMutation({
    mutationFn: () => {
      if (!title.trim() || !body.trim()) {
        throw new Error("Title and message are required");
      }
      if (audience === "CUSTOMER" && customerSearch.trim() && !selectedCustomerId) {
        throw new Error("Select a customer from the results or clear search to broadcast to all customers");
      }
      return NotificationService.create({
        title: title.trim(),
        body: body.trim(),
        audience,
        createdBy: user?.name,
        customerId: audience === "CUSTOMER" && selectedCustomerId ? selectedCustomerId : undefined,
        productStatusTag: productStatusTag || undefined,
      });
    },
    onSuccess: async () => {
      setTitle("");
      setBody("");
      setProductStatusTag("");
      setCustomerSearch("");
      setSelectedCustomerId("");
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
      Alert.alert("Sent", "Notification broadcasted.");
    },
    onError: (err: any) => Alert.alert("Failed", err?.message || "Please try again"),
  });

  const configMutation = useMutation({
    mutationFn: () => {
      const parsed = Number(reminderEveryDays || 0);
      if (!Number.isFinite(parsed) || parsed < 1) {
        throw new Error("Reminder cadence should be at least 1 day");
      }
      return NotificationService.setDueReminderConfig(parsed);
    },
    onSuccess: () => {
      Alert.alert("Saved", "Due reminder cadence updated.");
    },
    onError: (err: any) => {
      Alert.alert("Unable to save", err?.message || "Please try again");
    },
  });

  return (
    <SafeAreaView style={styles.container} edges={["left", "right"]}>
      <FixedHeader
        title="Notification Center"
        subtitle="Send updates to customers and staff"
        titleStyle={styles.headerTitle}
        actions={
          <Pressable style={styles.headerIconBtn} onPress={() => refetch()}>
            <MaterialIcons
              name={isRefetching ? "sync" : "refresh"}
              size={20}
              color={Colors.white}
            />
          </Pressable>
        }
      />

      <View style={styles.composer}>
        <View style={styles.audienceRow}>
          {(["ALL", "CUSTOMER", "STAFF"] as const).map((item) => (
            <Pressable
              key={item}
              style={[
                styles.audienceChip,
                audience === item && styles.audienceChipActive,
              ]}
              onPress={() => {
                setAudience(item);
                if (item !== "CUSTOMER") {
                  setCustomerSearch("");
                  setSelectedCustomerId("");
                }
              }}
            >
              <Text
                style={[
                  styles.audienceChipText,
                  audience === item && styles.audienceChipTextActive,
                ]}
              >
                {item}
              </Text>
            </Pressable>
          ))}
        </View>

        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Title"
          style={styles.input}
          placeholderTextColor={Colors.textTertiary}
        />
        <TextInput
          value={body}
          onChangeText={setBody}
          placeholder="Message"
          style={[styles.input, styles.bodyInput]}
          multiline
          placeholderTextColor={Colors.textTertiary}
        />

        {audience === "CUSTOMER" ? (
          <View style={styles.targetWrap}>
            <Text style={styles.helperText}>
              Leave target unselected to notify all customers.
            </Text>
            <TextInput
              value={customerSearch}
              onChangeText={(value) => {
                setCustomerSearch(value);
                if (!value.trim()) setSelectedCustomerId("");
              }}
              placeholder="Search customer by name, phone, or ID"
              style={styles.input}
              placeholderTextColor={Colors.textTertiary}
            />
            {selectedCustomer ? (
              <View style={styles.selectedCustomerCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.selectedCustomerTitle}>{selectedCustomer.name}</Text>
                  <Text style={styles.selectedCustomerMeta}>ID: {selectedCustomer._id}</Text>
                  {selectedCustomer.mobileNumber ? (
                    <Text style={styles.selectedCustomerMeta}>
                      Phone: {selectedCustomer.mobileNumber}
                    </Text>
                  ) : null}
                </View>
                <Pressable onPress={() => setSelectedCustomerId("")}>
                  <MaterialIcons name="close" size={18} color={Colors.textSecondary} />
                </Pressable>
              </View>
            ) : null}
            {customerSearch.trim() ? (
              <View style={styles.customerList}>
                {filteredCustomers.map((customer: any) => (
                  <Pressable
                    key={customer._id}
                    style={styles.customerItem}
                    onPress={() => {
                      setSelectedCustomerId(String(customer._id));
                      setCustomerSearch(String(customer.name || ""));
                    }}
                  >
                    <Text style={styles.customerName}>{customer.name || "Unnamed"}</Text>
                    <Text style={styles.customerMeta}>ID: {customer._id}</Text>
                    {customer.mobileNumber ? (
                      <Text style={styles.customerMeta}>Phone: {customer.mobileNumber}</Text>
                    ) : null}
                  </Pressable>
                ))}
                {filteredCustomers.length === 0 ? (
                  <Text style={styles.noResultText}>No matching customers found.</Text>
                ) : null}
              </View>
            ) : null}
          </View>
        ) : null}

        <TextInput
          value={productStatusTag}
          onChangeText={setProductStatusTag as any}
          placeholder="Product status tag (optional)"
          style={styles.input}
          placeholderTextColor={Colors.textTertiary}
        />

        <Pressable style={styles.sendBtn} onPress={() => createMutation.mutate()}>
          <Text style={styles.sendBtnText}>
            {audience === "CUSTOMER" && selectedCustomerId
              ? "Send Targeted Notification"
              : "Send Broadcast"}
          </Text>
        </Pressable>
      </View>

      <View style={styles.reminderCard}>
        <Text style={styles.reminderTitle}>Due Reminder Cadence</Text>
        <Text style={styles.helperText}>Set interval in days for automatic due reminders.</Text>
        <View style={styles.reminderRow}>
          <TextInput
            value={reminderEveryDays}
            onChangeText={setReminderEveryDays}
            placeholder="Every X days"
            keyboardType="numeric"
            style={[styles.input, styles.daysInput]}
            placeholderTextColor={Colors.textTertiary}
          />
          <Pressable
            style={styles.saveBtn}
            onPress={() => configMutation.mutate()}
          >
            <Text style={styles.saveBtnText}>Save</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {(data || []).map((item) => (
          <View key={item.id} style={styles.card}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardBody}>{item.body}</Text>
            {item.customerId ? <Text style={styles.meta}>Customer ID: {item.customerId}</Text> : null}
            {item.customerPhone ? (
              <Text style={styles.meta}>Phone: {item.customerPhone}</Text>
            ) : null}
            {item.productStatusTag ? (
              <Text style={styles.meta}>Status: {item.productStatusTag}</Text>
            ) : null}
            <Text style={styles.meta}>{new Date(item.createdAt).toLocaleString("en-IN")}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  headerTitle: { fontSize: 24 },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.34)",
    alignItems: "center",
    justifyContent: "center",
  },
  composer: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  audienceRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  audienceChip: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  audienceChipActive: {
    borderColor: Colors.primary,
    backgroundColor: `${Colors.primary}12`,
  },
  audienceChipText: { color: Colors.textSecondary, fontWeight: "600", fontSize: 12 },
  audienceChipTextActive: { color: Colors.primary },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    color: Colors.text,
    backgroundColor: Colors.surfaceDark,
  },
  bodyInput: { minHeight: 72, textAlignVertical: "top" },
  helperText: { color: Colors.textTertiary, fontSize: 12 },
  targetWrap: { gap: Spacing.sm },
  selectedCustomerCard: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    backgroundColor: `${Colors.primary}12`,
    padding: Spacing.sm,
    flexDirection: "row",
    gap: Spacing.sm,
  },
  selectedCustomerTitle: { color: Colors.text, fontWeight: "700" },
  selectedCustomerMeta: { color: Colors.textSecondary, fontSize: 12 },
  customerList: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    backgroundColor: Colors.surfaceDark,
    overflow: "hidden",
  },
  customerItem: {
    padding: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  customerName: { color: Colors.text, fontWeight: "600" },
  customerMeta: { color: Colors.textSecondary, fontSize: 12, marginTop: 2 },
  noResultText: {
    color: Colors.textTertiary,
    textAlign: "center",
    paddingVertical: Spacing.md,
  },
  sendBtn: {
    borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: "center",
    paddingVertical: Spacing.sm,
  },
  sendBtnText: { color: Colors.white, fontWeight: "700" },
  reminderCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  reminderTitle: { color: Colors.text, fontWeight: "700", fontSize: 15 },
  reminderRow: { flexDirection: "row", gap: Spacing.sm, alignItems: "center" },
  daysInput: { flex: 1 },
  saveBtn: {
    borderRadius: 10,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.success,
  },
  saveBtnText: { color: Colors.white, fontWeight: "700" },
  content: { paddingHorizontal: Spacing.lg, gap: Spacing.md, paddingBottom: 110 },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    padding: Spacing.md,
    gap: 4,
  },
  cardTitle: { color: Colors.text, fontWeight: "700" },
  cardBody: { color: Colors.textSecondary },
  meta: { color: Colors.textTertiary, fontSize: 12, marginTop: 2 },
});
