"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import DashboardLayout from "../../components/DashboardLayout";

import VehicleHeader from "../../components/vehicles/VehicleHeader";
import VehicleStats from "../../components/vehicles/VehicleStats";
import VehicleFilters from "../../components/vehicles/VehicleFilters";
import VehicleTable from "../../components/vehicles/VehicleTable";

import AddVehicleModal from "../../components/vehicles/AddVehicleModal";

import VehicleForm, {
  VehicleFormData,
} from "../../components/vehicles/VehicleForm";

import VehicleDetailsDrawer from "../../components/vehicles/VehicleDetailsDrawer";

import { Vehicle } from "../../data/vehicles";

interface ApiVehicle {
  id: string;
  registrationNumber: string;
  make: string;
  model: string;
  variant?: string | null;
  year?: number | null;
  category: string;
  fuelType: string;
  transmission: string;
  seatingCapacity: number;
  homeCity: string;
  status: string;
  baseFare?: number;
  totalTrips?: number;
  createdAt?: string;
  vendor?: {
    id: string;
    companyName: string;
    name?: string;
  } | null;
  driver?: {
    id: string;
    name?: string;
  } | null;
}

function categoryToLabel(value: string) {
  const map: Record<string, string> = {
    HATCHBACK: "Hatchback",
    SEDAN: "Sedan",
    SUV: "SUV",
    MUV: "MUV",
    LUXURY: "Luxury",
    TEMPO_TRAVELLER: "Tempo Traveller",
    MINI_BUS: "Mini Bus",
    BUS: "Bus",
  };

  return map[value] || value;
}

function fuelToLabel(value: string) {
  const map: Record<string, string> = {
    PETROL: "Petrol",
    DIESEL: "Diesel",
    CNG: "CNG",
    ELECTRIC: "Electric",
    HYBRID: "Hybrid",
  };

  return map[value] || value;
}

function transmissionToLabel(value: string) {
  const map: Record<string, string> = {
    MANUAL: "Manual",
    AUTOMATIC: "Automatic",
  };

  return map[value] || value;
}

function statusToLabel(value: string) {
  const map: Record<string, string> = {
    AVAILABLE: "Available",
    RESERVED: "Reserved",
    ON_TRIP: "On Trip",
    MAINTENANCE: "Maintenance",
    BLOCKED: "Blocked",
  };

  return map[value] || value;
}

function mapApiVehicle(vehicle: ApiVehicle): Vehicle {
  const category = categoryToLabel(
    vehicle.category
  );

  const status = statusToLabel(vehicle.status) as Vehicle["status"];

  return {
    id: vehicle.id,

    registrationNo:
      vehicle.registrationNumber,

    vehicleName:
      [vehicle.make, vehicle.model]
        .filter(Boolean)
        .join(" ") ||
      vehicle.model,

    brand: vehicle.make,

    model: vehicle.model,

    year:
      Number(vehicle.year) || 0,

    vehicleType: category,

    category,

    fuelType:
      fuelToLabel(vehicle.fuelType),

    transmission:
      transmissionToLabel(
        vehicle.transmission
      ),

    seatingCapacity:
      Number(vehicle.seatingCapacity) || 0,

    vendorName:
      vehicle.vendor?.companyName || "-",

    driverName:
      vehicle.driver?.name || "-",

    rcExpiry: "-",

    insuranceExpiry: "-",

    permitExpiry: "-",

    fitnessExpiry: "-",

    pollutionExpiry: "-",

    status,

    availability:
      status === "Available"
        ? "Available"
        : status === "On Trip"
        ? "Booked"
        : "Blocked",

    totalTrips:
      Number(vehicle.totalTrips) || 0,

    earnings:
      `₹${Number(
        vehicle.baseFare || 0
      ).toLocaleString()}`,

    city:
      vehicle.homeCity || "",

    createdAt:
      vehicle.createdAt
        ? new Date(
            vehicle.createdAt
          ).toLocaleDateString()
        : "-",
  };
}

function categoryToEnum(
  category: string
) {
  const map: Record<string, string> = {
    Sedan: "SEDAN",
    Hatchback: "HATCHBACK",
    SUV: "SUV",
    MUV: "MUV",
    Luxury: "LUXURY",
    Premium: "LUXURY",
    Commercial: "BUS",
    "Tempo Traveller":
      "TEMPO_TRAVELLER",
    "Mini Bus": "MINI_BUS",
    Bus: "BUS",
    Other: "SEDAN",
  };

  return (
    map[category] ||
    category
      .toUpperCase()
      .replace(/ /g, "_")
  );
}

function fuelToEnum(
  fuel: string
) {
  const map: Record<string, string> = {
    Petrol: "PETROL",
    Diesel: "DIESEL",
    CNG: "CNG",
    Electric: "ELECTRIC",
    Hybrid: "HYBRID",
  };

  return map[fuel] || fuel.toUpperCase();
}

function transmissionToEnum(
  transmission: string
) {
  const map: Record<string, string> = {
    Manual: "MANUAL",
    Automatic: "AUTOMATIC",
  };

  return (
    map[transmission] ||
    transmission.toUpperCase()
  );
}

function getApiData(result: any) {
  /*
   * Our success() response is:
   *
   * {
   *   success: true,
   *   data: {
   *     data: [...],
   *     pagination: {...}
   *   }
   * }
   */

  if (
    result?.data?.data &&
    Array.isArray(result.data.data)
  ) {
    return result.data.data;
  }

  if (
    Array.isArray(result?.data)
  ) {
    return result.data;
  }

  return [];
}

export default function VehiclesPage() {
  const [vehicles, setVehicles] =
    useState<Vehicle[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [status, setStatus] =
    useState("");

  const [city, setCity] =
    useState("");

  const [
    openVehicleModal,
    setOpenVehicleModal,
  ] = useState(false);

  const [
    drawerOpen,
    setDrawerOpen,
  ] = useState(false);

  const [
    selectedVehicle,
    setSelectedVehicle,
  ] = useState<Vehicle | null>(
    null
  );

  const [
    editingVehicle,
    setEditingVehicle,
  ] = useState<Vehicle | null>(
    null
  );

  const [
    saving,
    setSaving,
  ] = useState(false);

  const loadVehicles =
    useCallback(async () => {
      try {
        setLoading(true);
        setError("");

        const response =
          await fetch(
            "/api/vehicles?page=1&limit=100",
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

        const apiVehicles =
          getApiData(result);

        setVehicles(
          apiVehicles.map(
            mapApiVehicle
          )
        );
      } catch (err) {
        console.error(
          "Vehicle loading error:",
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load vehicles."
        );
      } finally {
        setLoading(false);
      }
    }, []);

  useEffect(() => {
    loadVehicles();
  }, [loadVehicles]);

  const filteredVehicles =
    useMemo(() => {
      return vehicles.filter(
        (vehicle) => {
          const searchValue =
            search.toLowerCase();

          const matchSearch =
            vehicle.vehicleName
              .toLowerCase()
              .includes(searchValue) ||
            vehicle.registrationNo
              .toLowerCase()
              .includes(searchValue) ||
            vehicle.vendorName
              .toLowerCase()
              .includes(searchValue) ||
            vehicle.driverName
              .toLowerCase()
              .includes(searchValue);

          const matchStatus =
            !status ||
            vehicle.status === status;

          const matchCity =
            !city ||
            vehicle.city
              .toLowerCase()
              .includes(
                city.toLowerCase()
              );

          return (
            matchSearch &&
            matchStatus &&
            matchCity
          );
        }
      );
    }, [
      vehicles,
      search,
      status,
      city,
    ]);

  const totalRevenue =
    vehicles.reduce(
      (sum, vehicle) => {
        const value =
          Number(
            vehicle.earnings.replace(
              /[₹,]/g,
              ""
            )
          ) || 0;

        return sum + value;
      },
      0
    );

  const totalVehicles =
    vehicles.length;

  const availableVehicles =
    vehicles.filter(
      (vehicle) =>
        vehicle.status ===
        "Available"
    ).length;

  const onTripVehicles =
    vehicles.filter(
      (vehicle) =>
        vehicle.status ===
        "On Trip"
    ).length;

  const maintenanceVehicles =
    vehicles.filter(
      (vehicle) =>
        vehicle.status ===
        "Maintenance"
    ).length;

  function resetFilters() {
    setSearch("");
    setStatus("");
    setCity("");
  }

  function handleViewVehicle(
    vehicle: Vehicle
  ) {
    setSelectedVehicle(vehicle);
    setDrawerOpen(true);
  }

  function handleEditVehicle(
    vehicle: Vehicle
  ) {
    setEditingVehicle(vehicle);
    setOpenVehicleModal(true);
  }

  async function handleDeleteVehicle(
    vehicle: Vehicle
  ) {
    const confirmed =
      window.confirm(
        `Are you sure you want to delete ${vehicle.vehicleName} (${vehicle.registrationNo})?`
      );

    if (!confirmed) {
      return;
    }

    try {
      setSaving(true);

      const response =
        await fetch(
          `/api/vehicles?id=${encodeURIComponent(
            vehicle.id
          )}`,
          {
            method: "DELETE",
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
            "Failed to delete vehicle."
        );
      }

      await loadVehicles();

      if (
        selectedVehicle?.id ===
        vehicle.id
      ) {
        setSelectedVehicle(null);
        setDrawerOpen(false);
      }
    } catch (err) {
      console.error(
        "Vehicle delete error:",
        err
      );

      alert(
        err instanceof Error
          ? err.message
          : "Failed to delete vehicle."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveVehicle(
    data: VehicleFormData
  ) {
    try {
      setSaving(true);

      const payload = {
        id:
          editingVehicle?.id,

        vendorId:
          data.vendorId,

        registrationNo:
          data.registrationNo,

        make:
          data.brand,

        model:
          data.model ||
          data.vehicleName,

        variant:
          data.vehicleName,

        year:
          data.year
            ? Number(data.year)
            : null,

        category:
          categoryToEnum(
            data.category
          ),

        fuelType:
          fuelToEnum(
            data.fuelType
          ),

        transmission:
          transmissionToEnum(
            data.transmission
          ),

        seatingCapacity:
          Number(
            data.seatingCapacity
          ),

        homeCity:
          data.city,

        baseFare: 0,

        pricePerKm: null,

        waitingCharge: null,

        nightCharge: null,
      };

      const response =
        await fetch(
          "/api/vehicles",
          {
            method:
              editingVehicle
                ? "PUT"
                : "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify(
              payload
            ),
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
            "Failed to save vehicle."
        );
      }

      /*
       * IMPORTANT:
       * Do not add the vehicle manually
       * to React state.
       *
       * Reload from PostgreSQL so the
       * displayed list is always the
       * database truth.
       */
      await loadVehicles();

      setEditingVehicle(null);
      setOpenVehicleModal(false);
    } catch (err) {
      console.error(
        "Vehicle save error:",
        err
      );

      alert(
        err instanceof Error
          ? err.message
          : "Failed to save vehicle."
      );
    } finally {
      setSaving(false);
    }
  }

  function closeVehicleModal() {
    setOpenVehicleModal(false);
    setEditingVehicle(null);
  }

  const editingFormData:
    | Partial<VehicleFormData>
    | undefined =
    editingVehicle
      ? {
          registrationNo:
            editingVehicle.registrationNo,

          vehicleName:
            editingVehicle.vehicleName,

          brand:
            editingVehicle.brand,

          model:
            editingVehicle.model,

          year:
            String(
              editingVehicle.year ||
                ""
            ),

          vehicleType:
            editingVehicle.vehicleType,

          category:
            editingVehicle.category,

          fuelType:
            editingVehicle.fuelType,

          transmission:
            editingVehicle.transmission,

          seatingCapacity:
            String(
              editingVehicle.seatingCapacity ||
                ""
            ),

          /*
           * Vehicle list currently exposes
           * vendorName, but the edit form
           * needs vendorId.
           *
           * The Vendor dropdown will load
           * the current active vendor list.
           */
          vendorName:
            editingVehicle.vendorName,

          driverName:
            editingVehicle.driverName,

          city:
            editingVehicle.city,
        }
      : undefined;

  return (
    <DashboardLayout>
      <VehicleHeader
        totalVehicles={
          totalVehicles
        }
        onAddVehicle={() => {
          setEditingVehicle(null);
          setOpenVehicleModal(true);
        }}
      />

      <VehicleStats
        total={totalVehicles}
        available={
          availableVehicles
        }
        onTrip={
          onTripVehicles
        }
        maintenance={
          maintenanceVehicles
        }
        revenue={`₹${totalRevenue.toLocaleString()}`}
      />

      <VehicleFilters
        search={search}
        status={status}
        city={city}
        onSearchChange={
          setSearch
        }
        onStatusChange={
          setStatus
        }
        onCityChange={
          setCity
        }
        onReset={
          resetFilters
        }
      />

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-xl bg-white p-12 text-center shadow">
          <div className="text-sm text-slate-500">
            Loading vehicles...
          </div>
        </div>
      ) : (
        <VehicleTable
          vehicles={
            filteredVehicles
          }
          onView={
            handleViewVehicle
          }
          onEdit={
            handleEditVehicle
          }
          onDelete={
            handleDeleteVehicle
          }
        />
      )}

      <VehicleDetailsDrawer
        open={drawerOpen}
        vehicle={
          selectedVehicle
        }
        onClose={() => {
          setDrawerOpen(false);
          setSelectedVehicle(
            null
          );
        }}
      />

      <AddVehicleModal
        isOpen={
          openVehicleModal
        }
        onClose={
          closeVehicleModal
        }
      >
        <VehicleForm
          key={
            editingVehicle?.id ||
            "new-vehicle"
          }
          initialData={
            editingFormData
          }
          onSave={
            handleSaveVehicle
          }
          onCancel={
            closeVehicleModal
          }
          saving={saving}
        />
      </AddVehicleModal>
    </DashboardLayout>
  );
}