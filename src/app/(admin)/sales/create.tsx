import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import InventorySelect from "../../../components/InventorySelect";
import { InventoryService } from "../../../services/inventory.service";
import { SalesService } from "../../../services/sales.service";
import { Colors, Spacing } from "../../../theme";

export default function CreateSale() {
  const router = useRouter();
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ["inventory"],
    queryFn: InventoryService.getAll,
  });

  const inventory = Array.isArray(data) ? data : (data?.data ?? []);

  const [selected, setSelected] = useState<any>(null);
  const [qty, setQty] = useState("1");
  const paymentMode: "CASH" | "UPI" | "ONLINE" = "CASH";

  const mutation = useMutation({
    mutationFn: SalesService.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventory"] });
      qc.invalidateQueries({ queryKey: ["sales"] });
      setSelected(null);
      setQty("1");
      Alert.alert("Success", "Sale recorded", [
        { text: "OK", onPress: () => router.replace("/(admin)/sales") },
      ]);
    },
    onError: (err: any) => {
      Alert.alert("Error", err?.message || "Unable to record sale");
    },
  });

  const submit = () => {
    if (mutation.isLoading) return;
    const quantity = Number(qty);

    if (!selected) return Alert.alert("Select inventory");

    if (quantity <= 0 || quantity > selected.quantity)
      return Alert.alert("Invalid quantity");

    mutation.mutate({
      paymentMode,
      items: [
        {
          inventoryId: selected._id,
          quantity,
        },
      ],
    });
  };

  return (
    <View style={{ padding: Spacing.lg }}>
      <Text style={{ fontWeight: "700", marginBottom: 8 }}>
        Select Inventory
      </Text>

      <FlatList
        data={inventory}
        keyExtractor={(i) => i._id}
        renderItem={({ item }) => (
          <InventorySelect item={item} onSelect={() => setSelected(item)} />
        )}
      />

      {selected && (
        <>
          <Text>Quantity</Text>
          <TextInput
            keyboardType="numeric"
            value={qty}
            onChangeText={setQty}
            style={styles.input}
          />

          <Pressable
            onPress={submit}
            disabled={mutation.isLoading}
            style={styles.button}
          >
            <Text style={styles.buttonText}>
              {mutation.isLoading ? "Processing..." : "Complete Sale"}
            </Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

const styles = {
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
  },
  button: {
    backgroundColor: Colors.primary,
    padding: Spacing.md,
    borderRadius: 12,
    marginTop: Spacing.lg,
  },
  buttonText: {
    color: Colors.white,
    textAlign: "center",
    fontWeight: "700",
  },
};
