import { MaterialIcons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  Image,
  ImageStyle,
  StyleProp,
  View,
  ViewStyle,
} from "react-native";
import { Colors } from "../../theme";
import { toImageUrl } from "../../utils/image";

type BannerCardImageProps = {
  uri?: string | null;
  label?: string | null;
  iconName?: keyof typeof MaterialIcons.glyphMap;
  minHeight?: number;
  containerStyle?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
  children?: ReactNode;
};

export default function BannerCardImage({
  uri,
  iconName = "spa",
  minHeight = 90,
  containerStyle,
  imageStyle,
  children,
}: BannerCardImageProps) {
  const [failed, setFailed] = useState(false);
  const resolvedUri = useMemo(() => toImageUrl(uri), [uri]);
  useEffect(() => {
    setFailed(false);
  }, [resolvedUri]);

  const validUri =
    typeof resolvedUri === "string" && resolvedUri.trim().length > 0 && !failed
      ? resolvedUri.trim()
      : null;

  return (
    <View
      style={[
        {
          backgroundColor: Colors.surface,
          borderRadius: 12,
          minHeight,
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          overflow: "hidden",
        },
        containerStyle,
      ]}
    >
      {validUri ? (
        <Image
          source={{ uri: validUri }}
          resizeMode="cover"
          style={[
            {
              width: "100%",
              height: "100%",
              position: "absolute",
              top: 0,
              left: 0,
            },
            imageStyle,
          ]}
          onError={() => setFailed(true)}
        />
      ) : (
        <MaterialIcons name={iconName} size={34} color={Colors.primary} />
      )}
      {children}
    </View>
  );
}
