"use client";

import { useEffect, useMemo, useState } from "react";

type Vendor = {
  id: string;
  companyName?: string;
  name?: string;
};

type Driver = {
  id: string;
  name: string;
  email?: string;
  mobile?: string | null;
};

type Vehicle = {
  id: string;
  registrationNumber: string;
  make: string;
  model: string;
  variant?: string | null;
  category: string;
  fuelType: string;
  transmission: string;
  seatingCapacity: number;
  luggageCapacity?: number | null;
  homeCity: string;
  status: string;
  driver: Driver | null;
};

type PricingPackage = {
  id: string;
  packageType: string;
  packageName: string;
  fromCity?: string | null;
  toCity?: string | null;
  extraPickupCharge?: number | string | null;
  extraDropCharge?: number | string | null;
  city: string;
  includedHours?: number | null;
  includedKm?: number | null;
  baseFare: number | string;
  extraKmRate?: number | string | null;
  extraHourRate?: number | string | null;
  driverAllowance?: number | string | null;
  nightCharge?: number | string | null;
  tollCharge?: number | string | null;
  parkingCharge?: number | string | null;
  otherCharges?: number | string | null;
  airportName?: string | null;
  transferDirection?: string | null;
  isActive: boolean;
};

const routeCities = [
  "Pune",
  "Mumbai",
  "Nashik",
  "Nagpur",
  "Aurangabad",
  "Kolhapur",
  "Satara",
  "Ahmednagar",
  "Solapur",
  "Goa",
  "Hyderabad",
  "Bengaluru",
  "Indore",
  "Surat",
  "Ahmedabad",
];
const pricingTypes = [
  "LOCAL",
  "OUTSTATION",
  "AIRPORT",
];

const cities = [
  "Pune",
  "Mumbai",
  "Nashik",
  "Nagpur",
  "Aurangabad",
  "Kolhapur",
  "Sangli",
  "Satara",
  "Ahmednagar",
  "Solapur",
  "Thane",
  "Navi Mumbai",
  "Delhi",
  "Bengaluru",
  "Hyderabad",
  "Chennai",
  "Kolkata",
  "Ahmedabad",
  "Jaipur",
  "Other",
];

const localPackages = [
  {
    value: "8 Hrs / 80 KM",
    label: "8 Hrs / 80 KM",
    hours: 8,
    km: 80,
  },
  {
    value: "12 Hrs / 120 KM",
    label: "12 Hrs / 120 KM",
    hours: 12,
    km: 120,
  },
];

const initialForm = {
  city: "",
  pricingType: "LOCAL",
  tripType: "ONEWAY",
  packageType: "LOCAL_PACKAGE",
  packageName: "",
  fromCity: "",
  toCity: "",
  extraPickupCharge: "",
  extraDropCharge: "",
  includedHours: "",
  includedKm: "",
  baseFare: "",
  extraKmRate: "",
  extraHourRate: "",
  driverAllowance: "",
  nightCharge: "",
  tollCharge: "",
  parkingCharge: "",
  otherCharges: "",
  airportName: "",
  transferDirection: "PICKUP",
  isActive: true,
};

export default function PricingPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [packages, setPackages] = useState<PricingPackage[]>([]);

  const [vendorId, setVendorId] = useState("");
  const [vehicleId, setVehicleId] = useState("");

  const [form, setForm] = useState(initialForm);

  const [loading, setLoading] = useState(false);
  const [loadingVehicles, setLoadingVehicles] = useState(false);
  const [message, setMessage] = useState("");

  const selectedVehicle = useMemo(
    () =>
      vehicles.find(
        (vehicle) => vehicle.id === vehicleId
      ) ?? null,
    [vehicles, vehicleId]
  );

  async function loadVendors() {
    try {
      const response = await fetch("/api/vendors");

      const json = await response.json();

      const data = Array.isArray(json)
        ? json
        : Array.isArray(json?.data)
          ? json.data
          : Array.isArray(json?.data?.vendors)
            ? json.data.vendors
            : [];

      setVendors(data);
    } catch {
      setMessage("Unable to load vendors.");
    }
  }

  async function loadVehicles(selectedVendorId: string) {
    if (!selectedVendorId) {
      setVehicles([]);
      setVehicleId("");
      return;
    }

    setLoadingVehicles(true);
    setMessage("");

    try {
      const response = await fetch(
        `/api/pricing/vehicles?vendorId=${encodeURIComponent(
          selectedVendorId
        )}`
      );

      const json = await response.json();

      if (!response.ok) {
        throw new Error(
          json?.message || "Unable to load vehicles."
        );
      }

      setVehicles(
        Array.isArray(json?.data)
          ? json.data
          : []
      );

      setVehicleId("");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to load vehicles."
      );
    } finally {
      setLoadingVehicles(false);
    }
  }

  async function loadPackages(
    selectedVendorId: string,
    selectedVehicleId: string
  ) {
    if (
      !selectedVendorId ||
      !selectedVehicleId
    ) {
      setPackages([]);
      return;
    }

    try {
      const response = await fetch(
        `/api/pricing/packages?vendorId=${encodeURIComponent(
          selectedVendorId
        )}&vehicleId=${encodeURIComponent(
          selectedVehicleId
        )}`
      );

      const json = await response.json();

      if (!response.ok) {
        throw new Error(
          json?.message ||
            "Unable to load pricing packages."
        );
      }

      setPackages(
        Array.isArray(json?.data)
          ? json.data
          : []
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to load pricing packages."
      );
    }
  }

  useEffect(() => {
    void loadVendors();
  }, []);

  useEffect(() => {
    void loadVehicles(vendorId);
  }, [vendorId]);

  useEffect(() => {
    void loadPackages(
      vendorId,
      vehicleId
    );
  }, [vendorId, vehicleId]);

  function update(
    field: keyof typeof initialForm,
    value: string | boolean
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function changeVehicle(value: string) {
    setVehicleId(value);

    setForm({
      ...initialForm,
      city: "",
    });

    setMessage("");
  }

  function changePricingType(value: string) {
    setForm((current) => ({
      ...current,
      pricingType: value,
      tripType:
        value === "OUTSTATION"
          ? "ONEWAY"
          : "ONEWAY",
      packageType:
        value === "LOCAL"
          ? "LOCAL_PACKAGE"
          : value,
      packageName: "",
  fromCity: "",
  toCity: "",
  extraPickupCharge: "",
  extraDropCharge: "",
      includedHours: "",
      includedKm: "",
      airportName: "",
      transferDirection: "PICKUP",
    }));
  }

  function changeLocalPackage(value: string) {
    const pkg = localPackages.find(
      (item) => item.value === value
    );

    setForm((current) => ({
      ...current,
      packageName: value,
      includedHours: pkg
        ? String(pkg.hours)
        : "",
      includedKm: pkg
        ? String(pkg.km)
        : "",
    }));
  }

  async function savePackage() {
    setMessage("");

    if (!vendorId) {
      setMessage("Select a vendor first.");
      return;
    }

    if (!vehicleId) {
      setMessage("Select a vehicle first.");
      return;
    }

    if (
      form.pricingType !== "OUTSTATION" ||
      form.tripType !== "ONEWAY"
    ) {
      if (!form.city) {
        setMessage("Select a pricing city.");
        return;
      }
    }

    if (
      form.pricingType !== "OUTSTATION" ||
      form.tripType !== "ONEWAY"
    ) {
      if (!form.packageName.trim()) {
        setMessage(
          "Select or enter a package name."
        );
        return;
      }
    }

    if (
      !form.baseFare ||
      Number(form.baseFare) < 0
    ) {
      setMessage(
        "Valid base package price is required."
      );
      return;
    }

    if (
      form.pricingType === "AIRPORT" &&
      !form.airportName.trim()
    ) {
      setMessage(
        "Airport / Terminal is required."
      );
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        "/api/pricing/packages",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            vendorId,
            vehicleId,
            city:
              form.pricingType === "OUTSTATION" &&
              form.tripType === "ONEWAY"
                ? form.fromCity
                : form.city,
                        fromCity:
              form.pricingType === "OUTSTATION" &&
              form.tripType === "ONEWAY"
                ? form.fromCity
                : null,

            toCity:
              form.pricingType === "OUTSTATION" &&
              form.tripType === "ONEWAY"
                ? form.toCity
                : null,
pricingType:
              form.pricingType,
            tripType:
              form.pricingType ===
              "OUTSTATION"
                ? form.tripType
                : "ONEWAY",
            chargeType: "FIXED",
            packageType:
              form.packageType,
            packageName:
              form.pricingType === "OUTSTATION" &&
              form.tripType === "ONEWAY"
                ? form.fromCity + " to " + form.toCity
                : form.packageName.trim(),
            includedHours:
              form.includedHours,
            includedKm:
              form.includedKm,
            baseFare:
              Number(form.baseFare),
            extraKmRate:
              form.extraKmRate,
            extraHourRate:
              form.extraHourRate,
            driverAllowance:
              form.pricingType === "LOCAL"
                ? null
                : form.driverAllowance,

            nightCharge:
              form.pricingType === "LOCAL"
                ? null
                : form.nightCharge,
            tollCharge:
              form.pricingType === "LOCAL"
                ? null
                : form.tollCharge,

            parkingCharge:
              form.pricingType === "LOCAL"
                ? null
                : form.parkingCharge,

            otherCharges:
              form.pricingType === "LOCAL"
                ? null
                : form.otherCharges,
            airportName:
              form.airportName,
            transferDirection:
              form.transferDirection,
            isActive:
              form.isActive,
          }),
        }
      );

      const json =
        await response.json();

      if (!response.ok) {
        throw new Error(
          json?.message ||
            "Failed to save pricing structure."
        );
      }

      setMessage(
        "Pricing structure saved successfully."
      );

      await loadPackages(
        vendorId,
        vehicleId
      );

      setForm({
        ...initialForm,
        city: form.city,
        pricingType:
          form.pricingType,
      });
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Failed to save pricing structure."
      );
    } finally {
      setLoading(false);
    }
  }

  const cityOptions = useMemo(() => {
    const vehicleCity =
      selectedVehicle?.homeCity;

    const values = [
      ...cities,
      ...(vehicleCity ? [vehicleCity] : []),
    ];

    return Array.from(
      new Set(values)
    ).sort();
  }, [selectedVehicle]);

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">

        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Pricing Management
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Configure transparent, vehicle-level pricing by city and service type.
          </p>
        </div>

        {message && (
          <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
            {message}
          </div>
        )}

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">

          <h2 className="text-lg font-semibold text-slate-900">
            Vehicle Pricing Configuration
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Vendor → Vehicle → Assigned Driver → City → Pricing Structure
          </p>

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">

            <Select
              label="Vendor"
              value={vendorId}
              onChange={(value) =>
                setVendorId(value)
              }
              options={[
                {
                  value: "",
                  label: "Select Vendor",
                },
                ...vendors.map(
                  (vendor) => ({
                    value: vendor.id,
                    label:
                      vendor.companyName ||
                      vendor.name ||
                      vendor.id,
                  })
                ),
              ]}
            />

            <Select
              label="Vehicle"
              value={vehicleId}
              disabled={
                !vendorId ||
                loadingVehicles
              }
              onChange={changeVehicle}
              options={[
                {
                  value: "",
                  label:
                    loadingVehicles
                      ? "Loading vehicles..."
                      : "Select Vehicle",
                },
                ...vehicles.map(
                  (vehicle) => ({
                    value: vehicle.id,
                    label: `${vehicle.registrationNumber} — ${vehicle.make} ${vehicle.model}`,
                  })
                ),
              ]}
            />

            <Select
              label="Pricing City"
              value={form.city}
              disabled={!vehicleId}
              onChange={(value) =>
                update("city", value)
              }
              options={[
                {
                  value: "",
                  label: "Select City",
                },
                ...cityOptions.map(
                  (city) => ({
                    value: city,
                    label: city,
                  })
                ),
              ]}
            />

          </div>

          {selectedVehicle && (
            <div className="mt-6 rounded-lg bg-slate-50 p-5">

              <h3 className="font-semibold text-slate-900">
                Selected Vehicle
              </h3>

              <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">

                <Info
                  label="Vehicle"
                  value={`${selectedVehicle.make} ${selectedVehicle.model}`}
                />

                <Info
                  label="Registration"
                  value={
                    selectedVehicle.registrationNumber
                  }
                />

                <Info
                  label="Category"
                  value={
                    selectedVehicle.category
                  }
                />

                <Info
                  label="Driver"
                  value={
                    selectedVehicle.driver?.name ||
                    "Not Assigned"
                  }
                />

                <Info
                  label="Fuel"
                  value={
                    selectedVehicle.fuelType
                  }
                />

                <Info
                  label="Transmission"
                  value={
                    selectedVehicle.transmission
                  }
                />

                <Info
                  label="Seats"
                  value={String(
                    selectedVehicle.seatingCapacity
                  )}
                />

                <Info
                  label="Home City"
                  value={
                    selectedVehicle.homeCity
                  }
                />

              </div>
            </div>
          )}

        </section>

        {selectedVehicle && (
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">

            <h2 className="text-lg font-semibold text-slate-900">
              Pricing Structure
            </h2>

            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">

              <Select
                label="Pricing Type"
                value={form.pricingType}
                onChange={
                  changePricingType
                }
                options={pricingTypes.map(
                  (value) => ({
                    value,
                    label: value,
                  })
                )}
              />

              {form.pricingType ===
                "OUTSTATION" && (
                <Select
                  label="Outstation Trip Type"
                  value={form.tripType}
                  onChange={(value) =>
                    update(
                      "tripType",
                      value
                    )
                  }
                  options={[
                    {
                      value: "ONEWAY",
                      label: "One Way",
                    },
                    {
                      value: "ROUNDTRIP",
                      label: "Round Trip",
                    },
                  ]}
                />
              )}

              {form.pricingType ===
                "LOCAL" && (
                <Select
                  label="Local Package"
                  value={
                    form.packageName
                  }
                  onChange={
                    changeLocalPackage
                  }
                  options={[
                    {
                      value: "",
                      label:
                        "Select Local Package",
                    },
                    ...localPackages.map(
                      (pkg) => ({
                        value:
                          pkg.value,
                        label:
                          pkg.label,
                      })
                    ),
                  ]}
                />
              )}

              
{form.pricingType === "OUTSTATION" &&
                form.tripType === "ONEWAY" && (
                <div className="mt-6 rounded-lg border border-slate-200 p-5">
                  <h3 className="text-lg font-semibold text-slate-900">
                    OUTSTATION ONEWAY ROUTE
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    Create a fixed fare for a specific city-to-city route.
                  </p>

                  <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">

                    <Select
                      label="From City"
                      value={form.fromCity}
                      onChange={(value) =>
                        update("fromCity", value)
                      }
                      options={routeCities.map((city) => ({
                        label: city,
                        value: city,
                      }))}
                    />

                    <Select
                      label="To City"
                      value={form.toCity}
                      onChange={(value) =>
                        update("toCity", value)
                      }
                      options={routeCities
                        .filter(
                          (city) =>
                            city !== form.fromCity
                        )
                        .map((city) => ({
                          label: city,
                          value: city,
                        }))}
                    />

                    <Input
                      label="Fixed Route Fare"
                      value={form.baseFare}
                      onChange={(value) =>
                        update("baseFare", value)
                      }
                      placeholder="₹ 0.00"
                      required
                    />

                  </div>

                  <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4">
                    <h4 className="font-semibold text-slate-900">
                      Important Note
                    </h4>

                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
                      <li>
                        Route fare is fixed for the selected From City → To City.
                      </li>
                      <li>
                        Extra pickup and extra drop charges are additional.
                      </li>
                      <li>
                        Toll, Parking and Other Charges are extra.
                      </li>
                      <li>
                        These charges are paid directly to the driver.
                      </li>
                      <li>
                        RideGrid does not calculate these charges in the route fare.
                      </li>
                    </ul>
                  </div>
                </div>
              )}

{form.pricingType ===
                "AIRPORT" && (
                <>
                  <Input
                    label="Airport / Terminal"
                    value={
                      form.airportName
                    }
                    onChange={(value) =>
                      update(
                        "airportName",
                        value
                      )
                    }
                    placeholder="Pune Airport"
                  />

                  <Select
                    label="Transfer Direction"
                    value={
                      form.transferDirection
                    }
                    onChange={(value) =>
                      update(
                        "transferDirection",
                        value
                      )
                    }
                    options={[
                      {
                        value:
                          "PICKUP",
                        label:
                          "Airport Pickup",
                      },
                      {
                        value:
                          "DROP",
                        label:
                          "Airport Drop",
                      },
                    ]}
                  /><Input
                    label="Package Name"
                    value={
                      form.packageName
                    }
                    onChange={(value) =>
                      update(
                        "packageName",
                        value
                      )
                    }
                    placeholder="Airport Transfer"
                  />
                </>
              )}

            </div>

            {(form.pricingType === "LOCAL" || form.pricingType === "AIRPORT" || (form.pricingType === "OUTSTATION" && form.tripType === "ROUNDTRIP")) && (
              <div className="mt-6 rounded-lg border border-slate-200 p-5">

                <h3 className="font-semibold">
                  Fare Structure
                </h3>

                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-4">

                  <Input
                    label="Included Hours"
                    value={
                      form.includedHours
                    }
                    onChange={(value) =>
                      update(
                        "includedHours",
                        value
                      )
                    }
                  />

                  <Input
                    label="Included KM"
                    value={
                      form.includedKm
                    }
                    onChange={(value) =>
                      update(
                        "includedKm",
                        value
                      )
                    }
                  />

                  <Input
                    label="Base Package Price"
                    value={
                      form.baseFare
                    }
                    onChange={(value) =>
                      update(
                        "baseFare",
                        value
                      )
                    }
                    required
                  />

                  <Input
                    label="Extra KM Cost"
                    value={
                      form.extraKmRate
                    }
                    onChange={(value) =>
                      update(
                        "extraKmRate",
                        value
                      )
                    }
                  />

                  <Input
                    label="Extra Hour Cost"
                    value={
                      form.extraHourRate
                    }
                    onChange={(value) =>
                      update(
                        "extraHourRate",
                        value
                      )
                    }
                  />

                </div>
              </div>
            )}


              {form.pricingType === "LOCAL" && (
                <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
                  <h3 className="font-semibold text-slate-900">
                    Important Note
                  </h3>

                  <ul className="mt-2 space-y-1 text-sm text-slate-600">
                    <li>
                      • Toll, Parking and Other Charges are extra.
                    </li>
                    <li>
                      • These charges are not included in the base package price.
                    </li>
                    <li>
                      • These amounts are paid directly to the driver during the trip.
                    </li>
                    <li>
                      • RideGrid does not calculate or include these charges in the package fare.
                    </li>
                  </ul>
                </div>
              )}
                        <div className="mt-6 flex justify-end">

              <button
                type="button"
                disabled={loading}
                onClick={() =>
                  void savePackage()
                }
                className="rounded-lg bg-slate-900 px-8 py-3 text-sm font-semibold text-white disabled:opacity-50"
              >
                {loading
                  ? "Saving..."
                  : "Save Pricing Structure"}
              </button>

            </div>

          </section>
        )}

        {selectedVehicle && (
          <section className="rounded-xl border border-slate-200 bg-white shadow-sm">

            <div className="border-b border-slate-200 px-6 py-4">
              <h2 className="font-semibold text-slate-900">
                Existing Pricing Structures
              </h2>
            </div>

            {packages.length === 0 ? (
              <div className="p-6 text-sm text-slate-500">
                No pricing structure configured for this vehicle.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1400px] text-left text-sm">

                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-3">City</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Package</th>
                      <th className="px-4 py-3">Hours</th>
                      <th className="px-4 py-3">KM</th>
                      <th className="px-4 py-3">Base</th>
                      <th className="px-4 py-3">Extra KM</th>
                      <th className="px-4 py-3">Extra Hour</th>
                      <th className="px-4 py-3">Toll</th>
                      <th className="px-4 py-3">Parking</th>
                      <th className="px-4 py-3">Other</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">

                    {packages.map(
                      (item) => (
                        <tr key={item.id}>

                          <td className="px-4 py-3 font-medium">
                            {item.city}
                          </td>

                          <td className="px-4 py-3">
                            {item.packageType}
                          </td>

                          <td className="px-4 py-3 font-medium">
                            {item.packageName}
                          </td>

                          <td className="px-4 py-3">
                            {item.includedHours ?? "-"}
                          </td>

                          <td className="px-4 py-3">
                            {item.includedKm ?? "-"}
                          </td>

                          <td className="px-4 py-3">
                            ₹{Number(
                              item.baseFare
                            ).toFixed(2)}
                          </td>

                          <td className="px-4 py-3">
                            {item.extraKmRate != null
                              ? `₹${Number(item.extraKmRate).toFixed(2)}`
                              : "-"}
                          </td>

                          <td className="px-4 py-3">
                            {item.extraHourRate != null
                              ? `₹${Number(item.extraHourRate).toFixed(2)}`
                              : "-"}
                          </td>

                          <td className="px-4 py-3">
                            {item.tollCharge != null
                              ? `₹${Number(item.tollCharge).toFixed(2)}`
                              : "-"}
                          </td>

                          <td className="px-4 py-3">
                            {item.parkingCharge != null
                              ? `₹${Number(item.parkingCharge).toFixed(2)}`
                              : "-"}
                          </td>

                          <td className="px-4 py-3">
                            {item.otherCharges != null
                              ? `₹${Number(item.otherCharges).toFixed(2)}`
                              : "-"}
                          </td>

                          <td className="px-4 py-3">
                            <span
                              className={
                                item.isActive
                                  ? "rounded-full bg-green-100 px-2 py-1 text-xs text-green-700"
                                  : "rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-500"
                              }
                            >
                              {item.isActive
                                ? "ACTIVE"
                                : "INACTIVE"}
                            </span>
                          </td>

                        </tr>
                      )
                    )}

                  </tbody>
                </table>
              </div>
            )}

          </section>
        )}

      </div>
    </main>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: {
    value: string;
    label: string;
  }[];
  disabled?: boolean;
}) {
  return (
    <label className="space-y-1">
      <span className="text-xs font-medium text-slate-600">
        {label}
      </span>

      <select
        value={value}
        disabled={disabled}
        onChange={(event) =>
          onChange(
            event.target.value
          )
        }
        className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm disabled:bg-slate-100"
      >
        {options.map(
          (option) => (
            <option
              key={option.value}
              value={option.value}
            >
              {option.label}
            </option>
          )
        )}
      </select>
    </label>
  );
}

function Input({
  label,
  value,
  onChange,
  placeholder,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="space-y-1">
      <span className="text-xs font-medium text-slate-600">
        {label}
      </span>

      <input
        type={
          label.toLowerCase().includes("name") ||
          label.toLowerCase().includes("airport")
            ? "text"
            : "number"
        }
        min="0"
        step="0.01"
        value={value}
        required={required}
        placeholder={placeholder}
        onChange={(event) =>
          onChange(
            event.target.value
          )
        }
        className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
      />
    </label>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <div className="text-[11px] uppercase text-slate-400">
        {label}
      </div>

      <div className="mt-1 font-medium text-slate-700">
        {value}
      </div>
    </div>
  );
}













