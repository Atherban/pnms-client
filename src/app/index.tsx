import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Redirect, useRouter } from "expo-router";
import { useRef, useState } from "react";
import {
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthStore } from "../stores/auth.store";
import { Colors } from "../theme";
import { AdminTheme } from "../components/admin/theme";
import { StatusBar } from "expo-status-bar";

const ONBOARDING_CARDS = [
  {
    title: "Grow Better Nursery Operations",
    subtitle: "Track inventory, sales, and staff workflows in one streamlined system.",
  },
  {
    title: "Every Plant, Properly Managed",
    subtitle: "Organize seed batches, germination, and stock movement without manual chaos.",
  },
  {
    title: "From Nursery to Customer, Faster",
    subtitle: "Manage orders, payments, and customer records with clarity and control.",
  },
];

const resolveLandingRoute = (role?: string) => {
  if (role === "SUPER_ADMIN") return "/(super-admin)";
  if (role === "NURSERY_ADMIN") return "/(admin)";
  if (role === "STAFF") return "/(staff)";
  if (role === "CUSTOMER") return "/unauthorized";
  return "/unauthorized";
};

export default function OnboardingScreen() {
  const router = useRouter();
  const scrollerRef = useRef<ScrollView>(null);
  const { width } = useWindowDimensions();
  const [activeIndex, setActiveIndex] = useState(0);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const role = useAuthStore((s) => s.user?.role);

  if (isAuthenticated && role) {
    return <Redirect href={resolveLandingRoute(role) as any} />;
  }

  const goToLogin = () => router.push("/(auth)/login");

  const handleContinue = () => {
    if (activeIndex === ONBOARDING_CARDS.length - 1) {
      goToLogin();
      return;
    }
    const nextIndex = activeIndex + 1;
    scrollerRef.current?.scrollTo({ x: nextIndex * width, animated: true });
    setActiveIndex(nextIndex);
  };

  return (
    <View style={styles.root}>
      
      <ImageBackground
        source={require("../../assets/images/onboarding.png")}
        style={styles.backgroundImage}
      >
        <LinearGradient
          colors={["rgba(0,0,0,0.18)", "rgba(0,0,0,0.10)", "rgba(0,0,0,0.82)"]}
          locations={[0, 0.45, 1]}
          style={styles.overlay}
        />

        <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
          <View style={styles.content}>
            <ScrollView
              ref={scrollerRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(event) => {
                const index = Math.round(event.nativeEvent.contentOffset.x / width);
                setActiveIndex(index);
              }}
            >
              {ONBOARDING_CARDS.map((card) => (
                <View key={card.title} style={[styles.slide, { width }]}> 
                  <Text style={styles.title}>{card.title}</Text>
                  <Text style={styles.subtitle}>{card.subtitle}</Text>
                </View>
              ))}
            </ScrollView>

            <View style={styles.footer}>
              <View style={styles.dotsRow}>
                {ONBOARDING_CARDS.map((card, index) => (
                  <View key={card.title} style={[styles.dot, activeIndex === index && styles.dotActive]} />
                ))}
              </View>

              <Pressable onPress={handleContinue} style={({ pressed }) => [styles.ctaButton, pressed && styles.ctaButtonPressed]}>
                <Text style={styles.ctaText}>{activeIndex === ONBOARDING_CARDS.length - 1 ? "Get Started" : "Next"}</Text>
                <MaterialIcons name="arrow-forward" size={24} color={Colors.white} />
              </Pressable>

              <Pressable onPress={goToLogin} style={styles.signInLink}>
                <Text style={styles.signInText}>
                  Already have an account? <Text style={styles.signInTextStrong}>Sign In</Text>
                </Text>
              </Pressable>
            </View>
          </View>
        </SafeAreaView>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.black },
  backgroundImage: { flex: 1 },
  overlay: { ...StyleSheet.absoluteFillObject },
  safeArea: { flex: 1 },
  content: { flex: 1, justifyContent: "flex-end", paddingBottom: 24 },
  slide: { justifyContent: "flex-end", paddingHorizontal: 28 },
  title: { color: Colors.white, fontSize: 54, lineHeight: 58, fontWeight: "800", letterSpacing: -1, maxWidth: 340 },
  subtitle: { color: "rgba(255,255,255,0.84)", fontSize: 18, lineHeight: 28, marginTop: 14, maxWidth: 340, fontWeight: "500" },
  footer: { marginTop: 32, paddingHorizontal: 24 },
  dotsRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 22 },
  dot: { width: 8, height: 8, borderRadius: 8, backgroundColor: "rgba(255,255,255,0.35)" },
  dotActive: { width: 40, backgroundColor: Colors.white },
  ctaButton: {
    backgroundColor: AdminTheme.colors.primary,
    borderRadius: 24,
    height: 64,
    paddingHorizontal: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  ctaButtonPressed: { opacity: 0.9 },
  ctaText: { color: Colors.white, fontSize: 22, fontWeight: "700", letterSpacing: -0.3 },
  signInLink: { alignItems: "center", marginTop: 24, marginBottom: 6 },
  signInText: { color: "rgba(255,255,255,0.72)", fontSize: 17, fontWeight: "500" },
  signInTextStrong: { color: Colors.white, fontWeight: "700" },
});
