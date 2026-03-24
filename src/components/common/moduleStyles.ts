import { AdminTheme } from "../admin/theme";

export const moduleHeaderTitle = {
  color: AdminTheme.colors.text,
  fontSize: 20,
  fontWeight: "700" as const,
};

export const moduleHeaderSubtitle = {
  marginTop: 4,
  color: AdminTheme.colors.textMuted,
  fontSize: 12,
};

export const moduleSectionTitle = {
  marginTop: AdminTheme.spacing.lg,
  marginBottom: AdminTheme.spacing.sm,
  fontSize: 12,
  fontWeight: "700" as const,
  color: AdminTheme.colors.textMuted,
  textTransform: "uppercase" as const,
  letterSpacing: 0.6,
};

export const moduleSearchContainer = {
  flexDirection: "row" as const,
  alignItems: "center" as const,
  gap: AdminTheme.spacing.sm,
  paddingVertical: 14,
  marginHorizontal: AdminTheme.spacing.lg,
  marginBottom: AdminTheme.spacing.md,
};

export const moduleSearchInput = {
  flex: 1,
  fontSize: 14,
  color: AdminTheme.colors.text,
  padding: 0,
};

export const moduleBadge = {
  borderRadius: AdminTheme.radius.full,
  paddingHorizontal: AdminTheme.spacing.sm,
  paddingVertical: 4,
  borderWidth: 1,
  borderColor: AdminTheme.colors.borderSoft,
  backgroundColor: AdminTheme.colors.surface,
};

export const moduleListRow = {
  borderWidth: 1,
  borderColor: AdminTheme.colors.borderSoft,
  borderRadius: AdminTheme.radius.lg,
  backgroundColor: AdminTheme.colors.surface,
  padding: AdminTheme.spacing.md,
  marginBottom: AdminTheme.spacing.sm,
  ...AdminTheme.shadow.card,
};

export const moduleCard = {
  ...moduleListRow,
  padding: AdminTheme.spacing.md,
};

export const moduleContainer = {
  flex: 1,
  backgroundColor: AdminTheme.colors.background,
  paddingHorizontal: AdminTheme.spacing.lg,
};
