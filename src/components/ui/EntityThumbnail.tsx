import { MaterialIcons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { Image, Text, View } from "react-native";
import { Colors } from "../../theme";

type EntityThumbnailProps = {
  uri?: string | null;
  label?: string | null;
  size?: number;
  iconName?: keyof typeof MaterialIcons.glyphMap;
};

export default function EntityThumbnail({
  uri,
  label,
  size = 40,
  iconName = "spa",
}: EntityThumbnailProps) {
  const [failed, setFailed] = useState(false);
  const validUri =
    typeof uri === "string" && uri.trim().length > 0 && !failed
      ? uri.trim()
      : null;
  const initial = useMemo(() => {
    const text = (label ?? "").trim();
    return text ? text.charAt(0).toUpperCase() : null;
  }, [label]);
  const radius = Math.round(size / 2);

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        borderWidth: 1,
        borderColor: Colors.borderLight,
        backgroundColor: Colors.surface,
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      {validUri ? (
        <Image
          source={{ uri: validUri }}
          resizeMode="cover"
          style={{ width: "100%", height: "100%" }}
          onError={() => setFailed(true)}
        />
      ) : initial ? (
        <Text
          style={{
            color: Colors.primary,
            fontWeight: "700",
            fontSize: Math.max(12, Math.round(size * 0.36)),
          }}
        >
          {initial}
        </Text>
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
