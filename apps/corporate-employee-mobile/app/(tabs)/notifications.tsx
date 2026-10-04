import { FlatList, View } from "react-native";
import { router } from "expo-router";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { Button, EmptyState, ErrorState, LoadingState, Screen, T } from "../../src/components/ui";
import { NotificationCard } from "../../src/components/Corporate";
import { corp, corpPost } from "../../src/services/api";
import { useApp } from "../../src/state/Providers";
import type { Notice, Page } from "../../src/types";

type NoticePage = Page<Notice> & { unread: number };
export default function Notifications() {
  const { session, online } = useApp();
  const client = useQueryClient();
  const q = useInfiniteQuery({
    queryKey: ["notifications", session?.user.id, "list"],
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) => corp<NoticePage>("notifications", `?page=${pageParam}`, signal),
    getNextPageParam: (p) => (p.hasMore ? p.page + 1 : undefined),
    enabled: !!session,
  });
  const items = q.data?.pages.flatMap((p) => p.items) || [];
  // The server resolves each notification's target against this employee's own trips
  // and requests; a missing or unauthorised target opens nothing.
  function open(n: Notice) {
    const t = n.target;
    if (t?.type === "booking") router.push({ pathname: "/trip", params: { id: t.id } });
    else if (t?.type === "approvals") router.push("/approvals");
    else if (t?.type === "reviews") router.push("/reviews");
  }
  async function read(n: Notice) {
    open(n);
    if (n.readAt || !online) return;
    await corpPost("notifications", { id: n.id }).catch(() => {});
    await client.invalidateQueries({ queryKey: ["notifications"] });
  }
  return (
    <Screen title="Updates" subtitle={q.data ? `${q.data.pages[0]?.unread ?? 0} unread` : undefined} scroll={false}>
      <FlatList
        contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 12 }}
        data={items}
        keyExtractor={(n) => n.id}
        refreshing={q.isRefetching}
        onRefresh={() => void q.refetch()}
        ListHeaderComponent={<View style={{ gap: 10 }}><T muted size={13}>Booking, approval and trip updates from RideGrid and your company. Tap one to open it.</T><ErrorState error={q.error} retry={() => void q.refetch()} /></View>}
        ListEmptyComponent={q.isPending ? <LoadingState /> : q.isError ? null : <EmptyState title="You're all caught up" body="Booking and approval updates will appear here." icon="notifications-off-outline" />}
        renderItem={({ item }) => <NotificationCard notice={item} onPress={() => void read(item)} />}
        ListFooterComponent={q.hasNextPage ? <Button title="Load more" secondary busy={q.isFetchingNextPage} onPress={() => void q.fetchNextPage()} /> : null}
      />
    </Screen>
  );
}
