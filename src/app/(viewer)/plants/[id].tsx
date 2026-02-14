import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import EntityThumbnail from "../../../components/ui/EntityThumbnail";
import { PlantTypeService } from "../../../services/plant-type.service";
import { Colors, Spacing } from "../../../theme";

export default function PlantDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isLoading, error } = useQuery({
    queryKey: ["plant-type", id],
    queryFn: () => PlantTypeService.getById(id as string),
    enabled: Boolean(id),
  });

  if (!id) return null;

  if (isLoading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </SafeAreaView>
    );
  }

  if (error || !data) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.error}>{(error as any)?.message || "Failed to load plant type"}</Text>
      </SafeAreaView>
    );
  }

  const item: any = (data as any)?.data ?? data;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.hero}>
        <EntityThumbnail uri={item.imageUrl} label={item.name} size={72} iconName="local-florist" />
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{item.name || "Plant Type"}</Text>
          <Text style={styles.meta}>{item.category || "—"} {item.variety ? `• ${item.variety}` : ""}</Text>
        </View>
      </View>
      <Text style={styles.meta}>Lifecycle: {item.lifecycleDays ? `${item.lifecycleDays} days` : "—"}</Text>
      <Text style={styles.meta}>
        Selling Price: {item.sellingPrice ? `₹${Number(item.sellingPrice).toLocaleString("en-IN")}` : "—"}
      </Text>
    </SafeAreaView>
  );
}

const styles = {
  container: { flex: 1, backgroundColor: Colors.background, padding: Spacing.lg },
  center: { flex: 1, alignItems: "center" as const, justifyContent: "center" as const, padding: Spacing.lg },
  hero: { flexDirection: "row" as const, alignItems: "center" as const, gap: Spacing.md, marginBottom: Spacing.md },
  name: { color: Colors.text, fontSize: 20, fontWeight: "700" as const },
  meta: { color: Colors.textSecondary, marginTop: 4 },
  error: { color: Colors.error, textAlign: "center" as const },
};
