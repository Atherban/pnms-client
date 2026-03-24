import { ReactNode } from "react";
import { MaterialIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useSegments } from "expo-router";
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from "react-native";

import { AdminTheme } from "../admin/theme";
import { Colors } from "../../theme";

type StitchHeaderProps = {
  title: string;
  subtitle?: string;
  onBackPress?: () => void;
  showBackButton?: boolean;
  actions?: ReactNode;
  userActions?: ReactNode;
  iconName?: keyof typeof MaterialIcons.glyphMap;
  userName?: string;
  userRoleLabel?: string;
  userAvatarText?: string;
  userAvatarImageUrl?: string;
  onLogout?: () => void;
  children?: ReactNode;
  variant?: "gradient" | "solid";
  colors?: readonly [string, string] | string[];
  backgroundColor?: string;
  borderBottomColor?: string;
  containerStyle?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  titleStyle?: StyleProp<TextStyle>;
  subtitleStyle?: StyleProp<TextStyle>;
  brandImageUrl?: string;
  brandImagePlacement?: "inline-left" | "right";
};

export default function StitchHeader({
  title,
  subtitle,
  onBackPress,
  showBackButton,
  actions,
  userActions,
  iconName,
  userName,
  userRoleLabel,
  userAvatarText,
  userAvatarImageUrl,
  onLogout,
  children,
  variant = "gradient",
  colors = [AdminTheme.colors.primary, AdminTheme.colors.primaryDark],
  backgroundColor,
  borderBottomColor,
  containerStyle,
  contentStyle,
  titleStyle,
  subtitleStyle,
  brandImageUrl,
  brandImagePlacement = "inline-left",
}: StitchHeaderProps) {
  const segments = useSegments();
  const isStaffRoute = segments[0] === "(staff)";
  const initialsFromName = userName
    ? userName
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() || "")
        .join("") || "U"
    : "U";
  const avatarText = userAvatarText || initialsFromName;
  const shouldShowBackButton = showBackButton ?? Boolean(onBackPress);
  const resolvedColors =
    variant === "solid"
      ? [backgroundColor || AdminTheme.colors.primary, AdminTheme.colors.primaryDark]
      : ((colors as string[]) || [AdminTheme.colors.primary, AdminTheme.colors.primaryDark]);
  const primaryTextColor = "#FFFFFF";
  const secondaryTextColor = "rgba(255,255,255,0.84)";
  const circleBackground = "rgba(255,255,255,0.18)";
  const circleBorder = "rgba(255,255,255,0.24)";
  const accentFill = "rgba(255,255,255,0.16)";

  return (
    <LinearGradient
      colors={resolvedColors as [string, string]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.container,
        isStaffRoute && variant === "gradient" && styles.staffGradientContainer,
        borderBottomColor ? { borderBottomColor } : null,
        containerStyle,
      ]}
    >
      <View style={[styles.glowOrb, styles.glowLeft]} />
      <View style={[styles.glowOrb, styles.glowRight]} />
      <View style={[styles.content, contentStyle]}>
        <View style={styles.row}>
          <View style={styles.left}>
            {shouldShowBackButton ? (
              <Pressable
                onPress={onBackPress}
                style={[
                  styles.circleButton,
                  { backgroundColor: circleBackground, borderColor: circleBorder },
                ]}
              >
                <MaterialIcons name="arrow-back" size={20} color={Colors.surface} />
              </Pressable>
            ) : null}
            {brandImageUrl && brandImagePlacement === "inline-left" ? (
              <View
                style={[
                  styles.brandWrap,
                  { backgroundColor: circleBackground, borderColor: circleBorder },
                ]}
              >
                <Image source={{ uri: brandImageUrl }} style={styles.brandImage} contentFit="cover" />
              </View>
            ) : iconName ? (
              <View
                style={[
                  styles.iconWrap,
                  { backgroundColor: accentFill, borderColor: circleBorder },
                ]}
              >
                <MaterialIcons name={iconName} size={20} color={Colors.surface} />
              </View>
            ) : null}
            <View style={styles.titleWrap}>
              <Text style={[styles.title, { color: primaryTextColor }, titleStyle]}>
                {title}
              </Text>
              {subtitle ? (
                <Text style={[styles.subtitle, { color: secondaryTextColor }, subtitleStyle]}>
                  {subtitle}
                </Text>
              ) : null}
            </View>
          </View>
          {actions || onLogout || (brandImageUrl && brandImagePlacement === "right") ? (
            <View style={styles.actions}>
              {actions}
              {brandImageUrl && brandImagePlacement === "right" ? (
                <View
                  style={[
                    styles.brandWrap,
                    { backgroundColor: circleBackground, borderColor: circleBorder },
                  ]}
                >
                  <Image source={{ uri: brandImageUrl }} style={styles.brandImage} contentFit="cover" />
                </View>
              ) : null}
              
            </View>
          ) : null}
        </View>

        {userName || userRoleLabel ? (
          <View style={styles.userInfoRow}>
            <View
              style={[
                styles.avatar,
                { backgroundColor: circleBackground, borderColor: circleBorder },
              ]}
            >
              {userAvatarImageUrl ? (
                <Image source={{ uri: userAvatarImageUrl }} style={styles.avatarImage} contentFit="cover" />
              ) : (
                <Text style={[styles.avatarText, { color: primaryTextColor }]}>{avatarText}</Text>
              )}
            </View>
            <View style={styles.userTextWrap}>
              <Text style={[styles.userNameText, { color: primaryTextColor }]} numberOfLines={1}>
                {userName || "User"}
              </Text>
              {userRoleLabel ? (
                <Text
                  style={[styles.userRoleText, { color: secondaryTextColor }]}
                  numberOfLines={1}
                >
                  {userRoleLabel}
                </Text>
              ) : null}
            </View>
            {userActions ? <View style={styles.actions}>{userActions}</View> : null}
          {onLogout ? (
                <Pressable
                  onPress={onLogout}
                  style={[
                    styles.circleButton,
                    { backgroundColor: circleBackground, borderColor: circleBorder },
                  ]}
                >
                  <MaterialIcons name="logout" size={20} color={Colors.surface} />
                </Pressable>
              ) : null}</View>
        ) : null}

        {children ? <View style={styles.bottom}>{children}</View> : null}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.18)",
  },
  solidContainer: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderBottomColor: AdminTheme.colors.borderSoft,
  },
  staffGradientContainer: {
    borderBottomColor: "rgba(255,255,255,0.2)",
  },
  glowOrb: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  glowLeft: {
    top: -70,
    left: -40,
  },
  glowRight: {
    right: -30,
    bottom: -90,
  },
  content: {
    paddingHorizontal: AdminTheme.spacing.lg,
    paddingTop: AdminTheme.spacing.md,
    paddingBottom: AdminTheme.spacing.md,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: AdminTheme.spacing.md,
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    gap: AdminTheme.spacing.sm,
    flex: 1,
  },
  circleButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  actionButton: {
    backgroundColor: "rgba(255,255,255,0.18)",
    borderColor: "rgba(255,255,255,0.24)",
  },
  actionButtonPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.97 }],
  },
  actionButtonDisabled: {
    opacity: 0.55,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  brandWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
  },
  brandImage: {
    width: "100%",
    height: "100%",
  },
  titleWrap: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  subtitle: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "600",
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: AdminTheme.spacing.sm,
  },
  userInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: AdminTheme.spacing.sm,
    marginTop: AdminTheme.spacing.md,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: 21,
  },
  avatarText: {
    fontSize: 14,
    fontWeight: "800",
  },
  userTextWrap: {
    flex: 1,
  },
  userNameText: {
    fontSize: 15,
    fontWeight: "800",
  },
  userRoleText: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "600",
  },
  bottom: {
    marginTop: AdminTheme.spacing.md,
  },
});

type StitchHeaderActionButtonProps = {
  iconName: keyof typeof MaterialIcons.glyphMap;
  onPress?: () => void;
  disabled?: boolean;
};

export function StitchHeaderActionButton({
  iconName,
  onPress,
  disabled,
}: StitchHeaderActionButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.circleButton,
        styles.actionButton,
        pressed && !disabled && styles.actionButtonPressed,
        disabled && styles.actionButtonDisabled,
      ]}
    >
      <MaterialIcons name={iconName} size={20} color={Colors.surface} />
    </Pressable>
  );
}
