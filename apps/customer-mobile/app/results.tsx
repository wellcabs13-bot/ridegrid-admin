import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import { MarketplaceCard, SegmentTabs } from "../src/components/Premium";
import { SaveRoute } from "../src/components/SaveRoute";
import { useLocalSearchParams, router } from "expo-router";
import { useInfiniteQuery } from "@tanstack/react-query";
import { FlatList, Text, View } from "react-native";
import { api } from "../src/services/api";
import type { Listing, Search, SearchResult } from "../src/types";
import { queryString } from "../src/utils/journey";
import { formatDate, formatTime } from "../src/utils/when";
import {
  Button,
  Empty,
  ErrorText,
  Loading,
  styles,
  theme,
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
  const [sort, setSort] = useState("Recommended");
  const loaded = q.data?.pages.flatMap((p) => p.listings) || [];
  // Sorting only reorders the vehicles already loaded; nothing is hidden or invented.
  const price = (l: Listing) => l.pricing.finalPayable;
  const rank = (l: Listing) =>
    (l.marketplace?.verified ? 0 : 2) + (l.driver ? 0 : 1);
  const rows = [...loaded].sort((a, b) =>
    sort === "Lowest Fare"
      ? price(a) - price(b)
      : sort === "Premium"
        ? price(b) - price(a)
        : rank(a) - rank(b) || price(a) - price(b),
  );
  const lowest = loaded.length ? Math.min(...loaded.map(price)) : null;
  const total = q.data?.pages[0]?.pagination.total;
  const route =
    search.serviceType === "AIRPORT"
      ? `${search.pickupCity} airport ${search.airportDirection === "DROP" ? "drop" : "pickup"}`
      : `${search.pickupCity}${search.dropCity ? ` → ${search.dropCity.replaceAll("|", ", ")}` : ""}`;
  return (
    <FlatList
      style={styles.screen}
      contentContainerStyle={styles.content}
      data={rows}
      keyExtractor={(v) => v.id}
      refreshing={q.isRefetching}
      onRefresh={() => void q.refetch()}
      ListHeaderComponent={
        <View style={{ gap: 14 }}>
          <View style={{ gap: 6 }}>
            <Text style={[styles.title, { fontSize: 22, lineHeight: 28 }]}>{route}</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Ionicons name="calendar-outline" size={14} color={theme.muted} />
              <Text style={styles.small}>
                {formatDate(search.date)} · {formatTime(search.time)} IST
                {search.serviceType === "AIRPORT" ? "" : ` · ${search.days} day(s)`}
              </Text>
            </View>
          </View>
          <SegmentTabs
            values={["Recommended", "Lowest Fare", "Premium"]}
            value={sort}
            onChange={setSort}
          />
          <Text style={[styles.body, { fontWeight: "700" }]}>
            {total != null
              ? `${total} exact car${total === 1 ? "" : "s"} available`
              : "Finding exact cars…"}
          </Text>
          {search.serviceType !== "AIRPORT" && <SaveRoute search={search} />}
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
            icon="car-outline"
            title="No rides found"
            body="Try another date or route. Availability changes as bookings are confirmed."
          />
        )
      }
      ItemSeparatorComponent={() => <View style={{ height: 14 }} />}
      renderItem={({ item }) => (
        <MarketplaceCard
          listing={item}
          best={lowest != null && price(item) === lowest}
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
