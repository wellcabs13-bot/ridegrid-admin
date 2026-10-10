import React, { useState } from "react";
import { RefreshControl, SectionList, Text, View } from "react-native";
import { Button, Card, colors, Label, Pills, RecordBadge, Screen, StateView, TripCard } from "../components/ui";
import { useDriver } from "../services/driver";
import { useApp } from "../state/Providers";
import { useOfflineRows } from "../storage/offline";
import { istParts } from "../utils/when";
import type { Booking, Page } from "../types";

const FILTERS = [
  { value: "UPCOMING", label: "Upcoming", icon: "calendar-outline" as const },
  { value: "ACTIVE", label: "Active", icon: "navigate-outline" as const },
  { value: "COMPLETED", label: "Completed", icon: "checkmark-circle-outline" as const },
  { value: "CANCELLED", label: "Cancelled", icon: "close-circle-outline" as const },
];
const EMPTY: Record<string, string> = {
  UPCOMING: "No upcoming trips assigned to you.",
  ACTIVE: "No trip is in progress right now.",
  COMPLETED: "Completed trips will appear here.",
  CANCELLED: "No cancelled trips.",
};
// Trips grouped under a "Today" / "09 Oct 2026" heading, in server order.
function byDay(items: Booking[]) {
  const today = istParts(Date.now())?.date;
  const groups: { title: string; data: Booking[] }[] = [];
  for (const b of items) {
    const day = istParts(b.pickupDateTime)?.date || "Date not recorded";
    const title = day === today ? "Today" : day;
    const last = groups[groups.length - 1];
    if (last?.title === title) last.data.push(b);
    else groups.push({ title, data: [b] });
  }
  return groups;
}

export function TripsScreen() {
  const [filter, setFilter] = useState("UPCOMING"), [page, setPage] = useState(1);
  const q = useDriver<Page<Booking>>("trips", `?filter=${filter}&page=${page}`, true), { session, online } = useApp();
  const cache = useOfflineRows(session?.user.id, `trips-${filter}-${page}`, q.data?.items || [], online);
  return (
    <Screen title="My Trips" scroll={false}>
      <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6, gap: 12 }}>
        <Pills options={FILTERS} value={filter} onChange={(f) => { setFilter(f); setPage(1); }} />
        <StateView loading={q.isPending && online} error={q.error} retry={() => void q.refetch()} />
      </View>
      {!online && !q.data && cache && (
        <View style={{ padding: 16, gap: 10 }}>
          <Label small muted>Saved summaries · {new Date(cache.savedAt).toLocaleString()}. Reconnect to open a trip.</Label>
          {cache.rows.map((r, i) => (
            <Card key={i} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Label bold>{String(r.bookingNumber)}</Label>
              <RecordBadge value={String(r.status)} />
            </Card>
          ))}
        </View>
      )}
      <SectionList
        sections={byDay(q.data?.items || [])}
        keyExtractor={(b) => b.id}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={{ padding: 16, paddingTop: 4, gap: 14, paddingBottom: 36 }}
        renderSectionHeader={({ section }) => <Text style={{ fontSize: 17, fontWeight: "900", color: colors.text, marginTop: 10, letterSpacing: -0.2 }}>{section.title}</Text>}
        renderItem={({ item }) => <TripCard booking={item} />}
        refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={() => void q.refetch()} tintColor={colors.brand} colors={[colors.brand]} />}
        ListEmptyComponent={!q.isPending && !q.error ? <StateView empty emptyIcon="car-outline" emptyTitle="No trips" emptyText={EMPTY[filter]} /> : null}
        ListFooterComponent={
          <View style={{ gap: 10, marginTop: 8 }}>
            {page > 1 && <Button title="Previous page" variant="secondary" compact onPress={() => setPage(page - 1)} />}
            {q.data?.hasMore && <Button title="Next page" variant="secondary" compact onPress={() => setPage(page + 1)} />}
          </View>
        }
      />
    </Screen>
  );
}
