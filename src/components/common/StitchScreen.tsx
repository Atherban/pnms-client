import { ReactNode } from "react";
import {
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { CustomerColors, Radius, Spacing } from "../../theme";
import { ActionBar, ACTION_BAR_HEIGHT } from "../customer/ActionBar";
import { CUSTOMER_BOTTOM_NAV_HEIGHT } from "../navigation/SharedBottomNav";
import { AdminTheme } from "../admin/theme";
import { useKeyboardVisible } from "../../hooks/useKeyboardVisible";
import StitchCard from "./StitchCard";
import StitchHeader from "./StitchHeader";
import StitchSectionHeader from "./StitchSectionHeader";
import StitchStatusBadge from "./StitchStatusBadge";

type BaseScreenProps = {
  title: string;
  subtitle?: string;
  onBackPress?: () => void;
  actions?: ReactNode;
  children: ReactNode;
  scrollContentStyle?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  refreshControl?: ReactNode;
  footer?: ReactNode;
  footerMode?: "inline" | "action-bar";
  backgroundColor?: string;
  borderBottomColor?: string;
  headerTitleStyle?: StyleProp<any>;
  headerSubtitleStyle?: StyleProp<any>;
  headerContainerStyle?: StyleProp<ViewStyle>;
  userName?: string;
  userRoleLabel?: string;
  userAvatarText?: string;
  userActions?: ReactNode;
};

export function StitchScreen({
  title,
  subtitle,
  onBackPress,
  actions,
  children,
  scrollContentStyle,
  contentContainerStyle,
  refreshControl,
  footer,
  footerMode = "inline",
  backgroundColor = AdminTheme.colors.background,
  borderBottomColor = AdminTheme.colors.borderSoft,
  headerTitleStyle,
  headerSubtitleStyle,
  headerContainerStyle,
  userName,
  userRoleLabel,
  userAvatarText,
  userActions,
}: BaseScreenProps) {
  const insets = useSafeAreaInsets();
  const isKeyboardVisible = useKeyboardVisible();
  const bottomInset = CUSTOMER_BOTTOM_NAV_HEIGHT + insets.bottom;
  const footerOffset =
    footer && footerMode === "action-bar" && !isKeyboardVisible ? ACTION_BAR_HEIGHT : 0;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor }]} edges={["left", "right"]}>
      <StitchHeader
        title={title}
        subtitle={subtitle}
        showBackButton={Boolean(onBackPress)}
        onBackPress={onBackPress}
        actions={actions}
        userName={userName}
        userRoleLabel={userRoleLabel}
        userAvatarText={userAvatarText}
        userActions={userActions}
        variant="gradient"
        backgroundColor={backgroundColor}
        borderBottomColor={borderBottomColor}
        titleStyle={headerTitleStyle}
        subtitleStyle={headerSubtitleStyle}
        containerStyle={headerContainerStyle}
      />
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={refreshControl as any}
        contentContainerStyle={[
          styles.contentContainer,
          { paddingBottom: AdminTheme.spacing.md + bottomInset + footerOffset },
          contentContainerStyle,
        ]}
      >
        <View style={[styles.content, scrollContentStyle]}>{children}</View>
      </ScrollView>
      {footer
        ? footerMode === "action-bar"
          ? <ActionBar>{footer}</ActionBar>
          : <View style={[styles.footer, { backgroundColor }]}>{footer}</View>
        : null}
    </SafeAreaView>
  );
}

export function StitchStatPill({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.statPill}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export function StitchEmptyState({
  title,
  message,
  icon,
  action,
}: {
  title: string;
  message: string;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <StitchCard style={styles.emptyCard} contentStyle={styles.emptyCardContent}>
      {icon ? <View style={styles.emptyIcon}>{icon}</View> : null}
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyMessage}>{message}</Text>
      {action ? <View style={styles.emptyAction}>{action}</View> : null}
    </StitchCard>
  );
}

export function StitchErrorState({
  title = "Something went wrong",
  message = "Please try again.",
  action,
}: {
  title?: string;
  message?: string;
  action?: ReactNode;
}) {
  return (
    <StitchEmptyState
      title={title}
      message={message}
      icon={<Text style={styles.errorGlyph}>!</Text>}
      action={action}
    />
  );
}

export const stitchScreenStyles = StyleSheet.create({
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
});

// Backward-compatible shared exports to ease migration away from module folders.
export const StaffScreen = StitchScreen;
export const CustomerScreen = (props: BaseScreenProps) => (
  <StitchScreen
    {...props}
    footerMode="action-bar"
    backgroundColor={CustomerColors.background}
    borderBottomColor={CustomerColors.border}
  />
);
export const StaffCard = StitchCard;
export const CustomerCard = StitchCard;
export const StaffSectionHeader = StitchSectionHeader;
export const SectionHeader = StitchSectionHeader;
export const StatPill = StitchStatPill;
export const CustomerEmptyState = StitchEmptyState;
export const CustomerErrorState = StitchErrorState;
export const customerScreenStyles = stitchScreenStyles;
export const StatusChip = ({
  label,
  tone = "default",
}: {
  label: string;
  tone?: "default" | "success" | "warning" | "danger" | "info";
}) => (
  <StitchStatusBadge
    label={label}
    tone={tone === "default" ? "neutral" : tone}
  />
);

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
  },
  content: {
    gap: Spacing.md,
  },
  footer: {},
  statPill: {
    flex: 1,
    minWidth: 0,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    backgroundColor: "rgba(15,189,73,0.10)",
    gap: 6,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "800",
    color: AdminTheme.colors.primaryDeep,
  },
  statLabel: {
    fontSize: 12,
    color: AdminTheme.colors.textMuted,
    fontWeight: "600",
  },
  emptyCard: {
    alignSelf: "stretch",
  },
  emptyCardContent: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 220,
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
  },
  emptyIcon: {
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: AdminTheme.colors.text,
  },
  emptyMessage: {
    marginTop: Spacing.xs,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    color: AdminTheme.colors.textMuted,
    maxWidth: 320,
  },
  emptyAction: {
    marginTop: Spacing.md,
  },
  errorGlyph: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: "hidden",
    backgroundColor: "#FEE2E2",
    textAlign: "center",
    lineHeight: 44,
    fontSize: 24,
    fontWeight: "800",
    color: "#B91C1C",
  },
});
