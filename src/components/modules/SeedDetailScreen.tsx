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

type SeedImageItem = {
  uri: string;
  imageId: string | null;
  canDelete: boolean;
};

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

  const deleteMutation = useMutation({
    mutationFn: (imageId: string) => {
      if (!id || !imageId) throw new Error("Seed id or image id missing");
      return UploadService.deleteSeedImage(id, imageId);
    },
    onSuccess: async () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSelectedImage(null);
      await queryClient.invalidateQueries({ queryKey: ["seeds"] });
      await queryClient.invalidateQueries({ queryKey: ["seed", id] });
      await refetch();
      Alert.alert("Removed", "Seed image removed successfully.");
    },
    onError: (e: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Delete Failed", formatErrorMessage(e));
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

  const imageItems = useMemo(() => {
    const map = new Map<string, SeedImageItem>();
    const upsert = (entry: SeedImageItem) => {
      if (!entry.uri) return;
      const existing = map.get(entry.uri);
      if (!existing) {
        map.set(entry.uri, entry);
        return;
      }

      if (!existing.imageId && entry.imageId) {
        map.set(entry.uri, entry);
      }
    };

    const seedMain = toImageUrl(seed?.imageUrl);
    if (seedMain) {
      upsert({ uri: seedMain, imageId: null, canDelete: false });
    }

    const plantMain = toImageUrl(seed?.plantType?.imageUrl);
    if (plantMain) {
      upsert({ uri: plantMain, imageId: null, canDelete: false });
    }

    const seedImages = Array.isArray(seed?.images) ? seed.images : [];
    for (const image of seedImages) {
      const uri = toImageUrl(
        image?.url ?? image?.path ?? image?.fileUrl ?? image?.fileName,
      );
      if (!uri) continue;

      const imageId =
        (typeof image?._id === "string" && image._id) ||
        (typeof image?.id === "string" && image.id) ||
        (typeof image?.imageId === "string" && image.imageId) ||
        null;

      upsert({ uri, imageId, canDelete: Boolean(imageId) });
    }

    const plantImages = Array.isArray(seed?.plantType?.images)
      ? seed.plantType.images
      : [];
    for (const image of plantImages) {
      const uri = toImageUrl(
        image?.url ?? image?.path ?? image?.fileUrl ?? image?.fileName,
      );
      if (!uri) continue;
      upsert({ uri, imageId: null, canDelete: false });
    }

    return Array.from(map.values());
  }, [seed]);

  const displayImage = selectedImage || imageItems[0]?.uri || null;
  const selectedImageItem = imageItems.find((image) => image.uri === displayImage) ?? null;
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

  const handleDeleteImage = (image: SeedImageItem) => {
    if (!image.imageId) {
      Alert.alert(
        "Cannot Remove",
        "This image is not seed-owned and cannot be removed here.",
      );
      return;
    }
    if (deleteMutation.isPending) {
      Alert.alert("Please wait", "An image operation is already in progress.");
      return;
    }

    Alert.alert("Remove Image", "Delete this seed image permanently?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          deleteMutation.mutate(image.imageId as string);
        },
      },
    ]);
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

          {canUpload && selectedImageItem?.canDelete && (
            <Pressable
              onPress={() => handleDeleteImage(selectedImageItem)}
              disabled={deleteMutation.isPending || uploadMutation.isPending}
              style={[
                styles.removeHeroButton,
                (deleteMutation.isPending || uploadMutation.isPending) && styles.buttonDisabled,
              ]}
            >
              {deleteMutation.isPending ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <>
                  <MaterialIcons name="delete" size={14} color={Colors.white} />
                  <Text style={styles.removeHeroButtonText}>Remove</Text>
                </>
              )}
            </Pressable>
          )}

          {imageItems.length > 1 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.thumbnailRow}
            >
              {imageItems.map((image) => (
                <View key={`${image.uri}-${image.imageId ?? "base"}`} style={styles.thumbnailCard}>
                  <TouchableOpacity
                    onPress={() => setSelectedImage(image.uri)}
                    style={[
                      styles.thumbnailWrap,
                      selectedImage === image.uri && styles.thumbnailWrapSelected,
                    ]}
                    activeOpacity={0.8}
                  >
                    <Image source={{ uri: image.uri }} style={styles.thumbnail} />
                  </TouchableOpacity>
                  {canUpload && image.canDelete && (
                    <Pressable
                      onPress={() => handleDeleteImage(image)}
                      disabled={deleteMutation.isPending || uploadMutation.isPending}
                      style={styles.thumbnailDeleteButton}
                    >
                      <MaterialIcons name="close" size={12} color={Colors.white} />
                    </Pressable>
                  )}
                </View>
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
                  (!pendingFile || uploadMutation.isPending || deleteMutation.isPending) &&
                    styles.buttonDisabled,
                ]}
                disabled={!pendingFile || uploadMutation.isPending || deleteMutation.isPending}
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
    position: "relative" as const,
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
  thumbnailCard: {
    position: "relative" as const,
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
  thumbnailDeleteButton: {
    position: "absolute" as const,
    top: -6,
    right: -6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.error,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderWidth: 1,
    borderColor: Colors.white,
  },
  removeHeroButton: {
    position: "absolute" as const,
    right: 10,
    bottom: 10,
    backgroundColor: Colors.error,
    borderRadius: 16,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
  },
  removeHeroButtonText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: "600" as const,
  },
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
