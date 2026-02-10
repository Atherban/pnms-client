import { Redirect, useLocalSearchParams } from "expo-router";

export default function PlantDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();

  if (!id) return null;

  return <Redirect href={`/(viewer)/inventory/${id}`} />;
}
