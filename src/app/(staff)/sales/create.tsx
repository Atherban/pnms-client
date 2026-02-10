import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { InventoryService } from "../../../services/inventory.service";
import { SalesService } from "../../../services/sales.service";
import { Colors, Spacing } from "../../../theme";

interface CartItem {
  inventory: any;
  quantity: number;
}

export default function StaffSalesCreate() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["inventory"],
    queryFn: InventoryService.getAll,
  });

  const inventory = Array.isArray(data) ? data : (data?.data ?? []);

  const filteredInventory = useMemo(() => {
    const term = search.toLowerCase();
    return inventory.filter((i: any) => {
      const name = i.plantType?.name?.toLowerCase() ?? "";
      const category = i.plantType?.category?.toLowerCase() ?? "";
      return i.quantity > 0 && (name.includes(term) || category.includes(term));
    });
  }, [inventory, search]);

  const addToCart = (item: any) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.inventory._id === item._id);
      if (existing) {
        if (existing.quantity >= item.quantity) return prev;
        return prev.map((i) =>
          i.inventory._id === item._id
            ? { ...i, quantity: i.quantity + 1 }
            : i,
        );
      }
      return [...prev, { inventory: item, quantity: 1 }];
    });
  };

  const updateQty = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) =>
          i.inventory._id === id
            ? {
                ...i,
                quantity: i.quantity + delta,
              }
            : i,
        )
        .filter((i) => i.quantity > 0),
    );
  };

  const getUnitPrice = (item: any) =>
    Number(
      item?.price ??
        item?.unitPrice ??
        item?.sellingPrice ??
        item?.priceSnapshot ??
        0,
    );

  const totalAmount = useMemo(() => {
    let sum = 0;
    let missing = false;
    for (const i of cart) {
      const unitPrice = getUnitPrice(i.inventory);
      if (!unitPrice) {
        missing = true;
        continue;
      }
      sum += i.quantity * unitPrice;
    }
    return missing ? null : sum;
  }, [cart]);

  const mutation = useMutation({
    mutationFn: () =>
      SalesService.create({
        paymentMode: "CASH",
        items: cart.map((i) => ({
          inventoryId: i.inventory._id,
          quantity: i.quantity,
        })),
      }),
    onSuccess: () => {
      Alert.alert("Success", "Sale recorded successfully");
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["staff-dashboard"] });
      router.back();
    },
    onError: (err: any) => {
      Alert.alert("Error", err?.message || "Sale failed");
    },
  });

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading inventory...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.errorText}>Failed to load inventory</Text>
          <Pressable
            onPress={() => refetch()}
            style={({ pressed }) => [
              styles.retryButton,
              pressed && styles.retryButtonPressed,
            ]}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>New Sale</Text>

        {/* Search */}
        <TextInput
          placeholder="Search inventory..."
          value={search}
          onChangeText={setSearch}
          style={styles.search}
        />

        {/* Inventory List */}
        <FlatList
          data={filteredInventory}
          keyExtractor={(p) => p._id}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No sellable inventory</Text>
              <Text style={styles.emptyMessage}>
                Items will appear once inventory is available.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable onPress={() => addToCart(item)} style={styles.plantRow}>
              <Text style={styles.plantName}>
                {item.plantType?.name || "Unknown"}
              </Text>
              <Text style={styles.plantMeta}>
                Stock {item.quantity}
              </Text>
            </Pressable>
          )}
        />

        {/* Cart */}
        {cart.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Cart</Text>

            {cart.map((i) => (
              <View key={i.inventory._id} style={styles.cartRow}>
                <Text style={styles.cartName}>
                  {i.inventory.plantType?.name || "Unknown"}
                </Text>

                <View style={styles.qtyControls}>
                  <Pressable onPress={() => updateQty(i.inventory._id, -1)}>
                    <Text style={styles.qtyBtn}>−</Text>
                  </Pressable>

                  <Text style={styles.qtyText}>{i.quantity}</Text>

                  <Pressable
                    onPress={() =>
                      i.quantity < i.inventory.quantity &&
                      updateQty(i.inventory._id, 1)
                    }
                  >
                    <Text style={styles.qtyBtn}>+</Text>
                  </Pressable>
                </View>

                <Text style={styles.cartPrice}>
                  {getUnitPrice(i.inventory)
                    ? `₹ ${i.quantity * getUnitPrice(i.inventory)}`
                    : "₹ —"}
                </Text>
              </View>
            ))}

            <View style={styles.totalRow}>
              <Text style={styles.totalText}>Total</Text>
              <Text style={styles.totalText}>
                {totalAmount === null ? "₹ —" : `₹ ${totalAmount}`}
              </Text>
            </View>

            <Pressable
              onPress={() => mutation.mutate()}
              disabled={mutation.isLoading || cart.length === 0}
              style={({ pressed }) => [
                styles.submit,
                (mutation.isLoading || cart.length === 0) &&
                  styles.submitDisabled,
                pressed && styles.submitPressed,
              ]}
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
  centered: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    padding: Spacing.lg,
  },
  loadingText: {
    marginTop: Spacing.md,
    color: Colors.textSecondary,
  },
  errorText: {
    color: Colors.error,
    marginBottom: Spacing.md,
  },
  retryButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: 12,
  },
  retryButtonPressed: {
    backgroundColor: Colors.primaryDark,
    transform: [{ scale: 0.98 }],
  },
  retryButtonText: {
    color: Colors.white,
    fontWeight: "600",
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
  emptyState: {
    alignItems: "center" as const,
    paddingVertical: Spacing.xl,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  emptyMessage: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: "center" as const,
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
  submitDisabled: {
    opacity: 0.6,
  },
  submitPressed: {
    transform: [{ scale: 0.98 }],
  },
  submitText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: "600" as const,
  },
};
