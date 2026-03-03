import { LinearGradient } from "expo-linear-gradient";
import { ReactNode } from "react";
import { MaterialIcons } from "@expo/vector-icons";
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from "react-native";

import { Colors, Spacing } from "../../theme";

type FixedHeaderProps = {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children?: ReactNode;
  colors?: readonly [string, string] | string[];
  containerStyle?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  titleStyle?: StyleProp<TextStyle>;
  subtitleStyle?: StyleProp<TextStyle>;
  userName?: string;
  userRoleLabel?: string;
  userAvatarText?: string;
  onLogout?: () => void;
};

export default function FixedHeader({
  title,
  subtitle,
  actions,
  children,
  colors = [Colors.primary, Colors.primaryLight],
  containerStyle,
  contentStyle,
  titleStyle,
  subtitleStyle,
  userName,
  userRoleLabel,
  userAvatarText,
  onLogout,
}: FixedHeaderProps) {
  const initialsFromName = userName
    ? userName
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() || "")
        .join("") || "U"
    : "U";
  const avatarText = userAvatarText || initialsFromName;

  return (
    <LinearGradient colors={colors as [string, string]} style={[styles.container, containerStyle]}>
      <View style={[styles.topRow, contentStyle]}>
        <View style={styles.titleWrap}>
          <Text style={[styles.title, titleStyle]}>{title}</Text>
          {subtitle ? <Text style={[styles.subtitle, subtitleStyle]}>{subtitle}</Text> : null}
        </View>
        {actions || onLogout ? (
          <View style={styles.actions}>
            {actions}
            {onLogout ? (
              <Pressable
                onPress={onLogout}
                style={({ pressed }) => [
                  styles.logoutButton,
                  pressed && styles.logoutButtonPressed,
                ]}
              >
                <MaterialIcons name="logout" size={20} color={Colors.white} />
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>

      {userName || userRoleLabel ? (
        <View style={styles.userInfoRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{avatarText}</Text>
          </View>
          <View style={styles.userInfoTextWrap}>
            <Text style={styles.userNameText} numberOfLines={1}>
              {userName || "User"}
            </Text>
            {userRoleLabel ? (
              <Text style={styles.userRoleText} numberOfLines={1}>
                {userRoleLabel}
              </Text>
            ) : null}
          </View>
        </View>
      ) : null}

      {children ? <View style={styles.bottom}>{children}</View> : null}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.lg,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  titleWrap: {
    flex: 1,
  },
  title: {
    color: Colors.white,
    fontSize: 28,
    fontWeight: "700",
  },
  subtitle: {
    marginTop: 2,
    color: "rgba(255,255,255,0.92)",
    fontSize: 14,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  logoutButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.34)",
    alignItems: "center",
    justifyContent: "center",
  },
  logoutButtonPressed: {
    opacity: 0.86,
  },
  userInfoRow: {
    marginTop: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  avatarText: {
    color: Colors.white,
    fontWeight: "700",
    fontSize: 14,
  },
  userInfoTextWrap: {
    flex: 1,
  },
  userNameText: {
    color: Colors.white,
    fontWeight: "700",
    fontSize: 16,
  },
  userRoleText: {
    marginTop: 2,
    color: "rgba(255,255,255,0.88)",
    fontSize: 12,
  },
  bottom: {
    marginTop: Spacing.md,
  },
});
