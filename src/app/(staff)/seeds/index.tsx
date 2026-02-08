import { MaterialIcons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  View,
} from "react-native";
import { Seed, SeedService } from "../../../services/seed.service";
import { Colors, Spacing } from "../../../theme";

const BOTTOM_NAV_HEIGHT = 80; // Adjust based on your bottom nav height
const { width: SCREEN_WIDTH } = Dimensions.get("window");
const STAT_CARD_WIDTH = (SCREEN_WIDTH - Spacing.lg * 2 - Spacing.md * 2) / 4;

export default function AdminSeeds() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["seeds"],
    queryFn: SeedService.getAll,
  });

  /* Normalize API response safely */
  const seeds = useMemo<Seed[]>(() => {
    if (!data) return [];
    return Array.isArray(data) ? data : (data.data ?? []);
  }, [data]);

  const filteredSeeds = useMemo(() => {
    const term = search.toLowerCase();
    return seeds.filter(
      (s) =>
        s.name.toLowerCase().includes(term) ||
        s.supplierName?.toLowerCase().includes(term) ||
        s.category?.toLowerCase().includes(term),
    );
  }, [seeds, search]);


  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const getExpiryStatus = (expiryDate: string) => {
    const expiry = new Date(expiryDate);
    if (isNaN(expiry.getTime())) {
      return {
        status: "Unknown",
        color: Colors.textSecondary,
        icon: "help",
      };
    }

    const today = new Date();
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0)
      return { status: "Expired", color: Colors.error, icon: "error" };
    if (diffDays <= 30)
      return {
        status: "Expiring Soon",
        color: Colors.warning,
        icon: "warning",
      };
    return { status: "Valid", color: Colors.success, icon: "check-circle" };
  };

  const formatDate = (date: string) => {
    const d = new Date(date);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const stats = useMemo(() => {
    const totalSeeds = seeds.length;

    const expiredSeeds = seeds.filter((s) => {
      const d = new Date(s.expiryDate);
      return !isNaN(d.getTime()) && d < new Date();
    }).length;

    const lowStockSeeds = seeds.filter(
      (s) => (s.quantityInStock ?? 0) < (s.minStockLevel ?? 10),
    ).length;

    const validSeeds = totalSeeds - expiredSeeds;

    return { totalSeeds, expiredSeeds, lowStockSeeds, validSeeds };
  }, [seeds]);

  const renderContent = () => {
    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading seeds...</Text>
        </View>
      );
    }

    if (filteredSeeds.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <MaterialIcons name="grass" size={64} color={Colors.border} />
          <Text style={styles.emptyTitle}>No seeds found</Text>
          <Text style={styles.emptyMessage}>
            {search.length > 0
              ? "Try adjusting your search terms"
              : "No seeds have been added yet"}
          </Text>
          <Pressable
            onPress={() => router.push("/(admin)/seeds/create")}
            style={({ pressed }) => [
              styles.emptyButton,
              pressed && styles.emptyButtonPressed,
            ]}
          >
            <Text style={styles.emptyButtonText}>Add First Seed</Text>
          </Pressable>
        </View>
      );
    }

    return (
      <FlatList
        data={filteredSeeds}
        keyExtractor={(s) => s._id}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={<View style={styles.listHeader} />}
        renderItem={({ item }) => {
          const expiryStatus = getExpiryStatus(item.expiryDate);
          const isLowStock =
            (item.quantityInStock ?? 0) < (item.minStockLevel ?? 10);

          return (
            <View style={styles.seedCard}>
              {/* Header */}
              <View style={styles.cardHeader}>
                <View style={styles.titleContainer}>
                  <MaterialIcons
                    name="grass"
                    size={20}
                    color={Colors.primary}
                  />
                  <Text style={styles.seedName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  {item.category && (
                    <View
                      style={[
                        styles.categoryBadge,
                        { backgroundColor: Colors.info + "15" },
                      ]}
                    >
                      <Text
                        style={[styles.categoryText, { color: Colors.info }]}
                      >
                        {item.category}
                      </Text>
                    </View>
                  )}
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: expiryStatus.color + "15" },
                  ]}
                >
                  <MaterialIcons
                    name={expiryStatus.icon as any}
                    size={12}
                    color={expiryStatus.color}
                  />
                  <Text
                    style={[styles.statusText, { color: expiryStatus.color }]}
                  >
                    {expiryStatus.status}
                  </Text>
                </View>
              </View>

              {item.supplierName && (
                <View style={styles.supplierRow}>
                  <MaterialIcons
                    name="business"
                    size={16}
                    color={Colors.textSecondary}
                  />
                  <Text style={styles.supplierText} numberOfLines={1}>
                    {item.supplierName}
                  </Text>
                </View>
              )}

              <View style={styles.infoGrid}>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Stock</Text>
                  <View style={styles.infoValueRow}>
                    <Text
                      style={[
                        styles.infoValue,
                        isLowStock && styles.lowStockValue,
                      ]}
                    >
                      {item.quantityInStock ?? 0}
                    </Text>
                    {isLowStock && (
                      <MaterialIcons
                        name="error"
                        size={14}
                        color={Colors.warning}
                      />
                    )}
                  </View>
                </View>

                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Purchased</Text>
                  <Text style={styles.infoValue}>
                    {item.totalPurchased ?? 0}
                  </Text>
                </View>

                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Expiry</Text>
                  <Text style={styles.infoValue}>
                    {formatDate(item.expiryDate)}
                  </Text>
                </View>
              </View>
            </View>
          );
        }}
      />
    );
  };

  return (
    <View style={styles.container}>
      {/* Fixed Header Section */}
      <View style={styles.fixedHeader}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Seed Inventory</Text>
            <Text style={styles.subtitle}>
              {stats.totalSeeds} total seeds • {filteredSeeds.length} filtered
            </Text>
          </View>
        </View>

        {/* Stats Cards - Fixed Grid */}
        <View style={styles.statsGrid}>
          <View
            style={[
              styles.statCard,
              { backgroundColor: Colors.primary + "10" },
            ]}
          >
            <MaterialIcons name="grass" size={20} color={Colors.primary} />
            <Text style={styles.statValue}>{stats.totalSeeds}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>

          <View
            style={[
              styles.statCard,
              { backgroundColor: Colors.success + "10" },
            ]}
          >
            <MaterialIcons
              name="check-circle"
              size={20}
              color={Colors.success}
            />
            <Text style={styles.statValue}>{stats.validSeeds}</Text>
            <Text style={styles.statLabel}>Valid</Text>
          </View>

          <View
            style={[
              styles.statCard,
              { backgroundColor: Colors.warning + "10" },
            ]}
          >
            <MaterialIcons name="warning" size={20} color={Colors.warning} />
            <Text style={styles.statValue}>{stats.lowStockSeeds}</Text>
            <Text style={styles.statLabel}>Low Stock</Text>
          </View>

          <View
            style={[styles.statCard, { backgroundColor: Colors.error + "10" }]}
          >
            <MaterialIcons name="error" size={20} color={Colors.error} />
            <Text style={styles.statValue}>{stats.expiredSeeds}</Text>
            <Text style={styles.statLabel}>Expired</Text>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <MaterialIcons
            name="search"
            size={20}
            color={Colors.textSecondary}
            style={styles.searchIcon}
          />
          <TextInput
            placeholder="Search seeds"
            placeholderTextColor={Colors.textTertiary}
            value={search}
            onChangeText={setSearch}
            style={styles.searchInput}
            clearButtonMode="while-editing"
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")} style={styles.clearButton}>
              <MaterialIcons
                name="close"
                size={16}
                color={Colors.textSecondary}
              />
            </Pressable>
          )}
        </View>
      </View>

      {/* Scrollable Content Area */}
      <View style={styles.contentArea}>{renderContent()}</View>
    </View>
  );
}

const styles = {
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  fixedHeader: {
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  header: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: 24,
    fontWeight: "700" as const,
    color: Colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  addButton: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 10,
    gap: Spacing.xs,
  },
  addButtonPressed: {
    backgroundColor: Colors.primaryDark,
    transform: [{ scale: 0.98 }],
  },
  addButtonText: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: "600" as const,
  },
  statsGrid: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    marginBottom: Spacing.md,
  },
  statCard: {
    width: STAT_CARD_WIDTH,
    padding: Spacing.sm,
    borderRadius: 12,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: Colors.text,
    marginTop: Spacing.xs,
  },
  statLabel: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontWeight: "500" as const,
    marginTop: Spacing.xs,
    textAlign: "center" as const,
  },
  searchContainer: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    height: 44,
  },
  searchIcon: {
    marginRight: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    padding: 0,
  },
  clearButton: {
    padding: Spacing.xs,
  },
  contentArea: {
    flex: 1,
  },
  listHeader: {
    height: Spacing.md,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: BOTTOM_NAV_HEIGHT + Spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingBottom: BOTTOM_NAV_HEIGHT,
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: 16,
    color: Colors.textSecondary,
    fontWeight: "500" as const,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    padding: Spacing.xl,
    paddingBottom: BOTTOM_NAV_HEIGHT + Spacing.xl,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600" as const,
    color: Colors.text,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  emptyMessage: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center" as const,
    marginBottom: Spacing.lg,
    lineHeight: 20,
  },
  emptyButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: 12,
  },
  emptyButtonPressed: {
    backgroundColor: Colors.primaryDark,
    transform: [{ scale: 0.98 }],
  },
  emptyButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: "600" as const,
  },
  seedCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "flex-start" as const,
    marginBottom: Spacing.xs,
  },
  titleContainer: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    flex: 1,
    gap: Spacing.sm,
  },
  seedName: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: Colors.text,
    flex: 1,
  },
  categoryBadge: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: 6,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: "600" as const,
  },
  statusBadge: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600" as const,
  },
  supplierRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    marginBottom: Spacing.sm,
    gap: Spacing.xs,
  },
  supplierText: {
    fontSize: 14,
    color: Colors.textSecondary,
    flex: 1,
  },
  infoGrid: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    marginBottom: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderColor: Colors.borderLight,
  },
  infoItem: {
    alignItems: "center" as const,
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    color: Colors.textTertiary,
    marginBottom: Spacing.xs,
    fontWeight: "500" as const,
  },
  infoValueRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: Spacing.xs,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: Colors.text,
  },
  lowStockValue: {
    color: Colors.warning,
  },
  actionsContainer: {
    flexDirection: "row" as const,
    gap: Spacing.xs,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingVertical: Spacing.xs,
    borderRadius: 8,
    gap: 4,
  },
  editButton: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  imageButton: {
    backgroundColor: Colors.info + "10",
    borderWidth: 1,
    borderColor: Colors.info + "30",
  },
  deleteButton: {
    backgroundColor: Colors.error + "10",
    borderWidth: 1,
    borderColor: Colors.error + "30",
  },
  actionButtonPressed: {
    transform: [{ scale: 0.98 }],
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: Colors.primary,
  },
};
