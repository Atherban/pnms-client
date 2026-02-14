import { MaterialIcons as Icon } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  View,
} from "react-native";

import { ConfirmModal } from "../../../components/ConfirmModal";
import { RoleSelectModal } from "../../../components/RoleSelectModal";
import { User, UserService } from "../../../services/user.service";
import { useAuthStore } from "../../../stores/auth.store";
import { Colors, Spacing } from "../../../theme";

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

  const users = useMemo(() => data?.users ?? [], [data]);
  const totalUsers = data?.users?.length ?? 0;

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        search.trim() === "" ||
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase());

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
      ADMIN: "Admin",
      STAFF: "Staff",
      VIEWER: "Viewer",
    };
    return roleMap[role];
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
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
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading users...</Text>
        </View>
      );
    }

    if (filteredUsers.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Icon name="group-off" size={64} color={Colors.border} />
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
            colors={[Colors.primary]}
            tintColor={Colors.primary}
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
            item.role === "ADMIN"
              ? Colors.error
              : item.role === "STAFF"
                ? Colors.warning
                : Colors.success;

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
                  <Text style={styles.userEmail}>{item.email}</Text>
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
                            ? `${Colors.success}15`
                            : `${Colors.error}15`,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.statusDot,
                          {
                            backgroundColor: item.isActive
                              ? Colors.success
                              : Colors.error,
                          },
                        ]}
                      />
                      <Text
                        style={[
                          styles.statusText,
                          {
                            color: item.isActive
                              ? Colors.success
                              : Colors.error,
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
                  <Icon name="swap-horiz" size={16} color={Colors.primary} />
                  <Text style={styles.actionButtonText}>Role</Text>
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
                    color={item.isActive ? Colors.error : Colors.success}
                  />
                  <Text
                    style={[
                      styles.actionButtonText,
                      {
                        color: item.isActive ? Colors.error : Colors.success,
                      },
                    ]}
                  >
                    {item.isActive ? "Disable" : "Enable"}
                  </Text>
                </Pressable>
              </View>

              {isSelf && (
                <View style={styles.selfIndicator}>
                  <Icon name="person" size={12} color={Colors.textTertiary} />
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
      {/* Fixed Header Section */}
      <View style={styles.fixedHeader}>
        <LinearGradient
          colors={[Colors.primary, Colors.primaryLight || Colors.primary]}
          style={styles.headerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>User Management</Text>
              <Text style={styles.subtitle}>
                {totalUsers} total users • {filteredUsers.length} filtered
              </Text>
            </View>
            <Pressable
              onPress={() => router.push("/(admin)/users/create")}
              style={({ pressed }) => [
                styles.createButton,
                pressed && styles.createButtonPressed,
              ]}
            >
              <Icon name="person-add" size={18} color={Colors.primary} />
              <Text style={styles.createButtonText}>User</Text>
            </Pressable>
          </View>

          {/* Stats Cards */}
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Icon name="people" size={18} color={Colors.white} />
              <Text style={styles.statValue}>{stats.totalUsers}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>

            <View style={styles.statCard}>
              <Icon name="check-circle" size={18} color={Colors.white} />
              <Text style={styles.statValue}>{stats.activeUsers}</Text>
              <Text style={styles.statLabel}>Active</Text>
            </View>

            <View style={styles.statCard}>
              <Icon name="block" size={18} color={Colors.white} />
              <Text style={styles.statValue}>{stats.disabledUsers}</Text>
              <Text style={styles.statLabel}>Disabled</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Search Bar */}
        <View style={styles.searchSection}>
          <View style={styles.searchContainer}>
            <Icon
              name="search"
              size={20}
              color={Colors.textSecondary}
              style={styles.searchIcon}
            />
            <TextInput
              placeholder="Search by name or email..."
              placeholderTextColor={Colors.textTertiary}
              value={search}
              onChangeText={setSearch}
              style={styles.searchInput}
              clearButtonMode="while-editing"
            />
            {search.length > 0 && (
              <Pressable
                onPress={() => setSearch("")}
                style={styles.clearButton}
              >
                <Icon name="close" size={16} color={Colors.textSecondary} />
              </Pressable>
            )}
          </View>
        </View>

        {/* Filter Chips - Fixed Row */}
        <View style={styles.filterRow}>
          <Pressable
            onPress={() =>
              setRoleFilter((r) =>
                r === "ALL"
                  ? "ADMIN"
                  : r === "ADMIN"
                    ? "STAFF"
                    : r === "STAFF"
                      ? "VIEWER"
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
                  roleFilter === "ADMIN"
                    ? "security"
                    : roleFilter === "STAFF"
                      ? "work"
                      : "visibility"
                }
                size={12}
                color={Colors.primary}
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
                  statusFilter === "ACTIVE" ? Colors.success : Colors.error
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
                color={Colors.textSecondary}
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
        confirmColor={confirmUser?.isActive ? Colors.error : Colors.success}
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
    backgroundColor: Colors.background,
  },
  fixedHeader: {
    backgroundColor: Colors.background,
    paddingBottom: Spacing.md,
  },
  headerGradient: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
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
    color: Colors.white,
  },
  subtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.88)",
    marginTop: Spacing.xs,
  },
  createButton: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 10,
    gap: Spacing.xs,
  },
  createButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  createButtonText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: "700" as const,
  },
  statsGrid: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    gap: Spacing.sm,
  },
  statCard: {
    flex: 1,
    padding: Spacing.sm,
    borderRadius: 12,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)",
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  statValue: {
    fontSize: 17,
    fontWeight: "700" as const,
    color: Colors.white,
    marginTop: Spacing.xs,
  },
  statLabel: {
    fontSize: 10,
    color: "rgba(255,255,255,0.88)",
    fontWeight: "600" as const,
    marginTop: Spacing.xs,
    textAlign: "center" as const,
  },
  searchSection: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  searchContainer: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: Colors.white,
    marginBottom: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    height: 46,
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
  filterRow: {
    marginTop: 10,
    paddingHorizontal: Spacing.lg,
    flexDirection: "row" as const,
    gap: Spacing.xs,
    flexWrap: "wrap" as const,
  },
  filterChip: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    height: 32,
  },
  filterChipActive: {
    backgroundColor: Colors.primary + "10",
    borderColor: Colors.primary,
  },
  filterChipPressed: {
    backgroundColor: Colors.surfaceDark,
    transform: [{ scale: 0.98 }],
  },
  filterChipText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: "500" as const,
  },
  filterChipTextActive: {
    color: Colors.primary,
    fontWeight: "600" as const,
  },
  filterIcon: {
    marginLeft: Spacing.xs,
  },
  contentArea: {
    flex: 1,
  },
  listHeader: {
    height: Spacing.md,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: BOTTOM_NAV_HEIGHT + Spacing.lg,
  },
  listFooter: {
    paddingVertical: Spacing.md,
    alignItems: "center" as const,
  },
  listFooterText: {
    fontSize: 12,
    color: Colors.textTertiary,
    fontWeight: "500" as const,
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
  userCard: {
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
  userCardDisabled: {
    opacity: 0.7,
  },
  userInfo: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    marginBottom: Spacing.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginRight: Spacing.md,
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
    color: Colors.text,
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  userMeta: {
    flexDirection: "row" as const,
    gap: Spacing.sm,
  },
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "600" as const,
  },
  statusBadge: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
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
    gap: Spacing.md,
  },
  actionsDisabled: {
    opacity: 0.5,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingVertical: Spacing.sm,
    borderRadius: 10,
    gap: Spacing.xs,
  },
  actionButtonOutline: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  actionButtonSuccess: {
    backgroundColor: Colors.success + "15",
    borderWidth: 1,
    borderColor: Colors.success + "30",
  },
  actionButtonDanger: {
    backgroundColor: Colors.error + "15",
    borderWidth: 1,
    borderColor: Colors.error + "30",
  },
  actionButtonPressed: {
    transform: [{ scale: 0.98 }],
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.primary,
  },
  selfIndicator: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    gap: Spacing.xs,
  },
  selfIndicatorText: {
    fontSize: 12,
    color: Colors.textTertiary,
    fontWeight: "500" as const,
  },
};
