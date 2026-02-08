import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Plant, PlantService } from "../../../services/plant.service";
import { SalesService } from "../../../services/sales.service";
import { Colors, Spacing } from "../../../theme";

interface CartItem {
  plant: Plant;
  quantity: number;
}

export default function StaffSalesCreate() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);

  const { data } = useQuery({
    queryKey: ["plants"],
    queryFn: PlantService.getAll,
  });

  const plants: Plant[] = Array.isArray(data) ? data : [];

  const filteredPlants = useMemo(() => {
    return plants.filter(
      (p) =>
        p.quantityAvailable > 0 &&
        p.name.toLowerCase().includes(search.toLowerCase()),
    );
  }, [plants, search]);

  const addToCart = (plant: Plant) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.plant._id === plant._id);
      if (existing) {
        if (existing.quantity >= plant.quantityAvailable) return prev;
        return prev.map((i) =>
          i.plant._id === plant._id ? { ...i, quantity: i.quantity + 1 } : i,
        );
      }
      return [...prev, { plant, quantity: 1 }];
    });
  };

  const updateQty = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) =>
          i.plant._id === id
            ? {
                ...i,
                quantity: i.quantity + delta,
              }
            : i,
        )
        .filter((i) => i.quantity > 0),
    );
  };

  const totalAmount = useMemo(() => {
    return cart.reduce((sum, i) => sum + i.quantity * i.plant.price, 0);
  }, [cart]);

  const mutation = useMutation({
    mutationFn: () =>
      SalesService.create({
        items: cart.map((i) => ({
          plantId: i.plant._id,
          quantity: i.quantity,
        })),
      }),
    onSuccess: () => {
      Alert.alert("Success", "Sale recorded successfully");
      router.back();
    },
    onError: (err: any) => {
      Alert.alert("Error", err?.message || "Sale failed");
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>New Sale</Text>

        {/* Search */}
        <TextInput
          placeholder="Search plants..."
          value={search}
          onChangeText={setSearch}
          style={styles.search}
        />

        {/* Plant List */}
        <FlatList
          data={filteredPlants}
          keyExtractor={(p) => p._id}
          renderItem={({ item }) => (
            <Pressable onPress={() => addToCart(item)} style={styles.plantRow}>
              <Text style={styles.plantName}>{item.name}</Text>
              <Text style={styles.plantMeta}>
                ₹{item.price} • Stock {item.quantityAvailable}
              </Text>
            </Pressable>
          )}
        />

        {/* Cart */}
        {cart.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Cart</Text>

            {cart.map((i) => (
              <View key={i.plant._id} style={styles.cartRow}>
                <Text style={styles.cartName}>{i.plant.name}</Text>

                <View style={styles.qtyControls}>
                  <Pressable onPress={() => updateQty(i.plant._id, -1)}>
                    <Text style={styles.qtyBtn}>−</Text>
                  </Pressable>

                  <Text style={styles.qtyText}>{i.quantity}</Text>

                  <Pressable
                    onPress={() =>
                      i.quantity < i.plant.quantityAvailable &&
                      updateQty(i.plant._id, 1)
                    }
                  >
                    <Text style={styles.qtyBtn}>+</Text>
                  </Pressable>
                </View>

                <Text style={styles.cartPrice}>
                  ₹{i.quantity * i.plant.price}
                </Text>
              </View>
            ))}

            <View style={styles.totalRow}>
              <Text style={styles.totalText}>Total</Text>
              <Text style={styles.totalText}>₹ {totalAmount}</Text>
            </View>

            <Pressable
              onPress={() => mutation.mutate()}
              disabled={mutation.isLoading}
              style={styles.submit}
            >
              <Text style={styles.submitText}>
                {mutation.isLoading ? "Processing..." : "Confirm Sale"}
              </Text>
            </Pressable>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

/* ---------------- Styles ---------------- */

const styles = {
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.lg,
  },
  title: {
    fontSize: 20,
    fontWeight: "600" as const,
    marginBottom: Spacing.md,
    color: Colors.text,
  },
  search: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    backgroundColor: Colors.surface,
  },
  plantRow: {
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderColor: Colors.borderLight,
  },
  plantName: {
    fontSize: 16,
    fontWeight: "500" as const,
  },
  plantMeta: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600" as const,
    marginVertical: Spacing.md,
  },
  cartRow: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    marginBottom: Spacing.sm,
  },
  cartName: {
    flex: 1,
  },
  qtyControls: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: Spacing.sm,
  },
  qtyBtn: {
    fontSize: 20,
    color: Colors.primary,
    paddingHorizontal: Spacing.sm,
  },
  qtyText: {
    minWidth: 24,
    textAlign: "center" as const,
  },
  cartPrice: {
    width: 80,
    textAlign: "right" as const,
  },
  totalRow: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    marginVertical: Spacing.md,
  },
  totalText: {
    fontSize: 16,
    fontWeight: "600" as const,
  },
  submit: {
    backgroundColor: Colors.primary,
    padding: Spacing.md,
    borderRadius: 10,
    alignItems: "center" as const,
  },
  submitText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: "600" as const,
  },
};
