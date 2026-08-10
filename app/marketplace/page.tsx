"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type ServiceType =
  | "OUTSTATION"
  | "LOCAL"
  | "AIRPORT"
  | "TOURS"
  | "CORPORATE";

type OutstationType =
  | "ONEWAY"
  | "ROUNDTRIP"
  | "MULTICITY";

type LocalType =
  | "POINT_TO_POINT"
  | "HOURLY";

const categories = [
  { value: "", label: "All Car Categories" },
  { value: "HATCHBACK", label: "Hatchback" },
  { value: "SEDAN", label: "Sedan" },
  { value: "SUV", label: "SUV" },
  { value: "MUV", label: "MUV" },
  { value: "LUXURY", label: "Luxury" },
  { value: "TEMPO_TRAVELLER", label: "Tempo Traveller" },
  { value: "MINI_BUS", label: "Mini Bus" },
  { value: "BUS", label: "Bus" },
];

const services = [
  {
    value: "OUTSTATION" as ServiceType,
    label: "Outstation",
    description: "Intercity travel",
  },
  {
    value: "LOCAL" as ServiceType,
    label: "Local",
    description: "City travel & rental",
  },
  {
    value: "AIRPORT" as ServiceType,
    label: "Airport Transfer",
    description: "Airport pickup & drop",
  },
  {
    value: "TOURS" as ServiceType,
    label: "Tour Packages",
    description: "Ready-made journeys",
  },
  {
    value: "CORPORATE" as ServiceType,
    label: "Corporate",
    description: "Business travel",
  },
];

const outstationTypes = [
  {
    value: "ONEWAY" as OutstationType,
    label: "One Way",
  },
  {
    value: "ROUNDTRIP" as OutstationType,
    label: "Round Trip",
  },
  {
    value: "MULTICITY" as OutstationType,
    label: "Multi City",
  },
];

const localTypes = [
  {
    value: "POINT_TO_POINT" as LocalType,
    label: "Point to Point",
  },
  {
    value: "HOURLY" as LocalType,
    label: "Hourly Rental",
  },
];

const hourlyPackages = [
  "4 Hrs / 40 KM",
  "8 Hrs / 80 KM",
  "12 Hrs / 120 KM",
];

export default function MarketplacePage() {
  const router = useRouter();

  const [serviceType, setServiceType] =
    useState<ServiceType>("OUTSTATION");

  const [outstationType, setOutstationType] =
    useState<OutstationType>("ONEWAY");

  const [localType, setLocalType] =
    useState<LocalType>("POINT_TO_POINT");

  const [airportDirection, setAirportDirection] =
    useState("AIRPORT_TO_CITY");

  const [pickupCity, setPickupCity] =
    useState("");

  const [dropCity, setDropCity] =
    useState("");

  const [airport, setAirport] =
    useState("");

  const [date, setDate] =
    useState("");

  const [time, setTime] =
    useState("");

  const [returnDate, setReturnDate] =
    useState("");

  const [returnTime, setReturnTime] =
    useState("");

  const [category, setCategory] =
    useState("");

  const [hourlyPackage, setHourlyPackage] =
    useState(hourlyPackages[1]);

  const [packageName, setPackageName] =
    useState("");

  const [corporateCompany, setCorporateCompany] =
    useState("");

  const [multiCityStops, setMultiCityStops] =
    useState<string[]>(["", ""]);

  const [error, setError] =
    useState("");

  const today = useMemo(
    () =>
      new Date()
        .toISOString()
        .split("T")[0],
    []
  );

  function resetError() {
    setError("");
  }

  function handleServiceChange(
    service: ServiceType
  ) {
    setServiceType(service);
    setError("");

    setPickupCity("");
    setDropCity("");
    setAirport("");
    setDate("");
    setTime("");
    setReturnDate("");
    setReturnTime("");
    setCategory("");
    setPackageName("");
    setCorporateCompany("");
    setMultiCityStops(["", ""]);
  }

  function updateMultiCityStop(
    index: number,
    value: string
  ) {
    setMultiCityStops((current) =>
      current.map((stop, stopIndex) =>
        stopIndex === index
          ? value
          : stop
      )
    );
  }

  function addMultiCityStop() {
    if (multiCityStops.length >= 6) {
      return;
    }

    setMultiCityStops((current) => [
      ...current,
      "",
    ]);
  }

  function removeMultiCityStop(
    index: number
  ) {
    if (multiCityStops.length <= 2) {
      return;
    }

    setMultiCityStops((current) =>
      current.filter(
        (_, stopIndex) =>
          stopIndex !== index
      )
    );
  }

  function validateCommonFields() {
    if (!date) {
      setError(
        "Please select journey date."
      );
      return false;
    }

    if (!time) {
      setError(
        "Please select journey time."
      );
      return false;
    }

    return true;
  }

  function handleSearch() {
    setError("");

    const params =
      new URLSearchParams();

    params.set(
      "serviceType",
      serviceType
    );

    params.set(
      "date",
      date
    );

    params.set(
      "time",
      time
    );

    if (category) {
      params.set(
        "category",
        category
      );
    }

    // -----------------------------
    // OUTSTATION
    // -----------------------------
    if (serviceType === "OUTSTATION") {
      if (!pickupCity.trim()) {
        setError(
          "Please enter pickup city."
        );
        return;
      }

      if (
        outstationType !== "MULTICITY" &&
        !dropCity.trim()
      ) {
        setError(
          "Please enter drop city."
        );
        return;
      }

      if (
        outstationType !== "MULTICITY" &&
        pickupCity
          .trim()
          .toLowerCase() ===
          dropCity
            .trim()
            .toLowerCase()
      ) {
        setError(
          "Pickup and drop city cannot be the same."
        );
        return;
      }

      if (
        outstationType ===
        "ROUNDTRIP"
      ) {
        if (!returnDate) {
          setError(
            "Please select return date."
          );
          return;
        }

        if (!returnTime) {
          setError(
            "Please select return time."
          );
          return;
        }

        params.set(
          "returnDate",
          returnDate
        );

        params.set(
          "returnTime",
          returnTime
        );
      }

      if (
        outstationType ===
        "MULTICITY"
      ) {
        const validStops =
          multiCityStops
            .map((stop) =>
              stop.trim()
            )
            .filter(Boolean);

        if (
          validStops.length < 2
        ) {
          setError(
            "Please enter at least two cities for Multi City."
          );
          return;
        }

        params.set(
          "cities",
          validStops.join("|")
        );
      }

      params.set(
        "tripType",
        outstationType
      );

      params.set(
        "pickupCity",
        pickupCity.trim()
      );

      if (dropCity.trim()) {
        params.set(
          "dropCity",
          dropCity.trim()
        );
      }
    }

    // -----------------------------
    // LOCAL
    // -----------------------------
    if (serviceType === "LOCAL") {
      if (!pickupCity.trim()) {
        setError(
          "Please enter pickup city."
        );
        return;
      }

      if (!validateCommonFields()) {
        return;
      }

      params.set(
        "localType",
        localType
      );

      params.set(
        "pickupCity",
        pickupCity.trim()
      );

      if (
        localType ===
        "POINT_TO_POINT"
      ) {
        if (!dropCity.trim()) {
          setError(
            "Please enter drop location."
          );
          return;
        }

        params.set(
          "dropCity",
          dropCity.trim()
        );
      }

      if (
        localType ===
        "HOURLY"
      ) {
        params.set(
          "hourlyPackage",
          hourlyPackage
        );
      }

      params.set(
        "tripType",
        "LOCAL"
      );
    }

    // -----------------------------
    // AIRPORT
    // -----------------------------
    if (
      serviceType ===
      "AIRPORT"
    ) {
      if (!airport.trim()) {
        setError(
          "Please enter airport."
        );
        return;
      }

      if (!pickupCity.trim()) {
        setError(
          "Please enter city/location."
        );
        return;
      }

      if (!validateCommonFields()) {
        return;
      }

      params.set(
        "airport",
        airport.trim()
      );

      params.set(
        "airportDirection",
        airportDirection
      );

      params.set(
        "pickupCity",
        pickupCity.trim()
      );

      params.set(
        "tripType",
        "AIRPORT"
      );
    }

    // -----------------------------
    // TOUR PACKAGES
    // -----------------------------
    if (
      serviceType === "TOURS"
    ) {
      if (!packageName) {
        setError(
          "Please select a tour package."
        );
        return;
      }

      if (!validateCommonFields()) {
        return;
      }

      params.set(
        "packageName",
        packageName
      );

      params.set(
        "tripType",
        "TOUR_PACKAGE"
      );
    }

    // -----------------------------
    // CORPORATE
    // -----------------------------
    if (
      serviceType === "CORPORATE"
    ) {
      if (!corporateCompany.trim()) {
        setError(
          "Please enter company name."
        );
        return;
      }

      if (!pickupCity.trim()) {
        setError(
          "Please enter pickup city."
        );
        return;
      }

      if (!validateCommonFields()) {
        return;
      }

      params.set(
        "company",
        corporateCompany.trim()
      );

      params.set(
        "pickupCity",
        pickupCity.trim()
      );

      if (dropCity.trim()) {
        params.set(
          "dropCity",
          dropCity.trim()
        );
      }

      params.set(
        "tripType",
        "CORPORATE"
      );
    }

    router.push(
      `/marketplace/results?${params.toString()}`
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      {/* Header */}
      <section className="border-b bg-white">
        <div className="mx-auto max-w-7xl px-6 py-10">
          <div className="mb-7">
            <p className="text-sm font-bold uppercase tracking-wide text-blue-600">
              RideGrid Marketplace
            </p>

            <h1 className="mt-2 text-4xl font-bold tracking-tight text-slate-900">
              Find the right vehicle
              for your journey
            </h1>

            <p className="mt-3 max-w-3xl text-slate-500">
              Choose your travel service,
              compare verified vehicles,
              vendors and drivers, then
              book the ride that suits you.
            </p>
          </div>

          {/* SERVICE TYPE */}
          <div className="rounded-2xl border bg-slate-50 p-5 shadow-sm">
            <p className="mb-3 text-sm font-bold text-slate-900">
              What service do you need?
            </p>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {services.map(
                (service) => (
                  <button
                    key={
                      service.value
                    }
                    type="button"
                    onClick={() =>
                      handleServiceChange(
                        service.value
                      )
                    }
                    className={`rounded-xl border px-4 py-4 text-left transition ${
                      serviceType ===
                      service.value
                        ? "border-blue-600 bg-blue-600 text-white shadow-sm"
                        : "border-slate-200 bg-white text-slate-900 hover:border-blue-300 hover:bg-blue-50"
                    }`}
                  >
                    <div className="font-bold">
                      {service.label}
                    </div>

                    <div
                      className={`mt-1 text-xs ${
                        serviceType ===
                        service.value
                          ? "text-blue-100"
                          : "text-slate-500"
                      }`}
                    >
                      {
                        service.description
                      }
                    </div>
                  </button>
                )
              )}
            </div>

            {/* SERVICE CONTENT */}
            <div className="mt-6">
              {/* OUTSTATION */}
              {serviceType ===
                "OUTSTATION" && (
                <>
                  <div className="mb-5 flex flex-wrap gap-3">
                    {outstationTypes.map(
                      (item) => (
                        <button
                          key={
                            item.value
                          }
                          type="button"
                          onClick={() => {
                            setOutstationType(
                              item.value
                            );
                            resetError();
                          }}
                          className={`rounded-xl px-5 py-3 text-sm font-semibold ${
                            outstationType ===
                            item.value
                              ? "bg-slate-900 text-white"
                              : "border bg-white text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          {
                            item.label
                          }
                        </button>
                      )
                    )}
                  </div>

                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
                    <input
                      value={
                        pickupCity
                      }
                      onChange={(e) =>
                        setPickupCity(
                          e.target
                            .value
                        )
                      }
                      placeholder="Pickup city"
                      className="field"
                    />

                    {outstationType !==
                      "MULTICITY" && (
                      <input
                        value={
                          dropCity
                        }
                        onChange={(e) =>
                          setDropCity(
                            e.target
                              .value
                          )
                        }
                        placeholder="Drop city"
                        className="field"
                      />
                    )}

                    <input
                      type="date"
                      min={today}
                      value={date}
                      onChange={(e) =>
                        setDate(
                          e.target
                            .value
                        )
                      }
                      className="field"
                    />

                    <input
                      type="time"
                      value={time}
                      onChange={(e) =>
                        setTime(
                          e.target
                            .value
                        )
                      }
                      className="field"
                    />

                    {outstationType ===
                      "ROUNDTRIP" && (
                      <>
                        <input
                          type="date"
                          min={
                            date ||
                            today
                          }
                          value={
                            returnDate
                          }
                          onChange={(e) =>
                            setReturnDate(
                              e.target
                                .value
                            )
                          }
                          className="field"
                        />

                        <input
                          type="time"
                          value={
                            returnTime
                          }
                          onChange={(e) =>
                            setReturnTime(
                              e.target
                                .value
                            )
                          }
                          className="field"
                        />
                      </>
                    )}

                    <select
                      value={
                        category
                      }
                      onChange={(e) =>
                        setCategory(
                          e.target
                            .value
                        )
                      }
                      className="field"
                    >
                      {categories.map(
                        (item) => (
                          <option
                            key={
                              item.value
                            }
                            value={
                              item.value
                            }
                          >
                            {
                              item.label
                            }
                          </option>
                        )
                      )}
                    </select>

                    <button
                      type="button"
                      onClick={
                        handleSearch
                      }
                      className="rounded-xl bg-blue-600 px-6 py-3 font-bold text-white hover:bg-blue-700"
                    >
                      Search Vehicles
                    </button>
                  </div>

                  {outstationType ===
                    "MULTICITY" && (
                    <div className="mt-4 rounded-xl border bg-white p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <div>
                          <p className="font-bold text-slate-900">
                            Multi City Route
                          </p>

                          <p className="text-xs text-slate-500">
                            Add the cities in
                            your travel sequence.
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={
                            addMultiCityStop
                          }
                          className="text-sm font-bold text-blue-600"
                        >
                          + Add City
                        </button>
                      </div>

                      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                        {multiCityStops.map(
                          (
                            stop,
                            index
                          ) => (
                            <div
                              key={
                                index
                              }
                              className="flex gap-2"
                            >
                              <input
                                value={
                                  stop
                                }
                                onChange={(
                                  e
                                ) =>
                                  updateMultiCityStop(
                                    index,
                                    e.target
                                      .value
                                  )
                                }
                                placeholder={`City ${index + 1}`}
                                className="field flex-1"
                              />

                              {multiCityStops.length >
                                2 && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    removeMultiCityStop(
                                      index
                                    )
                                  }
                                  className="rounded-xl border px-3 text-slate-500 hover:bg-slate-100"
                                >
                                  ×
                                </button>
                              )}
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* LOCAL */}
              {serviceType ===
                "LOCAL" && (
                <>
                  <div className="mb-5 flex flex-wrap gap-3">
                    {localTypes.map(
                      (item) => (
                        <button
                          key={
                            item.value
                          }
                          type="button"
                          onClick={() =>
                            setLocalType(
                              item.value
                            )
                          }
                          className={`rounded-xl px-5 py-3 text-sm font-semibold ${
                            localType ===
                            item.value
                              ? "bg-slate-900 text-white"
                              : "border bg-white text-slate-600"
                          }`}
                        >
                          {
                            item.label
                          }
                        </button>
                      )
                    )}
                  </div>

                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                    <input
                      value={
                        pickupCity
                      }
                      onChange={(e) =>
                        setPickupCity(
                          e.target
                            .value
                        )
                      }
                      placeholder="Pickup city"
                      className="field"
                    />

                    {localType ===
                      "POINT_TO_POINT" && (
                      <input
                        value={
                          dropCity
                        }
                        onChange={(e) =>
                          setDropCity(
                            e.target
                              .value
                          )
                        }
                        placeholder="Drop location"
                        className="field"
                      />
                    )}

                    {localType ===
                      "HOURLY" && (
                      <select
                        value={
                          hourlyPackage
                        }
                        onChange={(e) =>
                          setHourlyPackage(
                            e.target
                              .value
                          )
                        }
                        className="field"
                      >
                        {hourlyPackages.map(
                          (
                            item
                          ) => (
                            <option
                              key={
                                item
                              }
                            >
                              {
                                item
                              }
                            </option>
                          )
                        )}
                      </select>
                    )}

                    <input
                      type="date"
                      min={today}
                      value={date}
                      onChange={(e) =>
                        setDate(
                          e.target
                            .value
                        )
                      }
                      className="field"
                    />

                    <input
                      type="time"
                      value={time}
                      onChange={(e) =>
                        setTime(
                          e.target
                            .value
                        )
                      }
                      className="field"
                    />

                    <select
                      value={
                        category
                      }
                      onChange={(e) =>
                        setCategory(
                          e.target
                            .value
                        )
                      }
                      className="field"
                    >
                      {categories.map(
                        (item) => (
                          <option
                            key={
                              item.value
                            }
                            value={
                              item.value
                            }
                          >
                            {
                              item.label
                            }
                          </option>
                        )
                      )}
                    </select>

                    <button
                      type="button"
                      onClick={
                        handleSearch
                      }
                      className="rounded-xl bg-blue-600 px-6 py-3 font-bold text-white hover:bg-blue-700"
                    >
                      Search Vehicles
                    </button>
                  </div>
                </>
              )}

              {/* AIRPORT */}
              {serviceType ===
                "AIRPORT" && (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
                  <select
                    value={
                      airportDirection
                    }
                    onChange={(e) =>
                      setAirportDirection(
                        e.target.value
                      )
                    }
                    className="field"
                  >
                    <option value="AIRPORT_TO_CITY">
                      Airport → City
                    </option>
                    <option value="CITY_TO_AIRPORT">
                      City → Airport
                    </option>
                  </select>

                  <input
                    value={airport}
                    onChange={(e) =>
                      setAirport(
                        e.target.value
                      )
                    }
                    placeholder="Airport"
                    className="field"
                  />

                  <input
                    value={pickupCity}
                    onChange={(e) =>
                      setPickupCity(
                        e.target.value
                      )
                    }
                    placeholder="City / Location"
                    className="field"
                  />

                  <input
                    type="date"
                    min={today}
                    value={date}
                    onChange={(e) =>
                      setDate(
                        e.target.value
                      )
                    }
                    className="field"
                  />

                  <input
                    type="time"
                    value={time}
                    onChange={(e) =>
                      setTime(
                        e.target.value
                      )
                    }
                    className="field"
                  />

                  <select
                    value={
                      category
                    }
                    onChange={(e) =>
                      setCategory(
                        e.target.value
                      )
                    }
                    className="field"
                  >
                    {categories.map(
                      (item) => (
                        <option
                          key={
                            item.value
                          }
                          value={
                            item.value
                          }
                        >
                          {
                            item.label
                          }
                        </option>
                      )
                    )}
                  </select>

                  <button
                    type="button"
                    onClick={
                      handleSearch
                    }
                    className="rounded-xl bg-blue-600 px-6 py-3 font-bold text-white hover:bg-blue-700"
                  >
                    Search Vehicles
                  </button>
                </div>
              )}

              {/* TOURS */}
              {serviceType ===
                "TOURS" && (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <select
                    value={
                      packageName
                    }
                    onChange={(e) =>
                      setPackageName(
                        e.target.value
                      )
                    }
                    className="field"
                  >
                    <option value="">
                      Select Tour Package
                    </option>
                    <option value="UJJAIN_OMKARESHWAR">
                      Ujjain - Omkareshwar
                    </option>
                    <option value="ASHTAVINAYAK">
                      Ashtavinayak Darshan
                    </option>
                    <option value="MAHABALESHWAR">
                      Mahabaleshwar
                    </option>
                    <option value="BHIMASHANKAR">
                      Bhimashankar
                    </option>
                    <option value="SHIRDI">
                      Shirdi
                    </option>
                    <option value="AYODHYA">
                      Ayodhya
                    </option>
                  </select>

                  <input
                    type="date"
                    min={today}
                    value={date}
                    onChange={(e) =>
                      setDate(
                        e.target.value
                      )
                    }
                    className="field"
                  />

                  <input
                    type="time"
                    value={time}
                    onChange={(e) =>
                      setTime(
                        e.target.value
                      )
                    }
                    className="field"
                  />

                  <select
                    value={
                      category
                    }
                    onChange={(e) =>
                      setCategory(
                        e.target.value
                      )
                    }
                    className="field"
                  >
                    {categories.map(
                      (item) => (
                        <option
                          key={
                            item.value
                          }
                          value={
                            item.value
                          }
                        >
                          {
                            item.label
                          }
                        </option>
                      )
                    )}
                  </select>

                  <button
                    type="button"
                    onClick={
                      handleSearch
                    }
                    className="rounded-xl bg-blue-600 px-6 py-3 font-bold text-white hover:bg-blue-700"
                  >
                    Search Vehicles
                  </button>
                </div>
              )}

              {/* CORPORATE */}
              {serviceType ===
                "CORPORATE" && (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
                  <input
                    value={
                      corporateCompany
                    }
                    onChange={(e) =>
                      setCorporateCompany(
                        e.target.value
                      )
                    }
                    placeholder="Company name"
                    className="field"
                  />

                  <input
                    value={pickupCity}
                    onChange={(e) =>
                      setPickupCity(
                        e.target.value
                      )
                    }
                    placeholder="Pickup city"
                    className="field"
                  />

                  <input
                    value={dropCity}
                    onChange={(e) =>
                      setDropCity(
                        e.target.value
                      )
                    }
                    placeholder="Destination"
                    className="field"
                  />

                  <input
                    type="date"
                    min={today}
                    value={date}
                    onChange={(e) =>
                      setDate(
                        e.target.value
                      )
                    }
                    className="field"
                  />

                  <input
                    type="time"
                    value={time}
                    onChange={(e) =>
                      setTime(
                        e.target.value
                      )
                    }
                    className="field"
                  />

                  <select
                    value={
                      category
                    }
                    onChange={(e) =>
                      setCategory(
                        e.target.value
                      )
                    }
                    className="field"
                  >
                    {categories.map(
                      (item) => (
                        <option
                          key={
                            item.value
                          }
                          value={
                            item.value
                          }
                        >
                          {
                            item.label
                          }
                        </option>
                      )
                    )}
                  </select>

                  <button
                    type="button"
                    onClick={
                      handleSearch
                    }
                    className="rounded-xl bg-blue-600 px-6 py-3 font-bold text-white hover:bg-blue-700"
                  >
                    Search Vehicles
                  </button>
                </div>
              )}
            </div>

            {error && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {error}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Marketplace Value */}
      <section className="mx-auto max-w-7xl px-6 py-12">
        <div className="grid gap-5 md:grid-cols-3">
          <div className="rounded-2xl border bg-white p-6">
            <h2 className="font-bold text-slate-900">
              Compare Vehicles
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Compare verified vehicles,
              categories, features and fares
              before choosing.
            </p>
          </div>

          <div className="rounded-2xl border bg-white p-6">
            <h2 className="font-bold text-slate-900">
              Compare Vendors & Drivers
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Review vendor information,
              driver details, ratings and trip
              history.
            </p>
          </div>

          <div className="rounded-2xl border bg-white p-6">
            <h2 className="font-bold text-slate-900">
              Choose Your Ride
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Select the marketplace listing
              that best matches your journey.
            </p>
          </div>
        </div>
      </section>

      <style jsx>{`
        .field {
          width: 100%;
          border-radius: 0.75rem;
          border: 1px solid rgb(226 232 240);
          background: white;
          padding: 0.75rem 1rem;
          outline: none;
          transition: all 150ms ease;
        }

        .field:focus {
          border-color: rgb(59 130 246);
          box-shadow:
            0 0 0 2px
            rgb(219 234 254);
        }
      `}</style>
    </main>
  );
}