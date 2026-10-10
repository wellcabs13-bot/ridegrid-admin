import { Avatar, Badge, Divider, RouteLine, SegmentTabs } from "../../components/Premium";
import { formatDateTime } from "../../utils/when";
import { routeParams } from "../../utils/routes";
import { useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { useInfiniteQuery } from "@tanstack/react-query";
import { api } from "../../services/api";
import { useApp } from "../../state/Providers";
import type { BookingPage } from "../../types";
import { bookingGroup, bookingStatusLabel, bookingTone, money } from "../../utils/journey";
import {
  Button,
  Empty,
  ErrorText,
  Loading,
  SignedIn,
  styles,
  theme,
} from "../../components/ui";
// Reference tabs: Upcoming (includes a trip in progress) / Past / Cancelled.
const TABS = ["Upcoming", "Past", "Cancelled"];
const inTab = (status: string, tab: string) => {
  const g = bookingGroup(status);
  return tab === "Upcoming"
    ? g === "Upcoming" || g === "Active"
    : tab === "Past"
      ? g === "Completed"
      : g === "Cancelled";
};
export function Trips() {
  const { session, online } = useApp();
  const [tab, setTab] = useState("Upcoming");
  const q = useInfiniteQuery({
    queryKey: ["bookings", session?.user.id],
    enabled: !!session,
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) =>
      api<BookingPage>(`/api/mobile/bookings?page=${pageParam}`, { signal }),
    getNextPageParam: (p) => (p.hasMore ? p.page + 1 : undefined),
  });
  const rows = q.data?.pages.flatMap((p) => p.bookings) || [];
  const shown = rows.filter((b) => inTab(b.status, tab));
  const count = (t: string) => rows.filter((b) => inTab(b.status, t)).length;
  return (
    <View style={styles.screen}>
      <SignedIn>
        <FlatList
          contentContainerStyle={styles.content}
          data={shown}
          keyExtractor={(b) => b.id}
          refreshing={q.isRefetching}
          onRefresh={() => void q.refetch()}
          ItemSeparatorComponent={() => <View style={{ height: 14 }} />}
          ListHeaderComponent={
            <View style={{ gap: 14 }}>
              <View style={{ gap: 4 }}>
                <Text style={styles.title}>My Trips</Text>
                <Text style={styles.subtitle}>Every journey, in one place.</Text>
              </View>
              <SegmentTabs
                values={TABS}
                value={tab}
                onChange={setTab}
                format={(t) => (rows.length ? `${t} (${count(t)})` : t)}
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
                icon="car-outline"
                title={`No ${tab.toLowerCase()} trips`}
                body={
                  q.hasNextPage
                    ? "Load older trips to check earlier journeys."
                    : "Confirmed marketplace bookings appear here."
                }
              >
                {tab === "Upcoming" && (
                  <Button title="Book a ride" onPress={() => router.push("/(tabs)/book")} />
                )}
              </Empty>
            )
          }
          renderItem={({ item: b }) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Open booking ${b.bookingNumber}`}
              onPress={() =>
                router.push({ pathname: "/bookings/[id]", params: { id: b.id } })
              }
              style={({ pressed }) => [styles.card, { padding: 14 }, pressed && { opacity: 0.9 }]}
            >
              <View style={styles.row}>
                <Text style={[styles.body, { fontWeight: "700", flex: 1 }]} numberOfLines={1}>
                  {formatDateTime(b.pickupDateTime)}
                </Text>
                <Badge
                  text={bookingStatusLabel(b.status)}
                  tone={bookingTone(b.status).tone}
                  icon={bookingTone(b.status).icon}
                />
              </View>
              <Divider />
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[styles.body, { fontWeight: "700" }]} numberOfLines={1}>
                    {b.vehicle.make} {b.vehicle.model}
                  </Text>
                  <Text style={styles.small} numberOfLines={1}>
                    {b.vendor.companyName}
                  </Text>
                </View>
                <Text style={{ color: theme.ink, fontSize: 20, fontWeight: "800", letterSpacing: -0.5 }}>
                  {money(b.finalFare ?? b.estimatedFare)}
                </Text>
              </View>
              <RouteLine from={b.pickupLocation} to={b.dropLocation} />
              {b.driver && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <Avatar name={`${b.driver.firstName} ${b.driver.lastName}`} size={30} />
                  <Text style={[styles.body, { fontWeight: "600", flex: 1 }]} numberOfLines={1}>
                    {b.driver.firstName} {b.driver.lastName}
                  </Text>
                  <Text style={styles.small}>{b.bookingNumber}</Text>
                </View>
              )}
              <View style={{ flexDirection: "row", gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Button
                    compact
                    outline
                    title="View Details"
                    onPress={() =>
                      router.push({
                        pathname: "/bookings/[id]",
                        params: { id: b.id },
                      })
                    }
                  />
                </View>
                {b.rebook && (
                  <View style={{ flex: 1 }}>
                    <Button
                      compact
                      title="Rebook"
                      icon="repeat"
                      onPress={() =>
                        router.push({
                          pathname: "/search",
                          params: routeParams(b.rebook!),
                        })
                      }
                    />
                  </View>
                )}
              </View>
            </Pressable>
          )}
          ListFooterComponent={
            q.hasNextPage ? (
              <Button
                title="Load older trips"
                secondary
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
