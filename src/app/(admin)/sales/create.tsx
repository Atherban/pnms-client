import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PlantService } from "../../../services/plant.service";
import { SalesService } from "../../../services/sales.service";
import { Colors, Spacing } from "../../../theme";

export default function AdminSalesCreate() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [plantId, setPlantId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState("");
  const [pricePerUnit, setPricePerUnit] = useState("");
  const [paymentMode, setpaymentMode] = useState<
    "CASH" | "UPI" | "CARD" | null
  >(null);

  /* Fetch plants */
  const { data: plantData, isLoading } = useQuery({
    queryKey: ["plants"],
    queryFn: PlantService.getAll,
  });

  const plants = Array.isArray(plantData) ? plantData : [];

  const selectedPlant = useMemo(
    () => plants.find((p) => p._id === plantId),
    [plants, plantId],
  );

  const qty = Number(quantity);
  const unitPrice = Number(pricePerUnit);

  const isValid =
    !!plantId &&
    !!paymentMode &&
    qty > 0 &&
    unitPrice > 0 &&
    qty <= (selectedPlant?.quantityAvailable ?? 0);

  /* Mutation */
  const mutation = useMutation({
    mutationFn: () =>
      SalesService.create({
        items: [
          {
            plantId: plantId!,
            quantity: qty,
            pricePerUnit: unitPrice,
          },
        ],
        paymentMode: paymentMode!,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["plants"] });
      Alert.alert("Success", "Sale recorded successfully");
      router.back();
    },
    onError: (err: any) => {
      Alert.alert(
        "Error",
        err?.message || "Failed to record sale. Please try again.",
      );
    },
  });

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Record Sale</Text>

        {/* Plant Selection */}
        <Text style={styles.label}>Select Plant</Text>
        {plants.map((p) => (
          <Pressable
            key={p._id}
            onPress={() => setPlantId(p._id)}
            style={[styles.option, plantId === p._id && styles.optionActive]}
          >
            <Text style={styles.optionText}>{p.name}</Text>
            <Text style={styles.optionSub}>
              Available: {p.quantityAvailable}
            </Text>
          </Pressable>
        ))}

        {/* Quantity */}
        <Text style={styles.label}>Quantity</Text>
        <TextInput
          value={quantity}
          onChangeText={setQuantity}
          keyboardType="numeric"
          placeholder="Enter quantity"
          style={styles.input}
        />

        {/* Price */}
        <Text style={styles.label}>Price per Unit</Text>
        <TextInput
          value={pricePerUnit}
          onChangeText={setPricePerUnit}
          keyboardType="numeric"
          placeholder="Enter price"
          style={styles.input}
        />

        {/* Payment Method */}
        <Text style={styles.label}>Payment Method</Text>
        <View style={styles.paymentRow}>
          {(["CASH", "UPI", "CARD"] as const).map((method) => (
            <Pressable
              key={method}
              onPress={() => setpaymentMode(method)}
              style={[
                styles.paymentOption,
                paymentMode === method && styles.paymentActive,
              ]}
            >
              <Text
                style={[
                  styles.paymentText,
                  paymentMode === method && styles.paymentTextActive,
                ]}
              >
                {method}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Submit */}
        <Pressable
          disabled={!isValid || mutation.isLoading}
          onPress={() => mutation.mutate()}
          style={[
            styles.submitButton,
            (!isValid || mutation.isLoading) && styles.submitDisabled,
          ]}
        >
          {mutation.isLoading ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <Text style={styles.submitText}>Save Sale</Text>
          )}
        </Pressable>

        {!paymentMode && (
          <Text style={styles.hint}>Please select a payment method</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/* Styles */
const styles = {
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.lg,
  },
  title: {
    fontSize: 22,
    fontWeight: "700" as const,
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: 14,
    fontWeight: "600" as const,
    marginBottom: Spacing.sm,
  },
  option: {
    padding: Spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.sm,
  },
  optionActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + "10",
  },
  optionText: {
    fontSize: 16,
    fontWeight: "600" as const,
  },
  optionSub: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    fontSize: 16,
  },
  paymentRow: {
    flexDirection: "row" as const,
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  paymentOption: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center" as const,
  },
  paymentActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + "10",
  },
  paymentText: {
    fontWeight: "600" as const,
    color: Colors.textSecondary,
  },
  paymentTextActive: {
    color: Colors.primary,
  },
  submitButton: {
    padding: Spacing.lg,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: "center" as const,
  },
  submitDisabled: {
    opacity: 0.5,
  },
  submitText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: "700" as const,
  },
  hint: {
    marginTop: Spacing.sm,
    fontSize: 12,
    color: Colors.error,
    textAlign: "center" as const,
  },
};
