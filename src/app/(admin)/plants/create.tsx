import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import { Button } from "../../../components";
import { PlantService } from "../../../services/plant.service";
import { Colors, Spacing } from "../../../theme";

/**
 * Categories accepted by backend
 * MUST match enum / validation exactly
 */
const PLANT_CATEGORIES = [
  "FLOWER",
  "FRUIT",
  "INDOOR",
  "OUTDOOR",
  "VEGETABLE",
  "MEDICINAL",
  "ORNAMENTAL",
] as const;

type PlantCategory = (typeof PLANT_CATEGORIES)[number];

export default function CreatePlant() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [category, setCategory] = useState<PlantCategory | "">("");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [categoryOpen, setCategoryOpen] = useState(false);

  const mutation = useMutation({
    mutationFn: PlantService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plants"] });
      router.replace("/(admin)/plants");
    },
  });

  const handleCreate = () => {
    mutation.mutate({
      name: name.trim(),
      category,
      price: Number(price),
      quantityAvailable: Number(quantity),
    });
  };

  const isDisabled =
    mutation.isLoading || !name.trim() || !category || !price || !quantity;

  return (
    <View style={{ padding: Spacing.lg }}>
      <Text
        style={{
          fontSize: 18,
          fontWeight: "600",
          marginBottom: Spacing.lg,
        }}
      >
        Add Plant
      </Text>

      {/* Plant Name */}
      <TextInput
        placeholder="Plant Name"
        value={name}
        onChangeText={setName}
        style={inputStyle}
      />

      {/* Category Dropdown */}
      <View style={{ marginBottom: Spacing.md }}>
        <Pressable
          onPress={() => setCategoryOpen((v) => !v)}
          style={{
            borderWidth: 1,
            borderColor: Colors.border,
            padding: Spacing.md,
            justifyContent: "space-between",
            flexDirection: "row",
          }}
        >
          <Text
            style={{
              color: category ? Colors.textPrimary : Colors.textSecondary,
            }}
          >
            {category || "Select Category"}
          </Text>
          <Text style={{ color: Colors.textSecondary }}>▼</Text>
        </Pressable>

        {categoryOpen && (
          <View
            style={{
              borderWidth: 1,
              borderColor: Colors.border,
              borderTopWidth: 0,
            }}
          >
            {PLANT_CATEGORIES.map((c) => (
              <Pressable
                key={c}
                onPress={() => {
                  setCategory(c);
                  setCategoryOpen(false);
                }}
                style={{
                  padding: Spacing.md,
                  backgroundColor:
                    category === c ? Colors.surface : "transparent",
                }}
              >
                <Text
                  style={{
                    fontWeight: category === c ? "600" : "400",
                  }}
                >
                  {c}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>

      {/* Price */}
      <TextInput
        placeholder="Price"
        keyboardType="numeric"
        value={price}
        onChangeText={setPrice}
        style={inputStyle}
      />

      {/* Initial Quantity */}
      <TextInput
        placeholder="Initial Quantity"
        keyboardType="numeric"
        value={quantity}
        onChangeText={setQuantity}
        style={inputStyle}
      />

      <Button
        title="Create Plant"
        onPress={handleCreate}
        disabled={isDisabled}
      />

      {mutation.isError && (
        <Text
          style={{
            color: Colors.error,
            marginTop: Spacing.md,
          }}
        >
          Failed to create plant
        </Text>
      )}
    </View>
  );
}

const inputStyle = {
  borderWidth: 1,
  borderColor: Colors.border,
  padding: Spacing.md,
  marginBottom: Spacing.md,
};
