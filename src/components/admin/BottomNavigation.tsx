import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { usePathname, useRouter } from "expo-router";
import { Home, Leaf, Menu, Sprout, Users } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { Colors, Spacing } from "../../theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const NAV_ITEM_WIDTH = SCREEN_WIDTH / 5;

// Define icon components
const DashboardIcon = Home;
const UsersIcon = Users;
const PlantsIcon = Leaf;
const SeedsIcon = Sprout;
const MoreIcon = Menu;

const NAV_ITEMS = [
  {
    label: "Dashboard",
    icon: DashboardIcon,
    activeIcon: DashboardIcon,
    path: "/(admin)",
    color: "#6366F1",
  },
  {
    label: "Users",
    icon: UsersIcon,
    activeIcon: UsersIcon,
    path: "/(admin)/users",
    color: "#EC4899",
  },
  {
    label: "Plants",
    icon: PlantsIcon,
    activeIcon: PlantsIcon,
    path: "/(admin)/plants",
    color: "#10B981",
  },
  {
    label: "Seeds", // Changed from "Seed" to "Seeds" for consistency
    icon: SeedsIcon,
    activeIcon: SeedsIcon,
    path: "/(admin)/seeds",
    color: "#F59E0B",
  },
  {
    label: "More",
    icon: MoreIcon,
    activeIcon: MoreIcon,
    path: "/(admin)/more",
    color: "#8B5CF6",
  },
];

export default function CoolBottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const [activeIndex, setActiveIndex] = useState(0);
  const [pressedIndex, setPressedIndex] = useState<number | null>(null);

  // Animations
  const indicatorAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const bounceAnim = useRef(new Animated.Value(1)).current;

  // Find active index
  useEffect(() => {
    const index = NAV_ITEMS.findIndex((item) => pathname.startsWith(item.path));
    if (index !== -1 && index !== activeIndex) {
      handleNavigation(index, NAV_ITEMS[index].path);
    }
  }, [pathname]);

  const handleNavigation = (index: number, path: string) => {
    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Reset pressed state
    setPressedIndex(null);

    // Navigation
    if (pathname !== path) {
      router.replace(path);
    }

    // Indicator animation
    Animated.spring(indicatorAnim, {
      toValue: index * NAV_ITEM_WIDTH,
      useNativeDriver: true,
      tension: 150,
      friction: 15,
    }).start();

    // Bounce animation for active item
    Animated.sequence([
      Animated.timing(bounceAnim, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
        easing: Easing.ease,
      }),
      Animated.timing(bounceAnim, {
        toValue: 1.1,
        duration: 150,
        useNativeDriver: true,
        easing: Easing.ease,
      }),
      Animated.timing(bounceAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
        easing: Easing.ease,
      }),
    ]).start(() => {
      setActiveIndex(index);
    });
  };

  const handlePressIn = (index: number) => {
    setPressedIndex(index);
    Animated.spring(scaleAnim, {
      toValue: 0.92,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    setPressedIndex(null);
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  // Active indicator translation
  const indicatorTranslateX = indicatorAnim.interpolate({
    inputRange: [0, SCREEN_WIDTH],
    outputRange: [0, SCREEN_WIDTH],
  });

  return (
    <View style={styles.container}>
      {/* Blur Background */}
      <BlurView intensity={90} tint="light" style={styles.blurBackground}>
        {/* Animated Indicator */}
        <Animated.View
          style={[
            styles.activeIndicator,
            {
              transform: [{ translateX: indicatorTranslateX }],
              backgroundColor: NAV_ITEMS[activeIndex]?.color + "20",
              borderColor: NAV_ITEMS[activeIndex]?.color + "40",
            },
          ]}
        >
          {/* Glow Effect */}
          <View
            style={[
              styles.glowEffect,
              { backgroundColor: NAV_ITEMS[activeIndex]?.color + "20" },
            ]}
          />
        </Animated.View>

        {/* Navigation Items */}
        <View style={styles.navItemsContainer}>
          {NAV_ITEMS.map((item, index) => {
            const isActive = activeIndex === index;
            const isPressed = pressedIndex === index;
            const IconComponent = item.icon;

            return (
              <Pressable
                key={item.path}
                onPressIn={() => handlePressIn(index)}
                onPressOut={handlePressOut}
                onPress={() => handleNavigation(index, item.path)}
                style={styles.navItem}
              >
                <Animated.View
                  style={[
                    styles.iconContainer,
                    isActive && styles.iconContainerActive,
                    isPressed && styles.iconContainerPressed,
                    {
                      transform: [{ scale: isActive ? bounceAnim : scaleAnim }],
                    },
                  ]}
                >
                  {/* Icon Background Gradient */}
                  {isActive && (
                    <LinearGradient
                      colors={[
                        item.color + "40",
                        item.color + "20",
                        "transparent",
                      ]}
                      style={styles.iconGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    />
                  )}

                  {/* Lucide Icon */}
                  <IconComponent
                    size={isActive ? 24 : 22}
                    color={isActive ? item.color : Colors.textSecondary}
                    strokeWidth={isActive ? 2.5 : 2}
                  />

                  {/* Active Dot */}
                  {isActive && (
                    <Animated.View
                      style={[
                        styles.activeDot,
                        {
                          backgroundColor: item.color,
                          transform: [
                            {
                              scale: bounceAnim.interpolate({
                                inputRange: [0.9, 1, 1.1],
                                outputRange: [0.8, 1, 1.2],
                              }),
                            },
                          ],
                        },
                      ]}
                    />
                  )}
                </Animated.View>

                {/* Label */}
                <Animated.Text
                  style={[
                    styles.label,
                    {
                      color: isActive ? item.color : Colors.textSecondary,
                      opacity: isActive ? 1 : 0.7,
                      transform: [
                        {
                          translateY: isActive
                            ? bounceAnim.interpolate({
                                inputRange: [0.9, 1, 1.1],
                                outputRange: [2, 0, -2],
                              })
                            : 0,
                        },
                      ],
                    },
                  ]}
                  numberOfLines={1}
                >
                  {item.label}
                </Animated.Text>

                {/* Ripple Effect */}
                {isPressed && (
                  <View
                    style={[
                      styles.rippleEffect,
                      { backgroundColor: item.color + "20" },
                    ]}
                  />
                )}
              </Pressable>
            );
          })}
        </View>

        {/* Top Border Glow */}
        <LinearGradient
          colors={["transparent", Colors.primary + "10", "transparent"]}
          style={styles.topGlow}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        />
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: -10,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  blurBackground: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.2)",
    borderLeftWidth: 1,
    borderLeftColor: "rgba(255, 255, 255, 0.1)",
    borderRightWidth: 1,
    borderRightColor: "rgba(255, 255, 255, 0.1)",
    backgroundColor: "rgba(255, 255, 255, 0.85)",
  },
  navItemsContainer: {
    flexDirection: "row",
    paddingHorizontal: Spacing.sm,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  navItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.sm,
    position: "relative",
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
    position: "relative",
    borderWidth: 1.5,
    borderColor: "transparent",
    backgroundColor: "rgba(255, 255, 255, 0.6)",
  },
  iconContainerActive: {
    borderColor: "rgba(255, 255, 255, 0.3)",
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  iconContainerPressed: {
    transform: [{ scale: 0.92 }],
  },
  iconGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 26,
  },
  activeDot: {
    position: "absolute",
    bottom: 6,
    width: 6,
    height: 6,
    borderRadius: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  label: {
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
    letterSpacing: 0.3,
    maxWidth: "90%",
  },
  activeIndicator: {
    position: "absolute",
    top: 12,
    width: NAV_ITEM_WIDTH - 24,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    marginHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  glowEffect: {
    width: "70%",
    height: "70%",
    borderRadius: 20,
    opacity: 0.5,
  },
  rippleEffect: {
    position: "absolute",
    width: 64,
    height: 64,
    borderRadius: 32,
    opacity: 0.8,
  },
  topGlow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    opacity: 0.5,
  },
  safeArea: {
    backgroundColor: Colors.surface,
    height: 34,
  },
});
