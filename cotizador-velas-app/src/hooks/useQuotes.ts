import { useInfiniteQuery } from "@tanstack/react-query";
import { services } from "../services/container";
export function useQuotes(filter: {
  status?: string;
  clientId?: string;
  folio?: string;
}) {
  return useInfiniteQuery({
    queryKey: ["quotes", filter],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => services.repos!.quotes.page(pageParam, filter),
    getNextPageParam: (p) => p.nextCursor,
    staleTime: 300000,
  });
}
