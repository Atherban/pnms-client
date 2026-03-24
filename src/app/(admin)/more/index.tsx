import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useMemo } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import StitchCard from "../../../components/common/StitchCard";
import StitchHeader from "../../../components/common/StitchHeader";
import { AdminTheme } from "../../../components/admin/theme";

const BOTTOM_NAV_HEIGHT = 80;

// Calculate card width for 2-column grid
const GRID_GAP = AdminTheme.spacing.md;
const HORIZONTAL_PADDING = AdminTheme.spacing.md;

const QUICK_LINKS = [
  {
    title: "Sales",
    icon: "receipt",
    path: "/(admin)/sales",
    color: "#10B981",
    description: "View sales & transactions",
  },
  {
    title: "Profit",
    icon: "trending-up",
    path: "/(admin)/profit",
    color: "#F59E0B",
    description: "Revenue analysis",
  },
  {
    title: "Reports",
    icon: "summarize",
    path: "/(admin)/more/reports",
    color: "#EC4899",
    description: "Generate reports",
  },
  {
    title: "Payment Verify",
    icon: "fact-check",
    path: "/(admin)/payments/verification",
    color: "#0EA5E9",
    description: "Approve payment screenshots",
  },
  {
    title: "Staff Performance",
    icon: "leaderboard",
    path: "/(admin)/staff/performance",
    color: "#6366F1",
    description: "Sales and collection tracking",
  },
  {
    title: "Staff Accounts",
    icon: "account-balance-wallet",
    path: "/(admin)/staff/accounting",
    color: "#14B8A6",
    description: "Accounting net balance",
  },
  {
    title: "Banners",
    icon: "campaign",
    path: "/(admin)/banners",
    color: "#0EA5E9",
    description: "Create and manage banners",
  },
  {
    title: "Notifications",
    icon: "notifications-active",
    path: "/(admin)/notifications",
    color: "#22C55E",
    description: "Broadcast customer alerts",
  },
  {
    title: "Audit Logs",
    icon: "history",
    path: "/(admin)/audit-logs",
    color: "#F59E0B",
    description: "Soft-delete history and cleanup",
  },
  {
    title: "Public Profile",
    icon: "contact-phone",
    path: "/(admin)/settings/public-profile",
    color: "#3B82F6",
    description: "UPI, contacts and social links",
  },
  {
    title: "Inventory",
    icon: "inventory",
    path: "/(admin)/inventory",
    color: "#EF4444",
    description: "Stock management",
  },
  {
    title: "Seeds",
    icon: "grass",
    path: "/(admin)/seeds",
    color: "#84CC16",
    description: "Seed batches overview",
  },
  {
    title: "Sowing",
    icon: "eco",
    path: "/(admin)/sowing",
    color: "#A3A33A",
    description: "View sowing records",
  },
  {
    title: "Germination",
    icon: "local-florist",
    path: "/(admin)/germination",
    color: "#22C55E",
    description: "View germination records",
  },
  {
    title: "Customer Seed Batches",
    icon: "inventory-2",
    path: "/(admin)/seed-batches",
    color: "#10B981",
    description: "Lifecycle and service billing",
  },
  {
    title: "Customers",
    icon: "groups",
    path: "/(admin)/customers",
    color: "#0EA5E9",
    description: "Read customer records",
  },
  {
    title: "Expenses",
    icon: "payments",
    path: "/(admin)/expenses",
    color: "#F97316",
    description: "Read expense records",
  },
  {
    title: "Labours",
    icon: "engineering",
    path: "/(admin)/labours",
    color: "#14B8A6",
    description: "Read labour records",
  },
];

export default function MoreScreen() {
  const handleNavigation = (path: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(path as any);
  };

  // Split items into left and right columns for masonry layout
  const { leftColumn, rightColumn } = useMemo(() => {
    const left: typeof QUICK_LINKS = [];
    const right: typeof QUICK_LINKS = [];
    
    QUICK_LINKS.forEach((item, index) => {
      if (index % 2 === 0) {
        left.push(item);
      } else {
        right.push(item);
      }
    });
    
    return { leftColumn: left, rightColumn: right };
  }, []);

  return (
    <View style={styles.container}>
      <StitchHeader
        title="More"
        subtitle="Quick access to tools"
        actions={<MaterialIcons name="widgets" size={20} color={AdminTheme.colors.surface} />}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Masonry Grid Layout */}
        <View style={styles.masonryGrid}>
          {/* Left Column */}
          <View style={styles.column}>
            {leftColumn.map((item) => (
              <Pressable
                key={item.title}
                onPress={() => handleNavigation(item.path)}
                style={({ pressed }) => [
                  styles.cardWrapper,
                  pressed && styles.cardPressed,
                ]}
              >
                <StitchCard style={styles.card}>
                  {/* Icon Container */}
                  <View
                    style={[
                      styles.iconContainer,
                      { backgroundColor: item.color + "15" },
                    ]}
                  >
                    <MaterialIcons
                      name={item.icon as any}
                      size={24}
                      color={item.color}
                    />
                  </View>

                  {/* Content */}
                  <View style={styles.contentContainer}>
                    <Text style={styles.cardTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={styles.cardDescription}>
                      {item.description}
                    </Text>
                  </View>

                  {/* Arrow Indicator */}
                  <View style={styles.arrowContainer}>
                    <MaterialIcons
                      name="chevron-right"
                      size={16}
                      color={AdminTheme.colors.textSoft}
                    />
                  </View>
                </StitchCard>
              </Pressable>
            ))}
          </View>

          {/* Right Column */}
          <View style={styles.column}>
            {rightColumn.map((item) => (
              <Pressable
                key={item.title}
                onPress={() => handleNavigation(item.path)}
                style={({ pressed }) => [
                  styles.cardWrapper,
                  pressed && styles.cardPressed,
                ]}
              >
                <StitchCard style={styles.card}>
                  {/* Icon Container */}
                  <View
                    style={[
                      styles.iconContainer,
                      { backgroundColor: item.color + "15" },
                    ]}
                  >
                    <MaterialIcons
                      name={item.icon as any}
                      size={24}
                      color={item.color}
                    />
                  </View>

                  {/* Content */}
                  <View style={styles.contentContainer}>
                    <Text style={styles.cardTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={styles.cardDescription}>
                      {item.description}
                    </Text>
                  </View>

                  {/* Arrow Indicator */}
                  <View style={styles.arrowContainer}>
                    <MaterialIcons
                      name="chevron-right"
                      size={16}
                      color={AdminTheme.colors.textSoft}
                    />
                  </View>
                </StitchCard>
              </Pressable>
            ))}
          </View>
        </View>

        

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>PNMS v1.0.0</Text>
          <Text style={styles.footerText}>© 2024 Plant Nursery Management</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AdminTheme.colors.background,
  },
  scrollContent: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingTop: AdminTheme.spacing.md,
    paddingBottom: BOTTOM_NAV_HEIGHT + 2 * AdminTheme.spacing.lg,
  },
  
  // Masonry Grid Layout
  masonryGrid: {
    flexDirection: "row",
    gap: GRID_GAP,
    marginBottom: AdminTheme.spacing.lg,
  },
  
  // Column - each takes half width
  column: {
    flex: 1,
    gap: GRID_GAP,
  },
  
  // Card Wrapper - full width of column
  cardWrapper: {
    width: "100%",
  },
  
  // Card - dynamic height based on content
  card: {
    width: "100%",
    padding: AdminTheme.spacing.sm,
  },
  
  // Pressed state
  cardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  
  // Icon container - fixed size
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: AdminTheme.spacing.xs,
  },
  
  // Content container - allows natural height
  contentContainer: {
    // No flex:1 here - let content determine height
  },
  
  // Card title - truncated
  cardTitle: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: AdminTheme.colors.text,
    marginBottom: 2,
  },
  
  // Card description - wraps naturally
  cardDescription: {
    fontSize: 11,
    color: AdminTheme.colors.textMuted,
    lineHeight: 14,
  },
  
  // Arrow container - positioned absolutely
  arrowContainer: {
    position: "absolute",
    top: AdminTheme.spacing.sm,
    right: AdminTheme.spacing.sm,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: AdminTheme.colors.surfaceMuted,
  },

  // Support section (full width)
  supportSection: {
    marginBottom: AdminTheme.spacing.lg,
    width: "100%",
  },
  supportCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: AdminTheme.spacing.md,
    gap: AdminTheme.spacing.md,
  },
  supportIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  supportContent: {
    flex: 1,
  },
  supportTitle: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: AdminTheme.colors.text,
    marginBottom: 2,
  },
  supportText: {
    fontSize: 13,
    color: AdminTheme.colors.textMuted,
  },
  supportButton: {
    backgroundColor: AdminTheme.colors.primary,
    paddingHorizontal: AdminTheme.spacing.md,
    paddingVertical: AdminTheme.spacing.sm,
    borderRadius: AdminTheme.radius.full,
    ...AdminTheme.shadow,
  },
  supportButtonPressed: {
    backgroundColor: AdminTheme.colors.primaryDark,
    transform: [{ scale: 0.98 }],
  },
  supportButtonText: {
    color: AdminTheme.colors.surface,
    fontSize: 13,
    fontWeight: "600" as const,
  },

  // Footer
  footer: {
    alignItems: "center",
    paddingTop: AdminTheme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: AdminTheme.colors.borderSoft,
    gap: AdminTheme.spacing.xs,
  },
  footerText: {
    fontSize: 12,
    color: AdminTheme.colors.textSoft,
  },
});
