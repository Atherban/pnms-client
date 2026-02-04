import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";
import { PlantService } from "../../../services/plant.service";

export default function PlantDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data } = useQuery({
    queryKey: ["plant", id],
    queryFn: () => PlantService.getById(id),
  });

  if (!data) return null;

  return (
    <View>
      <Text>{data.name}</Text>
      <Text>₹ {data.price}</Text>
      <Text>Available: {data.quantityAvailable}</Text>
    </View>
  );
}
