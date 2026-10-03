"use client";

import { useEffect, useState } from "react";

export interface VehicleFormData {
  registrationNo: string;
  brand: string;
  model: string;
  year: string;
  category: string;
  fuelType: string;
  transmission: string;
  seatingCapacity: string;
  vendorId: string;
  vendorName: string;
  driverName: string;
  city: string;

  documents: {
    rc: File | null;
    insurance: File | null;
    permit: File | null;
    fitness: File | null;
    pollution: File | null;
    tax: File | null;
    fastag: File | null;
    other: File | null;
  };

  photos: {
    main: File | null;
    exterior: File | null;
    interior: File | null;
    other: File | null;
  };
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
  brand: "",
  model: "",
  year: "",
  category: "",
  fuelType: "",
  transmission: "",
  seatingCapacity: "",
  vendorId: "",
  vendorName: "",
  driverName: "",
  city: "",

  documents: {
    rc: null,
    insurance: null,
    permit: null,
    fitness: null,
    pollution: null,
    tax: null,
    fastag: null,
    other: null,
  },

  photos: {
    main: null,
    exterior: null,
    interior: null,
    other: null,
  },
};

const vehicleModels: Record<string, string[]> = {
  Tata: [
    "Tiago","Tigor","Altroz","Punch","Nexon","Curvv",
    "Harrier","Safari","Xpres-T","Winger","Magic",
    "Ace","Intra","Ultra"
  ],
  Mahindra: [
    "Bolero","Bolero Neo","Scorpio","Scorpio-N","XUV300",
    "XUV 3XO","XUV400","XUV700","Thar","Marazzo",
    "Jeeto","Supro","Bolero Camper"
  ],
  Maruti: [
    "Alto K10","S-Presso","Celerio","Wagon R","Swift",
    "Dzire","Baleno","Fronx","Brezza","Ertiga",
    "XL6","Invicto","Eeco","Grand Vitara"
  ],
  Hyundai: [
    "Grand i10 Nios","i20","Aura","Exter","Venue",
    "Creta","Alcazar","Verna","Tucson","Ioniq 5"
  ],
  Toyota: [
    "Glanza","Urban Cruiser Hyryder","Rumion",
    "Innova Crysta","Innova Hycross","Fortuner",
    "Camry","Vellfire"
  ],
  Kia: [
    "Sonet","Seltos","Carens","Carnival","EV6"
  ],
  Honda: [
    "Amaze","City","Elevate"
  ],
  Renault: [
    "Kwid","Triber","Kiger"
  ],
  Nissan: [
    "Magnite","X-Trail"
  ],
  Volkswagen: [
    "Polo","Virtus","Taigun","Tiguan"
  ],
  Skoda: [
    "Slavia","Kushaq","Kodiaq","Superb"
  ],
  MG: [
    "Comet EV","Astor","Hector","Gloster","Windsor EV"
  ],
  Jeep: [
    "Compass","Meridian","Wrangler","Grand Cherokee"
  ],
  Force: [
    "Gurkha","Trax Cruiser","Urbania","Traveller"
  ],
  Isuzu: [
    "D-Max","V-Cross","MU-X"
  ],
  Citroen: [
    "C3","C3 Aircross","C5 Aircross","Basalt"
  ],
  BYD: [
    "Atto 3","E6","Seal","Sealion 7"
  ],
  "Mercedes-Benz": [
    "A-Class","C-Class","E-Class","S-Class",
    "GLA","GLC","GLE","GLS","V-Class"
  ],
  BMW: [
    "2 Series","3 Series","5 Series","7 Series",
    "X1","X3","X5","X7"
  ],
  Audi: [
    "A4","A6","A8","Q3","Q5","Q7","Q8"
  ],
  Volvo: [
    "XC40","XC60","XC90","S90","C40"
  ],
};

const brands = Object.keys(vehicleModels).sort();

const categories = [
  "Hatchback",
  "Sedan",
  "SUV",
  "MUV",
  "Luxury",
  "Tempo Traveller",
  "Mini Bus",
  "Bus",
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
  "2","4","5","6","7","8","9",
  "12","17","20","26","32","40","45","50",
];

const indianCities = [
  "Ahmedabad","Agra","Amritsar","Aurangabad","Bengaluru",
  "Bhopal","Bhubaneswar","Chandigarh","Chennai","Coimbatore",
  "Dehradun","Delhi","Faridabad","Goa","Gurugram",
  "Guwahati","Hyderabad","Indore","Jaipur","Jalandhar",
  "Jammu","Kanpur","Kochi","Kolkata","Lucknow",
  "Ludhiana","Madurai","Meerut","Mumbai","Mysuru",
  "Nagpur","Nashik","Noida","Patna","Pune",
  "Rajkot","Ranchi","Surat","Thane","Thiruvananthapuram",
  "Udaipur","Vadodara","Varanasi","Vijayawada","Visakhapatnam"
].sort();

const documentFields = [
  ["rc", "Registration Certificate (RC)"],
  ["insurance", "Insurance Policy"],
  ["permit", "National Permit"],
  ["fitness", "Fitness Certificate"],
  ["pollution", "Pollution Certificate"],
  ["tax", "Road Tax Receipt"],
  ["fastag", "FASTag Details"],
  ["other", "Other Documents"],
] as const;

const photoFields = [
  ["main", "Main Car Profile Photo"],
  ["exterior", "Exterior Photo"],
  ["interior", "Interior Photo"],
  ["other", "Other Photo"],
] as const;

export default function VehicleForm({
  onSave,
  onCancel,
  initialData,
  saving = false,
}: VehicleFormProps) {
  const [form, setForm] = useState<VehicleFormData>({
    ...emptyForm,
    ...initialData,
    documents: {
      ...emptyForm.documents,
      ...(initialData?.documents || {}),
    },
    photos: {
      ...emptyForm.photos,
      ...(initialData?.photos || {}),
    },
  });

  const [vendors, setVendors] = useState<VendorOption[]>([]);
  const [loadingVendors, setLoadingVendors] = useState(true);
  const [vendorError, setVendorError] = useState("");

  useEffect(() => {
    setForm({
      ...emptyForm,
      ...initialData,
      documents: {
        ...emptyForm.documents,
        ...(initialData?.documents || {}),
      },
      photos: {
        ...emptyForm.photos,
        ...(initialData?.photos || {}),
      },
    });
  }, [initialData]);

  useEffect(() => {
    let cancelled = false;

    async function loadActiveVendors() {
      try {
        setLoadingVendors(true);
        setVendorError("");

        const response = await fetch(
          "/api/vendors?status=Active&limit=100",
          { cache: "no-store" }
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(
            result.message || "Failed to load vendors."
          );
        }

        if (!cancelled) {
          setVendors(
            Array.isArray(result.data) ? result.data : []
          );
        }
      } catch (error) {
        console.error(error);

        if (!cancelled) {
          setVendors([]);
          setVendorError("Unable to load active vendors.");
        }
      } finally {
        if (!cancelled) setLoadingVendors(false);
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
      ...(field === "brand"
        ? { model: "" }
        : {}),
    }));
  }

  function updateDocument(
    field: keyof VehicleFormData["documents"],
    file: File | null
  ) {
    setForm((prev) => ({
      ...prev,
      documents: {
        ...prev.documents,
        [field]: file,
      },
    }));
  }

  function updatePhoto(
    field: keyof VehicleFormData["photos"],
    file: File | null
  ) {
    setForm((prev) => ({
      ...prev,
      photos: {
        ...prev.photos,
        [field]: file,
      },
    }));
  }

  function handleVendorChange(vendorId: string) {
    const vendor = vendors.find(
      (item) => item.id === vendorId
    );

    setForm((prev) => ({
      ...prev,
      vendorId,
      vendorName: vendor?.companyName || "",
    }));
  }

  function handleSubmit(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    if (!form.vendorId) {
      alert("Please select an active vendor first.");
      return;
    }

    if (!form.registrationNo.trim()) {
      alert("Please enter registration number.");
      return;
    }

    if (!form.brand) {
      alert("Please select vehicle brand.");
      return;
    }

    if (!form.model) {
      alert("Please select vehicle model.");
      return;
    }

    if (!form.category) {
      alert("Please select vehicle category.");
      return;
    }

    if (!form.fuelType) {
      alert("Please select fuel type.");
      return;
    }

    if (!form.transmission) {
      alert("Please select transmission.");
      return;
    }

    if (!form.seatingCapacity) {
      alert("Please select seating capacity.");
      return;
    }

    if (!form.city) {
      alert("Please select city.");
      return;
    }

    onSave(form);
  }

  const models = form.brand
    ? vehicleModels[form.brand] || []
    : [];

  const inputClass =
    "w-full rounded-lg border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100";

  const labelClass =
    "mb-2 block text-sm font-semibold text-slate-700";

  return (
    <form onSubmit={handleSubmit} className="space-y-8">

      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">

        <div className="lg:col-span-3">
          <label className={labelClass}>Vendor</label>

          <select
            value={form.vendorId}
            onChange={(e) =>
              handleVendorChange(e.target.value)
            }
            disabled={saving || loadingVendors}
            className={inputClass}
          >
            <option value="">
              {loadingVendors
                ? "Loading active vendors..."
                : vendors.length
                ? "Select Vendor"
                : "No active vendors available"}
            </option>

            {vendors.map((vendor) => (
              <option key={vendor.id} value={vendor.id}>
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
        </div>

        <div>
          <label className={labelClass}>
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
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Brand</label>

          <select
            value={form.brand}
            onChange={(e) =>
              update("brand", e.target.value)
            }
            disabled={saving}
            className={inputClass}
          >
            <option value="">Select Brand</option>

            {brands.map((brand) => (
              <option key={brand} value={brand}>
                {brand}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass}>Model</label>

          <select
            value={form.model}
            onChange={(e) =>
              update("model", e.target.value)
            }
            disabled={saving || !form.brand}
            className={inputClass}
          >
            <option value="">
              {form.brand
                ? "Select Model"
                : "Select Brand First"}
            </option>

            {models.map((model) => (
              <option key={model} value={model}>
                {model}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass}>Year</label>

          <input
            type="number"
            min="1990"
            max={new Date().getFullYear() + 1}
            value={form.year}
            onChange={(e) =>
              update("year", e.target.value)
            }
            disabled={saving}
            placeholder="2023"
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Category</label>

          <select
            value={form.category}
            onChange={(e) =>
              update("category", e.target.value)
            }
            disabled={saving}
            className={inputClass}
          >
            <option value="">Select Category</option>

            {categories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass}>Fuel Type</label>

          <select
            value={form.fuelType}
            onChange={(e) =>
              update("fuelType", e.target.value)
            }
            disabled={saving}
            className={inputClass}
          >
            <option value="">Select Fuel Type</option>

            {fuelTypes.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass}>Transmission</label>

          <select
            value={form.transmission}
            onChange={(e) =>
              update("transmission", e.target.value)
            }
            disabled={saving}
            className={inputClass}
          >
            <option value="">Select Transmission</option>

            {transmissions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass}>
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
            className={inputClass}
          >
            <option value="">
              Select Seating Capacity
            </option>

            {seatingCapacities.map((item) => (
              <option key={item} value={item}>
                {item} Seats
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass}>City</label>

          <select
            value={form.city}
            onChange={(e) =>
              update("city", e.target.value)
            }
            disabled={saving}
            className={inputClass}
          >
            <option value="">Select City</option>

            {indianCities.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
        </div>
      </div>

      <section className="border-t pt-7">
        <div className="mb-5">
          <h3 className="text-lg font-bold text-slate-900">
            Vehicle Documents
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            Upload vehicle compliance and verification documents.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {documentFields.map(([field, label]) => (
            <div
              key={field}
              className="rounded-xl border border-slate-200 bg-slate-50 p-4"
            >
              <label className={labelClass}>
                {label}
              </label>

              <input
                type="file"
                accept=".jpg,.jpeg,.png,.pdf"
                disabled={saving}
                onChange={(e) =>
                  updateDocument(
                    field,
                    e.target.files?.[0] || null
                  )
                }
                className={inputClass}
              />

              {form.documents[field] && (
                <p className="mt-2 text-xs font-medium text-green-600">
                  ? {form.documents[field]?.name}
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="border-t pt-7">
        <div className="mb-5">
          <h3 className="text-lg font-bold text-slate-900">
            Vehicle Photos
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            These photos will be used for marketplace vehicle listings.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {photoFields.map(([field, label]) => (
            <div
              key={field}
              className="rounded-xl border border-slate-200 bg-slate-50 p-4"
            >
              <label className={labelClass}>
                {label}
              </label>

              <input
                type="file"
                accept=".jpg,.jpeg,.png,.webp"
                disabled={saving}
                onChange={(e) =>
                  updatePhoto(
                    field,
                    e.target.files?.[0] || null
                  )
                }
                className={inputClass}
              />

              {form.photos[field] && (
                <p className="mt-2 text-xs font-medium text-green-600">
                  ? {form.photos[field]?.name}
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

      <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3">
        <p className="text-sm text-blue-800">
          <strong>Vendor-managed vehicle:</strong>{" "}
          {form.vendorName
            ? `This vehicle will be associated with ${form.vendorName}.`
            : "Select an active vendor to associate this vehicle."}
        </p>
      </div>

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
          className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Vehicle"}
        </button>
      </div>
    </form>
  );
}
