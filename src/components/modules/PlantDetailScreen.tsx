import { MaterialIcons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
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
import { PlantTypeService } from "../../services/plant-type.service";
import { UploadService } from "../../services/upload.service";
import { useAuthStore } from "../../stores/auth.store";
import { formatErrorMessage } from "../../utils/error";
import { toImageUrl } from "../../utils/image";
import { canViewSensitivePricing } from "../../utils/rbac";
import { AdminTheme } from "../admin/theme";
import StitchHeader from "../common/StitchHeader";

const BOTTOM_NAV_HEIGHT = 80;

interface PlantDetailScreenProps {
  id?: string;
  title?: string;
  canUpload?: boolean;
}

type PlantImageItem = {
  uri: string;
  imageId: string | null;
  canDelete: boolean;
};

const formatCurrency = (value?: number) => {
  if (!value || Number.isNaN(Number(value))) return "—";
  return `₹${Number(value).toLocaleString("en-IN")}`;
};

const formatEnumLabel = (value?: string) => {
  if (!value) return "—";
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

export function PlantDetailScreen({
  id,
  title = "Plant Details",
  canUpload = false,
}: PlantDetailScreenProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const role = useAuthStore((state) => state.user?.role);
  const showSensitivePricing = canViewSensitivePricing(role);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<{
    uri: string;
    name: string;
    type: string;
  } | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["plant-type", id],
    queryFn: () => PlantTypeService.getById(id as string),
    enabled: Boolean(id),
  });

  const uploadMutation = useMutation({
    mutationFn: () => {
      if (!id || !pendingFile) throw new Error("Plant id or image missing");
      return UploadService.uploadPlantTypeImage(id, pendingFile);
    },
    onSuccess: async () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setPendingFile(null);
      await queryClient.invalidateQueries({ queryKey: ["plant-types"] });
      await queryClient.invalidateQueries({ queryKey: ["plant-type", id] });
      await refetch();
      Alert.alert("Uploaded", "Plant image uploaded successfully.");
    },
    onError: (e: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Upload Failed", formatErrorMessage(e));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (imageId: string) => {
      if (!id || !imageId) throw new Error("Plant id or image id missing");
      return UploadService.deletePlantTypeImage(id, imageId);
    },
    onSuccess: async () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSelectedImage(null);
      await queryClient.invalidateQueries({ queryKey: ["plant-types"] });
      await queryClient.invalidateQueries({ queryKey: ["plant-type", id] });
      await refetch();
      Alert.alert("Removed", "Plant image removed successfully.");
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

  const item = useMemo(() => {
    if (!data || typeof data !== "object") return null;
    return (data as any)?.data && typeof (data as any).data === "object"
      ? (data as any).data
      : (data as any);
  }, [data]);

  const imageItems = useMemo(() => {
    const map = new Map<string, PlantImageItem>();
    const upsert = (entry: PlantImageItem) => {
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

    const main = toImageUrl(item?.imageUrl);
    if (main) {
      upsert({ uri: main, imageId: null, canDelete: false });
    }

    const images = Array.isArray(item?.images) ? item.images : [];
    for (const image of images) {
      const uri = toImageUrl(
        image?.url ?? image?.path ?? image?.fileUrl ?? image?.fileName,
      );
      if (!uri) continue;

      const imageId =
        (typeof image?._id === "string" && image._id) ||
        (typeof image?.id === "string" && image.id) ||
        (typeof image?.imageId === "string" && image.imageId) ||
        null;

      upsert({
        uri,
        imageId,
        canDelete: Boolean(imageId),
      });
    }

    return Array.from(map.values());
  }, [item]);

  const displayImage = selectedImage || imageItems[0]?.uri || null;
  const selectedImageItem = imageItems.find((image) => image.uri === displayImage) ?? null;
  const growthStages = Array.isArray(item?.growthStages) ? item.growthStages : [];

  const handleDeleteImage = (image: PlantImageItem) => {
    if (!image.imageId) {
      Alert.alert("Cannot Remove", "This image cannot be removed.");
      return;
    }
    if (deleteMutation.isPending) {
      Alert.alert("Please wait", "An image operation is already in progress.");
      return;
    }

    Alert.alert("Remove Image", "Delete this image permanently?", [
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
      name: asset.fileName ?? "plant-type.jpg",
      type: asset.mimeType ?? "image/jpeg",
    });
  };

  if (!id) {
    return (
      <SafeAreaView style={styles.center} edges={["left", "right"]}>
        <Text style={styles.errorText}>Missing plant id.</Text>
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.center} edges={["left", "right"]}>
        <ActivityIndicator size="large" color={AdminTheme.colors.primary} />
        <Text style={styles.loadingText}>Loading plant details...</Text>
      </SafeAreaView>
    );
  }

  if (error || !item) {
    return (
      <SafeAreaView style={styles.container} edges={["left", "right"]}>
        <StitchHeader
          title={title}
          subtitle="Unable to load plant details"
          variant="gradient"
          showBackButton
          onBackPress={handleBack}
        />
        <View style={styles.center}>
          <MaterialIcons name="error-outline" size={52} color={AdminTheme.colors.danger} />
          <Text style={styles.errorText}>
            {(error as any)?.message || "Unable to load plant details."}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["left", "right"]}>
      <StitchHeader
        title={title}
        subtitle={item.name || "Plant overview"}
        variant="gradient"
        showBackButton
        onBackPress={handleBack}
        actions={
          <Pressable onPress={() => refetch()} style={styles.refreshButton}>
            <MaterialIcons name="refresh" size={20} color={AdminTheme.colors.surface} />
          </Pressable>
        }
      />

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
                <MaterialIcons
                  name="local-florist"
                  size={40}
                  color={AdminTheme.colors.primary}
                />
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
                <ActivityIndicator size="small" color={AdminTheme.colors.surface} />
              ) : (
                <>
                  <MaterialIcons name="delete" size={14} color={AdminTheme.colors.surface} />
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
                      <MaterialIcons name="close" size={12} color={AdminTheme.colors.surface} />
                    </Pressable>
                  )}
                </View>
              ))}
            </ScrollView>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.name}>{item.name || "Plant Type"}</Text>
          <Text style={styles.meta}>
            {item.category || "Uncategorized"}
            {item.variety ? ` • ${item.variety}` : ""}
          </Text>

          <View style={styles.heroMetaChips}>
            <View style={styles.metaChip}>
              <MaterialIcons
                name="straighten"
                size={13}
                color={AdminTheme.colors.textMuted}
              />
              <Text style={styles.metaChipText}>
                {item.lifecycleDays ? `${item.lifecycleDays} days lifecycle` : "Lifecycle not set"}
              </Text>
            </View>
            <View style={styles.metaChip}>
              <MaterialIcons
                name="grass"
                size={13}
                color={AdminTheme.colors.textMuted}
              />
              <Text style={styles.metaChipText}>
                {formatEnumLabel(item.expectedSeedUnit)}
              </Text>
            </View>
            <View style={styles.metaChip}>
              <MaterialIcons
                name="flag"
                size={13}
                color={AdminTheme.colors.textMuted}
              />
              <Text style={styles.metaChipText}>
                Min stock {item.minStockLevel ?? "—"}
              </Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Lifecycle</Text>
              <Text style={styles.statValue}>
                {item.lifecycleDays ? `${item.lifecycleDays}d` : "—"}
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Price</Text>
              <Text style={styles.statValue}>
                {formatCurrency(item.sellingPrice)}
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Min Stock</Text>
              <Text style={styles.statValue}>
                {item.minStockLevel ?? "—"}
              </Text>
            </View>
          </View>

          {showSensitivePricing && (
            <View style={styles.detailRow}>
              <Text style={styles.detailKey}>Default Cost</Text>
              <Text style={styles.detailValue}>
                {formatCurrency(item.defaultCostPrice)}
              </Text>
            </View>
          )}
          <View style={styles.detailRow}>
            <Text style={styles.detailKey}>Growth Stages</Text>
            <Text style={styles.detailValue}>{growthStages.length || "—"}</Text>
          </View>
        </View>

        {canUpload && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Plant Images</Text>

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
                  <ActivityIndicator size="small" color={AdminTheme.colors.surface} />
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

const cardSurface = {
  borderWidth: 1,
  borderColor: AdminTheme.colors.borderSoft,
  borderRadius: AdminTheme.radius.lg,
  backgroundColor: AdminTheme.colors.surface,
  ...AdminTheme.shadow.card,
};

const styles = {
  container: { flex: 1, backgroundColor: AdminTheme.colors.background },
  center: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    padding: AdminTheme.spacing.lg,
  },
  loadingText: { marginTop: AdminTheme.spacing.sm, color: AdminTheme.colors.textMuted },
  errorText: { color: AdminTheme.colors.danger, textAlign: "center" as const, marginTop: 8 },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  refreshButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent:"center",
    alignItems:"center"
  },
  scrollContent: {
    paddingHorizontal: AdminTheme.spacing.lg,
    paddingTop: AdminTheme.spacing.lg,
    paddingBottom: BOTTOM_NAV_HEIGHT + AdminTheme.spacing.xl,
    gap: AdminTheme.spacing.md,
  },
  card: {
    ...cardSurface,
    backgroundColor: AdminTheme.colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: AdminTheme.colors.borderSoft,
    padding: AdminTheme.spacing.md,
  },
  heroImageWrap: {
    borderRadius: 12,
    overflow: "hidden" as const,
    backgroundColor: AdminTheme.colors.surface,
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
    backgroundColor: AdminTheme.colors.surface,
  },
  thumbnailRow: {
    gap: 8,
    paddingTop: 10,
  },
  thumbnailCard: {
    ...cardSurface,
    position: "relative" as const,
  },
  thumbnailWrap: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: AdminTheme.colors.borderSoft,
    overflow: "hidden" as const,
  },
  thumbnailWrapSelected: {
    borderColor: AdminTheme.colors.primary,
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
    backgroundColor: AdminTheme.colors.danger,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderWidth: 1,
    borderColor: AdminTheme.colors.surface,
  },
  removeHeroButton: {
    position: "absolute" as const,
    right: 10,
    bottom: 10,
    backgroundColor: AdminTheme.colors.danger,
    borderRadius: 16,
    paddingHorizontal: AdminTheme.spacing.sm,
    paddingVertical: 6,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
  },
  removeHeroButtonText: {
    color: AdminTheme.colors.surface,
    fontSize: 12,
    fontWeight: "600" as const,
  },
  name: {
    color: AdminTheme.colors.text,
    fontSize: 20,
    fontWeight: "700" as const,
    marginBottom: 2,
  },
  meta: { color: AdminTheme.colors.textMuted, marginBottom: 12 },
  heroMetaChips: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: 8,
    marginBottom: 12,
  },
  metaChip: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: AdminTheme.colors.background,
    borderWidth: 1,
    borderColor: AdminTheme.colors.borderSoft,
  },
  metaChipText: {
    color: AdminTheme.colors.textMuted,
    fontSize: 12,
    fontWeight: "600" as const,
  },
  statsRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: AdminTheme.colors.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  statItem: { flex: 1, alignItems: "center" as const },
  statLabel: { fontSize: 12, color: AdminTheme.colors.textMuted },
  statValue: {
    marginTop: 2,
    fontSize: 16,
    fontWeight: "700" as const,
    color: AdminTheme.colors.text,
  },
  statDivider: { width: 1, height: 34, backgroundColor: AdminTheme.colors.borderSoft },
  detailRow: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    paddingVertical: 8,
  },
  detailKey: { color: AdminTheme.colors.textMuted, fontSize: 13 },
  detailValue: { color: AdminTheme.colors.text, fontSize: 13, fontWeight: "500" as const },
  sectionTitle: {
    marginTop: AdminTheme.spacing.lg,
    marginBottom: AdminTheme.spacing.sm,
    fontSize: 12,
    fontWeight: "700" as const,
    color: AdminTheme.colors.textMuted,
    textTransform: "uppercase" as const,
    letterSpacing: 0.6,
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
    borderColor: AdminTheme.colors.borderSoft,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginBottom: 12,
    backgroundColor: AdminTheme.colors.surface,
  },
  pendingPlaceholderText: { color: AdminTheme.colors.textMuted, fontSize: 13 },
  uploadActions: {
    flexDirection: "row" as const,
    gap: 10,
  },
  secondaryButton: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: AdminTheme.colors.border,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    height: 42,
  },
  secondaryButtonText: {
    color: AdminTheme.colors.text,
    fontSize: 14,
    fontWeight: "600" as const,
  },
  primaryButton: {
    flex: 1,
    borderRadius: 10,
    backgroundColor: AdminTheme.colors.primary,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    height: 42,
  },
  primaryButtonText: {
    color: AdminTheme.colors.surface,
    fontSize: 14,
    fontWeight: "600" as const,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
} as const;
