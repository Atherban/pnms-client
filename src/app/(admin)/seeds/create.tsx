import DateTimePicker from "@react-native-community/datetimepicker";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import { Button } from "../../../components";
import { SeedService } from "../../../services/seed.service";
import { Colors, Spacing } from "../../../theme";

/* Backend enum values */
const SEED_CATEGORIES = ["VEGETABLE", "FLOWER", "FRUIT", "HERB"] as const;

type SeedCategory = (typeof SEED_CATEGORIES)[number];

const formatDate = (d: Date) => d.toISOString().split("T")[0];
const formatDisplayDate = (d: Date) =>
  d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

export default function CreateSeed() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [category, setCategory] = useState<SeedCategory | null>(null);
  const [supplierName, setSupplierName] = useState("");
  const [totalPurchased, setTotalPurchased] = useState("");

  const [purchaseDate, setPurchaseDate] = useState<Date | null>(null);
  const [expiryDate, setExpiryDate] = useState<Date | null>(null);

  const [showPurchasePicker, setShowPurchasePicker] = useState(false);
  const [showExpiryPicker, setShowExpiryPicker] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  const mutation = useMutation({
    mutationFn: SeedService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seeds"] });
      router.back();
    },
    onError: (err: any) => {
      Alert.alert("Create failed", err?.message ?? "Something went wrong");
    },
  });

  const handleCreate = () => {
    if (!name.trim()) {
      Alert.alert("Validation", "Seed name is required");
      return;
    }
    if (!category) {
      Alert.alert("Validation", "Category is required");
      return;
    }
    if (!supplierName.trim()) {
      Alert.alert("Validation", "Supplier name is required");
      return;
    }
    if (!totalPurchased || isNaN(Number(totalPurchased))) {
      Alert.alert("Validation", "Total purchased must be a number");
      return;
    }
    if (!purchaseDate || !expiryDate) {
      Alert.alert("Validation", "Please select both dates");
      return;
    }

    mutation.mutate({
      name: name.trim(),
      category,
      supplierName: supplierName.trim(),
      totalPurchased: Number(totalPurchased),
      purchaseDate: formatDate(purchaseDate),
      expiryDate: formatDate(expiryDate),
    });
  };

  return (
    <ScrollView contentContainerStyle={{ padding: Spacing.lg }}>
      <Text style={title}>Add Seed</Text>

      <TextInput
        placeholder="Seed Name"
        value={name}
        onChangeText={setName}
        style={input}
      />

      {/* Category Dropdown */}
      <Pressable onPress={() => setShowCategoryModal(true)} style={selectBox}>
        <Text
          style={{
            color: category ? Colors.textPrimary : Colors.textSecondary,
            fontWeight: category ? "600" : "400",
          }}
        >
          {category ?? "Select Category"} ▼
        </Text>
      </Pressable>

      <TextInput
        placeholder="Supplier Name"
        value={supplierName}
        onChangeText={setSupplierName}
        style={input}
      />

      <TextInput
        placeholder="Total Purchased"
        keyboardType="numeric"
        value={totalPurchased}
        onChangeText={setTotalPurchased}
        style={input}
      />

      {/* Purchase Date */}
      <Pressable onPress={() => setShowPurchasePicker(true)} style={selectBox}>
        <Text>
          {purchaseDate
            ? formatDisplayDate(purchaseDate)
            : "Select Purchase Date"}
        </Text>
      </Pressable>

      {showPurchasePicker && (
        <DateTimePicker
          value={purchaseDate ?? new Date()}
          mode="date"
          onChange={(_, date) => {
            setShowPurchasePicker(false);
            if (date) setPurchaseDate(date);
          }}
        />
      )}

      {/* Expiry Date */}
      <Pressable onPress={() => setShowExpiryPicker(true)} style={selectBox}>
        <Text>
          {expiryDate ? formatDisplayDate(expiryDate) : "Select Expiry Date"}
        </Text>
      </Pressable>

      {showExpiryPicker && (
        <DateTimePicker
          value={expiryDate ?? new Date()}
          mode="date"
          onChange={(_, date) => {
            setShowExpiryPicker(false);
            if (date) setExpiryDate(date);
          }}
        />
      )}

      <Button
        title={mutation.isLoading ? "Creating..." : "Create Seed"}
        onPress={handleCreate}
        disabled={mutation.isLoading}
      />

      {/* Category Modal */}
      <Modal transparent animationType="fade" visible={showCategoryModal}>
        <Pressable
          onPress={() => setShowCategoryModal(false)}
          style={modalOverlay}
        >
          <View style={modalCard}>
            <Text style={modalTitle}>Select Category</Text>

            {SEED_CATEGORIES.map((c) => (
              <Pressable
                key={c}
                onPress={() => {
                  setCategory(c);
                  setShowCategoryModal(false);
                }}
                style={modalOption}
              >
                <Text
                  style={{
                    fontWeight: category === c ? "600" : "400",
                    color: category === c ? Colors.primary : Colors.textPrimary,
                  }}
                >
                  {c}
                </Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

/* Styles */
const title = {
  fontSize: 18,
  fontWeight: "600" as const,
  marginBottom: Spacing.lg,
};

const input = {
  borderWidth: 1,
  borderColor: Colors.border,
  padding: Spacing.md,
  marginBottom: Spacing.md,
};

const selectBox = {
  borderWidth: 1,
  borderColor: Colors.border,
  padding: Spacing.md,
  borderRadius: 6,
  marginBottom: Spacing.md,
};

const modalOverlay = {
  flex: 1,
  backgroundColor: "rgba(0,0,0,0.4)",
  justifyContent: "center",
  padding: Spacing.lg,
};

const modalCard = {
  backgroundColor: "#FFF",
  borderRadius: 8,
  padding: Spacing.lg,
};

const modalTitle = {
  fontSize: 16,
  fontWeight: "600" as const,
  marginBottom: Spacing.md,
};

const modalOption = {
  paddingVertical: Spacing.sm,
};
