import React, { useEffect, useState } from "react";
import { FlatList, View } from "react-native";
import { router } from "expo-router";
import { Badge, BookingCard, Button, Card, DriverCard, Field, Label, Pills, Screen, State, VehicleCard } from "../components/ui";
import { useRows } from "../services/vendor";
import type { Booking, Vehicle, Driver } from "../types";
import { useApp } from "../state/Providers";
import { useOfflineRows } from "../storage/offline";
import { statusLabel } from "../utils/status";

// Filters are exactly the status values the Vendor API accepts.
const STATUSES = {
  bookings: ["", "PENDING", "CONFIRMED", "UPCOMING", "DRIVER_ASSIGNED", "TRIP_STARTED", "TRIP_COMPLETED", "CANCELLED"],
  fleet: ["", "AVAILABLE", "RESERVED", "ON_TRIP", "MAINTENANCE", "BLOCKED"],
  drivers: ["", "AVAILABLE", "ASSIGNED", "ACTIVE", "ON_TRIP", "INACTIVE", "SUSPENDED"],
};
const CATEGORIES = ["", "SEDAN", "SUV", "MUV", "HATCHBACK", "LUXURY", "TEMPO_TRAVELLER", "MINI_BUS", "BUS"];
const TITLES = { bookings: "Bookings", fleet: "My Vehicles", drivers: "My Drivers" };
const EMPTY = {
  bookings: { icon: "calendar-outline" as const, title: "No bookings", text: "Bookings for your fleet will appear here." },
  fleet: { icon: "car-sport-outline" as const, title: "No vehicles", text: "Add a vehicle to start receiving bookings." },
  drivers: { icon: "people-outline" as const, title: "No drivers", text: "Add a driver and align them to a vehicle." },
};

export default function Lists({ section }: { section: "bookings" | "fleet" | "drivers" }) {
  const [status, setStatus] = useState(""),
    [search, setSearch] = useState(""),
    [debounced, setDebounced] = useState(""),
    [category, setCategory] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);
  const q = useRows<Booking | Vehicle | Driver>(section, { status, search: debounced, category });
  const rows = q.data?.pages.flatMap((p) => p.items) || [];
  const { online, session } = useApp();
  const offline = useOfflineRows(session?.user.id, section, rows, online);
  function render(item: Booking | Vehicle | Driver) {
    if (section === "bookings") return <BookingCard booking={item as Booking} />;
    if (section === "fleet") return <VehicleCard vehicle={item as Vehicle} />;
    return <DriverCard driver={item as Driver} />;
  }
  if (!online && !rows.length)
    return (
      <Screen title="Offline snapshot">
        <Label muted>
          {offline ? `Saved ${new Date(offline.savedAt).toLocaleString()}. Sensitive details require a connection.` : "No saved list available on this device."}
        </Label>
        {offline?.rows.map((row, index) => (
          <Card key={String(row.id || index)} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Label bold>{String(row.bookingNumber || row.registrationNumber || `Driver ${index + 1}`)}</Label>
            <Badge value={String(row.status || "UNKNOWN")} />
          </Card>
        ))}
      </Screen>
    );
  const e = EMPTY[section];
  return (
    <Screen title={TITLES[section]} scroll={false}>
      <FlatList
        contentContainerStyle={{ padding: 16, paddingBottom: 36 }}
        data={rows}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => render(item)}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        refreshing={q.isRefetching}
        onRefresh={() => q.refetch()}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View style={{ gap: 12, marginBottom: 12 }}>
            <Pills options={STATUSES[section].map((v) => ({ value: v, label: v ? statusLabel(v) : "All" }))} value={status} onChange={setStatus} />
            {section !== "bookings" && (
              <>
                <Button
                  title={section === "fleet" ? "Add Vehicle" : "Add Driver"}
                  icon="add"
                  onPress={() => router.push(section === "fleet" ? "/edit-vehicle" : "/edit-driver")}
                />
                <Field
                  label={section === "fleet" ? "Search by registration, make or model" : "Search drivers by name"}
                  hideLabel
                  icon="search"
                  value={search}
                  onChangeText={setSearch}
                />
              </>
            )}
            {section === "drivers" && status === "AVAILABLE" && <Label small muted>Available for today's Asia/Kolkata reservation window.</Label>}
            {section === "fleet" && <Pills options={CATEGORIES.map((v) => ({ value: v, label: v ? statusLabel(v) : "All types" }))} value={category} onChange={setCategory} />}
            <State loading={q.isPending} error={q.error} retry={() => q.refetch()} />
          </View>
        }
        ListEmptyComponent={!q.isPending && !q.error ? <Card><State empty emptyIcon={e.icon} emptyTitle={e.title} emptyText={e.text} /></Card> : null}
        ListFooterComponent={
          q.hasNextPage ? (
            <View style={{ marginTop: 14 }}>
              <Button title={q.isFetchingNextPage ? "Loading…" : "Load more"} variant="secondary" busy={q.isFetchingNextPage} onPress={() => q.fetchNextPage()} />
            </View>
          ) : null
        }
      />
    </Screen>
  );
}
