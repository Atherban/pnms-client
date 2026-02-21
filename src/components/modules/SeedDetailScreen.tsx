import { MaterialIcons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { SeedService } from "../../services/seed.service";
import { UploadService } from "../../services/upload.service";
import { Colors, Spacing } from "../../theme";
import { formatErrorMessage } from "../../utils/error";
import { toImageUrl } from "../../utils/image";

const BOTTOM_NAV_HEIGHT = 80;

interface SeedDetailScreenProps {
  id?: string;
  title?: string;
  routeGroup?: "staff" | "admin" | "viewer";
  canUpload?: boolean;
}

const formatDate = (date?: string) => {
  if (!date) return "—";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const toNumber = (value: unknown) => Number(value ?? 0) || 0;

export function SeedDetailScreen({
  id,
  title = "Seed Details",
  canUpload = false,
}: SeedDetailScreenProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<{
    uri: string;
    name: string;
    type: string;
  } | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["seed", id],
    queryFn: () => SeedService.getById(id as string),
    enabled: Boolean(id),
  });

  const uploadMutation = useMutation({
    mutationFn: () => {
      if (!id || !pendingFile) {
        throw new Error("Seed or image is missing");
      }
      return UploadService.uploadSeedImage(id, pendingFile);
    },
    onSuccess: async () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setPendingFile(null);
      await queryClient.invalidateQueries({ queryKey: ["seeds"] });
      await queryClient.invalidateQueries({ queryKey: ["seed", id] });
      await refetch();
      Alert.alert("Uploaded", "Seed image uploaded successfully.");
    },
    onError: (e: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Upload Failed", formatErrorMessage(e));
    },
  });

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const seed = useMemo(() => {
    if (!data || typeof data !== "object") return null;
    return (data as any)?.data && typeof (data as any).data === "object"
      ? (data as any).data
      : (data as any);
  }, [data]);

  const imageUrls = useMemo(() => {
    const urls = new Set<string>();
    const push = (value?: string | null) => {
      const resolved = toImageUrl(value);
      if (resolved) urls.add(resolved);
    };

    push(seed?.imageUrl);
    push(seed?.plantType?.imageUrl);

    const seedImages = Array.isArray(seed?.images) ? seed.images : [];
    const plantImages = Array.isArray(seed?.plantType?.images)
      ? seed.plantType.images
      : [];

    for (const image of [...seedImages, ...plantImages]) {
      push(image?.url ?? image?.path ?? image?.fileUrl ?? image?.fileName);
    }

    return Array.from(urls);
  }, [seed]);

  const displayImage = selectedImage || imageUrls[0] || null;
  const totalPurchased = toNumber(seed?.totalPurchased);
  const seedsUsed = toNumber(seed?.seedsUsed);
  const available = Math.max(
    0,
    totalPurchased - seedsUsed - toNumber(seed?.discardedSeeds),
  );
  const isExpired = (() => {
    if (!seed?.expiryDate) return false;
    const d = new Date(seed.expiryDate);
    if (Number.isNaN(d.getTime())) return false;
    return d.getTime() < Date.now();
  })();

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission Required", "Please allow photo access.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });

    if (result.canceled) return;
    const asset = result.assets[0];

    setPendingFile({
      uri: asset.uri,
      name: asset.fileName ?? "seed.jpg",
      type: asset.mimeType ?? "image/jpeg",
    });
  };

  if (!id) {
    return (
      <SafeAreaView style={styles.center} edges={["left", "right"]}>
        <Text style={styles.errorText}>Missing seed id.</Text>
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.center} edges={["left", "right"]}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading seed details...</Text>
      </SafeAreaView>
    );
  }

  if (error || !seed) {
    return (
      <SafeAreaView style={styles.container} edges={["left", "right"]}>
        <View style={styles.headerWrap}>
          <Pressable onPress={handleBack} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={20} color={Colors.white} />
          </Pressable>
          <Text style={styles.headerTitle}>{title}</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.center}>
          <MaterialIcons name="error-outline" size={52} color={Colors.error} />
          <Text style={styles.errorText}>
            {(error as any)?.message || "Unable to load seed details."}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["left", "right"]}>
      <LinearGradient
        colors={[Colors.primary, Colors.primaryLight || Colors.primary]}
        style={styles.headerWrap}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <Pressable onPress={handleBack} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={20} color={Colors.white} />
        </Pressable>
        <Text style={styles.headerTitle}>{title}</Text>
        <Pressable onPress={() => refetch()} style={styles.backButton}>
          <MaterialIcons name="refresh" size={20} color={Colors.white} />
        </Pressable>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.card}>
          <View style={styles.heroImageWrap}>
            {displayImage ? (
              <Image source={{ uri: displayImage }} style={styles.heroImage} />
            ) : (
              <View style={styles.heroFallback}>
                <MaterialIcons name="grass" size={40} color={Colors.primary} />
              </View>
            )}
          </View>

          {imageUrls.length > 1 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.thumbnailRow}
            >
              {imageUrls.map((uri) => (
                <TouchableOpacity
                  key={uri}
                  onPress={() => setSelectedImage(uri)}
                  style={[
                    styles.thumbnailWrap,
                    selectedImage === uri && styles.thumbnailWrapSelected,
                  ]}
                  activeOpacity={0.8}
                >
                  <Image source={{ uri }} style={styles.thumbnail} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.name}>{seed.name || "Seed"}</Text>
          <Text style={styles.meta}>
            {seed.plantType?.name || seed.category || "Uncategorized"}
          </Text>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Purchased</Text>
              <Text style={styles.statValue}>{totalPurchased}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Used</Text>
              <Text style={styles.statValue}>{seedsUsed}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Available</Text>
              <Text style={styles.statValue}>{available}</Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailKey}>Supplier</Text>
            <Text style={styles.detailValue}>{seed.supplierName || "—"}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailKey}>Purchase Date</Text>
            <Text style={styles.detailValue}>{formatDate(seed.purchaseDate)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailKey}>Expiry Date</Text>
            <Text
              style={[
                styles.detailValue,
                isExpired && { color: Colors.error, fontWeight: "600" as const },
              ]}
            >
              {formatDate(seed.expiryDate)}
            </Text>
          </View>
        </View>

        {canUpload && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Upload Seed Image</Text>

            {pendingFile ? (
              <Image source={{ uri: pendingFile.uri }} style={styles.pendingPreview} />
            ) : (
              <View style={styles.pendingPlaceholder}>
                <Text style={styles.pendingPlaceholderText}>No image selected</Text>
              </View>
            )}

            <View style={styles.uploadActions}>
              <TouchableOpacity
                onPress={pickImage}
                style={styles.secondaryButton}
                activeOpacity={0.8}
              >
                <Text style={styles.secondaryButtonText}>Choose Image</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => uploadMutation.mutate()}
                style={[
                  styles.primaryButton,
                  (!pendingFile || uploadMutation.isPending) && styles.buttonDisabled,
                ]}
                disabled={!pendingFile || uploadMutation.isPending}
                activeOpacity={0.8}
              >
                {uploadMutation.isPending ? (
                  <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                  <Text style={styles.primaryButtonText}>Upload</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = {
  container: { flex: 1, backgroundColor: Colors.background },
  center: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    padding: Spacing.lg,
  },
  loadingText: { marginTop: Spacing.sm, color: Colors.textSecondary },
  errorText: { color: Colors.error, textAlign: "center" as const, marginTop: 8 },
  headerWrap: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
  },
  headerTitle: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: "700" as const,
  },
  headerSpacer: { width: 40 },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: BOTTOM_NAV_HEIGHT + Spacing.xl,
    gap: Spacing.md,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    padding: Spacing.md,
  },
  heroImageWrap: {
    borderRadius: 12,
    overflow: "hidden" as const,
    backgroundColor: Colors.surface,
  },
  heroImage: {
    width: "100%" as const,
    height: 210,
    resizeMode: "cover" as const,
  },
  heroFallback: {
    width: "100%" as const,
    height: 210,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: Colors.surface,
  },
  thumbnailRow: {
    gap: 8,
    paddingTop: 10,
  },
  thumbnailWrap: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    overflow: "hidden" as const,
  },
  thumbnailWrapSelected: {
    borderColor: Colors.primary,
    borderWidth: 2,
  },
  thumbnail: { width: 62, height: 62 },
  name: {
    color: Colors.text,
    fontSize: 20,
    fontWeight: "700" as const,
    marginBottom: 2,
  },
  meta: { color: Colors.textSecondary, marginBottom: 12 },
  statsRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  statItem: { flex: 1, alignItems: "center" as const },
  statLabel: { fontSize: 12, color: Colors.textSecondary },
  statValue: {
    marginTop: 2,
    fontSize: 16,
    fontWeight: "700" as const,
    color: Colors.text,
  },
  statDivider: { width: 1, height: 34, backgroundColor: Colors.borderLight },
  detailRow: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    paddingVertical: 8,
  },
  detailKey: { color: Colors.textSecondary, fontSize: 13 },
  detailValue: { color: Colors.text, fontSize: 13, fontWeight: "500" as const },
  sectionTitle: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: "700" as const,
    marginBottom: 10,
  },
  pendingPreview: {
    width: "100%" as const,
    height: 160,
    borderRadius: 10,
    marginBottom: 12,
  },
  pendingPlaceholder: {
    width: "100%" as const,
    height: 120,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginBottom: 12,
    backgroundColor: Colors.surface,
  },
  pendingPlaceholderText: { color: Colors.textSecondary, fontSize: 13 },
  uploadActions: {
    flexDirection: "row" as const,
    gap: 10,
  },
  secondaryButton: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    height: 42,
  },
  secondaryButtonText: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: "600" as const,
  },
  primaryButton: {
    flex: 1,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    height: 42,
  },
  primaryButtonText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: "600" as const,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
} as const;
