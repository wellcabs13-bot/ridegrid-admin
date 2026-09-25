import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { api, post } from "./api";
import { useApp } from "../state/Providers";
import { assertOnline } from "../utils/offline";
import type { Page } from "../types";
export const endpoint = (section: string) => `/api/mobile/vendor/${section}`;
export function useVendor<T>(section: string, params = "") {
  const { session } = useApp();
  return useQuery({
    queryKey: [session?.user.id, section, params],
    queryFn: ({ signal }) => api<T>(endpoint(section) + params, { signal }),
    enabled: !!session,
    refetchInterval:
      section === "home" || section === "bookings" ? 60000 : false,
  });
}
export function useRows<T>(section: string, params: Record<string, string>) {
  const { session } = useApp();
  return useInfiniteQuery({
    queryKey: [session?.user.id, section, params],
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) =>
      api<Page<T>>(
        endpoint(section) +
          "?" +
          new URLSearchParams({ ...params, page: String(pageParam) }),
        { signal },
      ),
    refetchInterval: section === "bookings" ? 30000 : false,
    getNextPageParam: (last) => (last.hasMore ? last.page + 1 : undefined),
    enabled: !!session,
  });
}
export function useSave<T = unknown>(section: string) {
  const { online } = useApp(),
    client = useQueryClient();
  return useMutation({
    networkMode: "always",
    mutationFn: async (body: unknown) => {
      assertOnline(online);
      return post<T>(
        section.startsWith("/") ? section : endpoint(section),
        body,
      );
    },
    onSuccess: () => client.invalidateQueries(),
  });
}

