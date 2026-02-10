// app/(staff)/inventory/index.tsx
import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { InventoryService } from "../../../services/inventory.service";
import { Colors, Spacing } from "../../../theme";

export default function StaffInventory() {
  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ["inventory"],
    queryFn: InventoryService.getAll,
  });

  if (isLoading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </SafeAreaView>
    );
  }

  const inventory = Array.isArray(data) ? data : (data?.data ?? []);

  if (error) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.error}>Failed to load inventory</Text>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            refetch();
          }}
          style={({ pressed }) => [
            styles.retryButton,
            pressed && styles.retryButtonPressed,
          ]}
        >
          <Text style={styles.retryButtonText}>Try Again</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={inventory}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ padding: Spacing.lg }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              refetch();
            }}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No inventory items</Text>
            <Text style={styles.emptyMessage}>
              Stock will appear here once sowing creates inventory.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.name}>
              {item.plantType?.name || "Unknown"}
            </Text>
            <Text style={styles.qty}>Stock: {item.quantity}</Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = {
  container: { flex: 1, backgroundColor: Colors.background },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    borderRadius: 12,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  name: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text,
  },
  qty: {
    marginTop: 4,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  error: {
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
  emptyContainer: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  emptyMessage: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: "center",
  },
};
