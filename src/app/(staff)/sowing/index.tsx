import { MaterialIcons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  View,
} from "react-native";
import { Sowing, SowingService } from "../../../services/sowing.service";
import { Colors, Spacing } from "../../../theme";

const BOTTOM_NAV_HEIGHT = 80; // Adjust based on your bottom nav height
const { width: SCREEN_WIDTH } = Dimensions.get("window");
const STAT_CARD_WIDTH = (SCREEN_WIDTH - Spacing.lg * 2 - Spacing.md * 2) / 4;

export default function StaffSowingIndex() {
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["staff-sowings"],
    queryFn: SowingService.getAll,
  });

  /* Refresh when screen gains focus */
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  /* Normalize API response safely */
  const sowings = useMemo<Sowing[]>(
    () => (Array.isArray(data) ? data : []),
    [data],
  );

  const filteredSowings = useMemo(() => {
    const term = search.toLowerCase();
    return sowings.filter((s) => {
      const seedName =
        typeof s.seedId === "object"
          ? s.seedId?.name?.toLowerCase() ?? ""
          : "";
      const plantName =
        (typeof s.seedId === "object"
          ? s.seedId?.plantType?.name
          : s.plantType?.name) ?? "";
      const plantNameLc = plantName.toLowerCase();
      const performer = s.performedBy?.name?.toLowerCase() ?? "";
      return (
        seedName.includes(term) ||
        plantNameLc.includes(term) ||
        performer.includes(term)
      );
    });
  }, [sowings, search]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const isToday = (date: string) => {
    const d = new Date(date);
    if (isNaN(d.getTime())) return false;
    const now = new Date();
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    );
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

  const getRoleBadge = (role?: "ADMIN" | "STAFF") => {
    if (role === "ADMIN") {
      return {
        label: "Admin",
        color: Colors.info,
        icon: "verified-user",
      };
    }
    return {
      label: "Staff",
      color: Colors.primary,
      icon: "person",
    };
  };

  const stats = useMemo(() => {
    const totalSowings = sowings.length;
    const totalQuantity = sowings.reduce(
      (sum, s) => sum + (s.quantity ?? 0),
      0,
    );
    const uniqueSeeds = new Set(
      sowings
        .map((s) =>
          typeof s.seedId === "object" ? s.seedId?._id : s.seedId,
        )
        .filter(Boolean),
    ).size;
    const todaySowings = sowings.filter((s) => isToday(s.createdAt)).length;

    return { totalSowings, totalQuantity, uniqueSeeds, todaySowings };
  }, [sowings]);

  const renderContent = () => {
    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading sowing records...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.emptyContainer}>
          <MaterialIcons name="error-outline" size={64} color={Colors.error} />
          <Text style={styles.emptyTitle}>Failed to load sowings</Text>
          <Text style={styles.emptyMessage}>
            Please check your connection or permissions.
          </Text>
          <Pressable
            onPress={() => refetch()}
            style={({ pressed }) => [
              styles.emptyButton,
              pressed && styles.emptyButtonPressed,
            ]}
          >
            <Text style={styles.emptyButtonText}>Try Again</Text>
          </Pressable>
        </View>
      );
    }

    if (filteredSowings.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <MaterialIcons name="eco" size={64} color={Colors.border} />
          <Text style={styles.emptyTitle}>No sowing records found</Text>
          <Text style={styles.emptyMessage}>
            {search.length > 0
              ? "Try adjusting your search terms"
              : "No sowing activities have been recorded yet"}
          </Text>
          <Pressable
            onPress={() => router.push("/(staff)/sowing/create")}
            style={({ pressed }) => [
              styles.emptyButton,
              pressed && styles.emptyButtonPressed,
            ]}
          >
            <Text style={styles.emptyButtonText}>Record First Sowing</Text>
          </Pressable>
        </View>
      );
    }

    return (
      <FlatList
        data={filteredSowings}
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
          const roleBadge = getRoleBadge(item.roleAtTime);
          return (
            <View style={styles.sowingCard}>
              {/* Header */}
              <View style={styles.cardHeader}>
                <View style={styles.titleContainer}>
                  <MaterialIcons
                    name="grass"
                    size={20}
                    color={Colors.primary}
                  />
                  <Text style={styles.seedName} numberOfLines={1}>
                    {typeof item.seedId === "object"
                      ? item.seedId?.name || "Unknown Seed"
                      : "Unknown Seed"}
                  </Text>
                  <MaterialIcons
                    name="trending-flat"
                    size={16}
                    color={Colors.textTertiary}
                  />
                  <Text style={styles.plantName} numberOfLines={1}>
                    {typeof item.seedId === "object"
                      ? item.seedId?.plantType?.name ||
                        item.plantType?.name ||
                        "Unknown Plant"
                      : item.plantType?.name || "Unknown Plant"}
                  </Text>
                </View>
                <View
                  style={[
                    styles.roleBadge,
                    { backgroundColor: roleBadge.color + "15" },
                  ]}
                >
                  <MaterialIcons
                    name={roleBadge.icon as any}
                    size={12}
                    color={roleBadge.color}
                  />
                  <Text
                    style={[styles.roleText, { color: roleBadge.color }]}
                  >
                    {roleBadge.label}
                  </Text>
                </View>
              </View>

              <View style={styles.infoGrid}>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Quantity</Text>
                  <Text style={styles.infoValue}>{item.quantity ?? 0}</Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Performed By</Text>
                  <Text style={styles.infoValue} numberOfLines={1}>
                    {item.performedBy?.name || "Unknown"}
                  </Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Date</Text>
                  <Text style={styles.infoValue}>
                    {formatDate(item.createdAt)}
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
            <Text style={styles.title}>Sowing Records</Text>
            <Text style={styles.subtitle}>
              {stats.totalSowings} total sowings • {filteredSowings.length}{" "}
              filtered
            </Text>
          </View>
          <Pressable
            onPress={() => router.push("/(staff)/sowing/create")}
            style={({ pressed }) => [
              styles.addButton,
              pressed && styles.addButtonPressed,
            ]}
          >
            <MaterialIcons name="add" size={16} color={Colors.white} />
            <Text style={styles.addButtonText}>Record</Text>
          </Pressable>
        </View>

        {/* Stats Cards - Fixed Grid */}
        <View style={styles.statsGrid}>
          <View
            style={[
              styles.statCard,
              { backgroundColor: Colors.primary + "10" },
            ]}
          >
            <MaterialIcons name="format-list-bulleted" size={20} color={Colors.primary} />
            <Text style={styles.statValue}>{stats.totalSowings}</Text>
            <Text style={styles.statLabel}>Sowings</Text>
          </View>

          <View
            style={[
              styles.statCard,
              { backgroundColor: Colors.success + "10" },
            ]}
          >
            <MaterialIcons name="spa" size={20} color={Colors.success} />
            <Text style={styles.statValue}>{stats.totalQuantity}</Text>
            <Text style={styles.statLabel}>Seeds Used</Text>
          </View>

          <View
            style={[
              styles.statCard,
              { backgroundColor: Colors.info + "10" },
            ]}
          >
            <MaterialIcons name="grass" size={20} color={Colors.info} />
            <Text style={styles.statValue}>{stats.uniqueSeeds}</Text>
            <Text style={styles.statLabel}>Seed Types</Text>
          </View>

          <View
            style={[
              styles.statCard,
              { backgroundColor: Colors.warning + "10" },
            ]}
          >
            <MaterialIcons name="today" size={20} color={Colors.warning} />
            <Text style={styles.statValue}>{stats.todaySowings}</Text>
            <Text style={styles.statLabel}>Today</Text>
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
            placeholder="Search seed or staff..."
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
  sowingCard: {
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
  plantName: {
    fontSize: 14,
    fontWeight: "500" as const,
    color: Colors.textSecondary,
    flex: 1,
  },
  roleBadge: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 4,
  },
  roleText: {
    fontSize: 11,
    fontWeight: "600" as const,
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
  infoValue: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: Colors.text,
  },
};
