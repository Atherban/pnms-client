import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { usePathname, useRouter } from "expo-router";
import type { LucideIcon } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useKeyboardVisible } from "../../hooks/useKeyboardVisible";
import { Colors, Spacing } from "../../theme";

export type NavItem = {
  label: string;
  icon: LucideIcon;
  path: string;
  color: string;
};

export const CUSTOMER_BOTTOM_NAV_HEIGHT = 72;
export const SHARED_BOTTOM_NAV_HEIGHT = CUSTOMER_BOTTOM_NAV_HEIGHT;

type SharedBottomNavProps = {
  items: NavItem[];
};

// Animation constants - optimized for instant response
const SPRING_CONFIG = {
  tension: 300,
  friction: 25,
  useNativeDriver: true,
};

const PRESS_SPRING = {
  tension: 400,
  friction: 20,
  useNativeDriver: true,
};

export default function SharedBottomNav({ items }: SharedBottomNavProps) {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const navItemWidth = width / Math.max(1, items.length);
  const isKeyboardVisible = useKeyboardVisible();

  const [activeIndex, setActiveIndex] = useState(0);
  const [pressedIndex, setPressedIndex] = useState<number | null>(null);

  // Animations - initialized with current values
  const indicatorAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const bounceAnim = useRef(new Animated.Value(1)).current;
  const labelScaleAnim = useRef(new Animated.Value(1)).current;

  // Instant indicator positioning
  useEffect(() => {
    if (activeIndex !== null) {
      Animated.spring(indicatorAnim, {
        toValue: activeIndex * navItemWidth,
        ...SPRING_CONFIG,
      }).start();
    }
  }, [activeIndex, indicatorAnim, navItemWidth]);

  // Find active index based on path
  useEffect(() => {
    const index = items.reduce((best, item, idx) => {
      if (!pathname.startsWith(item.path)) return best;
      if (best === -1) return idx;
      return item.path.length > items[best].path.length ? idx : best;
    }, -1);

    if (index !== -1 && index !== activeIndex) {
      setActiveIndex(index);
    }
  }, [pathname, items, activeIndex]);

  const handlePressIn = (index: number) => {
    setPressedIndex(index);
    Animated.spring(scaleAnim, {
      toValue: 0.92,
      ...PRESS_SPRING,
    }).start();
    Animated.spring(labelScaleAnim, {
      toValue: 0.95,
      ...PRESS_SPRING,
    }).start();
  };

  const handlePressOut = () => {
    setPressedIndex(null);
    Animated.spring(scaleAnim, {
      toValue: 1,
      ...PRESS_SPRING,
    }).start();
    Animated.spring(labelScaleAnim, {
      toValue: 1,
      ...PRESS_SPRING,
    }).start();
  };

  const handleNavigation = (index: number, path: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPressedIndex(null);

    if (pathname !== path) {
      router.replace(path as any);
    }

    // Instant active state update
    setActiveIndex(index);

    // Quick bounce feedback
    Animated.sequence([
      Animated.spring(bounceAnim, {
        toValue: 0.85,
        tension: 400,
        friction: 15,
        useNativeDriver: true,
      }),
      Animated.spring(bounceAnim, {
        toValue: 1,
        tension: 300,
        friction: 20,
        useNativeDriver: true,
      }),
    ]).start();
  };

  if (!items.length || isKeyboardVisible) return null;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[Colors.primary, Colors.primaryDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientShell}
      >
        <BlurView intensity={5} tint="dark" style={styles.blurBackground}>
          {/* Top Highlight Line */}
          <LinearGradient
            colors={["rgba(255,255,255,0.08)", "rgba(255,255,255,0.5)", "rgba(255,255,255,0.08)"]}
            style={styles.topGlow}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          />

          {/* Animated Indicator */}
          <Animated.View
            style={[
              styles.activeIndicator,
              {
                transform: [{ translateX: indicatorAnim }],
                width: navItemWidth - 24,
              },
            ]}
          >
            <LinearGradient
              colors={[
                "rgba(255,255,255,0.34)",
                "rgba(255,255,255,0.14)",
              ]}
              style={styles.activeIndicatorGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
            <View
              style={[
                styles.activeIndicatorBorder,
                { borderColor: "rgba(255,255,255,0.28)" },
              ]}
            />
          </Animated.View>

          {/* Navigation Items */}
          <View
            style={[
              styles.navItemsContainer,
              { paddingBottom: Math.max(insets.bottom, Spacing.sm) },
            ]}
          >
            {items.map((item, index) => {
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
                  <View style={styles.iconWrapper}>
                    {/* Icon Background */}
                    <Animated.View
                      style={[
                        styles.iconBackground,
                        isActive && styles.iconBackgroundActive,
                        isActive && {
                          backgroundColor: "rgba(255,255,255,0.12)",
                          borderColor: "rgba(255,255,255,0.22)",
                        },
                        {
                          transform: [
                            { scale: isActive ? bounceAnim : scaleAnim },
                          ],
                        },
                      ]}
                    />

                    {/* Icon Container */}
                    <Animated.View
                      style={[
                        styles.iconContainer,
                        isActive && styles.iconContainerActive,
                        {
                          transform: [
                            { scale: isActive ? bounceAnim : scaleAnim },
                          ],
                        },
                      ]}
                    >
                      {/* Icon Shadow for Active State */}
                      {isActive && (
                        <View
                          style={[
                            styles.iconShadow,
                            { backgroundColor: "rgba(255,255,255,0.18)" },
                          ]}
                        />
                      )}

                      {/* Lucide Icon */}
                      <IconComponent
                        size={isActive ? 22 : 20}
                        color={isActive ? Colors.white : "rgba(255,255,255,0.72)"}
                        strokeWidth={isActive ? 2.2 : 1.8}
                      />

                      {/* Active Dot */}
                      {isActive && (
                        <View
                          style={[
                            styles.activeDot,
                            { backgroundColor: Colors.white },
                          ]}
                        />
                      )}
                    </Animated.View>

                    {/* Label */}
                    <Animated.Text
                      style={[
                        styles.label,
                        {
                          color: isActive ? Colors.white : "rgba(255,255,255,0.72)",
                          opacity: isActive ? 1 : 0.78,
                          transform: [
                            {
                              scale: isPressed ? labelScaleAnim : 1,
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
                      <Animated.View
                        style={[
                          styles.rippleEffect,
                          {
                            backgroundColor: "rgba(255,255,255,0.16)",
                            transform: [
                              {
                                scale: scaleAnim.interpolate({
                                  inputRange: [0.92, 1],
                                  outputRange: [1.2, 0.8],
                                }),
                              },
                            ],
                          },
                        ]}
                      />
                    )}
                  </View>
                </Pressable>
              );
            })}
          </View>

          {/* Bottom Shadow */}
          <LinearGradient
            colors={["rgba(0,0,0,0.12)", "transparent"]}
            style={styles.bottomShadow}
            start={{ x: 0, y: 1 }}
            end={{ x: 0, y: 0 }}
          />
        </BlurView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "transparent",
  },
  gradientShell: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    overflow: "hidden",
    shadowColor: Colors.primaryDark,
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 24,
  },
  blurBackground: {
    overflow: "hidden",
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.26)",
    borderLeftWidth: 1,
    borderLeftColor: "rgba(255, 255, 255, 0.12)",
    borderRightWidth: 1,
    borderRightColor: "rgba(255, 255, 255, 0.12)",
    backgroundColor: "rgba(11, 47, 22, 0.19)",
  },
  navItemsContainer: {
    flexDirection: "row",
    paddingHorizontal: Spacing.xs,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.xs,
  },
  navItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapper: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    width: "100%",
  },
  iconBackground: {
    position: "absolute",
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "transparent",
  },
  iconBackgroundActive: {
    borderWidth: 1.5,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
    position: "relative",
    backgroundColor: "rgba(255, 255, 255, 0.10)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.14)",
  },
  iconContainerActive: {
    backgroundColor: "rgba(255, 255, 255, 0.20)",
    borderColor: "rgba(255, 255, 255, 0.28)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  iconShadow: {
    position: "absolute",
    top: 8,
    left: 8,
    right: 8,
    bottom: 8,
    borderRadius: 18,
    opacity: 0.3,
  },
  activeDot: {
    position: "absolute",
    bottom: -2,
    width: 4,
    height: 4,
    borderRadius: 2,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
    elevation: 2,
  },
  label: {
    fontSize: 10,
    fontWeight: "500",
    textAlign: "center",
    letterSpacing: 0.2,
    maxWidth: "90%",
    marginTop: 0,
  },
  activeIndicator: {
    position: "absolute",
    top: 6,
    // height: 48,
    borderRadius: 24,
    marginHorizontal: 12,
    // alignItems: "center",
    // justifyContent: "center",
    // overflow: "hidden",
  },
  activeIndicatorGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  activeIndicatorBorder: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 24,
    borderWidth: 1.2,
  },
  rippleEffect: {
    position: "absolute",
    width: 56,
    height: 56,
    borderRadius: 28,
    opacity: 0.5,
  },
  topGlow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1.5,
    opacity: 0.7,
  },
  bottomShadow: {
    position: "absolute",
    bottom: -8,
    left: 0,
    right: 0,
    height: 16,
    opacity: 0.4,
  },
});
