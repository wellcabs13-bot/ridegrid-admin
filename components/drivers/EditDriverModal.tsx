"use client";

import { useEffect, useState } from "react";

interface Driver {
  id: string | number;
  name?: string;
  mobile?: string;
  email?: string;
  licenseNumber?: string;
  licenseExpiry?: string;
  aadhaar?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  experience?: string;
  dateOfBirth?: string;
  policeVerificationNumber?: string;
  vehicleId?: string | null;
  vendorId?: string | null;
  status?: string;
}

interface Vendor {
  id: string | number;
  companyName: string;
  status?: string;
  isApproved?: boolean;
}

interface Vehicle {
  id: string | number;
  registrationNumber: string;
  make: string;
  model: string;
  status?: string;
  vendorId?: string;
  driverId?: string | null;
}

interface EditDriverModalProps {
  isOpen: boolean;
  driver: Driver | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function EditDriverModal({
  isOpen,
  driver,
  onClose,
  onSaved,
}: EditDriverModalProps) {
  const [vendors, setVendors] =
    useState<Vendor[]>([]);

  const [vehicles, setVehicles] =
    useState<Vehicle[]>([]);

  const [loadingVendors, setLoadingVendors] =
    useState(false);

  const [loadingVehicles, setLoadingVehicles] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [vendorId, setVendorId] =
    useState("");

  const [vehicleId, setVehicleId] =
    useState("");

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
    status: "Active",
  });

  useEffect(() => {
    if (!isOpen || !driver) {
      return;
    }

    const nameParts =
      String(driver.name || "")
        .trim()
        .split(/\s+/);

    const firstName =
      nameParts.shift() || "";

    const lastName =
      nameParts.join(" ");

    setForm({
      firstName,
      lastName,
      mobile: driver.mobile || "",
      email: driver.email || "",
      address: driver.address || "",
      city: driver.city || "",
      state: driver.state || "",
      pincode: driver.pincode || "",
      dateOfBirth:
        driver.dateOfBirth || "",
      experience:
        driver.experience || "",
      aadhaarNumber:
        driver.aadhaar || "",
      policeVerificationNumber:
        driver.policeVerificationNumber || "",
      licenseNumber:
        driver.licenseNumber || "",
      status:
        driver.status || "Active",
    });

    setVendorId(
      driver.vendorId || ""
    );

    setVehicleId(
      driver.vehicleId || ""
    );
  }, [isOpen, driver]);

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;

    async function loadVendors() {
      try {
        setLoadingVendors(true);

        const response =
          await fetch(
            "/api/vendors?status=Active&limit=100",
            {
              cache: "no-store",
            }
          );

        const result =
          await response.json();

        if (
          !response.ok ||
          !result.success
        ) {
          throw new Error(
            result.message ||
              "Failed to load vendors."
          );
        }

        const list =
          Array.isArray(
            result.data?.data
          )
            ? result.data.data
            : Array.isArray(
                result.data
              )
              ? result.data
              : [];

        const active =
          list.filter(
            (vendor: Vendor) =>
              vendor.status ===
                "Active" ||
              vendor.isApproved === true
          );

        if (!cancelled) {
          setVendors(active);
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
  }, [isOpen]);

  async function loadVehicles(
    selectedVendorId: string
  ) {
    if (!selectedVendorId) {
      setVehicles([]);
      return;
    }

    try {
      setLoadingVehicles(true);

      const response =
        await fetch(
          `/api/vehicles?vendorId=${encodeURIComponent(
            selectedVendorId
          )}&limit=100`,
          {
            cache: "no-store",
          }
        );

      const result =
        await response.json();

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ||
            "Failed to load vehicles."
        );
      }

      const list =
        Array.isArray(
          result.data?.data
        )
          ? result.data.data
          : Array.isArray(
              result.data
            )
            ? result.data
            : [];

      const available =
        list.filter(
          (vehicle: Vehicle) =>
            (!vehicle.vendorId ||
              vehicle.vendorId ===
                selectedVendorId) &&
            (
              !vehicle.driverId ||
              vehicle.driverId ===
                driver?.id
            ) &&
            vehicle.status !==
              "MAINTENANCE" &&
            vehicle.status !==
              "BLOCKED"
        );

      setVehicles(available);
    } catch (error) {
      console.error(
        "Failed to load vehicles:",
        error
      );

      setVehicles([]);
    } finally {
      setLoadingVehicles(false);
    }
  }

  useEffect(() => {
    if (
      isOpen &&
      vendorId
    ) {
      void loadVehicles(
        vendorId
      );
    }
  }, [isOpen, vendorId]);

  function update(
    field: keyof typeof form,
    value: string
  ) {
    setForm(
      (previous) => ({
        ...previous,
        [field]: value,
      })
    );
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!driver) {
      return;
    }

    if (!vendorId) {
      alert(
        "Please select an active vendor."
      );
      return;
    }

    if (!vehicleId) {
      alert(
        "Please select a vehicle."
      );
      return;
    }

    if (
      !form.firstName.trim() ||
      !form.lastName.trim()
    ) {
      alert(
        "Please enter driver's full name."
      );
      return;
    }

    if (!form.mobile.trim()) {
      alert(
        "Please enter mobile number."
      );
      return;
    }

    if (!form.email.trim()) {
      alert(
        "Please enter email."
      );
      return;
    }

    if (!form.licenseNumber.trim()) {
      alert(
        "Please enter driving licence number."
      );
      return;
    }

    if (!form.aadhaarNumber.trim()) {
      alert(
        "Please enter Aadhaar number."
      );
      return;
    }

    try {
      setSaving(true);

      const response =
        await fetch(
          "/api/drivers",
          {
            method: "PUT",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              id: driver.id,
              vendorId,
              vehicleId,

              firstName:
                form.firstName.trim(),

              lastName:
                form.lastName.trim(),

              mobile:
                form.mobile.trim(),

              email:
                form.email
                  .trim()
                  .toLowerCase(),

              address:
                form.address.trim(),

              city:
                form.city.trim(),

              state:
                form.state.trim(),

              pincode:
                form.pincode.trim(),

              dateOfBirth:
                form.dateOfBirth,

              experience:
                form.experience.trim(),

              aadhaarNumber:
                form.aadhaarNumber.trim(),

              policeVerificationNumber:
                form.policeVerificationNumber.trim(),

              licenseNumber:
                form.licenseNumber
                  .trim()
                  .toUpperCase(),

              status:
                form.status,
            }),
          }
        );

      const result =
        await response.json();

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ||
            "Failed to update driver."
        );
      }

      alert(
        "Driver updated successfully."
      );

      onClose();
      onSaved();
    } catch (error) {
      console.error(
        "Driver update failed:",
        error
      );

      alert(
        error instanceof Error
          ? error.message
          : "Failed to update driver."
      );
    } finally {
      setSaving(false);
    }
  }

  if (!isOpen || !driver) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[95vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-6 py-5">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              Edit Driver
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Edit all registered driver information.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-2xl text-slate-500 hover:bg-slate-100"
          >
            Ãƒâ€”
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-6 p-6"
        >
          {/* VENDOR & VEHICLE */}
          <section className="rounded-2xl border border-blue-200 bg-blue-50 p-6">
            <h3 className="mb-5 text-xl font-semibold text-slate-800">
              Vendor & Vehicle Assignment
            </h3>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Active Vendor *
                </label>

                <select
                  value={vendorId}
                  onChange={(event) => {
                    const value =
                      event.target.value;

                    setVendorId(value);
                    setVehicleId("");
                    setVehicles([]);

                    if (value) {
                      void loadVehicles(
                        value
                      );
                    }
                  }}
                  disabled={
                    loadingVendors ||
                    saving
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3"
                >
                  <option value="">
                    {loadingVendors
                      ? "Loading vendors..."
                      : "Select Active Vendor"}
                  </option>

                  {vendors.map(
                    (vendor) => (
                      <option
                        key={vendor.id}
                        value={vendor.id}
                      >
                        {vendor.companyName}
                      </option>
                    )
                  )}
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

                  {vehicles.map(
                    (vehicle) => (
                      <option
                        key={vehicle.id}
                        value={vehicle.id}
                      >
                        {vehicle.registrationNumber}
                        {" Ã¢â‚¬â€ "}
                        {vehicle.make}{" "}
                        {vehicle.model}
                      </option>
                    )
                  )}
                </select>
              </div>
            </div>
          </section>

          {/* PERSONAL INFORMATION */}
          <section className="rounded-2xl border p-6">
            <h3 className="mb-5 text-xl font-semibold">
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
                />
              </div>
            </div>
          </section>

          {/* ADDRESS */}
          <section className="rounded-2xl border p-6">
            <h3 className="mb-5 text-xl font-semibold">
              Address
            </h3>

            <div className="grid gap-5 md:grid-cols-2">
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

              <div className="grid gap-4">
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
          </section>

          {/* KYC */}
          <section className="rounded-2xl border p-6">
            <h3 className="mb-5 text-xl font-semibold">
              KYC & Verification
            </h3>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Aadhaar Number *
                </label>

                <input
                  value={
                    form.aadhaarNumber
                  }
                  onChange={(event) =>
                    update(
                      "aadhaarNumber",
                      event.target.value
                    )
                  }
                  className="w-full rounded-xl border px-4 py-3"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Police Verification Number
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
                />
              </div>
            </div>
          </section>

          {/* LICENCE */}
          <section className="rounded-2xl border p-6">
            <h3 className="mb-5 text-xl font-semibold">
              Driving Licence
            </h3>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Driving Licence Number *
                </label>

                <input
                  value={
                    form.licenseNumber
                  }
                  onChange={(event) =>
                    update(
                      "licenseNumber",
                      event.target.value.toUpperCase()
                    )
                  }
                  className="w-full rounded-xl border px-4 py-3 uppercase"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Driver Status
                </label>

                <select
                  value={form.status}
                  onChange={(event) =>
                    update(
                      "status",
                      event.target.value
                    )
                  }
                  className="w-full rounded-xl border px-4 py-3"
                >
                  <option value="Active">
                    Active
                  </option>
                  <option value="Inactive">
                    Inactive
                  </option>
                  <option value="Suspended">
                    Suspended
                  </option>
                </select>
              </div>
            </div>
          </section>

          <div className="flex justify-end gap-3 border-t pt-6">
            <button
              type="button"
              onClick={onClose}
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
                : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}