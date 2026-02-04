// components/UserProfile.tsx
import { StyleSheet, Text, View } from "react-native";
import { useAuthStore } from "../stores/auth.store";
import { Colors, Spacing } from "../theme";

interface UserProfileProps {
  showWelcome?: boolean;
  showRole?: boolean;
  size?: "small" | "medium" | "large";
}

export default function UserProfile({
  showWelcome = true,
  showRole = true,
  size = "medium",
}: UserProfileProps) {
  const user = useAuthStore((s) => s.user);

  const userName = user?.name;

  if (!user && !userName) return null;

  const displayName = user?.name || userName || "User";
  const initials = displayName.charAt(0).toUpperCase();
  const role = user?.role || "USER";

  const sizeMap = {
    small: { avatar: 32, fontSize: 14, nameSize: 14 },
    medium: { avatar: 48, fontSize: 20, nameSize: 18 },
    large: { avatar: 64, fontSize: 28, nameSize: 24 },
  };

  const { avatar, fontSize, nameSize } = sizeMap[size];

  const getRoleColor = () => {
    switch (role) {
      case "ADMIN":
        return Colors.error;
      case "STAFF":
        return Colors.warning;
      case "VIEWER":
        return Colors.success;
      default:
        return Colors.primary;
    }
  };

  const getRoleDisplay = () => {
    switch (role) {
      case "ADMIN":
        return "Administrator";
      case "STAFF":
        return "Staff Member";
      case "VIEWER":
        return "Viewer";
      default:
        return "User";
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.avatar, { width: avatar, height: avatar }]}>
        <Text style={[styles.avatarText, { fontSize }]}>{initials}</Text>
      </View>
      <View style={styles.userInfo}>
        {showWelcome && <Text style={styles.welcomeText}>Welcome back,</Text>}
        <Text style={[styles.userName, { fontSize: nameSize }]}>
          {displayName}
        </Text>
        {showRole && (
          <View style={styles.roleContainer}>
            <View
              style={[styles.roleDot, { backgroundColor: getRoleColor() }]}
            />
            <Text style={styles.roleText}>{getRoleDisplay()}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  avatar: {
    borderRadius: 999,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: Colors.primaryLight,
  },
  avatarText: {
    fontWeight: "700",
    color: Colors.white,
  },
  userInfo: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: "500",
    marginBottom: 2,
  },
  userName: {
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 4,
  },
  roleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  roleDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  roleText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: "500",
  },
});
