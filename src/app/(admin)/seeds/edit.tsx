import DateTimePicker from "@react-native-community/datetimepicker";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, TextInput } from "react-native";

import { Button } from "../../../components";
import { SeedService } from "../../../services/seed.service";
import { Colors, Spacing } from "../../../theme";

const formatDate = (d: Date) => d.toISOString().split("T")[0];
const formatDisplayDate = (d: Date) =>
  d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

export default function EditSeed() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ["seed", id],
    queryFn: () => SeedService.getById(id),
    enabled: !!id,
  });

  const [name, setName] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [expiryDate, setExpiryDate] = useState<Date | null>(null);
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    if (data) {
      setName(data.name);
      setSupplierName(data.supplierName);
      setExpiryDate(new Date(data.expiryDate));
    }
  }, [data]);

  const mutation = useMutation({
    mutationFn: (payload) => SeedService.update(id!, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seeds"] });
      router.back();
    },
  });

  return (
    <ScrollView contentContainerStyle={{ padding: Spacing.lg }}>
      <Text style={title}>Edit Seed</Text>

      <TextInput value={name} onChangeText={setName} style={input} />
      <TextInput
        value={supplierName}
        onChangeText={setSupplierName}
        style={input}
      />

      {/* Expiry Date */}
      <Pressable onPress={() => setShowPicker(true)} style={dateBox}>
        <Text style={dateText}>
          {expiryDate ? formatDisplayDate(expiryDate) : "Select Expiry Date"}
        </Text>
      </Pressable>

      {showPicker && (
        <DateTimePicker
          value={expiryDate ?? new Date()}
          mode="date"
          display="default"
          onChange={(_, date) => {
            setShowPicker(false);
            if (date) setExpiryDate(date);
          }}
        />
      )}

      <Button
        title={mutation.isLoading ? "Saving..." : "Save Changes"}
        onPress={() =>
          mutation.mutate({
            name: name.trim(),
            supplierName: supplierName.trim(),
            expiryDate: formatDate(expiryDate!),
          })
        }
        disabled={mutation.isLoading}
      />
    </ScrollView>
  );
}

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

const dateBox = {
  borderWidth: 1,
  borderColor: Colors.border,
  padding: Spacing.md,
  borderRadius: 6,
  marginBottom: Spacing.md,
};

const dateText = {
  color: Colors.textPrimary,
};
