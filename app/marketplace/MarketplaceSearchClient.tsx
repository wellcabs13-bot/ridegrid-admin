"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Service = "ONE_WAY" | "ROUNDTRIP" | "LOCAL" | "TOURS";

type PricingOption = {
  rateId: string;
  pricingPackageId: string;
  service: "ONE_WAY" | "ROUNDTRIP" | "LOCAL";
  canonicalService: string;
  vehicleCategory: string;
  city: string;
  fromCity: string;
  toCity: string;
  packageName: string;
  includedHours: number | null;
  includedKm: number | null;
  version: number;
};

function unique(values: string[]) {
  return Array.from(
    new Set(values.map(v => v.trim()).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b));
}

function same(a: string, b: string) {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

function prettyCategory(value: string) {
  return value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, c => c.toUpperCase());
}

function timeOptions() {
  const rows: { value: string; label: string }[] = [];

  for (let hour = 0; hour < 24; hour++) {
    for (const minute of [0, 30]) {
      const value =
        `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;

      const h = hour % 12 || 12;
      const ampm = hour < 12 ? "AM" : "PM";

      rows.push({
        value,
        label: `${String(h).padStart(2, "0")}:${String(minute).padStart(2, "0")} ${ampm}`,
      });
    }
  }

  return rows;
}

const TIMES = timeOptions();

function travelDays(start: string, end: string) {
  if (!start || !end) return 0;

  const a = new Date(`${start}T00:00:00`);
  const b = new Date(`${end}T00:00:00`);

  if (
    Number.isNaN(a.getTime()) ||
    Number.isNaN(b.getTime()) ||
    b < a
  ) return 0;

  return Math.floor((b.getTime() - a.getTime()) / 86400000) + 1;
}

export default function MarketplaceSearchClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const corporateId = searchParams.get("corporateId") || "";
  const corporateName = searchParams.get("corporateName") || "";

  const [options, setOptions] = useState<PricingOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [service, setService] = useState<Service>("ONE_WAY");

  const [pickupCity, setPickupCity] = useState("");
  const [dropCity, setDropCity] = useState("");

  const [visitCities, setVisitCities] = useState<string[]>([]);
  const [visitCityToAdd, setVisitCityToAdd] = useState("");
  const [showAdditionalVisitCity, setShowAdditionalVisitCity] = useState(false);

  const [localPackage, setLocalPackage] = useState("");

  const [pickupDate, setPickupDate] = useState("");
  const [pickupTime, setPickupTime] = useState("");

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [category, setCategory] = useState("");

  const [tourFrom, setTourFrom] = useState<"Pune" | "Mumbai">("Pune");
  const [tourId, setTourId] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);

        const response = await fetch("/api/marketplace/options", {
          cache: "no-store",
        });

        const json = await response.json();

        if (!response.ok || !json.success) {
          throw new Error(
            json.message || "Unable to load marketplace pricing."
          );
        }

        if (!cancelled) {
          setOptions(Array.isArray(json.data) ? json.data : []);
        }
      } catch (e) {
        if (!cancelled) {
          setError(
            e instanceof Error
              ? e.message
              : "Unable to load marketplace pricing."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  const serviceRows = useMemo(
    () => options.filter(o => o.service === service),
    [options, service]
  );

  const pickupCities = useMemo(() => {
    if (service === "LOCAL") {
      return unique(
        serviceRows.map(o => o.city)
      );
    }

    if (service === "ONE_WAY" || service === "ROUNDTRIP") {
      return unique(
        serviceRows.map(o => o.fromCity)
      );
    }

    return [];
  }, [serviceRows, service]);

  const destinationCities = useMemo(() => {
    if (!pickupCity) return [];

    return unique(
      serviceRows
        .filter(o => same(o.fromCity, pickupCity))
        .map(o => o.toCity)
        .filter(city => !same(city, pickupCity))
    );
  }, [serviceRows, pickupCity]);

  const localPackages = useMemo(() => {
    if (service !== "LOCAL" || !pickupCity) return [];

    return unique(
      serviceRows
        .filter(o => same(o.city, pickupCity))
        .map(o => o.packageName)
    );
  }, [serviceRows, service, pickupCity]);

  const categories = useMemo(() => {
    let rows = serviceRows;

    if (service === "LOCAL") {
      if (pickupCity) rows = rows.filter(o => same(o.city, pickupCity));
      if (localPackage) rows = rows.filter(o => same(o.packageName, localPackage));
    }

    if (service === "ONE_WAY") {
      if (pickupCity) rows = rows.filter(o => same(o.fromCity, pickupCity));
      if (dropCity) rows = rows.filter(o => same(o.toCity, dropCity));
    }

    if (service === "ROUNDTRIP") {
      if (pickupCity) rows = rows.filter(o => same(o.fromCity, pickupCity));

      if (visitCities.length) {
        rows = rows.filter(o =>
          visitCities.some(city => same(o.toCity, city))
        );
      }
    }

    return unique(rows.map(o => o.vehicleCategory));
  }, [
    serviceRows,
    service,
    pickupCity,
    dropCity,
    localPackage,
    visitCities,
  ]);

  const days = travelDays(startDate, endDate);

  function resetForService(next: Service) {
    setService(next);
    setError("");

    setPickupCity("");
    setDropCity("");

    setVisitCities([]);
    setVisitCityToAdd("");
    setShowAdditionalVisitCity(false);

    setLocalPackage("");

    setPickupDate("");
    setPickupTime("");

    setStartDate("");
    setEndDate("");

    setCategory("");

    setTourId("");
  }

  function selectVisitCity(value: string) {
    if (!value) return;

    if (!visitCities.some(city => same(city, value))) {
      setVisitCities(current => [...current, value]);
    }

    setVisitCityToAdd("");
    setShowAdditionalVisitCity(false);
    setCategory("");
  }

  function removeVisitCity(city: string) {
    setVisitCities(current =>
      current.filter(value => !same(value, city))
    );
  }

  function search() {
    setError("");

    const params = new URLSearchParams();

    if (service === "ONE_WAY") {
      if (!pickupCity || !dropCity) {
        setError("Select Pickup City and Drop City.");
        return;
      }

      if (!pickupDate || !pickupTime) {
        setError("Select Pickup Date and Pickup Time.");
        return;
      }

      if (!category) {
        setError("Select Car Category.");
        return;
      }

      params.set("serviceType", "OUTSTATION");
      params.set("tripType", "ONEWAY");
      params.set("pickupCity", pickupCity);
      params.set("dropCity", dropCity);
      params.set("date", pickupDate);
      params.set("time", pickupTime);
      params.set("category", category);
    }

    if (service === "ROUNDTRIP") {
      if (!pickupCity) {
        setError("Select Pickup City.");
        return;
      }

      if (!visitCities.length) {
        setError("Add at least one Visit / Travel City.");
        return;
      }

      if (!startDate || !endDate || !days) {
        setError("Select valid Start Date and End Date.");
        return;
      }

      if (!category) {
        setError("Select Car Category.");
        return;
      }

      params.set("serviceType", "OUTSTATION");
      params.set("tripType", "ROUNDTRIP");
      params.set("pickupCity", pickupCity);

      // Multiple visit cities remain in one query parameter so the
      // existing results route can forward them without a redesign.
      params.set("dropCity", visitCities.join("|"));

      params.set("date", startDate);
      params.set("endDate", endDate);
      params.set("days", String(days));
      params.set("category", category);
    }

    if (service === "LOCAL") {
      if (!pickupCity) {
        setError("Select Pickup City.");
        return;
      }

      if (!localPackage) {
        setError("Select Local Package.");
        return;
      }

      if (!pickupDate || !pickupTime) {
        setError("Select Pickup Date and Pickup Time.");
        return;
      }

      if (!category) {
        setError("Select Car Category.");
        return;
      }

      params.set("serviceType", "LOCAL");
      params.set("city", pickupCity);
      params.set("pickupCity", pickupCity);
      params.set("packageName", localPackage);
      params.set("date", pickupDate);
      params.set("time", pickupTime);
      params.set("category", category);
    }

    if (service === "TOURS") {
      setError(
        "No active Tours catalog is configured yet. Create Tours in the dashboard first."
      );
      return;
    }

    if (corporateId) params.set("corporateId", corporateId);
    if (corporateName) params.set("corporateName", corporateName);

    router.push(`/marketplace/results?${params.toString()}`);
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white">
      <div className="mx-auto max-w-6xl">

        <div className="mb-8">
          <p className="text-sm font-black uppercase tracking-[0.24em] text-orange-300">
            RideGrid Marketplace
          </p>

          <h1 className="mt-2 text-3xl font-black md:text-4xl">
            Find your ride
          </h1>

          <p className="mt-2 max-w-3xl text-slate-300">
            Vehicles shown in RideGrid are connected directly to current
            approved vendor pricing.
          </p>
        </div>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-2xl backdrop-blur md:p-7">

          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            {([
              ["ONE_WAY", "One-way"],
              ["ROUNDTRIP", "Roundtrip"],
              ["LOCAL", "Local"],
              ["TOURS", "Tours"],
            ] as [Service, string][]).map(([value, title]) => (
              <button
                key={value}
                type="button"
                onClick={() => resetForService(value)}
                className={`rounded-xl px-4 py-3 text-sm font-bold transition ${
                  service === value
                    ? "bg-orange-300 text-slate-950"
                    : "border border-white/10 bg-slate-900 text-white hover:bg-slate-800"
                }`}
              >
                {title}
              </button>
            ))}
          </div>

          <div className="my-6 h-px bg-white/10" />

          {loading ? (
            <div className="py-10 text-center text-slate-300">
              Loading live prices...
            </div>
          ) : (
            <>
              {service === "ONE_WAY" && (
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Pickup City">
                    <select
                      value={pickupCity}
                      onChange={e => {
                        setPickupCity(e.target.value);
                        setDropCity("");
                        setCategory("");
                      }}
                      className="input"
                    >
                      <option value="">Select pickup city</option>
                      {pickupCities.map(city => (
                        <option key={city}>{city}</option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Drop City">
                    <select
                      value={dropCity}
                      onChange={e => {
                        setDropCity(e.target.value);
                        setCategory("");
                      }}
                      className="input"
                      disabled={!pickupCity}
                    >
                      <option value="">Select drop city</option>
                      {destinationCities.map(city => (
                        <option key={city}>{city}</option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Pickup Date">
                    <input
                      type="date"
                      value={pickupDate}
                      onChange={e => setPickupDate(e.target.value)}
                      min={new Date().toISOString().slice(0, 10)}
                      className="input"
                    />
                  </Field>

                  <Field label="Pickup Time">
                    <select
                      value={pickupTime}
                      onChange={e => setPickupTime(e.target.value)}
                      className="input"
                    >
                      <option value="">Select pickup time</option>
                      {TIMES.map(row => (
                        <option key={row.value} value={row.value}>
                          {row.label}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Car Category">
                    <select
                      value={category}
                      onChange={e => setCategory(e.target.value)}
                      className="input"
                    >
                      <option value="">Select car category</option>
                      {categories.map(value => (
                        <option key={value} value={value}>
                          {prettyCategory(value)}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
              )}

              {service === "ROUNDTRIP" && (
                <div className="space-y-5">
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Pickup City">
                      <select
                        value={pickupCity}
                        onChange={e => {
                          setPickupCity(e.target.value);
                          setVisitCities([]);
                          setVisitCityToAdd("");
                          setShowAdditionalVisitCity(false);
                          setCategory("");
                        }}
                        className="input"
                      >
                        <option value="">Select pickup city</option>
                        {pickupCities.map(city => (
                          <option key={city}>{city}</option>
                        ))}
                      </select>
                    </Field>

                    <Field label="Visit / Travel City">
                      {visitCities.length === 0 ? (
                        <select
                          value=""
                          onChange={e => selectVisitCity(e.target.value)}
                          className="input"
                          disabled={!pickupCity}
                        >
                          <option value="">Select visit city</option>
                          {destinationCities.map(city => (
                            <option key={city} value={city}>
                              {city}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div>
                          {!showAdditionalVisitCity ? (
                            <button
                              type="button"
                              onClick={() => setShowAdditionalVisitCity(true)}
                              disabled={!pickupCity}
                              className="min-h-[48px] w-full rounded-xl border border-dashed border-orange-300/40 bg-orange-300/5 px-4 text-left font-bold text-orange-100 hover:bg-orange-300/10"
                            >
                              + Add Another City
                            </button>
                          ) : (
                            <select
                              value={visitCityToAdd}
                              onChange={e => selectVisitCity(e.target.value)}
                              className="input"
                              autoFocus
                            >
                              <option value="">Select another city</option>
                              {destinationCities
                                .filter(city =>
                                  !visitCities.some(v => same(v, city))
                                )
                                .map(city => (
                                  <option key={city} value={city}>
                                    {city}
                                  </option>
                                ))}
                            </select>
                          )}
                        </div>
                      )}
                    </Field>
                  </div>

                  {visitCities.length > 0 && (
                    <div>
                      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
                        Selected Visit Cities
                      </p>

                      <div className="flex flex-wrap gap-2">
                        {visitCities.map(city => (
                          <button
                            key={city}
                            type="button"
                            onClick={() => removeVisitCity(city)}
                            className="rounded-full border border-orange-300/30 bg-orange-300/10 px-3 py-2 text-sm text-orange-100"
                            title="Remove city"
                          >
                            {city} ×
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid gap-4 md:grid-cols-3">
                    <Field label="Start Date">
                      <input
                        type="date"
                        value={startDate}
                        onChange={e => {
                          setStartDate(e.target.value);
                          if (endDate && e.target.value > endDate) {
                            setEndDate("");
                          }
                        }}
                        min={new Date().toISOString().slice(0, 10)}
                        className="input"
                      />
                    </Field>

                    <Field label="End Date">
                      <input
                        type="date"
                        value={endDate}
                        onChange={e => setEndDate(e.target.value)}
                        min={startDate || new Date().toISOString().slice(0, 10)}
                        className="input"
                      />
                    </Field>

                    <div className="rounded-2xl border border-white/10 bg-slate-900 p-4">
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                        Travel Duration
                      </p>
                      <p className="mt-2 text-2xl font-black">
                        {days || 0} {days === 1 ? "Day" : "Days"}
                      </p>
                    </div>
                  </div>

                  <Field label="Car Category">
                    <select
                      value={category}
                      onChange={e => setCategory(e.target.value)}
                      className="input"
                    >
                      <option value="">Select car category</option>
                      {categories.map(value => (
                        <option key={value} value={value}>
                          {prettyCategory(value)}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
              )}

              {service === "LOCAL" && (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                  <Field label="Pickup City">
                    <select
                      value={pickupCity}
                      onChange={e => {
                        setPickupCity(e.target.value);
                        setLocalPackage("");
                        setCategory("");
                      }}
                      className="input"
                    >
                      <option value="">Select city</option>
                      {pickupCities.map(city => (
                        <option key={city} value={city}>
                          {city}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Package">
                    <select
                      value={localPackage}
                      onChange={e => {
                        setLocalPackage(e.target.value);
                        setCategory("");
                      }}
                      className="input"
                      disabled={!pickupCity}
                    >
                      <option value="">Select package</option>
                      {localPackages.map(value => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Pickup Date">
                    <input
                      type="date"
                      value={pickupDate}
                      onChange={e => setPickupDate(e.target.value)}
                      min={new Date().toISOString().slice(0, 10)}
                      className="input"
                    />
                  </Field>

                  <Field label="Pickup Time">
                    <select
                      value={pickupTime}
                      onChange={e => setPickupTime(e.target.value)}
                      className="input"
                    >
                      <option value="">Select pickup time</option>
                      {TIMES.map(row => (
                        <option key={row.value} value={row.value}>
                          {row.label}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Car Category">
                    <select
                      value={category}
                      onChange={e => setCategory(e.target.value)}
                      className="input"
                    >
                      <option value="">Select car category</option>
                      {categories.map(value => (
                        <option key={value} value={value}>
                          {prettyCategory(value)}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
              )}

              {service === "TOURS" && (
                <div className="space-y-5">
                  <div className="grid gap-4 md:grid-cols-3">
                    <Field label="Tours From">
                      <select
                        value={tourFrom}
                        onChange={e =>
                          setTourFrom(e.target.value as "Pune" | "Mumbai")
                        }
                        className="input"
                      >
                        <option value="Pune">Pune</option>
                        <option value="Mumbai">Mumbai</option>
                      </select>
                    </Field>

                    <Field label="Tour">
                      <select
                        value={tourId}
                        onChange={e => setTourId(e.target.value)}
                        className="input"
                        disabled
                      >
                        <option value="">
                          No active tours configured
                        </option>
                      </select>
                    </Field>

                    <Field label="Car Category">
                      <select
                        value=""
                        className="input"
                        disabled
                      >
                        <option>Configure Tours first</option>
                      </select>
                    </Field>
                  </div>

                  <div className="rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4 text-sm text-amber-100">
                    Tours will become searchable automatically after the
                    Tours catalog is created in the dashboard.
                  </div>
                </div>
              )}

              {error && (
                <div className="mt-5 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {error}
                </div>
              )}

              <button
                type="button"
                onClick={search}
                disabled={service === "TOURS"}
                className="mt-6 w-full rounded-2xl bg-orange-300 px-6 py-4 font-black text-slate-950 transition hover:bg-orange-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {service === "TOURS"
                  ? "Search Tour Packages"
                  : "Search Vehicles"}
              </button>
            </>
          )}
        </section>
      </div>

      <style jsx>{`
        :global(.input) {
          width: 100%;
          min-height: 48px;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,.12);
          background: #0f172a;
          padding: 0 14px;
          color: white;
          outline: none;
        }

        :global(.input:focus) {
          border-color: #fdba74;
          box-shadow: 0 0 0 2px rgba(253,186,116,.15);
        }

        :global(.input:disabled) {
          opacity: .45;
          cursor: not-allowed;
        }
      `}</style>
    </main>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-slate-200">
        {label}
      </span>
      {children}
    </label>
  );
}
