import { MaterialIcons as Icon } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from "react-native";

import { ConfirmModal } from "../../../components/ConfirmModal";
import { RoleSelectModal } from "../../../components/RoleSelectModal";
import StitchHeader from "../../../components/common/StitchHeader";
import StitchInput from "../../../components/common/StitchInput";
import AdminKpiCard from "../../../components/admin/AdminKpiCard";
import { AdminTheme } from "../../../components/admin/theme";
import { User, UserService } from "../../../services/user.service";
import { useAuthStore } from "../../../stores/auth.store";

const PAGE_SIZE = 10;
const BOTTOM_NAV_HEIGHT = 80; // Adjust based on your bottom nav height

export default function Users() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);

  // Pagination
  const [page] = useState(1);

  // Modals
  const [confirmUser, setConfirmUser] = useState<User | null>(null);
  const [roleUser, setRoleUser] = useState<User | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"ALL" | User["role"]>("ALL");
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "ACTIVE" | "DISABLED"
  >("ALL");
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["users", page],
    queryFn: () => UserService.getAll(page, PAGE_SIZE),
  });

  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: User["role"] }) =>
      UserService.updateRole(id, role),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });

  const activeMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      UserService.setActive(id, isActive),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });

  const resetMutation = useMutation({
    mutationFn: (payload: { userId: string; defaultPassword?: string }) =>
      UserService.resetPasswordToDefault(payload.userId, payload.defaultPassword),
    onSuccess: (response: any) => {
      const data = response?.data ?? response;
      const password = String(data?.defaultPassword || "12345");
      Alert.alert(
        "Password Reset",
        `Default password set to: ${password}\n\nShare this securely with the user. They will be asked to change it after login.`,
      );
    },
    onError: (err: any) => Alert.alert("Unable to reset", err?.message || "Please try again"),
  });

  const users = useMemo(() => data?.users ?? [], [data]);
  const totalUsers = data?.users?.length ?? 0;

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        search.trim() === "" ||
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        (u.email || "").toLowerCase().includes(search.toLowerCase()) ||
        (u.phoneNumber || "").toLowerCase().includes(search.toLowerCase());

      const matchesRole = roleFilter === "ALL" || u.role === roleFilter;

      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && u.isActive) ||
        (statusFilter === "DISABLED" && !u.isActive);

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, search, roleFilter, statusFilter]);

  const handleFilterReset = () => {
    setSearch("");
    setRoleFilter("ALL");
    setStatusFilter("ALL");
  };

  const getRoleDisplay = (role: User["role"]) => {
    const roleMap = {
      NURSERY_ADMIN: "Nursery Admin",
      STAFF: "Staff",
      CUSTOMER: "Customer",
    };
    return roleMap[role];
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleSendReset = (user: User) => {
    Alert.alert(
      "Reset To Default Password",
      `Set default password for ${user.name}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          onPress: () =>
            resetMutation.mutate({
              userId: user._id,
            }),
        },
      ],
    );
  };

  // Calculate statistics
  const stats = useMemo(() => {
    const activeUsers = users.filter((u) => u.isActive).length;
    const disabledUsers = users.filter((u) => !u.isActive).length;

    return { totalUsers: users.length, activeUsers, disabledUsers };
  }, [users]);

  const renderContent = () => {
    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={AdminTheme.colors.primary} />
          <Text style={styles.loadingText}>Loading users...</Text>
        </View>
      );
    }

    if (filteredUsers.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Icon name="group-off" size={64} color={AdminTheme.colors.border} />
          <Text style={styles.emptyTitle}>No users found</Text>
          <Text style={styles.emptyMessage}>
            {search.length > 0 || roleFilter !== "ALL" || statusFilter !== "ALL"
              ? "Try adjusting your filters"
              : "No users have been added yet"}
          </Text>
          <Pressable
            onPress={() => router.push("/(admin)/users/create")}
            style={({ pressed }) => [
              styles.emptyButton,
              pressed && styles.emptyButtonPressed,
            ]}
          >
            <Text style={styles.emptyButtonText}>Create User</Text>
          </Pressable>
        </View>
      );
    }

    return (
      <FlatList
        data={filteredUsers}
        keyExtractor={(u) => u._id}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching || refreshing}
            onRefresh={onRefresh}
            colors={[AdminTheme.colors.primary]}
            tintColor={AdminTheme.colors.primary}
          />
        }
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={<View style={styles.listHeader} />}
        ListFooterComponent={
          <View style={styles.listFooter}>
            <Text style={styles.listFooterText}>
              Showing {filteredUsers.length} of {users.length} users
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const isSelf = item._id === currentUser?.id;
          const roleColor =
            item.role === "NURSERY_ADMIN"
              ? AdminTheme.colors.danger
              : item.role === "STAFF"
                ? AdminTheme.colors.warning
                : AdminTheme.colors.success;

          return (
            <View
              style={[
                styles.userCard,
                !item.isActive && styles.userCardDisabled,
              ]}
            >
              {/* User Info */}
              <View style={styles.userInfo}>
                <View
                  style={[styles.avatar, { backgroundColor: `${roleColor}20` }]}
                >
                  <Text style={[styles.avatarText, { color: roleColor }]}>
                    {item.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.userDetails}>
                  <Text style={styles.userName}>{item.name}</Text>
                  <Text style={styles.userEmail}>
                    {item.email || item.phoneNumber || "No contact"}
                  </Text>
                  <View style={styles.userMeta}>
                    <View
                      style={[
                        styles.badge,
                        { backgroundColor: `${roleColor}15` },
                      ]}
                    >
                      <Text style={[styles.badgeText, { color: roleColor }]}>
                        {getRoleDisplay(item.role)}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor: item.isActive
                            ? `${AdminTheme.colors.success}15`
                            : `${AdminTheme.colors.danger}15`,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.statusDot,
                          {
                            backgroundColor: item.isActive
                              ? AdminTheme.colors.success
                              : AdminTheme.colors.danger,
                          },
                        ]}
                      />
                      <Text
                        style={[
                          styles.statusText,
                          {
                            color: item.isActive
                              ? AdminTheme.colors.success
                              : AdminTheme.colors.danger,
                          },
                        ]}
                      >
                        {item.isActive ? "Active" : "Disabled"}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Actions */}
              <View
                style={[
                  styles.actionsContainer,
                  isSelf && styles.actionsDisabled,
                ]}
              >
                <Pressable
                  disabled={isSelf}
                  onPress={() => setRoleUser(item)}
                  style={({ pressed }) => [
                    styles.actionButton,
                    styles.actionButtonOutline,
                    pressed && styles.actionButtonPressed,
                  ]}
                >
                  <Icon name="swap-horiz" size={16} color={AdminTheme.colors.primary} />
                  <Text style={styles.actionButtonText}>Role</Text>
                </Pressable>

                <Pressable
                  disabled={isSelf || resetMutation.isPending}
                  onPress={() => handleSendReset(item)}
                  style={({ pressed }) => [
                    styles.actionButton,
                    styles.actionButtonWarning,
                    pressed && styles.actionButtonPressed,
                  ]}
                >
                  <Icon name="lock-reset" size={16} color={AdminTheme.colors.warning} />
                  <Text
                    style={[
                      styles.actionButtonText,
                      { color: AdminTheme.colors.warning },
                    ]}
                  >
                    {resetMutation.isPending ? "Resetting..." : "Reset"}
                  </Text>
                </Pressable>

                <Pressable
                  disabled={isSelf}
                  onPress={() => setConfirmUser(item)}
                  style={({ pressed }) => [
                    styles.actionButton,
                    item.isActive
                      ? styles.actionButtonDanger
                      : styles.actionButtonSuccess,
                    pressed && styles.actionButtonPressed,
                  ]}
                >
                  <Icon
                    name={item.isActive ? "block" : "check-circle"}
                    size={16}
                    color={item.isActive ? AdminTheme.colors.danger : AdminTheme.colors.success}
                  />
                  <Text
                    style={[
                      styles.actionButtonText,
                      {
                        color: item.isActive ? AdminTheme.colors.danger : AdminTheme.colors.success,
                      },
                    ]}
                  >
                    {item.isActive ? "Disable" : "Enable"}
                  </Text>
                </Pressable>
              </View>

              {isSelf && (
                <View style={styles.selfIndicator}>
                  <Icon name="person" size={12} color={AdminTheme.colors.textSoft} />
                  <Text style={styles.selfIndicatorText}>Current User</Text>
                </View>
              )}
            </View>
          );
        }}
      />
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.fixedHeader}>
        <StitchHeader
          title="User Management"
          subtitle={`${totalUsers} total users • ${filteredUsers.length} filtered`}
          actions={
            <Pressable
              onPress={() => router.push("/(admin)/users/create")}
              style={({ pressed }) => [
                styles.createButton,
                pressed && styles.createButtonPressed,
              ]}
            >
              <Icon name="person-add" size={20} color={AdminTheme.colors.surface} />
            </Pressable>
          }
        />

        <View style={styles.statsGrid}>
          <AdminKpiCard
            label="Total"
            value={`${stats.totalUsers}`}
            tone="primary"
          />
          <AdminKpiCard
            label="Active"
            value={`${stats.activeUsers}`}
            tone="success"
          />
          <AdminKpiCard
            label="Disabled"
            value={`${stats.disabledUsers}`}
            tone="danger"
          />
        </View>

        <View style={styles.searchSection}>
          <StitchInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search by name, phone or email..."
            icon={<Icon name="search" size={18} color={AdminTheme.colors.textSoft} />}
            right={
              search.length > 0 ? (
                <Pressable onPress={() => setSearch("")} style={styles.clearButton}>
                  <Icon name="close" size={16} color={AdminTheme.colors.textSoft} />
                </Pressable>
              ) : null
            }
          />
        </View>

        {/* Filter Chips - Fixed Row */}
        <View style={styles.filterRow}>
          <Pressable
            onPress={() =>
              setRoleFilter((r) =>
                r === "ALL"
                  ? "NURSERY_ADMIN"
                  : r === "NURSERY_ADMIN"
                    ? "STAFF"
                    : r === "STAFF"
                      ? "CUSTOMER"
                      : "ALL",
              )
            }
            style={({ pressed }) => [
              styles.filterChip,
              roleFilter !== "ALL" && styles.filterChipActive,
              pressed && styles.filterChipPressed,
            ]}
          >
            <Text
              style={[
                styles.filterChipText,
                roleFilter !== "ALL" && styles.filterChipTextActive,
              ]}
            >
              {roleFilter === "ALL" ? "All Roles" : getRoleDisplay(roleFilter)}
            </Text>
            {roleFilter !== "ALL" && (
              <Icon
                name={
                  roleFilter === "NURSERY_ADMIN"
                    ? "security"
                    : roleFilter === "STAFF"
                      ? "work"
                      : "visibility"
                }
                size={12}
                color={AdminTheme.colors.primary}
                style={styles.filterIcon}
              />
            )}
          </Pressable>

          <Pressable
            onPress={() =>
              setStatusFilter((s) =>
                s === "ALL" ? "ACTIVE" : s === "ACTIVE" ? "DISABLED" : "ALL",
              )
            }
            style={({ pressed }) => [
              styles.filterChip,
              statusFilter !== "ALL" && styles.filterChipActive,
              pressed && styles.filterChipPressed,
            ]}
          >
            <Text
              style={[
                styles.filterChipText,
                statusFilter !== "ALL" && styles.filterChipTextActive,
              ]}
            >
              {statusFilter === "ALL"
                ? "All Status"
                : statusFilter === "ACTIVE"
                  ? "Active"
                  : "Disabled"}
            </Text>
            {statusFilter !== "ALL" && (
              <Icon
                name={statusFilter === "ACTIVE" ? "check-circle" : "block"}
                size={12}
                color={
                  statusFilter === "ACTIVE" ? AdminTheme.colors.success : AdminTheme.colors.danger
                }
                style={styles.filterIcon}
              />
            )}
          </Pressable>

          {(search.length > 0 ||
            roleFilter !== "ALL" ||
            statusFilter !== "ALL") && (
            <Pressable
              onPress={handleFilterReset}
              style={({ pressed }) => [
                styles.filterChip,
                pressed && styles.filterChipPressed,
              ]}
            >
              <Icon
                name="filter-alt-off"
                size={12}
                color={AdminTheme.colors.textMuted}
              />
              <Text style={[styles.filterChipText, { marginLeft: 4 }]}>
                Clear
              </Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* Scrollable Content Area */}
      <View style={styles.contentArea}>{renderContent()}</View>

      {/* Modals */}
      <ConfirmModal
        visible={!!confirmUser}
        title={confirmUser?.isActive ? "Disable User" : "Enable User"}
        message={`Are you sure you want to ${
          confirmUser?.isActive ? "disable" : "enable"
        } ${confirmUser?.name}? ${
          confirmUser?.isActive
            ? "They will lose access to the system."
            : "They will regain access to the system."
        }`}
        confirmText={confirmUser?.isActive ? "Disable User" : "Enable User"}
        confirmColor={confirmUser?.isActive ? AdminTheme.colors.danger : AdminTheme.colors.success}
        icon={confirmUser?.isActive ? "warning" : "check-circle"}
        onCancel={() => setConfirmUser(null)}
        onConfirm={() => {
          if (!confirmUser) return;
          activeMutation.mutate({
            id: confirmUser._id,
            isActive: !confirmUser.isActive,
          });
          setConfirmUser(null);
        }}
      />

      <RoleSelectModal
        visible={!!roleUser}
        currentRole={roleUser?.role as User["role"]}
        userName={roleUser?.name || ""}
        onClose={() => setRoleUser(null)}
        onSelect={(role) => {
          if (!roleUser) return;
          roleMutation.mutate({
            id: roleUser._id,
            role,
          });
          setRoleUser(null);
        }}
      />
    </View>
  );
}

/* Styles */
const styles = {
  container: {
    flex: 1,
    backgroundColor: AdminTheme.colors.background,
  },
  fixedHeader: {
    backgroundColor: AdminTheme.colors.background,
    paddingBottom: AdminTheme.spacing.md,
  },
  createButton: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent:"center",
    backgroundColor: "rgba(146, 243, 175, 0.24)",
    height:44,
    width:44,
    borderRadius: 24,
    // borderWidth: 1,
    // borderColor: "rgba(255, 255, 255, 0.3)",
    gap: AdminTheme.spacing.xs,
  },
  createButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  createButtonText: {
    color: AdminTheme.colors.primary,
    fontSize: 13,
    fontWeight: "700" as const,
  },
  statsGrid: {

    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    gap: AdminTheme.spacing.sm,
    paddingHorizontal: AdminTheme.spacing.md,
    paddingTop: AdminTheme.spacing.sm,
  },
  searchSection: {
    paddingHorizontal: AdminTheme.spacing.md,
    paddingTop: AdminTheme.spacing.md,
  },
  clearButton: {
    padding: AdminTheme.spacing.xs,
  },
  filterRow: {
    marginTop: 10,
    paddingHorizontal: AdminTheme.spacing.md,
    flexDirection: "row" as const,
    gap: AdminTheme.spacing.xs,
    flexWrap: "wrap" as const,
  },
  filterChip: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: AdminTheme.colors.surface,
    paddingHorizontal: AdminTheme.spacing.sm,
    paddingVertical: AdminTheme.spacing.xs,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: AdminTheme.colors.borderSoft,
    height: 32,
  },
  filterChipActive: {
    backgroundColor: `${AdminTheme.colors.primary}10`,
    borderColor: AdminTheme.colors.primary,
  },
  filterChipPressed: {
    backgroundColor: AdminTheme.colors.surfaceMuted,
    transform: [{ scale: 0.98 }],
  },
  filterChipText: {
    fontSize: 12,
    color: AdminTheme.colors.textMuted,
    fontWeight: "500" as const,
  },
  filterChipTextActive: {
    color: AdminTheme.colors.primary,
    fontWeight: "600" as const,
  },
  filterIcon: {
    marginLeft: AdminTheme.spacing.xs,
  },
  contentArea: {
    flex: 1,
  },
  listHeader: {
    height: AdminTheme.spacing.md,
  },
  listContent: {
    paddingHorizontal: AdminTheme.spacing.md,
    paddingTop: AdminTheme.spacing.sm,
    paddingBottom: BOTTOM_NAV_HEIGHT + AdminTheme.spacing.lg,
  },
  listFooter: {
    paddingVertical: AdminTheme.spacing.md,
    alignItems: "center" as const,
  },
  listFooterText: {
    fontSize: 12,
    color: AdminTheme.colors.textSoft,
    fontWeight: "500" as const,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingBottom: BOTTOM_NAV_HEIGHT,
  },
  loadingText: {
    marginTop: AdminTheme.spacing.md,
    fontSize: 16,
    color: AdminTheme.colors.textMuted,
    fontWeight: "500" as const,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    padding: AdminTheme.spacing.xl,
    paddingBottom: BOTTOM_NAV_HEIGHT + AdminTheme.spacing.xl,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600" as const,
    color: AdminTheme.colors.text,
    marginTop: AdminTheme.spacing.md,
    marginBottom: AdminTheme.spacing.xs,
  },
  emptyMessage: {
    fontSize: 14,
    color: AdminTheme.colors.textMuted,
    textAlign: "center" as const,
    marginBottom: AdminTheme.spacing.lg,
    lineHeight: 20,
  },
  emptyButton: {
    backgroundColor: AdminTheme.colors.primary,
    paddingHorizontal: AdminTheme.spacing.xl,
    paddingVertical: AdminTheme.spacing.md,
    borderRadius: AdminTheme.radius.lg,
  },
  emptyButtonPressed: {
    backgroundColor: AdminTheme.colors.primaryDark,
    transform: [{ scale: 0.98 }],
  },
  emptyButtonText: {
    color: AdminTheme.colors.surface,
    fontSize: 16,
    fontWeight: "600" as const,
  },
  userCard: {
    backgroundColor: AdminTheme.colors.surface,
    borderRadius: AdminTheme.radius.lg,
    padding: AdminTheme.spacing.md,
    marginBottom: AdminTheme.spacing.md,
    borderWidth: 1,
    borderColor: AdminTheme.colors.borderSoft,
    shadowColor: AdminTheme.colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  userCardDisabled: {
    opacity: 0.7,
  },
  userInfo: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    marginBottom: AdminTheme.spacing.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginRight: AdminTheme.spacing.md,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: "700" as const,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: AdminTheme.colors.text,
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 14,
    color: AdminTheme.colors.textMuted,
    marginBottom: AdminTheme.spacing.sm,
  },
  userMeta: {
    flexDirection: "row" as const,
    gap: AdminTheme.spacing.sm,
  },
  badge: {
    paddingHorizontal: AdminTheme.spacing.sm,
    paddingVertical: AdminTheme.spacing.xs,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "600" as const,
  },
  statusBadge: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingHorizontal: AdminTheme.spacing.sm,
    paddingVertical: AdminTheme.spacing.xs,
    borderRadius: 6,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600" as const,
  },
  actionsContainer: {
    flexDirection: "row" as const,
    gap: AdminTheme.spacing.md,
  },
  actionsDisabled: {
    opacity: 0.5,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingVertical: AdminTheme.spacing.sm,
    borderRadius: AdminTheme.radius.md,
    gap: AdminTheme.spacing.xs,
  },
  actionButtonOutline: {
    backgroundColor: AdminTheme.colors.surface,
    borderWidth: 1,
    borderColor: AdminTheme.colors.borderSoft,
  },
  actionButtonSuccess: {
    backgroundColor: `${AdminTheme.colors.success}15`,
    borderWidth: 1,
    borderColor: `${AdminTheme.colors.success}30`,
  },
  actionButtonDanger: {
    backgroundColor: `${AdminTheme.colors.danger}15`,
    borderWidth: 1,
    borderColor: `${AdminTheme.colors.danger}30`,
  },
  actionButtonWarning: {
    backgroundColor: `${AdminTheme.colors.warning}15`,
    borderWidth: 1,
    borderColor: `${AdminTheme.colors.warning}30`,
  },
  actionButtonPressed: {
    transform: [{ scale: 0.98 }],
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: AdminTheme.colors.primary,
  },
  selfIndicator: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    marginTop: AdminTheme.spacing.md,
    paddingTop: AdminTheme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: AdminTheme.colors.borderSoft,
    gap: AdminTheme.spacing.xs,
  },
  selfIndicatorText: {
    fontSize: 12,
    color: AdminTheme.colors.textSoft,
    fontWeight: "500" as const,
  },
};
