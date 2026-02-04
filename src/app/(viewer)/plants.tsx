import { FlatList, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { usePlants } from "../../features/plants/hooks/usePlants";

export default function Plants() {
  const router = useRouter();
  const { data } = usePlants();

  return (
    <FlatList
      data={data}
      keyExtractor={(item) => item._id}
      renderItem={({ item }) => (
        <Pressable onPress={() => router.push(`/(viewer)/plants/${item._id}`)}>
          <Text>{item.name}</Text>
          <Text>₹ {item.price}</Text>
          <Text>Qty: {item.quantityAvailable}</Text>
        </Pressable>
      )}
    />
  );
}
