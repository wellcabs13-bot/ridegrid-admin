import { useEffect, useMemo, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Button, Card, Chips, EmptyState, ErrorState, Heading, LoadingState, Message, Screen, T } from "../../src/components/ui";
import { DateField, Select } from "../../src/components/Inputs";
import { api } from "../../src/services/api";
import { useApp } from "../../src/state/Providers";
import type { Option, Search, Service } from "../../src/types";
import { calendarDays, label, pickupISO, serviceLabel } from "../../src/utils/journey";

const unique = (rows: string[]) => [...new Set(rows.filter(Boolean))].sort();

// RideSearchCard: service, route, date and category from live marketplace options only.
export default function BookRide() {
  const { online } = useApp();
  const params = useLocalSearchParams<Record<string, string>>();
  const q = useQuery({ queryKey: ["options"], queryFn: ({ signal }) => api<Option[]>("/api/marketplace/options", { signal }, false), staleTime: 300000 });
  const [service, setService] = useState<Service>(params.serviceType === "LOCAL" ? "LOCAL" : params.tripType === "ROUNDTRIP" ? "ROUNDTRIP" : "ONE_WAY");
  const [pickup, setPickup] = useState(params.pickupCity || "");
  const [drop, setDrop] = useState(params.tripType === "ROUNDTRIP" ? "" : params.dropCity || "");
  const [visits, setVisits] = useState<string[]>(params.tripType === "ROUNDTRIP" ? (params.dropCity || "").split("|").filter(Boolean) : []);
  const [pkg, setPkg] = useState(params.packageName || "");
  const [category, setCategory] = useState(params.category || "");
  const [date, setDate] = useState("");
  const [end, setEnd] = useState("");
  const [time, setTime] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    // A rebook link pre-fills criteria only. Price, availability and policy are fetched fresh.
    if (!params.pickupCity) return;
    setService(params.serviceType === "LOCAL" ? "LOCAL" : params.tripType === "ROUNDTRIP" ? "ROUNDTRIP" : "ONE_WAY");
    setPickup(params.pickupCity);
    setDrop(params.tripType === "ROUNDTRIP" ? "" : params.dropCity || "");
    setVisits(params.tripType === "ROUNDTRIP" ? (params.dropCity || "").split("|").filter(Boolean) : []);
    setPkg(params.packageName || "");
    setCategory(params.category || "");
  }, [params.pickupCity, params.dropCity, params.serviceType, params.tripType, params.category, params.packageName]);
  const duration = useMemo(() => {
    try {
      return { days: String(calendarDays(date, end)), error: "" };
    } catch (e) {
      return { days: "", error: (e as Error).message };
    }
  }, [date, end]);
  const options = q.data || [];
  const services = unique(options.map((o) => o.service)) as Service[];
  const rows = options.filter((o) => o.service === service);
  const cities = unique(rows.map((o) => (service === "LOCAL" ? o.city : o.fromCity)));
  const from = rows.filter((o) => (service === "LOCAL" ? o.city : o.fromCity) === pickup);
  const destinations = unique(from.map((o) => o.toCity));
  const relevant = from.filter((o) => (service === "ONE_WAY" ? o.toCity === drop : service === "LOCAL" ? o.packageName === pkg : visits.length ? visits.includes(o.toCity) : true));
  const categories = unique(relevant.map((o) => o.vehicleCategory)).filter((c) => service !== "ROUNDTRIP" || visits.every((v) => from.some((o) => o.vehicleCategory === c && o.toCity === v)));
  function reset(level: "service" | "pickup" | "route") {
    if (level === "service") setPickup("");
    if (level !== "route") {
      setDrop("");
      setVisits([]);
      setPkg("");
    }
    setCategory("");
  }
  function search() {
    try {
      if (!pickup) throw new Error("Choose a pickup city.");
      if (service === "ONE_WAY" && !drop) throw new Error("Choose your destination.");
      if (service === "ROUNDTRIP" && !visits.length) throw new Error("Choose at least one city to visit.");
      if (service === "LOCAL" && !pkg) throw new Error("Choose a local package.");
      if (!category || !categories.includes(category)) throw new Error("Choose an available vehicle category.");
      if (service === "ROUNDTRIP" && duration.error) throw new Error(duration.error);
      const s: Search = {
        serviceType: service === "LOCAL" ? "LOCAL" : "OUTSTATION",
        tripType: service === "ROUNDTRIP" ? "ROUNDTRIP" : "ONEWAY",
        pickupCity: pickup,
        dropCity: service === "ROUNDTRIP" ? visits.join("|") : service === "LOCAL" ? "" : drop,
        date,
        time: service === "ROUNDTRIP" ? "12:00" : time,
        days: service === "ROUNDTRIP" ? duration.days : "1",
        category,
        packageName: service === "LOCAL" ? pkg : "",
      };
      if (Date.parse(pickupISO(s)) <= Date.now()) throw new Error("Choose a future pickup date and time.");
      setError("");
      router.push({ pathname: "/results", params: s });
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <Screen title="Book a ride" subtitle="Every result is checked against your company travel policy." refresh={() => void q.refetch()} refreshing={q.isRefetching}>
      {q.isPending && <LoadingState />}
      <ErrorState error={q.error} retry={() => void q.refetch()} />
      {q.isSuccess && !options.length && <EmptyState title="No rides available right now" body="Marketplace routes appear here as soon as vendors publish current prices." icon="car-outline" />}
      {!!options.length && (
        <Card>
          <Heading>Service</Heading>
          <Chips values={services} value={service} format={serviceLabel} onChange={(v) => { setService(v as Service); reset("service"); }} />
          <Select label="Pickup city" values={cities} value={pickup} onChange={(v) => { setPickup(v); reset("pickup"); }} />
          {service === "ONE_WAY" && <Select label="Destination" values={destinations} value={drop} onChange={(v) => { setDrop(v); reset("route"); }} />}
          {service === "ROUNDTRIP" && <Select label="Cities to visit" multiple values={destinations} value={visits.join("|")} onChange={(v) => { setVisits(v.split("|").filter(Boolean)); reset("route"); }} />}
          {service === "LOCAL" && <Select label="Local package" values={unique(from.map((o) => o.packageName))} value={pkg} onChange={(v) => { setPkg(v); reset("route"); }} />}
          <T muted size={13}>Vehicle category</T>
          {categories.length ? <Chips values={categories} value={category} format={label} onChange={setCategory} /> : <T muted size={13}>Choose the route first.</T>}
          <DateField label={service === "ROUNDTRIP" ? "Departure date" : "Pickup date"} value={date} onChange={setDate} />
          {service === "ROUNDTRIP" ? (
            <>
              <DateField label="Return date" value={end} onChange={setEnd} />
              <T muted size={13}>{duration.days ? `${duration.days} calendar days · pickup at 12:00 IST` : "Choose both dates · pickup at 12:00 IST"}</T>
            </>
          ) : (
            <DateField label="Pickup time (24-hour, India time)" mode="time" value={time} onChange={setTime} />
          )}
          <Message text={error} />
          <Button title="Search rides" icon="search" disabled={!online} onPress={search} />
          {!online && <T muted size={13}>Reconnect to search live availability.</T>}
        </Card>
      )}
    </Screen>
  );
}
