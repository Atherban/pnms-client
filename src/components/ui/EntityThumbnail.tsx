import { MaterialIcons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import { Image, StyleProp, View, ViewStyle } from "react-native";
import { Colors } from "../../theme";
import { toImageUrl } from "../../utils/image";

type EntityThumbnailProps = {
  uri?: string | null;
  label?: string | null;
  size?: number;
  iconName?: keyof typeof MaterialIcons.glyphMap;
  style?: StyleProp<ViewStyle>;
};

export default function EntityThumbnail({
  uri,
  label,
  size = 40,
  iconName = "spa",
  style,
}: EntityThumbnailProps) {
  const [failed, setFailed] = useState(false);
  const resolvedUri = useMemo(() => toImageUrl(uri), [uri]);
  useEffect(() => {
    setFailed(false);
  }, [resolvedUri]);
  const validUri =
    typeof resolvedUri === "string" && resolvedUri.trim().length > 0 && !failed
      ? resolvedUri.trim()
      : null;
  const radius = Math.round(size / 2);

  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: radius,
          borderWidth: 1,
          borderColor: Colors.borderLight,
          backgroundColor: Colors.surface,
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        },
        style,
      ]}
    >
      {validUri ? (
        <Image
          source={{ uri: validUri }}
          resizeMode="cover"
          style={{ width: "100%", height: "100%" }}
          onError={() => setFailed(true)}
        />
      ) : (
        <MaterialIcons
          name={iconName}
          size={Math.max(14, Math.round(size * 0.5))}
          color={Colors.primary}
        />
      )}
    </View>
  );
}
