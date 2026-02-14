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

import { Button } from "../../../components";
import { UploadService } from "../../../services/upload.service";
import { Colors, Spacing } from "../../../theme";

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
      Alert.alert("Upload failed", err?.message ?? "Something went wrong");
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
    <View style={{ padding: Spacing.lg }}>
      <Text
        style={{
          fontSize: 18,
          fontWeight: "600",
          marginBottom: Spacing.lg,
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
            borderRadius: 8,
            marginBottom: Spacing.md,
          }}
          resizeMode="cover"
        />
      ) : (
        <View
          style={{
            height: 200,
            borderWidth: 1,
            borderColor: Colors.border,
            borderRadius: 8,
            justifyContent: "center",
            alignItems: "center",
            marginBottom: Spacing.md,
          }}
        >
          <Text style={{ color: Colors.textSecondary }}>No image selected</Text>
        </View>
      )}

      <Pressable onPress={pickImage} style={{ marginBottom: Spacing.md }}>
        <Text style={{ color: Colors.primary, fontWeight: "600" }}>
          Choose Image
        </Text>
      </Pressable>

      <Button
        title={mutation.isPending ? "Uploading..." : "Upload Image"}
        onPress={() => mutation.mutate()}
        disabled={!image || mutation.isPending}
      />

      {mutation.isPending && (
        <ActivityIndicator style={{ marginTop: Spacing.md }} />
      )}
    </View>
  );
}
