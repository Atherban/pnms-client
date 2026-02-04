import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, Text, TextInput } from "react-native";

import { Button } from "../../../components";
import { PlantService } from "../../../services/plant.service";
import { Colors, Spacing } from "../../../theme";

export default function EditPlant() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const plantId =
    typeof params.id === "string"
      ? params.id
      : Array.isArray(params.id)
        ? params.id[0]
        : undefined;

  const router = useRouter();
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["plant", plantId],
    queryFn: () => PlantService.getById(plantId!),
    enabled: !!plantId,
  });

  useEffect(() => {
    if (data) {
      setName(data.name);
      setCategory(data.category);
      setPrice(String(data.price));
    }
  }, [data]);

  const mutation = useMutation({
    mutationFn: (payload: { name: string; category: string; price: number }) =>
      PlantService.update(plantId!, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plants"] });
      router.back();
    },
  });

  const handleSave = () => {
    if (!plantId) {
      console.warn("Missing plantId");
      return;
    }

    mutation.mutate({
      name: name.trim(),
      category: category.trim(),
      price: Number(price),
    });
  };

  if (isLoading || !data) {
    return <Text style={{ padding: Spacing.lg }}>Loading...</Text>;
  }

  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ padding: Spacing.lg }}
    >
      <Text
        style={{ fontSize: 18, fontWeight: "600", marginBottom: Spacing.lg }}
      >
        Edit Plant
      </Text>

      <TextInput value={name} onChangeText={setName} style={inputStyle} />
      <TextInput
        value={category}
        onChangeText={setCategory}
        style={inputStyle}
      />
      <TextInput
        value={price}
        keyboardType="numeric"
        onChangeText={setPrice}
        style={inputStyle}
      />

      <Button
        title={mutation.isLoading ? "Saving..." : "Save Changes"}
        onPress={handleSave}
        disabled={mutation.isLoading}
      />
    </ScrollView>
  );
}

const inputStyle = {
  borderWidth: 1,
  borderColor: Colors.border,
  padding: Spacing.md,
  marginBottom: Spacing.md,
};
