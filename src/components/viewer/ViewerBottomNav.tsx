import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { usePathname, useRouter } from "expo-router";
import {
  BriefcaseBusiness,
  Home,
  LayoutDashboard,
  Receipt,
  UsersRound,
} from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useKeyboardVisible } from "../../hooks/useKeyboardVisible";
import { Colors, Spacing } from "../../theme";

const NAV_ITEMS = [
  {
    label: "Home",
    icon: LayoutDashboard,
    path: "/(viewer)",
    color: "#4A6FA5",
  },
  {
    label: "Inventory",
    icon: Home,
    path: "/(viewer)/inventory",
    color: "#6366F1",
  },
  {
    label: "Customers",
    icon: UsersRound,
    path: "/(viewer)/customers",
    color: "#10B981",
  },
  {
    label: "Expenses",
    icon: Receipt,
    path: "/(viewer)/expenses",
    color: "#F59E0B",
  },
  {
    label: "Labours",
    icon: BriefcaseBusiness,
    path: "/(viewer)/labours",
    color: "#8B5CF6",
  },
];

export default function ViewerBottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const navItemWidth = width / NAV_ITEMS.length;
  const isKeyboardVisible = useKeyboardVisible();

  const [activeIndex, setActiveIndex] = useState(0);
  const [pressedIndex, setPressedIndex] = useState<number | null>(null);

  /* Animations */
  const indicatorAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const bounceAnim = useRef(new Animated.Value(1)).current;

  const animateToIndex = useCallback((index: number) => {
    Animated.spring(indicatorAnim, {
      toValue: index * navItemWidth,
      useNativeDriver: true,
      tension: 150,
      friction: 15,
    }).start();

    Animated.sequence([
      Animated.timing(bounceAnim, {
        toValue: 0.9,
        duration: 100,
        easing: Easing.ease,
        useNativeDriver: true,
      }),
      Animated.timing(bounceAnim, {
        toValue: 1.1,
        duration: 150,
        easing: Easing.ease,
        useNativeDriver: true,
      }),
      Animated.timing(bounceAnim, {
        toValue: 1,
        duration: 100,
        easing: Easing.ease,
        useNativeDriver: true,
      }),
    ]).start(() => setActiveIndex(index));
  }, [bounceAnim, indicatorAnim, navItemWidth]);

  /* Sync active tab with route */
  useEffect(() => {
    const index = NAV_ITEMS.findIndex((item) => pathname.startsWith(item.path));

    if (index !== -1 && index !== activeIndex) {
      animateToIndex(index);
    }
  }, [activeIndex, animateToIndex, pathname]);

  const handleNavigation = (index: number, path: string) => {
    if (pathname === path) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPressedIndex(null);

    router.replace(path as any);
    animateToIndex(index);
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

  useEffect(() => {
    indicatorAnim.setValue(activeIndex * navItemWidth);
  }, [activeIndex, indicatorAnim, navItemWidth]);

  if (isKeyboardVisible) return null;

  return (
    <View style={styles.container}>
      <BlurView intensity={90} tint="light" style={styles.blurBackground}>
        {/* Active Indicator */}
        <Animated.View
          style={[
            styles.activeIndicator,
            {
              transform: [{ translateX: indicatorAnim }],
              width: navItemWidth - 24,
              backgroundColor: NAV_ITEMS[activeIndex]?.color + "20",
              borderColor: NAV_ITEMS[activeIndex]?.color + "40",
            },
          ]}
        >
          <View
            style={[
              styles.glowEffect,
              {
                backgroundColor: NAV_ITEMS[activeIndex]?.color + "20",
              },
            ]}
          />
        </Animated.View>

        {/* Tabs */}
        <View
          style={[
            styles.navItemsContainer,
            { paddingBottom: Spacing.lg + Math.max(0, insets.bottom - 8) },
          ]}
        >
          {NAV_ITEMS.map((item, index) => {
            const IconComponent = item.icon;
            const isActive = activeIndex === index;
            const isPressed = pressedIndex === index;

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
                  {isActive && (
                    <LinearGradient
                      colors={[
                        item.color + "40",
                        item.color + "20",
                        "transparent",
                      ]}
                      style={styles.iconGradient}
                    />
                  )}

                  <IconComponent
                    size={isActive ? 24 : 22}
                    color={isActive ? item.color : Colors.textSecondary}
                    strokeWidth={isActive ? 2.5 : 2}
                  />

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

                <Animated.Text
                  numberOfLines={1}
                  style={[
                    styles.label,
                    {
                      color: isActive ? item.color : Colors.textSecondary,
                      opacity: isActive ? 1 : 0.7,
                    },
                  ]}
                >
                  {item.label}
                </Animated.Text>

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

        <LinearGradient
          colors={["transparent", Colors.primary + "10", "transparent"]}
          style={styles.topGlow}
        />
      </BlurView>
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    width: "100%",
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
});
