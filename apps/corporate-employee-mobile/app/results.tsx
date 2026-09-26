import { FlatList, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Button, EmptyState, ErrorState, LoadingState, Message, Row, Screen, T, colors } from "../src/components/ui";
import { MarketplaceListingCard } from "../src/components/Corporate";
import { corp } from "../src/services/api";
import { useApp } from "../src/state/Providers";
import type { Search, SearchResult } from "../src/types";
import { label, queryString } from "../src/utils/journey";

export default function Results() {
  const { online, session, setJourney } = useApp();
  const params = useLocalSearchParams();
  const search = Object.fromEntries(Object.entries(params).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v])) as unknown as Search;
  const q = useInfiniteQuery({
    queryKey: ["search", session?.user.id, search],
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) => corp<SearchResult>("search", `?${queryString({ ...search, page: String(pageParam) })}`, signal),
    getNextPageParam: (p) => (p.pagination.page < p.pagination.totalPages ? p.pagination.page + 1 : undefined),
    enabled: !!session,
  });
  const listings = q.data?.pages.flatMap((p) => p.listings) || [];
  const counts = { ALLOWED: 0, APPROVAL_REQUIRED: 0, NOT_ALLOWED: 0 };
  listings.forEach((l) => counts[l.policy.decision]++);
  return (
    <Screen title="Available rides" subtitle={`${search.pickupCity}${search.dropCity ? ` to ${search.dropCity.replaceAll("|", ", ")}` : ""} · ${search.date}${search.tripType === "ROUNDTRIP" ? ` · ${search.days} day(s)` : ` · ${search.time} IST`}`} scroll={false}>
      <FlatList
        contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 14 }}
        data={listings}
        keyExtractor={(l) => l.id}
        refreshing={q.isRefetching}
        onRefresh={() => void q.refetch()}
        initialNumToRender={6}
        windowSize={7}
        removeClippedSubviews
        ListHeaderComponent={
          <View style={{ gap: 10 }}>
            <T muted size={13}>{label(search.category)} · lowest fare first · prices include platform fee and GST from the live quote engine.</T>
            {!!listings.length && (
              <Row>
                <T size={13} color={colors.emerald} weight="700">{counts.ALLOWED} within policy</T>
                <T size={13} color={colors.amber} weight="700">{counts.APPROVAL_REQUIRED} need approval</T>
                <T size={13} color={colors.red} weight="700">{counts.NOT_ALLOWED} not allowed</T>
              </Row>
            )}
            {!online && <Message text="Offline. Reconnect to choose a ride." tone={colors.amber} />}
            <ErrorState error={q.error} retry={() => void q.refetch()} />
          </View>
        }
        ListEmptyComponent={q.isPending ? <LoadingState rows={3} /> : q.isError ? null : <EmptyState title="No rides found" body="Try another date, route or category. Availability changes as bookings are confirmed." icon="car-outline" />}
        renderItem={({ item }) => (
          <MarketplaceListingCard
            listing={item}
            disabled={!online}
            onPress={() => {
              setJourney({ search, listing: item });
              router.push("/ride");
            }}
          />
        )}
        ListFooterComponent={q.hasNextPage ? <Button title="Load more rides" secondary busy={q.isFetchingNextPage} onPress={() => void q.fetchNextPage()} /> : null}
      />
    </Screen>
  );
}
