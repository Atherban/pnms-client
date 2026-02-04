import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React from "react";
import {
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Colors, Spacing } from "../../../theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const BOTTOM_NAV_HEIGHT = 80; // Adjust based on your bottom nav height
const CARD_WIDTH = (SCREEN_WIDTH - Spacing.lg * 2 - Spacing.md) / 2;

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
    title: "Analytics",
    icon: "analytics",
    path: "/(admin)/analytics",
    color: "#6366F1",
    description: "Business insights",
  },
  {
    title: "Reports",
    icon: "summarize",
    path: "/(admin)/reports",
    color: "#EC4899",
    description: "Generate reports",
  },
  {
    title: "Settings",
    icon: "settings",
    path: "/(admin)/settings",
    color: "#6B7280",
    description: "App configuration",
  },
  {
    title: "Support",
    icon: "help",
    path: "/(admin)/support",
    color: "#3B82F6",
    description: "Help & documentation",
  },
  {
    title: "Users",
    icon: "people",
    path: "/(admin)/users",
    color: "#8B5CF6",
    description: "Manage team access",
  },
  {
    title: "Inventory",
    icon: "inventory",
    path: "/(admin)/inventory",
    color: "#EF4444",
    description: "Stock management",
  },
];

export default function MoreScreen() {
  const handleNavigation = (path: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(path);
  };

  return (
    <View style={styles.container}>
      {/* Fixed Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>More Options</Text>
          <Text style={styles.subtitle}>Quick access to features</Text>
        </View>
        <MaterialIcons name="widgets" size={28} color={Colors.primary} />
      </View>

      {/* Scrollable Content */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Quick Links Grid */}
        <View style={styles.grid}>
          {QUICK_LINKS.map((item) => (
            <Pressable
              key={item.title}
              onPress={() => handleNavigation(item.path)}
              style={({ pressed }) => [
                styles.card,
                pressed && styles.cardPressed,
              ]}
            >
              {/* Icon */}
              <View
                style={[
                  styles.iconContainer,
                  {
                    backgroundColor: item.color + "10",
                    borderColor: item.color + "30",
                  },
                ]}
              >
                <MaterialIcons
                  name={item.icon as any}
                  size={22}
                  color={item.color}
                />
              </View>

              {/* Content */}
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardDescription}>{item.description}</Text>
              </View>

              {/* Arrow */}
              <MaterialIcons
                name="chevron-right"
                size={20}
                color={Colors.textTertiary}
                style={styles.arrow}
              />
            </Pressable>
          ))}
        </View>

        {/* Support Section */}
        <View style={styles.supportCard}>
          <MaterialIcons
            name="support-agent"
            size={32}
            color={Colors.primary}
          />
          <View style={styles.supportContent}>
            <Text style={styles.supportTitle}>Need Help?</Text>
            <Text style={styles.supportText}>Contact our support team</Text>
          </View>
          <Pressable
            onPress={() => handleNavigation("/(admin)/support")}
            style={({ pressed }) => [
              styles.supportButton,
              pressed && styles.supportButtonPressed,
            ]}
          >
            <Text style={styles.supportButtonText}>Contact</Text>
          </Pressable>
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
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.background,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: BOTTOM_NAV_HEIGHT + 2 * Spacing.xl,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    position: "relative",
  },
  cardPressed: {
    backgroundColor: Colors.surfaceDark,
    transform: [{ scale: 0.98 }],
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.sm,
    borderWidth: 1,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 2,
  },
  cardDescription: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  arrow: {
    position: "absolute",
    top: Spacing.md,
    right: Spacing.md,
  },
  supportCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    gap: Spacing.md,
  },
  supportContent: {
    flex: 1,
  },
  supportTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 2,
  },
  supportText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  supportButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: 8,
  },
  supportButtonPressed: {
    backgroundColor: Colors.primaryDark,
    transform: [{ scale: 0.98 }],
  },
  supportButtonText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: "600",
  },
  footer: {
    alignItems: "center",
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    gap: Spacing.xs,
  },
  footerText: {
    fontSize: 12,
    color: Colors.textTertiary,
  },
});
