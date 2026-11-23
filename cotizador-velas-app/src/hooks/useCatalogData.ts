import { useQuery, useQueryClient } from "@tanstack/react-query";
import { services } from "../services/container";
export function useCatalogData() {
  return useQuery({
    queryKey: ["catalog"],
    queryFn: async () => {
      const r = services.repos!;
      const [settings, materials, models, pricingTiers, fixedCosts] =
        await Promise.all([
          r.settings.get(),
          r.materials.list(),
          r.models.list(),
          r.pricing.list(),
          r.fixedCosts.list(),
        ]);
      return { settings, materials, models, pricingTiers, fixedCosts };
    },
    enabled: !!services.repos,
    staleTime: 300000,
  });
}
export function useRefresh() {
  const q = useQueryClient();
  return async () => {
    await q.invalidateQueries({ queryKey: ["catalog"] });
  };
}
