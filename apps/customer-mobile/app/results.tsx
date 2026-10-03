import { MarketplaceCard } from "../src/components/Premium";
import { SaveRoute } from "../src/components/SaveRoute";
import { useLocalSearchParams, router } from "expo-router";
import { useInfiniteQuery } from "@tanstack/react-query";
import { FlatList, Text, View } from "react-native";
import { api } from "../src/services/api";
import type { Search, SearchResult } from "../src/types";
import { queryString, money, label } from "../src/utils/journey";
import {
  Button,
  Card,
  Empty,
  ErrorText,
  Loading,
  styles,
} from "../src/components/ui";
import { useJourney } from "../src/state/Journey";
import { useApp } from "../src/state/Providers";
export default function Results() {
  const params = useLocalSearchParams();
  const search = Object.fromEntries(
    Object.entries(params).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]),
  ) as unknown as Search;
  const { setJourney } = useJourney();
  const { online } = useApp();
  const q = useInfiniteQuery({
    queryKey: ["results", search],
    initialPageParam: 1,
    queryFn: async ({ pageParam, signal }) => {
      const data = await api<SearchResult>(
        `/api/marketplace/search?${queryString({ ...search, page: String(pageParam), limit: "20" })}`,
        { signal },
        false,
      );
      const ids = data.listings.map((l) => l.id).join(",");
      if (ids) {
        try {
          const media = await api<
            Record<
              string,
              {
                vehiclePhotos: string[];
                ratings?: import("../src/types").Listing["ratings"];
              }
            >
          >(
            `/api/marketplace/listing-assets?vehicleIds=${encodeURIComponent(ids)}`,
            { signal },
            false,
          );
          data.listings = data.listings.map((l) => ({
            ...l,
            media: media[l.id],
            ratings: media[l.id]?.ratings,
          }));
        } catch {
          /* A media failure must not hide available vehicles. */
        }
      }
      return data;
    },
    getNextPageParam: (p) =>
      p.pagination.page < p.pagination.totalPages
        ? p.pagination.page + 1
        : undefined,
  });
  return (
    <FlatList
      style={styles.screen}
      contentContainerStyle={styles.content}
      data={q.data?.pages.flatMap((p) => p.listings) || []}
      keyExtractor={(v) => v.id}
      refreshing={q.isRefetching}
      onRefresh={() => void q.refetch()}
      ListHeaderComponent={
        <View style={{ gap: 14 }}>
          <Text style={styles.title}>Your next ride</Text>
          <Text style={styles.subtitle}>
            {search.pickupCity}{" "}
            {search.dropCity
              ? `to ${search.dropCity.replaceAll("|", ", ")}`
              : ""}
          </Text>
          <Text style={styles.small}>
            {search.date} / {search.time} IST / {search.days} day(s)
          </Text>
          <SaveRoute search={search} />
          <Text style={styles.small}>
            {q.data?.pages[0]?.pagination.total ?? "…"} vehicles · Lowest price
            first
          </Text>
          {!online && (
            <ErrorText error="Offline. Reconnect to select a ride." />
          )}
          <ErrorText error={q.error} />
          {q.isError && (
            <Button title="Try again" onPress={() => void q.refetch()} />
          )}
        </View>
      }
      ListEmptyComponent={
        q.isPending ? (
          <Loading />
        ) : (
          <Empty
            title="No rides found"
            body="Try another date or route. Availability changes as bookings are confirmed."
          />
        )
      }
      ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
      renderItem={({ item }) => (
        <MarketplaceCard
          listing={item}
          best={
            !!q.data?.pages[0]?.listings.length &&
            item.pricing.finalPayable ===
              q.data.pages[0].listings[0].pricing.finalPayable
          }
          disabled={!online}
          onPress={() => {
            setJourney({ search, listing: item });
            router.push("/listing");
          }}
        />
      )}
      ListFooterComponent={
        q.hasNextPage ? (
          <Button
            title="Load more rides"
            busy={q.isFetchingNextPage}
            onPress={() => void q.fetchNextPage()}
          />
        ) : null
      }
    />
  );
}
