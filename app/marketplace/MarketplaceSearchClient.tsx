"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type PricingOption = {
  id: string;
  pricingType: string;
  tripType: string;
  vehicleCategory: string;
  packageType: string;
  packageName: string;
  city: string | null;
  fromCity: string | null;
  toCity: string | null;
  includedHours: number | null;
  includedKm: number | null;
  airportName: string | null;
  transferDirection: string | null;
};

function label(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort();
}

export default function MarketplaceSearchClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const corporateId = searchParams.get("corporateId") || "";
  const corporateName = searchParams.get("corporateName") || "";

  const [options, setOptions] = useState<PricingOption[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [error, setError] = useState("");

  const [serviceType, setServiceType] = useState("");
  const [tripType, setTripType] = useState("");
  const [category, setCategory] = useState("");

  const [pickupCity, setPickupCity] = useState("");
  const [dropCity, setDropCity] = useState("");
  const [packageName, setPackageName] = useState("");

  const [airport, setAirport] = useState("");
  const [airportDirection, setAirportDirection] = useState("");
  const [airportSlab, setAirportSlab] = useState("");

  const [date, setDate] = useState("");
  const [time, setTime] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoadingOptions(true);
        const response = await fetch(
          "/api/marketplace/options",
          { cache: "no-store" }
        );
        const json = await response.json();

        if (!response.ok || !json?.success) {
          throw new Error(
            json?.message || "Unable to load live pricing options."
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
        if (!cancelled) setLoadingOptions(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const serviceOptions = useMemo(
    () => unique(options.map((o) => o.pricingType)),
    [options]
  );

  const tripOptions = useMemo(
    () =>
      unique(
        options
          .filter(
            (o) =>
              o.pricingType === "OUTSTATION"
          )
          .map((o) => o.tripType)
      ),
    [options]
  );

  const scoped = useMemo(
    () =>
      options.filter(
        (o) =>
          (!serviceType || o.pricingType === serviceType) &&
          (!tripType ||
            serviceType !== "OUTSTATION" ||
            o.tripType === tripType)
      ),
    [options, serviceType, tripType]
  );

  const categories = useMemo(
    () => unique(scoped.map((o) => o.vehicleCategory)),
    [scoped]
  );

  const pickupCities = useMemo(
    () =>
      unique(
        scoped.map((o) =>
          serviceType === "OUTSTATION"
            ? o.fromCity || ""
            : o.city || ""
        )
      ),
    [scoped, serviceType]
  );

  const destinationCities = useMemo(
    () =>
      unique(
        scoped
          .filter(
            (o) =>
              !pickupCity ||
              (o.fromCity || "").toLowerCase() ===
                pickupCity.toLowerCase()
          )
          .map((o) => o.toCity || "")
      ),
    [scoped, pickupCity]
  );

  const localPackages = useMemo(
    () =>
      unique(
        scoped
          .filter(
            (o) =>
              !pickupCity ||
              (o.city || "").toLowerCase() ===
                pickupCity.toLowerCase()
          )
          .map((o) => o.packageName)
      ),
    [scoped, pickupCity]
  );

  const airports = useMemo(
    () =>
      unique(
        scoped
          .filter(
            (o) =>
              !pickupCity ||
              (o.city || "").toLowerCase() ===
                pickupCity.toLowerCase()
          )
          .map((o) => o.airportName || "")
      ),
    [scoped, pickupCity]
  );

  const airportDirections = useMemo(
    () =>
      unique(
        scoped
          .filter(
            (o) =>
              (!pickupCity ||
                (o.city || "").toLowerCase() ===
                  pickupCity.toLowerCase()) &&
              (!airport ||
                (o.airportName || "").toLowerCase() ===
                  airport.toLowerCase())
          )
          .map((o) => o.transferDirection || "")
      ),
    [scoped, pickupCity, airport]
  );

  const airportSlabs = useMemo(
    () =>
      unique(
        scoped
          .filter(
            (o) =>
              (!pickupCity ||
                (o.city || "").toLowerCase() ===
                  pickupCity.toLowerCase()) &&
              (!airport ||
                (o.airportName || "").toLowerCase() ===
                  airport.toLowerCase()) &&
              (!airportDirection ||
                (o.transferDirection || "").toLowerCase() ===
                  airportDirection.toLowerCase())
          )
          .map((o) =>
            o.includedKm == null ? "" : String(o.includedKm)
          )
      ),
    [scoped, pickupCity, airport, airportDirection]
  );

  function changeService(value: string) {
    setServiceType(value);
    setTripType("");
    setCategory("");
    setPickupCity("");
    setDropCity("");
    setPackageName("");
    setAirport("");
    setAirportDirection("");
    setAirportSlab("");

    if (value !== "OUTSTATION") {
      setTripType("");
    }
  }

  function changeTrip(value: string) {
    setTripType(value);
    setCategory("");
    setPickupCity("");
    setDropCity("");
    setPackageName("");
    setAirport("");
    setAirportDirection("");
    setAirportSlab("");
  }

  function search() {
    setError("");

    if (!serviceType) {
      setError("Select a service.");
      return;
    }

    if (serviceType === "OUTSTATION" && !tripType) {
      setError("Select an Outstation trip type.");
      return;
    }

    if (!date || !time) {
      setError("Select pickup date and time.");
      return;
    }

    if (serviceType === "OUTSTATION") {
      if (!pickupCity || !dropCity) {
        setError("Select From City and To City from Pricing.");
        return;
      }

      if (
        pickupCity.toLowerCase() ===
        dropCity.toLowerCase()
      ) {
        setError("From City and To City must be different.");
        return;
      }
    }

    if (serviceType === "AIRPORT") {
      if (
        !pickupCity ||
        !airport ||
        !airportDirection ||
        !airportSlab
      ) {
        setError(
          "Select city, airport, transfer direction and KM slab from Pricing."
        );
        return;
      }
    }

    if (
      serviceType !== "OUTSTATION" &&
      serviceType !== "AIRPORT" &&
      (!pickupCity || !packageName)
    ) {
      setError("Select city and pricing package.");
      return;
    }

    const params = new URLSearchParams();

    params.set("serviceType", serviceType);

    if (serviceType === "OUTSTATION") {
      params.set("tripType", tripType);
      params.set("pickupCity", pickupCity);
      params.set("dropCity", dropCity);
    } else {
      params.set("tripType", "");
      params.set("pickupCity", pickupCity);
    }

    params.set("date", date);
    params.set("time", time);

    if (category) params.set("category", category);
    if (packageName) params.set("packageName", packageName);
    if (airport) params.set("airport", airport);
    if (airportDirection)
      params.set("airportDirection", airportDirection);
    if (airportSlab)
      params.set("airportSlab", airportSlab);

    if (corporateId) params.set("corporateId", corporateId);
    if (corporateName) params.set("corporateName", corporateName);

    router.push(`/marketplace/results?${params.toString()}`);
  }

  const isOutstation = serviceType === "OUTSTATION";
  const isAirport = serviceType === "AIRPORT";

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <div className="text-sm font-semibold uppercase tracking-[0.25em] text-cyan-300">
            RideGrid Marketplace
          </div>
          <h1 className="mt-2 text-3xl font-bold">
            Search vehicles from live pricing
          </h1>
          <p className="mt-2 max-w-3xl text-slate-300">
            Marketplace selections are generated directly from active
            Pricing Rules and Pricing Packages.
          </p>
        </div>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur">
          {loadingOptions ? (
            <div className="py-16 text-center text-slate-300">
              Loading live pricing structure...
            </div>
          ) : options.length === 0 ? (
            <div className="rounded-2xl border border-amber-300/20 bg-amber-300/10 p-6 text-amber-100">
              No active pricing is available.
            </div>
          ) : (
            <>
              <div
                className={`grid gap-4 ${
                  isOutstation ? "md:grid-cols-3" : "md:grid-cols-2"
                }`}
              >
                <Field label="Service Type">
                  <select
                    value={serviceType}
                    onChange={(e) =>
                      changeService(e.target.value)
                    }
                    className="input"
                  >
                    <option value="">Select service</option>
                    {serviceOptions.map((value) => (
                      <option key={value} value={value}>
                        {label(value)}
                      </option>
                    ))}
                  </select>
                </Field>

                {isOutstation && (
                  <Field label="Trip Type">
                    <select
                      value={tripType}
                      onChange={(e) =>
                        changeTrip(e.target.value)
                      }
                      className="input"
                    >
                      <option value="">Select trip type</option>
                      {tripOptions.map((value) => (
                        <option key={value} value={value}>
                          {label(value)}
                        </option>
                      ))}
                    </select>
                  </Field>
                )}

                <Field label="Car Category">
                  <select
                    value={category}
                    onChange={(e) =>
                      setCategory(e.target.value)
                    }
                    className="input"
                  >
                    <option value="">
                      All priced categories
                    </option>
                    {categories.map((value) => (
                      <option key={value} value={value}>
                        {label(value)}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <div className="my-6 h-px bg-white/10" />

              {isOutstation ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="From City">
                    <select
                      value={pickupCity}
                      onChange={(e) => {
                        setPickupCity(e.target.value);
                        setDropCity("");
                      }}
                      className="input"
                      disabled={!tripType}
                    >
                      <option value="">
                        {tripType
                          ? "Select From City"
                          : "Select Trip Type first"}
                      </option>
                      {pickupCities.map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="To City">
                    <select
                      value={dropCity}
                      onChange={(e) =>
                        setDropCity(e.target.value)
                      }
                      className="input"
                      disabled={!pickupCity}
                    >
                      <option value="">
                        {pickupCity
                          ? "Select To City"
                          : "Select From City first"}
                      </option>
                      {destinationCities
                        .filter(
                          (value) =>
                            value.toLowerCase() !==
                            pickupCity.toLowerCase()
                        )
                        .map((value) => (
                          <option key={value} value={value}>
                            {value}
                          </option>
                        ))}
                    </select>
                  </Field>
                </div>
              ) : isAirport ? (
                <div className="grid gap-4 md:grid-cols-4">
                  <Field label="City">
                    <select
                      value={pickupCity}
                      onChange={(e) => {
                        setPickupCity(e.target.value);
                        setAirport("");
                        setAirportDirection("");
                        setAirportSlab("");
                      }}
                      className="input"
                    >
                      <option value="">Select city</option>
                      {pickupCities.map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Airport">
                    <select
                      value={airport}
                      onChange={(e) => {
                        setAirport(e.target.value);
                        setAirportDirection("");
                        setAirportSlab("");
                      }}
                      className="input"
                      disabled={!pickupCity}
                    >
                      <option value="">Select airport</option>
                      {airports.map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Transfer">
                    <select
                      value={airportDirection}
                      onChange={(e) => {
                        setAirportDirection(e.target.value);
                        setAirportSlab("");
                      }}
                      className="input"
                      disabled={!airport}
                    >
                      <option value="">Select direction</option>
                      {airportDirections.map((value) => (
                        <option key={value} value={value}>
                          {label(value)}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="KM Slab">
                    <select
                      value={airportSlab}
                      onChange={(e) =>
                        setAirportSlab(e.target.value)
                      }
                      className="input"
                      disabled={!airportDirection}
                    >
                      <option value="">Select slab</option>
                      {airportSlabs.map((value) => (
                        <option key={value} value={value}>
                          {value} KM
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="City">
                    <select
                      value={pickupCity}
                      onChange={(e) => {
                        setPickupCity(e.target.value);
                        setPackageName("");
                      }}
                      className="input"
                    >
                      <option value="">
                        Select city from pricing
                      </option>
                      {pickupCities.map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Pricing Package">
                    <select
                      value={packageName}
                      onChange={(e) =>
                        setPackageName(e.target.value)
                      }
                      className="input"
                      disabled={!pickupCity}
                    >
                      <option value="">
                        Select saved package
                      </option>
                      {localPackages.map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
              )}

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <Field label="Pickup Date">
                  <input
                    type="date"
                    min={new Date().toISOString().slice(0, 10)}
                    value={date}
                    onChange={(e) =>
                      setDate(e.target.value)
                    }
                    className="input"
                  />
                </Field>

                <Field label="Pickup Time">
                  <input
                    type="time"
                    value={time}
                    onChange={(e) =>
                      setTime(e.target.value)
                    }
                    className="input"
                  />
                </Field>
              </div>

              {error && (
                <div className="mt-5 rounded-xl border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">
                  {error}
                </div>
              )}

              <button
                type="button"
                onClick={search}
                className="mt-6 w-full rounded-2xl bg-cyan-400 px-6 py-4 font-bold text-slate-950 hover:bg-cyan-300"
              >
                Search Vehicles
              </button>
            </>
          )}
        </section>
      </div>

      <style jsx>{`
        .input {
          width: 100%;
          border-radius: 0.9rem;
          border: 1px solid rgba(255,255,255,0.12);
          background: rgba(15,23,42,0.95);
          padding: 0.85rem 1rem;
          color: white;
          outline: none;
        }
        .input:focus {
          border-color: rgba(34,211,238,0.7);
          box-shadow: 0 0 0 3px rgba(34,211,238,0.1);
        }
        .input:disabled {
          cursor: not-allowed;
          opacity: 0.5;
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
      <span className="mb-2 block text-sm font-semibold text-slate-200">
        {label}
      </span>
      {children}
    </label>
  );
}

