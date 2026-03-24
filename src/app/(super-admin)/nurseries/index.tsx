import { MaterialIcons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
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

import SuperAdminButton from "../../../components/super-admin/SuperAdminButton";
import SuperAdminCard from "../../../components/super-admin/SuperAdminCard";
import SuperAdminHeader from "../../../components/super-admin/SuperAdminHeader";
import SuperAdminInput from "../../../components/super-admin/SuperAdminInput";
import SuperAdminKpiCard from "../../../components/super-admin/SuperAdminKpiCard";
import SuperAdminStatusBadge from "../../../components/super-admin/SuperAdminStatusBadge";
import { SHARED_BOTTOM_NAV_HEIGHT } from "../../../components/navigation/SharedBottomNav";
import { SuperAdminTheme } from "../../../components/super-admin/theme";
import { NurseryService } from "../../../services/nursery.service";
import { Colors } from "@/src/theme";

const STATUS_FILTERS = ["ALL", "ACTIVE", "SUSPENDED"] as const;

type StatusFilter = (typeof STATUS_FILTERS)[number];

// ==================== FORM CARD ====================

interface FormCardProps {
  name: string;
  code: string;
  address: string;
  phoneNumber: string;
  onNameChange: (text: string) => void;
  onCodeChange: (text: string) => void;
  onAddressChange: (text: string) => void;
  onPhoneNumberChange: (text: string) => void;
  onSubmit: () => void;
  isPending: boolean;
}

const FormCard = ({
  name,
  code,
  address,
  phoneNumber,
  onNameChange,
  onCodeChange,
  onAddressChange,
  onPhoneNumberChange,
  onSubmit,
  isPending,
}: FormCardProps) => {
  const isValid = name.trim().length > 0 && code.trim().length > 0;

  return (
    <SuperAdminCard style={styles.formCard}>
      <View style={styles.formHeader}>
        <MaterialIcons
          name="add-business"
          size={18}
          color={SuperAdminTheme.colors.primary}
        />
        <Text style={styles.formTitle}>Add New Nursery</Text>
      </View>

      <View style={styles.formFields}>
        <SuperAdminInput
          label="Nursery name *"
          value={name}
          onChangeText={onNameChange}
          placeholder="Enter nursery name"
        />
        <SuperAdminInput
          label="Nursery code *"
          value={code}
          onChangeText={onCodeChange}
          placeholder="e.g. GH-01"
        />
        <SuperAdminInput
          label="Address (optional)"
          value={address}
          onChangeText={onAddressChange}
          placeholder="Enter full address"
          multiline
          numberOfLines={3}
        />
        <SuperAdminInput
          label="Phone number (optional)"
          value={phoneNumber}
          onChangeText={onPhoneNumberChange}
          placeholder="Phone number"
          keyboardType="phone-pad"
        />
      </View>

      <SuperAdminButton
        label={isPending ? "Creating..." : "Create Nursery"}
        icon={
          isPending ? (
            <ActivityIndicator size="small" color={SuperAdminTheme.colors.surface} />
          ) : (
            <MaterialIcons name="add" size={18} color={SuperAdminTheme.colors.surface} />
          )
        }
        onPress={onSubmit}
        disabled={!isValid || isPending}
        style={styles.submitButton}
      />
    </SuperAdminCard>
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
  <SuperAdminCard style={styles.filterCard}>
    <View style={styles.searchContainer}>
      <MaterialIcons name="search" size={18} color={SuperAdminTheme.colors.textSoft} />
      <TextInput
        value={search}
        onChangeText={onSearchChange}
        style={styles.searchInput}
        placeholder="Search by name, code or address..."
        placeholderTextColor={SuperAdminTheme.colors.textSoft}
      />
      {search.length > 0 && (
        <Pressable
          onPress={() => onSearchChange("")}
          style={styles.searchClear}
        >
          <MaterialIcons name="close" size={16} color={SuperAdminTheme.colors.textSoft} />
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
  </SuperAdminCard>
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
                  ? "rgba(22, 163, 74, 0.12)"
                  : "rgba(239, 68, 68, 0.12)",
              },
            ]}
          >
            <MaterialIcons
              name="store"
              size={20}
              color={
                isActive
                  ? SuperAdminTheme.colors.success
                  : SuperAdminTheme.colors.danger
              }
            />
          </View>
          <View style={styles.nurseryInfo}>
            <View style={styles.nurseryTitleRow}>
              <Text style={styles.nurseryName} numberOfLines={1}>
                {nursery.name}
              </Text>
              <SuperAdminStatusBadge
                label={nursery.status || "ACTIVE"}
                tone={isActive ? "active" : "inactive"}
              />
            </View>
            {nursery.code && (
              <Text style={styles.nurseryCode}>Code: {nursery.code}</Text>
            )}
          </View>
        </View>
      </View>

      {nursery.address && (
        <View style={styles.nurseryAddress}>
          <MaterialIcons name="location-on" size={14} color={SuperAdminTheme.colors.textSoft} />
          <Text style={styles.addressText} numberOfLines={2}>
            {nursery.address}
          </Text>
        </View>
      )}

      {nursery.phoneNumber && (
        <View style={styles.nurseryAddress}>
          <MaterialIcons name="phone" size={14} color={SuperAdminTheme.colors.textSoft} />
          <Text style={styles.addressText} numberOfLines={1}>
            {nursery.phoneNumber}
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
            color={SuperAdminTheme.colors.primary}
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
  <SuperAdminCard style={styles.emptyContainer}>
    <MaterialIcons name="store" size={48} color={SuperAdminTheme.colors.textSoft} />
    <Text style={styles.emptyTitle}>
      {hasSearch ? "No Nurseries Found" : "No Nurseries Yet"}
    </Text>
    <Text style={styles.emptyMessage}>
      {hasSearch
        ? "Try adjusting your search or filters"
        : "Create your first nursery to get started"}
    </Text>
    {hasSearch && (
      <SuperAdminButton
        label="Clear Search"
        variant="secondary"
        onPress={onClearSearch}
        style={styles.clearSearchButton}
      />
    )}
  </SuperAdminCard>
);

// ==================== MAIN COMPONENT ====================

export default function SuperAdminNurseriesScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ status?: string }>();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [address, setAddress] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [search, setSearch] = useState("");
  const initialStatus = STATUS_FILTERS.includes(
    (params.status || "ALL") as StatusFilter,
  )
    ? ((params.status || "ALL") as StatusFilter)
    : "ALL";
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(initialStatus);

  const { data, isLoading, refetch } = useQuery({
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
        phoneNumber: phoneNumber.trim() || undefined,
      });
    },
    onSuccess: async () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setName("");
      setCode("");
      setAddress("");
      setPhoneNumber("");
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
        const haystack = [row.name, row.code, row.address, row.phoneNumber]
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

  const handleClearSearch = () => {
    setSearch("");
    setStatusFilter("ALL");
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <SuperAdminHeader
          title="Nursery Management"
          subtitle="Loading nurseries..."
          onBackPress={() => router.back()}
          actions={
            <Pressable style={styles.headerIconBtn} onPress={handleRefresh}>
              <MaterialIcons name="refresh" size={20} color={Colors.surface} />
            </Pressable>
          }
        />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={SuperAdminTheme.colors.primary} />
          <Text style={styles.loadingText}>Loading nurseries...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <SuperAdminHeader
        title="Nursery Management"
        subtitle="Create, search and assign admins"
        onBackPress={() => router.back()}
        actions={
          <Pressable style={styles.headerIconBtn} onPress={handleRefresh}>
            <MaterialIcons
              name={refreshing ? "sync" : "refresh"}
              size={20}
              color={SuperAdminTheme.colors.surface}
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
            colors={[SuperAdminTheme.colors.primary]}
            tintColor={SuperAdminTheme.colors.primary}
          />
        }
      >
        {/* Stats Card */}
        {rows.length > 0 && (
          <View style={styles.statsGrid}>
            <View style={styles.kpiItem}>
              <SuperAdminKpiCard
                label="Total"
                value={stats.total}
                icon={<MaterialIcons name="store" size={18} color={SuperAdminTheme.colors.primary} />}
              />
            </View>
            <View style={styles.kpiItem}>
              <SuperAdminKpiCard
                label="Active"
                value={stats.active}
                icon={<MaterialIcons name="check-circle" size={18} color={SuperAdminTheme.colors.success} />}
                tone="success"
              />
            </View>
            <View style={styles.kpiItem}>
              <SuperAdminKpiCard
                label="Suspended"
                value={stats.suspended}
                icon={<MaterialIcons name="block" size={18} color={SuperAdminTheme.colors.danger} />}
                tone="warning"
              />
            </View>
          </View>
        )}

        {/* Create Form */}
        <FormCard
          name={name}
          code={code}
          address={address}
          phoneNumber={phoneNumber}
          onNameChange={setName}
          onCodeChange={setCode}
          onAddressChange={setAddress}
          onPhoneNumberChange={setPhoneNumber}
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
    backgroundColor: SuperAdminTheme.colors.background,
  },

  headerIconBtn: {
     width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.34)",
    backgroundColor: "rgba(255, 255, 255, 0.14)",
    alignItems: "center",
    justifyContent: "center",
  },

  // Center Container
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: SuperAdminTheme.spacing.lg,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: SuperAdminTheme.colors.textMuted,
  },

  // Content
  content: {
    paddingHorizontal: SuperAdminTheme.spacing.md,
    paddingTop: SuperAdminTheme.spacing.md,
    paddingBottom: SHARED_BOTTOM_NAV_HEIGHT + 100,
    gap: SuperAdminTheme.spacing.lg,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  kpiItem: {
    width: "48%",
  },

  // Form Card
  formCard: {
    gap: 12,
  },
  formHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  formTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: SuperAdminTheme.colors.text,
  },
  formFields: {
    gap: 10,
  },
  submitButton: {
    marginTop: 4,
  },

  // Filter Card
  filterCard: {
    gap: 12,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: SuperAdminTheme.colors.surfaceMuted,
    borderRadius: SuperAdminTheme.radius.md,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: SuperAdminTheme.colors.border,
    height: 48,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: SuperAdminTheme.colors.text,
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
    fontWeight: "600",
    color: SuperAdminTheme.colors.textMuted,
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
    borderColor: SuperAdminTheme.colors.border,
    backgroundColor: SuperAdminTheme.colors.surfaceMuted,
  },
  filterChipActive: {
    borderColor: SuperAdminTheme.colors.primary,
    backgroundColor: "rgba(15, 189, 73, 0.08)",
  },
  filterChipPressed: {
    transform: [{ scale: 0.96 }],
  },
  filterChipText: {
    fontSize: 12,
    color: SuperAdminTheme.colors.textMuted,
    fontWeight: "500",
  },
  filterChipTextActive: {
    color: SuperAdminTheme.colors.primary,
    fontWeight: "600",
  },
  searchResults: {
    fontSize: 12,
    color: SuperAdminTheme.colors.textMuted,
  },

  // Nursery List
  nurseryList: {
    gap: 12,
  },
  nurseryCard: {
    backgroundColor: SuperAdminTheme.colors.surface,
    borderRadius: SuperAdminTheme.radius.lg,
    padding: SuperAdminTheme.spacing.md,
    borderWidth: 1,
    borderColor: SuperAdminTheme.colors.borderSoft,
    gap: 12,
  },
  nurseryCardPressed: {
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
    fontWeight: "700",
    color: SuperAdminTheme.colors.text,
    flex: 1,
  },
  nurseryCode: {
    fontSize: 12,
    color: SuperAdminTheme.colors.textMuted,
  },
  nurseryAddress: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    backgroundColor: SuperAdminTheme.colors.surfaceMuted,
    borderRadius: SuperAdminTheme.radius.md,
    padding: 10,
  },
  addressText: {
    flex: 1,
    fontSize: 12,
    color: SuperAdminTheme.colors.text,
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
    color: SuperAdminTheme.colors.primary,
    fontWeight: "600",
  },

  // Empty State
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: SuperAdminTheme.colors.text,
  },
  emptyMessage: {
    fontSize: 13,
    color: SuperAdminTheme.colors.textMuted,
    textAlign: "center",
    paddingHorizontal: 32,
  },
  clearSearchButton: {
    marginTop: 8,
  },
});
