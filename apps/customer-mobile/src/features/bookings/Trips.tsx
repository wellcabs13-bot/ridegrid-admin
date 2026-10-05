import Ionicons from "@expo/vector-icons/Ionicons";
import { Badge } from "../../components/Premium";
import { formatDateTime } from "../../utils/when";
import { routeParams } from "../../utils/routes";
import { useState } from "react";
import { FlatList, Text, View } from "react-native";
import { router } from "expo-router";
import { useInfiniteQuery } from "@tanstack/react-query";
import { api } from "../../services/api";
import { useApp } from "../../state/Providers";
import type { BookingPage } from "../../types";
import { bookingGroup, bookingStatusLabel, bookingTone, money } from "../../utils/journey";
import {
  Card,
  Button,
  Chips,
  Empty,
  ErrorText,
  Loading,
  SignedIn,
  styles,
  theme,
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
              <Text style={styles.title}>My trips</Text>
              <Text style={styles.subtitle}>Every journey, in one place.</Text>
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
              <View style={styles.row}>
                <Badge
                  text={bookingStatusLabel(b.status)}
                  tone={bookingTone(b.status).tone}
                  icon={bookingTone(b.status).icon}
                />
                <Text style={styles.small}>{b.bookingNumber}</Text>
              </View>
              <View style={{ flexDirection: "row", gap: 12 }}>
                <View style={{ alignItems: "center", paddingTop: 4 }}>
                  <Ionicons name="radio-button-on" size={16} color={theme.brand} />
                  <View style={{ width: 2, flex: 1, backgroundColor: theme.line, marginVertical: 3 }} />
                  <Ionicons name="location" size={16} color={theme.ink} />
                </View>
                <View style={{ flex: 1, gap: 12 }}>
                  <Text style={[styles.body, { fontWeight: "700" }]} numberOfLines={1}>
                    {b.pickupLocation}
                  </Text>
                  <Text style={styles.body} numberOfLines={1}>
                    {b.dropLocation}
                  </Text>
                </View>
              </View>
              <Text style={styles.small}>{formatDateTime(b.pickupDateTime)} IST</Text>
              <View style={{ height: 1, backgroundColor: theme.line }} />
              <View style={[styles.row, { alignItems: "flex-end" }]}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[styles.body, { fontWeight: "700" }]} numberOfLines={1}>
                    {b.vehicle.make} {b.vehicle.model}
                  </Text>
                  <Text style={styles.small} numberOfLines={2}>
                    {b.vendor.companyName}
                    {b.driver ? ` · ${b.driver.firstName} ${b.driver.lastName}` : ""}
                  </Text>
                </View>
                <Text style={{ color: theme.ink, fontSize: 22, fontWeight: "800", letterSpacing: -0.5 }}>
                  {money(b.finalFare ?? b.estimatedFare)}
                </Text>
              </View>
              <View style={{ flexDirection: "row", gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Button
                    title="View details"
                    secondary
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
                      title="Rebook"
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
