"use client";

import { useEffect, useState } from "react";

interface DriverLike {
  id: string | number;
  name: string;
  mobile?: string;
  email?: string;
  licenseNumber?: string;
  status?: string;
}

interface EditDriverModalProps {
  isOpen: boolean;
  driver: DriverLike | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function EditDriverModal({
  isOpen,
  driver,
  onClose,
  onSaved,
}: EditDriverModalProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [status, setStatus] = useState("ACTIVE");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!driver) {
      return;
    }

    const parts = driver.name.trim().split(/\s+/);

    setFirstName(parts[0] || "");
    setLastName(parts.slice(1).join(" "));
    setMobile(driver.mobile || "");
    setEmail(driver.email || "");
    setLicenseNumber(driver.licenseNumber || "");

    const currentStatus = String(
      driver.status || "Active"
    ).toUpperCase();

    if (currentStatus === "SUSPENDED") {
      setStatus("SUSPENDED");
    } else if (currentStatus === "INACTIVE") {
      setStatus("INACTIVE");
    } else {
      setStatus("ACTIVE");
    }
  }, [driver]);

  if (!isOpen || !driver) {
    return null;
  }

  const driverId = String(driver.id);

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    try {
      setSaving(true);

      const response = await fetch("/api/drivers", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: driverId,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          mobile: mobile.trim(),
          email: email.trim().toLowerCase(),
          licenseNumber: licenseNumber.trim(),
          status,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Failed to update driver."
        );
      }

      alert("Driver updated successfully.");

      onSaved();
      onClose();
    } catch (error) {
      console.error("Failed to update driver:", error);

      alert(
        error instanceof Error
          ? error.message
          : "Failed to update driver."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <h2 className="text-xl font-bold text-slate-800">
              Edit Driver
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Update driver details and status.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg px-3 py-2 text-2xl text-slate-500 hover:bg-slate-100"
          >
            ×
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-6 p-6"
        >
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                First Name
              </label>

              <input
                type="text"
                value={firstName}
                onChange={(event) =>
                  setFirstName(event.target.value)
                }
                required
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Last Name
              </label>

              <input
                type="text"
                value={lastName}
                onChange={(event) =>
                  setLastName(event.target.value)
                }
                required
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Mobile Number
              </label>

              <input
                type="text"
                value={mobile}
                onChange={(event) =>
                  setMobile(event.target.value)
                }
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Email
              </label>

              <input
                type="email"
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                required
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Driving Licence Number
              </label>

              <input
                type="text"
                value={licenseNumber}
                onChange={(event) =>
                  setLicenseNumber(event.target.value)
                }
                required
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Driver Status
              </label>

              <select
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value)
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-500"
              >
                <option value="ACTIVE">
                  Active
                </option>

                <option value="INACTIVE">
                  Inactive
                </option>

                <option value="SUSPENDED">
                  Suspended
                </option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-200 pt-5">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
