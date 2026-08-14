"use client";

import { useEffect, useState } from "react";

export interface VehicleFormData {
  registrationNo: string;
  vehicleName: string;
  brand: string;
  model: string;
  year: string;
  vehicleType: string;
  category: string;
  fuelType: string;
  transmission: string;
  seatingCapacity: string;

  vendorId: string;
  vendorName: string;

  // Kept only for compatibility with existing page/data structures.
  // Driver assignment will NOT be handled in this form.
  driverName: string;

  city: string;
}

interface VendorOption {
  id: string;
  companyName: string;
  ownerName?: string;
  status?: string;
}

interface VehicleFormProps {
  onSave: (vehicle: VehicleFormData) => void;
  onCancel: () => void;
  initialData?: Partial<VehicleFormData>;
  saving?: boolean;
}

const emptyForm: VehicleFormData = {
  registrationNo: "",
  vehicleName: "",
  brand: "",
  model: "",
  year: "",
  vehicleType: "",
  category: "",
  fuelType: "",
  transmission: "",
  seatingCapacity: "",

  vendorId: "",
  vendorName: "",

  driverName: "",

  city: "",
};

const vehicleTypes = [
  "Sedan",
  "Hatchback",
  "SUV",
  "MUV",
  "Luxury",
  "Tempo Traveller",
  "Bus",
  "Other",
];

const categories = [
  "Sedan",
  "Hatchback",
  "SUV",
  "MUV",
  "Luxury",
  "Premium",
  "Commercial",
  "Other",
];

const fuelTypes = [
  "Petrol",
  "Diesel",
  "CNG",
  "Electric",
  "Hybrid",
];

const transmissions = [
  "Manual",
  "Automatic",
];

const seatingCapacities = [
  "2",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "12",
  "17",
  "20",
  "26",
  "32",
  "40",
  "45",
  "50",
];

export default function VehicleForm({
  onSave,
  onCancel,
  initialData,
  saving = false,
}: VehicleFormProps) {
  const [form, setForm] =
    useState<VehicleFormData>({
      ...emptyForm,
      ...initialData,
    });

  const [vendors, setVendors] =
    useState<VendorOption[]>([]);

  const [loadingVendors, setLoadingVendors] =
    useState(true);

  const [vendorError, setVendorError] =
    useState("");

  useEffect(() => {
    setForm({
      ...emptyForm,
      ...initialData,
    });
  }, [initialData]);

  /*
   * Load ONLY active vendors.
   *
   * Vehicle ownership starts with the vendor.
   * Driver assignment is intentionally not part
   * of vehicle creation.
   */
  useEffect(() => {
    let cancelled = false;

    async function loadActiveVendors() {
      try {
        setLoadingVendors(true);
        setVendorError("");

        const response = await fetch(
          "/api/vendors?status=Active&limit=100",
          {
            cache: "no-store",
          }
        );

        const result = await response.json();

        if (
          !response.ok ||
          !result.success
        ) {
          throw new Error(
            result.message ||
              "Failed to load vendors."
          );
        }

        const list = Array.isArray(
          result.data
        )
          ? result.data
          : [];

        if (!cancelled) {
          setVendors(list);
        }
      } catch (error) {
        console.error(
          "Failed to load active vendors:",
          error
        );

        if (!cancelled) {
          setVendors([]);
          setVendorError(
            "Unable to load active vendors."
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingVendors(false);
        }
      }
    }

    loadActiveVendors();

    return () => {
      cancelled = true;
    };
  }, []);

  function update(
    field: keyof VehicleFormData,
    value: string
  ) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function handleVendorChange(
    vendorId: string
  ) {
    const vendor = vendors.find(
      (item) =>
        item.id === vendorId
    );

    setForm((prev) => ({
      ...prev,
      vendorId,
      vendorName:
        vendor?.companyName || "",
    }));
  }

  function handleSubmit(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    if (!form.vendorId) {
      alert(
        "Please select an active vendor first."
      );
      return;
    }

    if (
      !form.registrationNo.trim()
    ) {
      alert(
        "Please enter registration number."
      );
      return;
    }

    if (
      !form.vehicleName.trim()
    ) {
      alert(
        "Please enter vehicle name."
      );
      return;
    }

    if (!form.vehicleType) {
      alert(
        "Please select vehicle type."
      );
      return;
    }

    if (!form.category) {
      alert(
        "Please select vehicle category."
      );
      return;
    }

    if (!form.fuelType) {
      alert(
        "Please select fuel type."
      );
      return;
    }

    if (!form.transmission) {
      alert(
        "Please select transmission."
      );
      return;
    }

    if (!form.seatingCapacity) {
      alert(
        "Please select seating capacity."
      );
      return;
    }

    onSave(form);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-8"
    >
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">

        {/* =====================================================
            VENDOR — FIRST FIELD
        ====================================================== */}
        <div className="lg:col-span-3">
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Vendor
          </label>

          <select
            value={form.vendorId}
            onChange={(e) =>
              handleVendorChange(
                e.target.value
              )
            }
            disabled={
              saving ||
              loadingVendors
            }
            className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
          >
            <option value="">
              {loadingVendors
                ? "Loading active vendors..."
                : vendors.length === 0
                ? "No active vendors available"
                : "Select Vendor"}
            </option>

            {vendors.map((vendor) => (
              <option
                key={vendor.id}
                value={vendor.id}
              >
                {vendor.companyName}
                {vendor.ownerName
                  ? ` — ${vendor.ownerName}`
                  : ""}
              </option>
            ))}
          </select>

          {vendorError && (
            <p className="mt-2 text-xs text-red-600">
              {vendorError}
            </p>
          )}

          {!loadingVendors &&
            vendors.length === 0 &&
            !vendorError && (
              <p className="mt-2 text-xs text-orange-600">
                No Active vendors found.
                Add or activate a vendor
                first.
              </p>
            )}
        </div>

        {/* =====================================================
            REGISTRATION NUMBER
        ====================================================== */}
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Registration Number
          </label>

          <input
            value={form.registrationNo}
            onChange={(e) =>
              update(
                "registrationNo",
                e.target.value.toUpperCase()
              )
            }
            disabled={saving}
            placeholder="MH12AB1234"
            className="w-full rounded-lg border border-slate-200 px-4 py-3 uppercase outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
          />
        </div>

        {/* =====================================================
            VEHICLE NAME
        ====================================================== */}
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Vehicle Name
          </label>

          <input
            value={form.vehicleName}
            onChange={(e) =>
              update(
                "vehicleName",
                e.target.value
              )
            }
            disabled={saving}
            placeholder="Swift Dzire"
            className="w-full rounded-lg border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
          />
        </div>

        {/* =====================================================
            BRAND
        ====================================================== */}
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Brand
          </label>

          <input
            value={form.brand}
            onChange={(e) =>
              update(
                "brand",
                e.target.value
              )
            }
            disabled={saving}
            placeholder="Maruti"
            className="w-full rounded-lg border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
          />
        </div>

        {/* =====================================================
            MODEL
        ====================================================== */}
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Model
          </label>

          <input
            value={form.model}
            onChange={(e) =>
              update(
                "model",
                e.target.value
              )
            }
            disabled={saving}
            placeholder="Dzire"
            className="w-full rounded-lg border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
          />
        </div>

        {/* =====================================================
            YEAR
        ====================================================== */}
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Year
          </label>

          <input
            type="number"
            min="1990"
            max={
              new Date().getFullYear() + 1
            }
            value={form.year}
            onChange={(e) =>
              update(
                "year",
                e.target.value
              )
            }
            disabled={saving}
            placeholder="2023"
            className="w-full rounded-lg border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
          />
        </div>

        {/* =====================================================
            VEHICLE TYPE
        ====================================================== */}
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Vehicle Type
          </label>

          <select
            value={form.vehicleType}
            onChange={(e) =>
              update(
                "vehicleType",
                e.target.value
              )
            }
            disabled={saving}
            className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
          >
            <option value="">
              Select Vehicle Type
            </option>

            {vehicleTypes.map(
              (type) => (
                <option
                  key={type}
                  value={type}
                >
                  {type}
                </option>
              )
            )}
          </select>
        </div>

        {/* =====================================================
            CATEGORY
        ====================================================== */}
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Category
          </label>

          <select
            value={form.category}
            onChange={(e) =>
              update(
                "category",
                e.target.value
              )
            }
            disabled={saving}
            className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
          >
            <option value="">
              Select Category
            </option>

            {categories.map(
              (category) => (
                <option
                  key={category}
                  value={category}
                >
                  {category}
                </option>
              )
            )}
          </select>
        </div>

        {/* =====================================================
            FUEL TYPE
        ====================================================== */}
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Fuel Type
          </label>

          <select
            value={form.fuelType}
            onChange={(e) =>
              update(
                "fuelType",
                e.target.value
              )
            }
            disabled={saving}
            className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
          >
            <option value="">
              Select Fuel Type
            </option>

            {fuelTypes.map(
              (fuel) => (
                <option
                  key={fuel}
                  value={fuel}
                >
                  {fuel}
                </option>
              )
            )}
          </select>
        </div>

        {/* =====================================================
            TRANSMISSION
        ====================================================== */}
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Transmission
          </label>

          <select
            value={form.transmission}
            onChange={(e) =>
              update(
                "transmission",
                e.target.value
              )
            }
            disabled={saving}
            className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
          >
            <option value="">
              Select Transmission
            </option>

            {transmissions.map(
              (transmission) => (
                <option
                  key={transmission}
                  value={transmission}
                >
                  {transmission}
                </option>
              )
            )}
          </select>
        </div>

        {/* =====================================================
            SEATING CAPACITY
        ====================================================== */}
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Seating Capacity
          </label>

          <select
            value={form.seatingCapacity}
            onChange={(e) =>
              update(
                "seatingCapacity",
                e.target.value
              )
            }
            disabled={saving}
            className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
          >
            <option value="">
              Select Seating Capacity
            </option>

            {seatingCapacities.map(
              (capacity) => (
                <option
                  key={capacity}
                  value={capacity}
                >
                  {capacity} Seats
                </option>
              )
            )}
          </select>
        </div>

        {/* =====================================================
            CITY
        ====================================================== */}
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            City
          </label>

          <input
            value={form.city}
            onChange={(e) =>
              update(
                "city",
                e.target.value
              )
            }
            disabled={saving}
            placeholder="Pune"
            className="w-full rounded-lg border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
          />
        </div>
      </div>

      {/* =======================================================
          VENDOR RELATIONSHIP
      ======================================================== */}
      <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3">
        <p className="text-sm text-blue-800">
          <strong>Vendor-managed vehicle:</strong>{" "}
          {form.vendorName
            ? `This vehicle will be associated with ${form.vendorName}.`
            : "Select an active vendor to associate this vehicle."}
        </p>
      </div>

      {/* =======================================================
          FOOTER
      ======================================================== */}
      <div className="flex justify-end gap-3 border-t pt-6">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="rounded-lg border px-6 py-3 hover:bg-slate-100 disabled:opacity-50"
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={
            saving ||
            loadingVendors ||
            !form.vendorId
          }
          className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving
            ? "Saving..."
            : "Save Vehicle"}
        </button>
      </div>
    </form>
  );
}