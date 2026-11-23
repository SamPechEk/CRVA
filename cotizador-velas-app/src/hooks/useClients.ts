import { useQuery } from "@tanstack/react-query";
import { services } from "../services/container";
export function useClients() {
  return useQuery({
    queryKey: ["clients"],
    queryFn: () => services.repos!.clients.list(),
    staleTime: 300000,
  });
}
