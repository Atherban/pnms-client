import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView, Text, TextInput } from "react-native";

import { Button } from "../../../components";
import { PlantService } from "../../../services/plant.service";
import { Colors, Spacing } from "../../../theme";

export default function UpdateQuantity() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const plantId =
    typeof params.id === "string"
      ? params.id
      : Array.isArray(params.id)
        ? params.id[0]
        : undefined;

  const router = useRouter();
  const queryClient = useQueryClient();

  const [quantity, setQuantity] = useState("");

  const mutation = useMutation({
    mutationFn: (q: number) => PlantService.updateQuantity(plantId!, q),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plants"] });
      router.back();
    },
  });

  const handleUpdate = () => {
    if (!plantId) {
      console.warn("Missing plantId");
      return;
    }

    mutation.mutate(Number(quantity));
  };

  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ padding: Spacing.lg }}
    >
      <Text
        style={{ fontSize: 18, fontWeight: "600", marginBottom: Spacing.lg }}
      >
        Update Quantity
      </Text>

      <TextInput
        keyboardType="numeric"
        value={quantity}
        onChangeText={setQuantity}
        style={{
          borderWidth: 1,
          borderColor: Colors.border,
          padding: Spacing.md,
          marginBottom: Spacing.md,
        }}
      />

      <Button
        title={mutation.isLoading ? "Updating..." : "Update"}
        onPress={handleUpdate}
        disabled={mutation.isLoading}
      />
    </ScrollView>
  );
}
