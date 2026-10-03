import { Badge, PriceDisplay } from "../../components/Premium";
import { routeParams } from "../../utils/routes";
import { useState } from "react";
import { FlatList, Text, View } from "react-native";
import { router } from "expo-router";
import { useInfiniteQuery } from "@tanstack/react-query";
import { api } from "../../services/api";
import { useApp } from "../../state/Providers";
import type { BookingPage } from "../../types";
import { bookingGroup, label, money } from "../../utils/journey";
import {
  Card,
  Button,
  Chips,
  Empty,
  ErrorText,
  Loading,
  SignedIn,
  styles,
} from "../../components/ui";
export function Trips() {
  const { session, online } = useApp();
  const [group, setGroup] = useState("All");
  const q = useInfiniteQuery({
    queryKey: ["bookings", session?.user.id],
    enabled: !!session,
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) =>
      api<BookingPage>(`/api/mobile/bookings?page=${pageParam}`, { signal }),
    getNextPageParam: (p) => (p.hasMore ? p.page + 1 : undefined),
  });
  const rows = q.data?.pages.flatMap((p) => p.bookings) || [];
  return (
    <View style={styles.screen}>
      <SignedIn>
        <FlatList
          contentContainerStyle={styles.content}
          data={rows.filter(
            (b) => group === "All" || bookingGroup(b.status) === group,
          )}
          keyExtractor={(b) => b.id}
          refreshing={q.isRefetching}
          onRefresh={() => void q.refetch()}
          ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
          ListHeaderComponent={
            <View style={{ gap: 14 }}>
              <Text style={styles.title}>Your journeys</Text>
              <Text style={styles.subtitle}>Every plan, in one place.</Text>
              <Chips
                values={["All", "Upcoming", "Active", "Completed", "Cancelled"]}
                value={group}
                onChange={setGroup}
              />
              {!online && (
                <ErrorText error="Offline. Showing previously loaded trips." />
              )}
              <ErrorText error={q.error} />
              {q.isError && (
                <Button title="Retry" onPress={() => void q.refetch()} />
              )}
            </View>
          }
          ListEmptyComponent={
            q.isPending ? (
              <Loading />
            ) : (
              <Empty
                title="No trips here yet"
                body="Confirmed marketplace bookings appear here. Load more to check older trips."
              />
            )
          }
          renderItem={({ item: b }) => (
            <Card>
              <Badge
                text={label(b.status)}
                tone={b.status === "CANCELLED" ? "gold" : "green"}
              />
              <Text style={styles.small}>{b.bookingNumber}</Text>
              <Text style={styles.heading}>{b.pickupLocation}</Text>
              <Text style={styles.subtitle}>to {b.dropLocation}</Text>
              <Text style={styles.small}>
                {new Date(b.pickupDateTime).toLocaleString("en-IN", {
                  timeZone: "Asia/Kolkata",
                })}{" "}
                IST
              </Text>
              <Text style={styles.body}>
                {b.vehicle.make} {b.vehicle.model}
              </Text>
              <Text style={styles.small}>
                {b.vendor.companyName}
                {b.driver
                  ? ` · ${b.driver.firstName} ${b.driver.lastName}`
                  : ""}
              </Text>
              <PriceDisplay value={b.finalFare ?? b.estimatedFare} />
              {b.rebook && (
                <Button
                  title="Quick rebook"
                  onPress={() =>
                    router.push({
                      pathname: "/search",
                      params: routeParams(b.rebook!),
                    })
                  }
                />
              )}
              <Button
                title="View booking"
                secondary
                onPress={() =>
                  router.push({
                    pathname: "/bookings/[id]",
                    params: { id: b.id },
                  })
                }
              />
            </Card>
          )}
          ListFooterComponent={
            q.hasNextPage ? (
              <Button
                title="Load older trips"
                busy={q.isFetchingNextPage}
                onPress={() => void q.fetchNextPage()}
              />
            ) : null
          }
        />
      </SignedIn>
    </View>
  );
}
