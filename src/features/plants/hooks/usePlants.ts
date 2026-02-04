import { useQuery } from "@tanstack/react-query";
import { PlantService } from "../../../services/plant.service";

export const usePlants = () =>
  useQuery({
    queryKey: ["plants"],
    queryFn: PlantService.getAll,
  });
