import { useState } from "react";
import { FlatList, View } from "react-native";
import { router } from "expo-router";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Button, Card, Chips, EmptyState, ErrorState, LoadingState, MenuRow, Row, Screen, T } from "../../src/components/ui";
import { StatusBadge, TripCard } from "../../src/components/Corporate";
import { corp } from "../../src/services/api";
import { useApp } from "../../src/state/Providers";
import { useOfflineRows } from "../../src/storage/offline";
import type { Page, Trip } from "../../src/types";
import { dateTime, label } from "../../src/utils/journey";

const FILTERS = ["UPCOMING", "ACTIVE", "COMPLETED", "CANCELLED"];
export default function Trips() {
  const { session, online } = useApp();
  const [filter, setFilter] = useState("UPCOMING");
  const q = useInfiniteQuery({
    queryKey: ["trips", session?.user.id, filter],
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) => corp<Page<Trip>>("trips", `?filter=${filter}&page=${pageParam}`, signal),
    getNextPageParam: (p) => (p.hasMore ? p.page + 1 : undefined),
    enabled: !!session,
  });
  const items = q.data?.pages.flatMap((p) => p.items);
  const saved = useOfflineRows(session?.user.id, `trips-${filter}`, items, online);
  const showSaved = !items && !!saved && (q.isError || !online);
  return (
    <Screen title="My trips" subtitle="Your company rides on RideGrid." scroll={false}>
      <FlatList
        contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 12 }}
        data={items || []}
        keyExtractor={(t) => t.id}
        refreshing={q.isRefetching}
        onRefresh={() => void q.refetch()}
        initialNumToRender={8}
        removeClippedSubviews
        ListHeaderComponent={
          <View style={{ gap: 12 }}>
            <MenuRow icon="shield-checkmark-outline" title="Approval requests" subtitle="Pending, approved and past decisions" onPress={() => router.push("/approvals")} />
            <Chips values={FILTERS} value={filter} format={label} onChange={setFilter} />
            <ErrorState error={showSaved ? null : q.error} retry={() => void q.refetch()} />
            {showSaved && (
              <Card>
                <T muted size={13}>Saved on {new Date(saved!.savedAt).toLocaleString("en-IN")}. Reconnect for full details.</T>
                {saved!.rows.map((r) => (
                  <Row key={r.id}>
                    <View style={{ flex: 1 }}><T weight="600">{r.bookingNumber}</T><T muted size={12}>{dateTime(r.pickupDateTime)}</T></View>
                    {r.status && <StatusBadge status={r.status} />}
                  </Row>
                ))}
              </Card>
            )}
          </View>
        }
        ListEmptyComponent={q.isPending ? <LoadingState rows={3} /> : q.isError ? null : <EmptyState title={`No ${label(filter).toLowerCase()} trips`} body="Rides you book appear here with live status." icon="map-outline" />}
        renderItem={({ item }) => <TripCard trip={item} />}
        ListFooterComponent={q.hasNextPage ? <Button title="Load more" secondary busy={q.isFetchingNextPage} onPress={() => void q.fetchNextPage()} /> : null}
      />
    </Screen>
  );
}
