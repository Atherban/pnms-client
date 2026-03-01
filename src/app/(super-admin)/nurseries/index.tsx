import { MaterialIcons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import FixedHeader from "../../../components/common/FixedHeader";
import { AuthService } from "../../../services/auth.service";
import { NurseryService } from "../../../services/nursery.service";
import { useAuthStore } from "../../../stores/auth.store";
import { Colors } from "../../../theme";

const BOTTOM_NAV_HEIGHT = 80;
const STATUS_FILTERS = ["ALL", "ACTIVE", "SUSPENDED"] as const;

type StatusFilter = (typeof STATUS_FILTERS)[number];

// ==================== STATS CARD ====================

interface StatsCardProps {
  total: number;
  active: number;
  suspended: number;
}

const StatsCard = ({ total, active, suspended }: StatsCardProps) => (
  <View style={styles.statsCard}>
    <View style={styles.statsRow}>
      <View style={styles.statItem}>
        <View
          style={[styles.statIcon, { backgroundColor: `${Colors.primary}10` }]}
        >
          <MaterialIcons name="store" size={16} color={Colors.primary} />
        </View>
        <View style={styles.statInfo}>
          <Text style={styles.statNumber}>{total}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
      </View>

      <View style={styles.statDivider} />

      <View style={styles.statItem}>
        <View
          style={[styles.statIcon, { backgroundColor: `${Colors.success}10` }]}
        >
          <MaterialIcons name="check-circle" size={16} color={Colors.success} />
        </View>
        <View style={styles.statInfo}>
          <Text style={styles.statNumber}>{active}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
      </View>

      <View style={styles.statDivider} />

      <View style={styles.statItem}>
        <View
          style={[styles.statIcon, { backgroundColor: `${Colors.error}10` }]}
        >
          <MaterialIcons name="block" size={16} color={Colors.error} />
        </View>
        <View style={styles.statInfo}>
          <Text style={styles.statNumber}>{suspended}</Text>
          <Text style={styles.statLabel}>Suspended</Text>
        </View>
      </View>
    </View>
  </View>
);

// ==================== FORM CARD ====================

interface FormCardProps {
  name: string;
  code: string;
  address: string;
  onNameChange: (text: string) => void;
  onCodeChange: (text: string) => void;
  onAddressChange: (text: string) => void;
  onSubmit: () => void;
  isPending: boolean;
}

const FormCard = ({
  name,
  code,
  address,
  onNameChange,
  onCodeChange,
  onAddressChange,
  onSubmit,
  isPending,
}: FormCardProps) => {
  const isValid = name.trim().length > 0 && code.trim().length > 0;

  return (
    <View style={styles.formCard}>
      <View style={styles.formHeader}>
        <MaterialIcons name="add-business" size={18} color={Colors.primary} />
        <Text style={styles.formTitle}>Add New Nursery</Text>
      </View>

      <View style={styles.formFields}>
        <TextInput
          value={name}
          onChangeText={onNameChange}
          style={styles.input}
          placeholder="Nursery name *"
          placeholderTextColor="#9CA3AF"
        />
        <TextInput
          value={code}
          onChangeText={onCodeChange}
          style={styles.input}
          placeholder="Nursery code *"
          placeholderTextColor="#9CA3AF"
        />
        <TextInput
          value={address}
          onChangeText={onAddressChange}
          style={[styles.input, styles.addressInput]}
          placeholder="Address (optional)"
          placeholderTextColor="#9CA3AF"
          multiline
          numberOfLines={2}
        />
      </View>

      <Pressable
        style={({ pressed }) => [
          styles.submitButton,
          !isValid && styles.submitButtonDisabled,
          pressed && styles.submitButtonPressed,
        ]}
        onPress={onSubmit}
        disabled={!isValid || isPending}
      >
        <LinearGradient
          colors={[Colors.primary, Colors.primaryLight || Colors.primary]}
          style={styles.submitGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          {isPending ? (
            <ActivityIndicator size="small" color={Colors.white} />
          ) : (
            <>
              <MaterialIcons name="add" size={18} color={Colors.white} />
              <Text style={styles.submitButtonText}>Create Nursery</Text>
            </>
          )}
        </LinearGradient>
      </Pressable>
    </View>
  );
};

// ==================== FILTER BAR ====================

interface FilterBarProps {
  search: string;
  onSearchChange: (text: string) => void;
  statusFilter: StatusFilter;
  onStatusChange: (status: StatusFilter) => void;
  resultCount: number;
}

const FilterBar = ({
  search,
  onSearchChange,
  statusFilter,
  onStatusChange,
  resultCount,
}: FilterBarProps) => (
  <View style={styles.filterCard}>
    <View style={styles.searchContainer}>
      <MaterialIcons name="search" size={18} color="#9CA3AF" />
      <TextInput
        value={search}
        onChangeText={onSearchChange}
        style={styles.searchInput}
        placeholder="Search by name, code or address..."
        placeholderTextColor="#9CA3AF"
      />
      {search.length > 0 && (
        <Pressable
          onPress={() => onSearchChange("")}
          style={styles.searchClear}
        >
          <MaterialIcons name="close" size={16} color="#9CA3AF" />
        </Pressable>
      )}
    </View>

    <View style={styles.filterRow}>
      <Text style={styles.filterLabel}>Status:</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterChips}
      >
        {STATUS_FILTERS.map((item) => {
          const active = item === statusFilter;
          return (
            <Pressable
              key={item}
              style={({ pressed }) => [
                styles.filterChip,
                active && styles.filterChipActive,
                pressed && styles.filterChipPressed,
              ]}
              onPress={() => onStatusChange(item)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  active && styles.filterChipTextActive,
                ]}
              >
                {item}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>

    {search.length > 0 && (
      <Text style={styles.searchResults}>
        Found {resultCount} {resultCount === 1 ? "nursery" : "nurseries"}
      </Text>
    )}
  </View>
);

// ==================== NURSERY CARD ====================

interface NurseryCardProps {
  nursery: any;
  onPress: (id: string) => void;
}

const NurseryCard = ({ nursery, onPress }: NurseryCardProps) => {
  const isActive = nursery.status === "ACTIVE";

  return (
    <Pressable
      style={({ pressed }) => [
        styles.nurseryCard,
        pressed && styles.nurseryCardPressed,
      ]}
      onPress={() => onPress(nursery.id)}
    >
      <View style={styles.nurseryHeader}>
        <View style={styles.nurseryHeaderLeft}>
          <View
            style={[
              styles.nurseryIcon,
              {
                backgroundColor: isActive
                  ? `${Colors.success}10`
                  : `${Colors.error}10`,
              },
            ]}
          >
            <MaterialIcons
              name="store"
              size={20}
              color={isActive ? Colors.success : Colors.error}
            />
          </View>
          <View style={styles.nurseryInfo}>
            <View style={styles.nurseryTitleRow}>
              <Text style={styles.nurseryName} numberOfLines={1}>
                {nursery.name}
              </Text>
              <View
                style={[
                  styles.statusBadge,
                  isActive ? styles.activeBadge : styles.suspendedBadge,
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    isActive ? styles.activeText : styles.suspendedText,
                  ]}
                >
                  {nursery.status || "ACTIVE"}
                </Text>
              </View>
            </View>
            {nursery.code && (
              <Text style={styles.nurseryCode}>Code: {nursery.code}</Text>
            )}
          </View>
        </View>
      </View>

      {nursery.address && (
        <View style={styles.nurseryAddress}>
          <MaterialIcons name="location-on" size={14} color="#9CA3AF" />
          <Text style={styles.addressText} numberOfLines={2}>
            {nursery.address}
          </Text>
        </View>
      )}

      <View style={styles.nurseryFooter}>
        <View style={styles.viewDetails}>
          <Text style={styles.viewDetailsText}>
            View Details & Manage Admins
          </Text>
          <MaterialIcons
            name="chevron-right"
            size={16}
            color={Colors.primary}
          />
        </View>
      </View>
    </Pressable>
  );
};

// ==================== EMPTY STATE ====================

interface EmptyStateProps {
  hasSearch: boolean;
  onClearSearch: () => void;
}

const EmptyState = ({ hasSearch, onClearSearch }: EmptyStateProps) => (
  <View style={styles.emptyContainer}>
    <MaterialIcons name="store" size={48} color="#D1D5DB" />
    <Text style={styles.emptyTitle}>
      {hasSearch ? "No Nurseries Found" : "No Nurseries Yet"}
    </Text>
    <Text style={styles.emptyMessage}>
      {hasSearch
        ? "Try adjusting your search or filters"
        : "Create your first nursery to get started"}
    </Text>
    {hasSearch && (
      <Pressable onPress={onClearSearch} style={styles.clearSearchButton}>
        <Text style={styles.clearSearchText}>Clear Search</Text>
      </Pressable>
    )}
  </View>
);

// ==================== MAIN COMPONENT ====================

export default function SuperAdminNurseriesScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ status?: string }>();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const [refreshing, setRefreshing] = useState(false);

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [address, setAddress] = useState("");
  const [search, setSearch] = useState("");
  const initialStatus = STATUS_FILTERS.includes(
    (params.status || "ALL") as StatusFilter,
  )
    ? ((params.status || "ALL") as StatusFilter)
    : "ALL";
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(initialStatus);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["super-admin", "nurseries"],
    queryFn: () => NurseryService.list(),
  });

  const rows = useMemo(() => data ?? [], [data]);

  const createMutation = useMutation({
    mutationFn: () => {
      if (!name.trim()) throw new Error("Nursery name is required");
      if (!code.trim()) throw new Error("Nursery code is required");

      return NurseryService.create({
        name: name.trim(),
        code: code.trim() || undefined,
        address: address.trim() || undefined,
      });
    },
    onSuccess: async () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setName("");
      setCode("");
      setAddress("");
      await queryClient.invalidateQueries({
        queryKey: ["super-admin", "nurseries"],
      });
      Alert.alert("✅ Success", "Nursery created successfully");
    },
    onError: (err: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("❌ Failed", err?.message || "Unable to create nursery");
    },
  });

  // Calculate stats
  const stats = useMemo(() => {
    const active = rows.filter((r) => r.status === "ACTIVE").length;
    const suspended = rows.filter((r) => r.status !== "ACTIVE").length;
    return {
      total: rows.length,
      active,
      suspended,
    };
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows
      .filter((row) => {
        if (statusFilter !== "ALL" && (row.status || "ACTIVE") !== statusFilter)
          return false;
        if (!q) return true;
        const haystack = [row.name, row.code, row.address]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(q);
      })
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }, [rows, search, statusFilter]);

  const handleRefresh = async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await refetch();
    setRefreshing(false);
  };

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          await AuthService.logout();
          clearAuth();
          router.replace("/(auth)/login");
        },
      },
    ]);
  };

  const handleClearSearch = () => {
    setSearch("");
    setStatusFilter("ALL");
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <FixedHeader
          title="Nursery Management"
          subtitle="Loading nurseries..."
          
        />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading nurseries...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <FixedHeader
        title="Nursery Management"
        subtitle="Create, search and assign admins"
       
        actions={
          <Pressable
            style={({ pressed }) => [
              styles.headerIconBtn,
              pressed && styles.headerIconBtnPressed,
            ]}
            onPress={handleRefresh}
          >
            <MaterialIcons
              name={refreshing ? "sync" : "refresh"}
              size={20}
              color={Colors.white}
            />
          </Pressable>
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
      >
        {/* Stats Card */}
        {rows.length > 0 && (
          <StatsCard
            total={stats.total}
            active={stats.active}
            suspended={stats.suspended}
          />
        )}

        {/* Create Form */}
        <FormCard
          name={name}
          code={code}
          address={address}
          onNameChange={setName}
          onCodeChange={setCode}
          onAddressChange={setAddress}
          onSubmit={() => createMutation.mutate()}
          isPending={createMutation.isPending}
        />

        {/* Filter Bar */}
        <FilterBar
          search={search}
          onSearchChange={setSearch}
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
          resultCount={filtered.length}
        />

        {/* Nurseries List */}
        {filtered.length === 0 ? (
          <EmptyState
            hasSearch={search.length > 0 || statusFilter !== "ALL"}
            onClearSearch={handleClearSearch}
          />
        ) : (
          <View style={styles.nurseryList}>
            {filtered.map((row) => (
              <NurseryCard
                key={row.id}
                nursery={row}
                onPress={(id) =>
                  router.push({
                    pathname: "/(super-admin)/nurseries/[id]",
                    params: { id },
                  } as any)
                }
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },

  // Header
  headerTitle: {
    fontSize: 24,
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.34)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerIconBtnPressed: {
    backgroundColor: "rgba(255,255,255,0.1)",
    transform: [{ scale: 0.95 }],
  },

  // Center Container
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: "#6B7280",
  },

  // Content
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: BOTTOM_NAV_HEIGHT + 100,
    gap: 20,
  },

  // Stats Card
  statsCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  statInfo: {
    flex: 1,
  },
  statNumber: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "500",
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: "#E5E7EB",
    marginHorizontal: 12,
  },

  // Form Card
  formCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 12,
  },
  formHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  formTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  formFields: {
    gap: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: "#111827",
    backgroundColor: "#F9FAFB",
  },
  addressInput: {
    minHeight: 60,
    textAlignVertical: "top",
  },
  submitButton: {
    borderRadius: 12,
    overflow: "hidden",
    marginTop: 4,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonPressed: {
    transform: [{ scale: 0.98 }],
  },
  submitGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 8,
  },
  submitButtonText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: "600",
  },

  // Filter Card
  filterCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 12,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    height: 48,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#111827",
    padding: 0,
  },
  searchClear: {
    padding: 4,
  },
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: "#374151",
  },
  filterChips: {
    gap: 8,
    paddingRight: 20,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
  },
  filterChipActive: {
    borderColor: Colors.primary,
    backgroundColor: `${Colors.primary}05`,
  },
  filterChipPressed: {
    transform: [{ scale: 0.96 }],
  },
  filterChipText: {
    fontSize: 12,
    color: "#374151",
    fontWeight: "500",
  },
  filterChipTextActive: {
    color: Colors.primary,
    fontWeight: "600",
  },
  searchResults: {
    fontSize: 12,
    color: "#6B7280",
  },

  // Nursery List
  nurseryList: {
    gap: 12,
  },
  nurseryCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 12,
  },
  nurseryCardPressed: {
    backgroundColor: "#F9FAFB",
    transform: [{ scale: 0.98 }],
  },
  nurseryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  nurseryHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  nurseryIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  nurseryInfo: {
    flex: 1,
  },
  nurseryTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  nurseryName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  activeBadge: {
    backgroundColor: "#ECFDF5",
  },
  suspendedBadge: {
    backgroundColor: "#FEF2F2",
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
  },
  activeText: {
    color: Colors.success,
  },
  suspendedText: {
    color: Colors.error,
  },
  nurseryCode: {
    fontSize: 12,
    color: "#6B7280",
  },
  nurseryAddress: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    backgroundColor: "#F9FAFB",
    borderRadius: 10,
    padding: 10,
  },
  addressText: {
    flex: 1,
    fontSize: 12,
    color: "#374151",
    lineHeight: 16,
  },
  nurseryFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  viewDetails: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  viewDetailsText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: "600",
  },

  // Empty State
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  emptyMessage: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    paddingHorizontal: 32,
  },
  clearSearchButton: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: `${Colors.primary}10`,
  },
  clearSearchText: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: "600",
  },
});
