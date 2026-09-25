import React, { useEffect, useState } from "react";
import { FlatList, Pressable, View } from "react-native";
import { router } from "expo-router";
import {
  Badge,
  BookingCard,
  Button,
  Card,
  Chips,
  Field,
  Label,
  Screen,
  State,
  name,
  s,
} from "../components/ui";
import { useRows } from "../services/vendor";
import type { Booking, Vehicle, Driver } from "../types";
import { useApp } from "../state/Providers";
import { useOfflineRows } from "../storage/offline";
export default function Lists({
  section,
}: {
  section: "bookings" | "fleet" | "drivers";
}) {
  const [status, setStatus] = useState(""),
    [search, setSearch] = useState(""),
    [debounced, setDebounced] = useState(""),
    [category, setCategory] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);
  const q = useRows<Booking | Vehicle | Driver>(section, {
    status,
    search: debounced,
    category,
  });
  const rows = q.data?.pages.flatMap((p) => p.items) || [];
  const { online, session } = useApp();
  const offline = useOfflineRows(session?.user.id, section, rows, online);
  const statuses =
    section === "bookings"
      ? [
          "",
          "PENDING",
          "CONFIRMED",
          "UPCOMING",
          "DRIVER_ASSIGNED",
          "TRIP_STARTED",
          "TRIP_COMPLETED",
          "CANCELLED",
        ]
      : section === "fleet"
        ? ["", "AVAILABLE", "RESERVED", "ON_TRIP", "MAINTENANCE", "BLOCKED"]
        : [
            "",
            "AVAILABLE",
            "ASSIGNED",
            "ACTIVE",
            "ON_TRIP",
            "INACTIVE",
            "SUSPENDED",
          ];
  function render(item: Booking | Vehicle | Driver) {
    if (section === "bookings")
      return <BookingCard booking={item as Booking} />;
    const v = item as Vehicle,
      d = item as Driver;
    return (
      <Pressable
        onPress={() =>
          router.push({
            pathname: section === "fleet" ? "/vehicle" : "/driver",
            params: { id: item.id },
          })
        }
      >
        <Card>
          <Badge value={item.status} />
          <Label large>
            {section === "fleet" ? `${v.make} ${v.model}` : name(d)}
          </Label>
          <Label muted>
            {section === "fleet"
              ? `${v.registrationNumber} · ${v.category}`
              : d.vehicles.map((v) => v.registrationNumber).join(" · ")}
          </Label>
          <Label>
            {section === "fleet"
              ? name(v.driver)
              : `${d.bookings.length}${d.bookings.length === 5 ? "+" : ""} upcoming / active assignments`}
          </Label>
        </Card>
      </Pressable>
    );
  }
  if (!online && !rows.length)
    return (
      <Screen title="Offline snapshot">
        <Label muted>
          {offline
            ? `Saved ${new Date(offline.savedAt).toLocaleString()}. Sensitive details require a connection.`
            : "No saved list available on this device."}
        </Label>
        {offline?.rows.map((row, index) => (
          <Card key={String(row.id || index)}>
            <Label>
              {String(
                row.bookingNumber ||
                  row.registrationNumber ||
                  `Driver ${index + 1}`,
              )}
            </Label>
            <Badge value={String(row.status || "UNKNOWN")} />
          </Card>
        ))}
      </Screen>
    );
  return (
    <Screen
      title={
        section === "fleet"
          ? "Your fleet"
          : section === "drivers"
            ? "Your drivers"
            : "Bookings & trips"
      }
      scroll={false}
    >
      <FlatList
        contentContainerStyle={s.body}
        data={rows}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => render(item)}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        refreshing={q.isRefetching}
        onRefresh={() => q.refetch()}
        ListHeaderComponent={
          <View style={{ gap: 14, marginBottom: 16 }}>
            {section !== "bookings" && (
              <>
                <Button
                  title={section === "fleet" ? "Add vehicle" : "Add driver"}
                  onPress={() =>
                    router.push(
                      section === "fleet" ? "/edit-vehicle" : "/edit-driver",
                    )
                  }
                />
                <Field label="Search" value={search} onChangeText={setSearch} />
              </>
            )}
            <Chips values={statuses} value={status} onChange={setStatus} />
            {section === "drivers" && status === "AVAILABLE" && (
              <Label muted>
                Available for today's Asia/Kolkata reservation window.
              </Label>
            )}
            {section === "fleet" && (
              <Chips
                values={[
                  "",
                  "SEDAN",
                  "SUV",
                  "MUV",
                  "HATCHBACK",
                  "LUXURY",
                  "TEMPO_TRAVELLER",
                  "MINI_BUS",
                  "BUS",
                ]}
                value={category}
                onChange={setCategory}
              />
            )}
            <State
              loading={q.isPending}
              error={q.error}
              retry={() => q.refetch()}
            />
          </View>
        }
        ListEmptyComponent={!q.isPending && !q.error ? <State empty /> : null}
        ListFooterComponent={
          q.hasNextPage ? (
            <Button
              title={q.isFetchingNextPage ? "Loading…" : "Load more"}
              disabled={q.isFetchingNextPage}
              onPress={() => q.fetchNextPage()}
            />
          ) : null
        }
      />
    </Screen>
  );
}
