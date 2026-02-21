import { MaterialIcons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import EntityThumbnail from "../../../components/ui/EntityThumbnail";
import { PlantTypeService } from "../../../services/plant-type.service";
import { Colors, Spacing } from "../../../theme";

const formatCurrency = (amount: number) => `₹${amount.toLocaleString("en-IN")}`;

export default function PlantTypeDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const { data, isLoading, error } = useQuery({
    queryKey: ["plant-type", id],
    queryFn: () => PlantTypeService.getById(id as string),
    enabled: Boolean(id),
  });

  const plantType = (data as any)?.data ?? data ?? null;

  if (!id) {
    return (
      <SafeAreaView style={styles.container} edges={["left", "right"]}>
        <View style={styles.emptyContainer}>
          <MaterialIcons name="info" size={56} color={Colors.textSecondary} />
          <Text style={styles.emptyTitle}>Plant Type Not Selected</Text>
          <Text style={styles.emptyMessage}>
            Open a plant type from the list to view details.
          </Text>
          <Pressable
            onPress={() => router.replace("/(admin)/plants")}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonText}>Go to Plant Types</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={["left", "right"]}>
        <LinearGradient
          colors={[Colors.primary, Colors.primaryLight || Colors.primary]}
          style={styles.headerGradient}
        >
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={20} color={Colors.white} />
          </Pressable>
          <View style={styles.headerText}>
            <Text style={styles.title}>Plant Type Details</Text>
            <Text style={styles.subtitle}>Loading details...</Text>
          </View>
          <View style={styles.headerSpacer} />
        </LinearGradient>

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading plant type...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !plantType) {
    return (
      <SafeAreaView style={styles.container} edges={["left", "right"]}>
        <LinearGradient
          colors={[Colors.primary, Colors.primaryLight || Colors.primary]}
          style={styles.headerGradient}
        >
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={20} color={Colors.white} />
          </Pressable>
          <View style={styles.headerText}>
            <Text style={styles.title}>Plant Type Details</Text>
            <Text style={styles.subtitle}>Unable to load data</Text>
          </View>
          <View style={styles.headerSpacer} />
        </LinearGradient>

        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={64} color={Colors.error} />
          <Text style={styles.errorTitle}>Failed to Load Plant Type</Text>
          <Text style={styles.errorMessage}>
            Unable to fetch plant type details. Please try again.
          </Text>
          <Pressable onPress={() => router.back()} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const price = Number(plantType.sellingPrice ?? 0);
  const lifecycleDays = Number(plantType.lifecycleDays ?? 0);

  return (
    <SafeAreaView style={styles.container} edges={["left", "right"]}>
      <LinearGradient
        colors={[Colors.primary, Colors.primaryLight || Colors.primary]}
        style={styles.headerGradient}
      >
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={20} color={Colors.white} />
        </Pressable>
        <EntityThumbnail
          uri={plantType.imageUrl}
          label={plantType.name}
          size={48}
          iconName="local-florist"
        />
        <View style={styles.headerText}>
          <Text style={styles.title}>{plantType.name || "Plant Type"}</Text>
          <Text style={styles.subtitle}>Plant type details</Text>
        </View>
        <View style={styles.headerSpacer} />
      </LinearGradient>

      <View style={styles.content}>
        <View style={styles.card}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Category</Text>
            <Text style={styles.detailValue}>
              {plantType.category || "—"}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Variety</Text>
            <Text style={styles.detailValue}>{plantType.variety || "—"}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Lifecycle Days</Text>
            <Text style={styles.detailValue}>
              {lifecycleDays > 0 ? `${lifecycleDays} days` : "—"}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Selling Price</Text>
            <Text style={styles.detailValue}>
              {price > 0 ? formatCurrency(price) : "—"}
            </Text>
          </View>
        </View>

        <View style={styles.actionsContainer}>
          <Pressable
            onPress={() =>
              router.push({ pathname: "/(admin)/plants/edit", params: { id } })
            }
            style={styles.secondaryButton}
          >
            <MaterialIcons name="edit" size={18} color={Colors.primary} />
            <Text style={styles.secondaryButtonText}>Edit</Text>
          </Pressable>

          <Pressable
            onPress={() =>
              router.push({
                pathname: "/(admin)/plants/upload-image",
                params: { id },
              })
            }
            style={styles.secondaryButton}
          >
            <MaterialIcons name="image" size={18} color={Colors.info} />
            <Text style={[styles.secondaryButtonText, { color: Colors.info }]}
            >
              Upload Image
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = {
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerGradient: {
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: Spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.white + "20",
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  headerText: {
    flex: 1,
  },
  headerSpacer: {
    width: 40,
  },
  title: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: Colors.white,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.white,
    opacity: 0.9,
  },
  content: {
    padding: Spacing.lg,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: Spacing.lg,
  },
  detailRow: {
    marginBottom: Spacing.md,
  },
  detailLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
    textTransform: "uppercase" as const,
    letterSpacing: 0.6,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: Colors.text,
  },
  actionsContainer: {
    flexDirection: "row" as const,
    gap: Spacing.sm,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  secondaryButtonText: {
    fontWeight: "600" as const,
    color: Colors.primary,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingBottom: 80,
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: 16,
    color: Colors.textSecondary,
    fontWeight: "500" as const,
  },
  errorContainer: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    padding: Spacing.xl,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: Colors.text,
    marginTop: Spacing.md,
  },
  errorMessage: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center" as const,
    marginTop: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: 12,
  },
  primaryButtonText: {
    color: Colors.white,
    fontWeight: "600" as const,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    padding: Spacing.xl,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600" as const,
    color: Colors.text,
    marginTop: Spacing.md,
  },
  emptyMessage: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center" as const,
    marginTop: Spacing.sm,
    marginBottom: Spacing.lg,
  },
};
