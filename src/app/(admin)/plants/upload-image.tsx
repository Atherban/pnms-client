import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "../../../components";
import StitchHeader from "../../../components/common/StitchHeader";
import { AdminTheme } from "../../../components/admin/theme";
import { UploadService } from "../../../services/upload.service";
import { formatErrorMessage } from "../../../utils/error";

export default function UploadPlantTypeImage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [image, setImage] = useState<{
    uri: string;
    name: string;
    type: string;
  } | null>(null);

  const mutation = useMutation({
    mutationFn: () => {
      if (!image) {
        throw new Error("No image selected");
      }
      return UploadService.uploadPlantTypeImage(id as string, image);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plant-types"] });
      queryClient.invalidateQueries({ queryKey: ["plant-type", id] });
      router.back();
    },
    onError: (err: any) => {
      Alert.alert("Upload failed", formatErrorMessage(err));
    },
  });

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert("Permission required", "Allow access to photos");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });

    if (result.canceled) return;

    const asset = result.assets[0];

    if (asset.fileSize && asset.fileSize > 2 * 1024 * 1024) {
      Alert.alert("Image too large", "Max size is 2 MB");
      return;
    }

    setImage({
      uri: asset.uri,
      name: asset.fileName ?? "plant-type.jpg",
      type: asset.mimeType ?? "image/jpeg",
    });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: AdminTheme.colors.background }} edges={["left", "right"]}>
      <StitchHeader
        title="Upload Plant Image"
        subtitle="Add or replace plant type image"
        onBackPress={() => router.back()}
      />
      <View style={{ padding: AdminTheme.spacing.lg }}>
      <Text
        style={{
          fontSize: 18,
          fontWeight: "600",
          marginBottom: AdminTheme.spacing.lg,
          color: AdminTheme.colors.text,
        }}
      >
        Upload Plant Type Image
      </Text>

      {image ? (
        <Image
          source={{ uri: image.uri }}
          style={{
            width: "100%",
            height: 200,
            borderRadius: AdminTheme.radius.md,
            marginBottom: AdminTheme.spacing.md,
          }}
          resizeMode="cover"
        />
      ) : (
        <View
          style={{
            height: 200,
            borderWidth: 1,
            borderColor: AdminTheme.colors.borderSoft,
            borderRadius: AdminTheme.radius.md,
            justifyContent: "center",
            alignItems: "center",
            marginBottom: AdminTheme.spacing.md,
          }}
        >
          <Text style={{ color: AdminTheme.colors.textMuted }}>No image selected</Text>
        </View>
      )}

      <Pressable onPress={pickImage} style={{ marginBottom: AdminTheme.spacing.md }}>
        <Text style={{ color: AdminTheme.colors.primary, fontWeight: "600" }}>
          Choose Image
        </Text>
      </Pressable>

      <Button
        title={mutation.isPending ? "Uploading..." : "Upload Image"}
        onPress={() => mutation.mutate()}
        disabled={!image || mutation.isPending}
      />

      {mutation.isPending && (
        <ActivityIndicator style={{ marginTop: AdminTheme.spacing.md }} color={AdminTheme.colors.primary} />
      )}
    </View>
    </SafeAreaView>
  );
}
