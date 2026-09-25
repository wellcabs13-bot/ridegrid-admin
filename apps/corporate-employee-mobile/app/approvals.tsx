import { FlatList, View } from "react-native";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Button, EmptyState, ErrorState, LoadingState, Screen, T } from "../src/components/ui";
import { ApprovalCard } from "../src/components/Corporate";
import { corp } from "../src/services/api";
import { useApp } from "../src/state/Providers";
import type { Approval, Page } from "../src/types";

export default function Approvals() {
  const { session } = useApp();
  const q = useInfiniteQuery({
    queryKey: ["approvals", session?.user.id],
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) => corp<Page<Approval>>("approvals", `?page=${pageParam}`, signal),
    getNextPageParam: (p) => (p.hasMore ? p.page + 1 : undefined),
    enabled: !!session,
  });
  const items = q.data?.pages.flatMap((p) => p.items) || [];
  return (
    <Screen title="Approval requests" subtitle="Rides that need a decision from your company." scroll={false}>
      <FlatList
        contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 12 }}
        data={items}
        keyExtractor={(a) => a.id}
        refreshing={q.isRefetching}
        onRefresh={() => void q.refetch()}
        ListHeaderComponent={<View style={{ gap: 10 }}><T muted size={13}>Approved rides are confirmed at a fresh price that cannot exceed the approved amount.</T><ErrorState error={q.error} retry={() => void q.refetch()} /></View>}
        ListEmptyComponent={q.isPending ? <LoadingState /> : q.isError ? null : <EmptyState title="No approval requests" body="Rides outside your travel policy appear here after you submit them." icon="shield-checkmark-outline" />}
        renderItem={({ item }) => <ApprovalCard approval={item} />}
        ListFooterComponent={q.hasNextPage ? <Button title="Load more" secondary busy={q.isFetchingNextPage} onPress={() => void q.fetchNextPage()} /> : null}
      />
    </Screen>
  );
}
