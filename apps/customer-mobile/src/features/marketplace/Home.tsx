import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Brand, Badge, MenuRow } from "../../components/Premium";
import { theme } from "../../components/ui";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Text, View, ImageBackground, Pressable } from "react-native";
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
import { calendarDays, pickupISO } from "../../utils/journey";
import type { Option, Search, Service } from "../../types";
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
  const [service, setService] = useState<Service>(
    params.serviceType === "LOCAL"
      ? "LOCAL"
      : params.tripType === "ROUNDTRIP"
        ? "ROUNDTRIP"
        : "ONE_WAY",
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
  const rows = options.filter((o) => o.service === service);
  const cities = unique(
    rows.map((o) => (service === "LOCAL" ? o.city : o.fromCity)),
  );
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
    if (services.length && !services.includes(service)) {
      setService(services[0] as Service);
      setPickup("");
    }
  }, [services.join("|"), service]);
  function search() {
    try {
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
          ? "Plan your journey"
          : `Hello${session?.user.name ? `, ${session.user.name.split(" ")[0]}` : ", traveller"}`
      }
      subtitle={
        searchOnly
          ? "Your route. Your dates. Your choice."
          : "Where would you like to go today?"
      }
      onRefresh={() => void q.refetch()}
      refreshing={q.isRefetching}
    >
      {!searchOnly && (
        <>
          <ImageBackground
            source={require("../../../assets/journey-night.webp")}
            imageStyle={{ borderRadius: 20, width: "100%", height: "100%" }}
            style={{
              overflow: "hidden",
              borderRadius: 20,
              borderWidth: 1,
              borderColor: theme.line,
            }}
          >
            <LinearGradient
              colors={[`${theme.paper}44`, `${theme.paper}22`, `${theme.paper}D9`]}
              style={{ padding: 24, gap: 16 }}
            >
              <Brand large />
              <Text
                style={{
                  color: theme.ink,
                  fontSize: 30,
                  fontWeight: "800",
                  lineHeight: 36,
                }}
              >
                Go places.{"\n"}Your way.
              </Text>
              <Text style={[styles.subtitle, { maxWidth: 230 }]}>
                An open road. A real vehicle. A journey that's yours.
              </Text>
              <View style={{ height: 60, justifyContent: "flex-end" }}>
                <Badge text="RIDE MORE. LIVE FREER." tone="gold" />
              </View>
              <Button
                title="Find your next ride"
                onPress={() => router.push("/search")}
              />
            </LinearGradient>
          </ImageBackground>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              gap: 8,
            }}
          >
            {(
              [
                ["car-outline", "Real vehicles"],
                ["calendar-outline", "Date availability"],
                ["receipt-outline", "Clear pricing"],
              ] as const
            ).map(([icon, text]) => (
              <View
                key={text}
                style={{ flex: 1, alignItems: "center", gap: 8 }}
              >
                <Ionicons name={icon} size={24} color={theme.gold} />
                <Text
                  style={[styles.small, { textAlign: "center", fontSize: 11 }]}
                >
                  {text}
                </Text>
              </View>
            ))}
          </View>
          {!!services.length && (
            <View style={{ flexDirection: "row", gap: 10 }}>
              {services.map((v) => (
                <Pressable
                  key={v}
                  accessibilityRole="button"
                  accessibilityLabel={`Plan ${v.replaceAll("_", " ")}`}
                  onPress={() =>
                    router.push({
                      pathname: "/search",
                      params: {
                        serviceType: v === "LOCAL" ? "LOCAL" : "OUTSTATION",
                        tripType: v === "ROUNDTRIP" ? "ROUNDTRIP" : "ONEWAY",
                      },
                    })
                  }
                  style={{
                    flex: 1,
                    minHeight: 84,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: theme.line,
                    backgroundColor: theme.surface,
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                  }}
                >
                  <Ionicons
                    name={
                      v === "ROUNDTRIP"
                        ? "repeat-outline"
                        : v === "LOCAL"
                          ? "business-outline"
                          : "navigate-outline"
                    }
                    color={theme.gold}
                    size={25}
                  />
                  <Text
                    style={[styles.small, { fontWeight: "700", fontSize: 12 }]}
                  >
                    {v === "ONE_WAY"
                      ? "One-way"
                      : v === "ROUNDTRIP"
                        ? "Roundtrip"
                        : "Local"}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
          <Card>
            <MenuRow
              icon="sparkles-outline"
              title="A smarter way to plan"
              subtitle="Meet your RideGrid trip assistant"
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
        ) : !options.length ? (
          <Empty
            title="No routes available"
            body="Current marketplace options will appear here when available."
          />
        ) : (
          <Card>
            <Text style={styles.heading}>Let’s find your ride</Text>
            <Chips
              values={services}
              value={service}
              onChange={(v) => {
                setService(v as Service);
                setPickup("");
                setDrop("");
                setVisits([]);
                setPkg("");
                setCategory("");
              }}
            />
            <Select
              label="Pickup city"
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
            <Text style={styles.small}>Vehicle category</Text>
            <Chips
              values={categories}
              value={category}
              onChange={setCategory}
            />
            <JourneyDate
              label="Departure date (YYYY-MM-DD)"
              value={date}
              onChange={setDate}
            />
            {service === "ROUNDTRIP" ? (
              <>
                <JourneyDate
                  label="Return date (YYYY-MM-DD)"
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
                label="Pickup time (HH:MM, 24-hour, India time)"
                mode="time"
                value={time}
                onChange={setTime}
              />
            )}
            <ErrorText error={error} />
            <Button title="Find my ride" onPress={search} disabled={!online} />
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
