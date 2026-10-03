import { useQuery } from "@tanstack/react-query";
import { useApp } from "../state/Providers";
import { api } from "./api";
export function useDriver<T>(section: string, query = "", poll = false) {
  const { session, online } = useApp();
  return useQuery({ queryKey: ["driver", session?.user.id, section, query], enabled: !!session,
    queryFn: ({ signal }) => api<T>(`/api/mobile/driver/${section}${query}`, { signal }),
    refetchInterval: poll && online ? 30000 : false, refetchIntervalInBackground: false });
}
