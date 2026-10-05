import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Badge, MenuRow, QuickAction, SectionHeader, TrustRow } from "../../components/Premium";
import { theme, shadow } from "../../components/ui";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Text, View, ImageBackground, Pressable } from "react-native";
import { formatDateTime } from "../../utils/when";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import {
  Screen,
  Card,
  Button,
  Chips,
  ErrorText,
  Loading,
  Empty,
  styles,
} from "../../components/ui";
import { api } from "../../services/api";
import { readOptions, writeOptions } from "../../storage/cache";
import { bookingGroup, bookingStatusLabel, bookingTone, calendarDays, journeyLabel, label, pickupISO } from "../../utils/journey";
import type { BookingPage, Config, Journey, Option, Search, Service } from "../../types";
import { useApp } from "../../state/Providers";
import { Select } from "../../components/Select";
import { JourneyDate } from "../../components/JourneyDate";
const unique = (rows: string[]) => [...new Set(rows.filter(Boolean))].sort();
export function Home({ searchOnly = false }: { searchOnly?: boolean }) {
  const { online, session } = useApp();
  const params = useLocalSearchParams<Record<string, string>>();
  const [cached, setCached] = useState<Option[]>();
  useEffect(() => {
    void readOptions<Option[]>().then(setCached);
  }, []);
  const q = useQuery({
    queryKey: ["options"],
    queryFn: async ({ signal }) => {
      const data = await api<Option[]>(
        "/api/marketplace/options",
        { signal },
        false,
      );
      await writeOptions(data);
      return data;
    },
    initialData: cached,
    initialDataUpdatedAt: 0,
  });
  // Airport cities come from the server; airport supply itself is searched live.
  const config = useQuery({
    queryKey: ["config"],
    queryFn: ({ signal }) => api<Config>("/api/mobile/config", { signal }, false),
    staleTime: 300000,
  });
  const airportCities = config.data?.airportCities || [];
  // The next real booking, from the same API as My Trips (home only).
  const recent = useQuery({
    queryKey: ["home-bookings", session?.user.id],
    enabled: !!session && !searchOnly,
    queryFn: ({ signal }) => api<BookingPage>("/api/mobile/bookings?page=1", { signal }),
  });
  const upcoming = (recent.data?.bookings || [])
    .filter((b) => ["Upcoming", "Active"].includes(bookingGroup(b.status)))
    .sort((a, b) => Date.parse(a.pickupDateTime) - Date.parse(b.pickupDateTime))[0];
  const [service, setService] = useState<Journey>(
    params.serviceType === "AIRPORT"
      ? "AIRPORT"
      : params.serviceType === "LOCAL"
        ? "LOCAL"
        : params.tripType === "ROUNDTRIP"
          ? "ROUNDTRIP"
          : "ONE_WAY",
  );
  const [direction, setDirection] = useState<"PICKUP" | "DROP">(
    params.airportDirection === "DROP" ? "DROP" : "PICKUP",
  );
  const [pickup, setPickup] = useState(params.pickupCity || "");
  const [drop, setDrop] = useState(params.dropCity || "");
  const [visits, setVisits] = useState<string[]>(
    (params.dropCity || "").split("|").filter(Boolean),
  );
  const [pkg, setPkg] = useState(params.packageName || "");
  const [category, setCategory] = useState(params.category || "");
  const [date, setDate] = useState("");
  const [end, setEnd] = useState("");
  const [time, setTime] = useState("");
  const [error, setError] = useState("");
  const duration = useMemo(() => {
    try {
      return { days: String(calendarDays(date, end)), error: "" };
    } catch (e) {
      return { days: "", error: (e as Error).message };
    }
  }, [date, end]);
  const options = q.data || cached || [];
  const services = unique(options.map((o) => o.service));
  const journeys: Journey[] = [
    ...(services as Service[]),
    ...(airportCities.length ? (["AIRPORT"] as const) : []),
  ];
  const airport = service === "AIRPORT";
  const rows = options.filter((o) => o.service === service);
  const cities = airport
    ? unique(airportCities)
    : unique(rows.map((o) => (service === "LOCAL" ? o.city : o.fromCity)));
  const from = rows.filter(
    (o) => (service === "LOCAL" ? o.city : o.fromCity) === pickup,
  );
  const destinations = unique(from.map((o) => o.toCity));
  const relevant = from.filter((o) =>
    service === "ONE_WAY"
      ? o.toCity === drop
      : service === "LOCAL"
        ? o.packageName === pkg
        : visits.length
          ? visits.includes(o.toCity)
          : true,
  );
  const categories = unique(relevant.map((o) => o.vehicleCategory)).filter(
    (c) =>
      service !== "ROUNDTRIP" ||
      visits.every((v) =>
        from.some((o) => o.vehicleCategory === c && o.toCity === v),
      ),
  );
  useEffect(() => {
    if (journeys.length && !journeys.includes(service)) {
      setService(journeys[0]);
      setPickup("");
    }
  }, [journeys.join("|"), service]);
  function search() {
    try {
      if (airport) {
        if (!pickup) throw new Error("Choose the airport city.");
        const s: Search = {
          serviceType: "AIRPORT",
          tripType: "ONEWAY",
          pickupCity: pickup,
          city: pickup,
          airportDirection: direction,
          dropCity: "",
          date,
          time,
          days: "1",
          category: "",
          packageName: "",
        };
        if (Date.parse(pickupISO(s)) <= Date.now())
          throw new Error("Choose a future pickup date and time.");
        setError("");
        router.push({ pathname: "/results", params: s });
        return;
      }
      if (!pickup || !category || !categories.includes(category))
        throw new Error("Choose a pickup city and available vehicle category.");
      if (service === "ONE_WAY" && !drop)
        throw new Error("Choose your destination.");
      if (service === "ROUNDTRIP" && !visits.length)
        throw new Error("Choose at least one city to visit.");
      if (service === "LOCAL" && !pkg)
        throw new Error("Choose a local package.");
      if (service === "ROUNDTRIP" && duration.error)
        throw new Error(duration.error);
      const days = service === "ROUNDTRIP" ? duration.days : "1";
      const s: Search = {
        serviceType: service === "LOCAL" ? "LOCAL" : "OUTSTATION",
        tripType: service === "ROUNDTRIP" ? "ROUNDTRIP" : "ONEWAY",
        pickupCity: pickup,
        dropCity: service === "ROUNDTRIP" ? visits.join("|") : drop,
        date,
        time: service === "ROUNDTRIP" ? "12:00" : time,
        days,
        category,
        packageName: pkg,
      };
      if (Date.parse(pickupISO(s)) <= Date.now())
        throw new Error("Choose a future departure date and time.");
      setError("");
      router.push({ pathname: "/results", params: s });
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <Screen
      title={
        searchOnly
          ? "Book your ride"
          : `Hello${session?.user.name ? `, ${session.user.name.split(" ")[0]}` : ", traveller"}`
      }
      subtitle={
        searchOnly
          ? "Search exact cars from verified drivers and vendors."
          : "Let's ride better today."
      }
      onRefresh={() => void q.refetch()}
      refreshing={q.isRefetching}
    >
      {!searchOnly && (
        <>
          <ImageBackground
            source={require("../../../assets/journey-night.webp")}
            imageStyle={{ borderRadius: 24 }}
            style={{ overflow: "hidden", borderRadius: 24, ...shadow }}
          >
            <LinearGradient
              colors={["#0B1220F2", "#0B1220B3", "#0B122066"]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={{ padding: 22, gap: 14 }}
            >
              <Badge text="EXACT CARS · REAL DRIVERS" tone="cyan" icon="shield-checkmark" />
              <Text
                style={{
                  color: "white",
                  fontSize: 28,
                  fontWeight: "800",
                  lineHeight: 34,
                  letterSpacing: -0.6,
                  maxWidth: 260,
                }}
              >
                Your next ride is a better ride.
              </Text>
              <Text style={{ color: "#CBD5E1", fontSize: 14, lineHeight: 20, maxWidth: 260 }}>
                Choose the exact car, the exact driver and a transparent fare.
              </Text>
              <View style={{ alignSelf: "flex-start", minWidth: 200 }}>
                <Button
                  title="Book a ride"
                  icon="arrow-forward"
                  onPress={() => router.push("/(tabs)/book")}
                />
              </View>
            </LinearGradient>
          </ImageBackground>
          {!!journeys.length && (
            <View style={{ gap: 12 }}>
              <SectionHeader title="Where to?" caption="Pick the kind of journey" />
              <View style={{ flexDirection: "row", gap: 8 }}>
                {journeys.map((v) => (
                  <QuickAction
                    key={v}
                    title={journeyLabel(v)}
                    icon={
                      v === "ROUNDTRIP"
                        ? "repeat-outline"
                        : v === "LOCAL"
                          ? "time-outline"
                          : v === "AIRPORT"
                            ? "airplane-outline"
                            : "navigate-outline"
                    }
                    onPress={() =>
                      router.push({
                        pathname: "/search",
                        params: {
                          serviceType: v === "AIRPORT" ? "AIRPORT" : v === "LOCAL" ? "LOCAL" : "OUTSTATION",
                          tripType: v === "ROUNDTRIP" ? "ROUNDTRIP" : "ONEWAY",
                        },
                      })
                    }
                  />
                ))}
              </View>
            </View>
          )}
          {upcoming && (
            <View style={{ gap: 12 }}>
              <SectionHeader
                title={upcoming.status === "TRIP_STARTED" ? "Trip in progress" : "Upcoming ride"}
                action="All trips"
                onAction={() => router.push("/(tabs)/trips")}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Open booking ${upcoming.bookingNumber}`}
                onPress={() =>
                  router.push({ pathname: "/bookings/[id]", params: { id: upcoming.id } })
                }
                style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
              >
                <View style={styles.row}>
                  <Badge
                    text={bookingStatusLabel(upcoming.status)}
                    tone={bookingTone(upcoming.status).tone}
                    icon={bookingTone(upcoming.status).icon}
                  />
                  <Text style={styles.small}>{formatDateTime(upcoming.pickupDateTime)} IST</Text>
                </View>
                <Text style={styles.heading} numberOfLines={1}>
                  {upcoming.pickupLocation}
                </Text>
                <Text style={styles.small} numberOfLines={1}>
                  to {upcoming.dropLocation}
                </Text>
                <View style={styles.row}>
                  <Text style={[styles.body, { fontWeight: "600", flex: 1 }]} numberOfLines={1}>
                    {upcoming.vehicle.make} {upcoming.vehicle.model}
                    {upcoming.driver ? ` · ${upcoming.driver.firstName}` : ""}
                  </Text>
                  <Ionicons name="chevron-forward" size={18} color={theme.muted} />
                </View>
              </Pressable>
            </View>
          )}
          <Card>
            <TrustRow
              items={[
                ["car-sport-outline", "Exact cars"],
                ["person-circle-outline", "Real drivers"],
                ["business-outline", "Trusted vendors"],
                ["receipt-outline", "Clear fares"],
              ]}
            />
          </Card>
          <Card>
            <MenuRow
              icon="compass-outline"
              title="RideGuide"
              subtitle="Guided trip planning with real RideGrid information"
              onPress={() => router.push("/assistant")}
            />
            <MenuRow
              icon="bookmark-outline"
              title="Your saved routes"
              subtitle="Return to a favourite. Find a fresh fare."
              onPress={() => router.push("/saved-routes")}
            />
          </Card>
        </>
      )}
      {searchOnly &&
        (q.isPending && !options.length ? (
          <Loading />
        ) : !journeys.length ? (
          <Empty
            title="No routes available"
            body="Current marketplace options will appear here when available."
          />
        ) : (
          <Card>
            
            <Chips
              values={journeys}
              value={service}
              format={journeyLabel}
              onChange={(v) => {
                setService(v as Journey);
                setPickup("");
                setDrop("");
                setVisits([]);
                setPkg("");
                setCategory("");
              }}
            />
            {airport && (
              <Chips
                values={["PICKUP", "DROP"]}
                value={direction}
                format={(v) => (v === "PICKUP" ? "Pickup from airport" : "Drop to airport")}
                onChange={(v) => setDirection(v as "PICKUP" | "DROP")}
              />
            )}
            <Select
              label={airport ? "Airport city" : "Pickup city"}
              values={cities}
              value={pickup}
              onChange={(v) => {
                setPickup(v);
                setDrop("");
                setVisits([]);
                setPkg("");
                setCategory("");
              }}
            />
            {service === "ONE_WAY" && (
              <Select
                label="Destination"
                values={destinations}
                value={drop}
                onChange={(v) => {
                  setDrop(v);
                  setCategory("");
                }}
              />
            )}
            {service === "ROUNDTRIP" && (
              <Select
                label="Cities to visit"
                multiple
                values={destinations}
                value={visits.join("|")}
                onChange={(v) => {
                  setVisits(v.split("|").filter(Boolean));
                  setCategory("");
                }}
              />
            )}
            {service === "LOCAL" && (
              <Select
                label="Local package"
                values={unique(from.map((o) => o.packageName))}
                value={pkg}
                onChange={(v) => {
                  setPkg(v);
                  setCategory("");
                }}
              />
            )}
            {airport ? (
              <Text style={styles.small}>
                Airport cars appear as vendors publish airport fares for your city.
              </Text>
            ) : (
              <>
                <Text style={styles.small}>Vehicle category</Text>
                <Chips
                  values={categories}
                  value={category}
                  format={label}
                  onChange={setCategory}
                />
              </>
            )}
            <JourneyDate
              label={airport ? "Pickup date" : "Departure date"}
              value={date}
              onChange={setDate}
            />
            {service === "ROUNDTRIP" ? (
              <>
                <JourneyDate
                  label="Return date"
                  value={end}
                  onChange={setEnd}
                />
                <Text style={styles.small}>
                  {duration.days
                    ? `${duration.days} calendar days · Pickup at 12:00 IST`
                    : "Choose both dates · Pickup at 12:00 IST"}
                </Text>
              </>
            ) : (
              <JourneyDate
                label="Pickup time (India time)"
                mode="time"
                value={time}
                onChange={setTime}
              />
            )}
            <ErrorText error={error} />
            <Button title="Search exact cars" icon="search" onPress={search} disabled={!online} />
          </Card>
        ))}
      <ErrorText error={q.error} />
      {q.isError && (
        <Button
          title="Retry options"
          secondary
          onPress={() => void q.refetch()}
          disabled={!online}
        />
      )}
    </Screen>
  );
}
