"use client";

import { useEffect, useState } from "react";

interface Vendor {
  id: string;
  companyName: string;
  status?: string;
  isApproved?: boolean;
}

interface Vehicle {
  id: string;
  registrationNumber: string;
  make: string;
  model: string;
  status?: string;
  vendorId?: string;
  driverId?: string | null;
}

export default function DriverForm() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  const [loadingVendors, setLoadingVendors] = useState(true);
  const [loadingVehicles, setLoadingVehicles] = useState(false);
  const [saving, setSaving] = useState(false);

  const [vendorId, setVendorId] = useState("");
  const [vehicleId, setVehicleId] = useState("");

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    mobile: "",
    email: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    dateOfBirth: "",
    experience: "",
    aadhaarNumber: "",
    policeVerificationNumber: "",
    licenseNumber: "",
  });

  const [documents, setDocuments] = useState({
    aadhaar: null as File | null,
    policeVerification: null as File | null,
    drivingLicense: null as File | null,
  });

  function update(
    field: keyof typeof form,
    value: string
  ) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  /*
   * Load ACTIVE vendors only.
   */
  useEffect(() => {
    let cancelled = false;

    async function loadVendors() {
      try {
        setLoadingVendors(true);

        const response = await fetch(
          "/api/vendors?status=Active&limit=100",
          {
            cache: "no-store",
          }
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(
            result.message ||
              "Failed to load vendors."
          );
        }

        const list = Array.isArray(result.data)
          ? result.data
          : [];

        const activeVendors = list.filter(
          (vendor: Vendor) =>
            vendor.status === "Active" ||
            vendor.isApproved === true
        );

        if (!cancelled) {
          setVendors(activeVendors);
        }
      } catch (error) {
        console.error(
          "Failed to load vendors:",
          error
        );

        if (!cancelled) {
          setVendors([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingVendors(false);
        }
      }
    }

    loadVendors();

    return () => {
      cancelled = true;
    };
  }, []);

  /*
   * Vendor changes:
   * clear vehicle and load vehicles
   * belonging ONLY to selected vendor.
   */
  async function handleVendorChange(
    selectedVendorId: string
  ) {
    setVendorId(selectedVendorId);
    setVehicleId("");
    setVehicles([]);

    if (!selectedVendorId) {
      return;
    }

    try {
      setLoadingVehicles(true);

      const response = await fetch(
        `/api/vehicles?vendorId=${encodeURIComponent(
          selectedVendorId
        )}&limit=100`,
        {
          cache: "no-store",
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
            "Failed to load vehicles."
        );
      }

      const list = Array.isArray(result.data)
        ? result.data
        : [];

      /*
       * Only vehicles belonging to this vendor.
       * A vehicle already assigned to another driver
       * is not available for new assignment.
       */
      const availableVehicles = list.filter(
        (vehicle: Vehicle) =>
          (!vehicle.vendorId ||
            vehicle.vendorId ===
              selectedVendorId) &&
          !vehicle.driverId &&
          vehicle.status !== "MAINTENANCE" &&
          vehicle.status !== "BLOCKED"
      );

      setVehicles(availableVehicles);
    } catch (error) {
      console.error(
        "Failed to load vendor vehicles:",
        error
      );

      setVehicles([]);
    } finally {
      setLoadingVehicles(false);
    }
  }

  function handleFileChange(
    field:
      | "aadhaar"
      | "policeVerification"
      | "drivingLicense",
    file: File | null
  ) {
    setDocuments((previous) => ({
      ...previous,
      [field]: file,
    }));
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!vendorId) {
      alert("Please select an active vendor.");
      return;
    }

    if (!vehicleId) {
      alert(
        "Please select a vehicle from the selected vendor."
      );
      return;
    }

    if (
      !form.firstName.trim() ||
      !form.lastName.trim()
    ) {
      alert("Please enter driver's full name.");
      return;
    }

    if (!form.mobile.trim()) {
      alert("Please enter mobile number.");
      return;
    }

    if (!form.email.trim()) {
      alert("Please enter email.");
      return;
    }

    if (!form.licenseNumber.trim()) {
      alert(
        "Please enter driving licence number."
      );
      return;
    }

    if (!form.aadhaarNumber.trim()) {
      alert("Please enter Aadhaar number.");
      return;
    }

    if (!form.policeVerificationNumber.trim()) {
      alert(
        "Please enter police verification number."
      );
      return;
    }

    if (!documents.aadhaar) {
      alert("Please upload Aadhaar document.");
      return;
    }

    if (!documents.policeVerification) {
      alert(
        "Please upload police verification document."
      );
      return;
    }

    if (!documents.drivingLicense) {
      alert(
        "Please upload driving licence document."
      );
      return;
    }

    /*
     * Current backend is JSON-only.
     *
     * We deliberately stop here rather than
     * pretending uploaded documents were saved.
     *
     * Backend/schema implementation will connect
     * this exact form to persistence.
     */
    const payload = {
      vendorId,
      vehicleId,
      ...form,
    };

    console.log(
      "Driver registration payload:",
      payload
    );

    setSaving(true);

    try {
      /*
       * Temporary validation checkpoint.
       * The backend implementation will replace
       * this with the final multipart/document workflow.
       */
      await new Promise((resolve) =>
        setTimeout(resolve, 400)
      );

      alert(
        "Driver form validated successfully. Backend document persistence is the next implementation step."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      id="driverForm"
      onSubmit={handleSubmit}
      className="space-y-8"
    >
      {/* =====================================================
          1. VENDOR & VEHICLE
      ====================================================== */}

      <div className="rounded-2xl border border-blue-200 bg-blue-50 p-6">
        <h3 className="mb-2 text-xl font-semibold text-slate-800">
          Vendor & Vehicle Assignment
        </h3>

        <p className="mb-5 text-sm text-slate-600">
          Select the active vendor first. Only vehicles
          belonging to that vendor will be available.
        </p>

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium">
              Active Vendor *
            </label>

            <select
              value={vendorId}
              onChange={(event) =>
                handleVendorChange(
                  event.target.value
                )
              }
              disabled={
                loadingVendors || saving
              }
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3"
            >
              <option value="">
                {loadingVendors
                  ? "Loading active vendors..."
                  : "Select Active Vendor"}
              </option>

              {vendors.map((vendor) => (
                <option
                  key={vendor.id}
                  value={vendor.id}
                >
                  {vendor.companyName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Vehicle *
            </label>

            <select
              value={vehicleId}
              onChange={(event) =>
                setVehicleId(
                  event.target.value
                )
              }
              disabled={
                !vendorId ||
                loadingVehicles ||
                saving
              }
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3"
            >
              <option value="">
                {!vendorId
                  ? "Select vendor first"
                  : loadingVehicles
                  ? "Loading vehicles..."
                  : vehicles.length === 0
                  ? "No available vehicles"
                  : "Select Vehicle"}
              </option>

              {vehicles.map((vehicle) => (
                <option
                  key={vehicle.id}
                  value={vehicle.id}
                >
                  {vehicle.registrationNumber} —{" "}
                  {vehicle.make} {vehicle.model}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* =====================================================
          2. PERSONAL INFORMATION
      ====================================================== */}

      <div className="rounded-2xl border border-slate-200 p-6">
        <h3 className="mb-5 text-xl font-semibold text-slate-800">
          Personal Information
        </h3>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="mb-2 block text-sm font-medium">
              First Name *
            </label>

            <input
              value={form.firstName}
              onChange={(event) =>
                update(
                  "firstName",
                  event.target.value
                )
              }
              className="w-full rounded-xl border px-4 py-3"
              placeholder="First Name"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Last Name *
            </label>

            <input
              value={form.lastName}
              onChange={(event) =>
                update(
                  "lastName",
                  event.target.value
                )
              }
              className="w-full rounded-xl border px-4 py-3"
              placeholder="Last Name"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Mobile Number *
            </label>

            <input
              value={form.mobile}
              onChange={(event) =>
                update(
                  "mobile",
                  event.target.value
                )
              }
              className="w-full rounded-xl border px-4 py-3"
              placeholder="+91XXXXXXXXXX"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Email *
            </label>

            <input
              type="email"
              value={form.email}
              onChange={(event) =>
                update(
                  "email",
                  event.target.value
                )
              }
              className="w-full rounded-xl border px-4 py-3"
              placeholder="driver@email.com"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Date of Birth
            </label>

            <input
              type="date"
              value={form.dateOfBirth}
              onChange={(event) =>
                update(
                  "dateOfBirth",
                  event.target.value
                )
              }
              className="w-full rounded-xl border px-4 py-3"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Experience
            </label>

            <input
              value={form.experience}
              onChange={(event) =>
                update(
                  "experience",
                  event.target.value
                )
              }
              className="w-full rounded-xl border px-4 py-3"
              placeholder="5 Years"
            />
          </div>
        </div>
      </div>

      {/* =====================================================
          3. ADDRESS
      ====================================================== */}

      <div className="rounded-2xl border border-slate-200 p-6">
        <h3 className="mb-5 text-xl font-semibold text-slate-800">
          Address
        </h3>

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium">
              Full Address
            </label>

            <textarea
              rows={5}
              value={form.address}
              onChange={(event) =>
                update(
                  "address",
                  event.target.value
                )
              }
              className="w-full rounded-xl border px-4 py-3"
              placeholder="Full residential address"
            />
          </div>

          <div className="grid gap-5">
            <input
              value={form.city}
              onChange={(event) =>
                update(
                  "city",
                  event.target.value
                )
              }
              className="rounded-xl border px-4 py-3"
              placeholder="City"
            />

            <input
              value={form.state}
              onChange={(event) =>
                update(
                  "state",
                  event.target.value
                )
              }
              className="rounded-xl border px-4 py-3"
              placeholder="State"
            />

            <input
              value={form.pincode}
              onChange={(event) =>
                update(
                  "pincode",
                  event.target.value
                )
              }
              className="rounded-xl border px-4 py-3"
              placeholder="Pincode"
            />
          </div>
        </div>
      </div>

      {/* =====================================================
          4. AADHAAR
      ====================================================== */}

      <div className="rounded-2xl border border-slate-200 p-6">
        <h3 className="mb-5 text-xl font-semibold text-slate-800">
          Aadhaar Verification
        </h3>

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium">
              Aadhaar Number *
            </label>

            <input
              value={form.aadhaarNumber}
              onChange={(event) =>
                update(
                  "aadhaarNumber",
                  event.target.value
                )
              }
              className="w-full rounded-xl border px-4 py-3"
              placeholder="XXXX XXXX XXXX"
              maxLength={14}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Upload Aadhaar *
            </label>

            <input
              type="file"
              accept=".jpg,.jpeg,.png,.pdf"
              onChange={(event) =>
                handleFileChange(
                  "aadhaar",
                  event.target.files?.[0] ||
                    null
                )
              }
              className="w-full rounded-xl border px-4 py-3"
            />

            {documents.aadhaar && (
              <p className="mt-2 text-xs text-green-600">
                {documents.aadhaar.name}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* =====================================================
          5. POLICE VERIFICATION
      ====================================================== */}

      <div className="rounded-2xl border border-slate-200 p-6">
        <h3 className="mb-5 text-xl font-semibold text-slate-800">
          Police Verification
        </h3>

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium">
              Verification Number *
            </label>

            <input
              value={
                form.policeVerificationNumber
              }
              onChange={(event) =>
                update(
                  "policeVerificationNumber",
                  event.target.value
                )
              }
              className="w-full rounded-xl border px-4 py-3"
              placeholder="Police Verification Number"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Upload Police Verification *
            </label>

            <input
              type="file"
              accept=".jpg,.jpeg,.png,.pdf"
              onChange={(event) =>
                handleFileChange(
                  "policeVerification",
                  event.target.files?.[0] ||
                    null
                )
              }
              className="w-full rounded-xl border px-4 py-3"
            />

            {documents.policeVerification && (
              <p className="mt-2 text-xs text-green-600">
                {
                  documents.policeVerification
                    .name
                }
              </p>
            )}
          </div>
        </div>
      </div>

      {/* =====================================================
          6. DRIVING LICENCE
      ====================================================== */}

      <div className="rounded-2xl border border-slate-200 p-6">
        <h3 className="mb-5 text-xl font-semibold text-slate-800">
          Driving Licence
        </h3>

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium">
              Driving Licence Number *
            </label>

            <input
              value={form.licenseNumber}
              onChange={(event) =>
                update(
                  "licenseNumber",
                  event.target.value.toUpperCase()
                )
              }
              className="w-full rounded-xl border px-4 py-3 uppercase"
              placeholder="MH1220230012345"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Upload Driving Licence *
            </label>

            <input
              type="file"
              accept=".jpg,.jpeg,.png,.pdf"
              onChange={(event) =>
                handleFileChange(
                  "drivingLicense",
                  event.target.files?.[0] ||
                    null
                )
              }
              className="w-full rounded-xl border px-4 py-3"
            />

            {documents.drivingLicense && (
              <p className="mt-2 text-xs text-green-600">
                {
                  documents.drivingLicense.name
                }
              </p>
            )}
          </div>
        </div>
      </div>

      {/* =====================================================
          BANK DETAILS INTENTIONALLY REMOVED
      ====================================================== */}

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm text-slate-600">
          Driver bank accounts, payouts and transaction
          details are not managed from Driver Registration.
        </p>
      </div>

      {/* =====================================================
          ACTIONS
      ====================================================== */}

      <div className="flex justify-end gap-3 border-t pt-6">
        <button
          type="button"
          disabled={saving}
          className="rounded-xl border px-6 py-3 font-medium hover:bg-slate-100 disabled:opacity-50"
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-blue-600 px-7 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {saving
            ? "Saving..."
            : "Register Driver"}
        </button>
      </div>
    </form>
  );
}