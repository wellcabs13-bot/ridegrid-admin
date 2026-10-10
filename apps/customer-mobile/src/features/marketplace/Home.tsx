import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@expo/vector-icons/Ionicons";
import {
  Badge,
  Divider,
  IconDisc,
  QuickAction,
  RouteLine,
  SectionHeader,
  SegmentTabs,
  TrustRow,
} from "../../components/Premium";
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
import { routeParams } from "../../utils/routes";
import { bookingGroup, bookingStatusLabel, bookingTone, calendarDays, journeyLabel, label, pickupISO } from "../../utils/journey";
import type { BookingPage, Config, Journey, Option, SavedRoute, Search, Service } from "../../types";
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
  // Routes the customer saved from results; the same API as the Saved Routes screen.
  const saved = useQuery({
    queryKey: ["saved-routes", session?.user.id],
    enabled: !!session && !searchOnly,
    queryFn: ({ signal }) =>
      api<{ routes: SavedRoute[] }>("/api/mobile/routes", { signal }),
  });
  const savedRoutes = (saved.data?.routes || []).slice(0, 3);
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
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = session?.user.name?.split(" ")[0];
  const journeyIcon = (v: Journey) =>
    v === "ROUNDTRIP"
      ? "repeat"
      : v === "LOCAL"
        ? "time"
        : v === "AIRPORT"
          ? "airplane"
          : "car";
  const journeyTint = (v: Journey) =>
    v === "AIRPORT" ? theme.blue : v === "LOCAL" ? theme.success : v === "ROUNDTRIP" ? theme.purple : theme.brand;
  return (
    <Screen
      title={searchOnly ? "Book Your Ride" : "Home"}
      header={
        searchOnly ? (
          <View style={{ gap: 4 }}>
            <Text accessibilityRole="header" style={styles.title}>
              Book Your Ride
            </Text>
            <Text style={styles.subtitle}>
              Search for exact cars from verified drivers and vendors.
            </Text>
          </View>
        ) : (
          <View style={{ gap: 2 }}>
            <Text style={[styles.subtitle, { fontSize: 15 }]}>
              {greeting}
              {firstName ? `, ${firstName}` : ""}
            </Text>
            <Text accessibilityRole="header" style={[styles.title, { fontSize: 28, lineHeight: 34 }]}>
              Let's Ride Better Today!
            </Text>
          </View>
        )
      }
      onRefresh={() => void q.refetch()}
      refreshing={q.isRefetching}
    >
      {!searchOnly && (
        <>
          <ImageBackground
            source={require("../../../assets/journey-night.webp")}
            imageStyle={{ borderRadius: 22 }}
            style={{ overflow: "hidden", borderRadius: 22, ...shadow }}
          >
            <LinearGradient
              colors={["#0A0F1CF5", "#0A0F1CCC", "#0A0F1C55"]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={{ padding: 20, gap: 10 }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <View
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 15,
                    backgroundColor: theme.brand,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="sparkles" size={16} color="white" />
                </View>
                <Text style={{ color: "white", fontSize: 18, fontWeight: "800", letterSpacing: -0.3 }}>
                  RideGuide Planner
                </Text>
              </View>
              <Text style={{ color: "#D9DDE6", fontSize: 13.5, lineHeight: 19, maxWidth: 250 }}>
                Plan smarter. Compare exact cars, drivers and transparent fares in one place.
              </Text>
              <View style={{ alignSelf: "flex-start", marginTop: 4 }}>
                <Button
                  compact
                  title="Plan my trip"
                  icon="arrow-forward"
                  onPress={() => router.push("/assistant")}
                />
              </View>
            </LinearGradient>
          </ImageBackground>
          {!!journeys.length && (
            <View style={{ flexDirection: "row", gap: 6 }}>
              {journeys.map((v) => (
                <QuickAction
                  key={v}
                  title={
                    v === "ONE_WAY" ? "Book a Ride" : v === "AIRPORT" ? "Airport Ride" : v === "LOCAL" ? "Hourly / Local" : journeyLabel(v)
                  }
                  tint={journeyTint(v)}
                  icon={journeyIcon(v)}
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
          )}
          {upcoming && (
            <View style={{ gap: 10 }}>
              <SectionHeader
                icon="car-sport"
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
                  <Text style={[styles.body, { fontWeight: "700" }]}>
                    {formatDateTime(upcoming.pickupDateTime)}
                  </Text>
                  <Badge
                    text={bookingStatusLabel(upcoming.status)}
                    tone={bookingTone(upcoming.status).tone}
                    icon={bookingTone(upcoming.status).icon}
                  />
                </View>
                <RouteLine from={upcoming.pickupLocation} to={upcoming.dropLocation} />
                <Divider />
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
          {!!session && (
            <View style={{ gap: 10 }}>
              <SectionHeader
                icon="bookmark"
                title="Saved routes"
                action={savedRoutes.length ? "See all" : undefined}
                onAction={() => router.push("/saved-routes")}
              />
              {savedRoutes.length ? (
                <Card>
                  {savedRoutes.map((r, i) => (
                    <View key={r.id} style={{ gap: 12 }}>
                      {i > 0 && <Divider />}
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Check fares for ${r.pickupCity}`}
                        onPress={() =>
                          router.push({ pathname: "/search", params: routeParams(r) })
                        }
                        style={({ pressed }) => ({
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 12,
                          opacity: pressed ? 0.7 : 1,
                        })}
                      >
                        <IconDisc name="navigate" size={40} />
                        <View style={{ flex: 1, gap: 2 }}>
                          <Text style={[styles.body, { fontWeight: "700" }]} numberOfLines={1}>
                            {r.pickupCity} → {r.dropCity.replaceAll("|", ", ") || r.packageName}
                          </Text>
                          <Text style={[styles.small, { fontSize: 12 }]}>
                            {label(r.category)} ·{" "}
                            {r.serviceType === "LOCAL" ? "Local" : r.tripType === "ROUNDTRIP" ? "Round trip" : "One-way"}
                          </Text>
                        </View>
                        <Badge text="Check fares" />
                      </Pressable>
                    </View>
                  ))}
                </Card>
              ) : saved.isPending ? null : (
                <View style={[styles.card, { flexDirection: "row", alignItems: "center", gap: 12 }]}>
                  <IconDisc name="bookmark-outline" size={40} />
                  <Text style={[styles.small, { flex: 1 }]}>
                    Save a route from your search results and it will wait for you here.
                  </Text>
                </View>
              )}
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
        </>
      )}
      {searchOnly &&
        (q.isPending && !options.length ? (
          <Loading />
        ) : !journeys.length ? (
          <Empty
            icon="map-outline"
            title="No routes available"
            body="Current marketplace options will appear here when available."
          />
        ) : (
          <>
            <SegmentTabs
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
            <Card>
              {airport && (
                <SegmentTabs
                  values={["PICKUP", "DROP"]}
                  value={direction}
                  format={(v) => (v === "PICKUP" ? "Pickup from airport" : "Drop to airport")}
                  onChange={(v) => setDirection(v as "PICKUP" | "DROP")}
                />
              )}
              <Select
                icon="radio-button-on"
                label={airport ? "Airport city" : "Pickup location"}
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
                  icon="location"
                  label="Drop-off location"
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
                  icon="location"
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
                  icon="time"
                  label="Local package"
                  values={unique(from.map((o) => o.packageName))}
                  value={pkg}
                  onChange={(v) => {
                    setPkg(v);
                    setCategory("");
                  }}
                />
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
              {airport ? (
                <Text style={styles.small}>
                  Airport cars appear as vendors publish airport fares for your city.
                </Text>
              ) : (
                <View style={{ gap: 8 }}>
                  <Text style={[styles.small, { fontWeight: "600", color: theme.ink }]}>
                    Vehicle category
                  </Text>
                  <Chips
                    values={categories}
                    value={category}
                    format={label}
                    onChange={setCategory}
                  />
                </View>
              )}
              <ErrorText error={error} />
              <Button title="Search Exact Cars" icon="arrow-forward" onPress={search} disabled={!online} />
            </Card>
            <TrustRow
              items={[
                ["shield-checkmark-outline", "Verified drivers"],
                ["business-outline", "Trusted vendors"],
                ["receipt-outline", "Transparent fares"],
                ["lock-closed-outline", "Secure booking"],
              ]}
            />
          </>
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
