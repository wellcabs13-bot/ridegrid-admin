"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import DashboardLayout from "../../components/DashboardLayout";

import { Driver } from "../../data/drivers";

import DriverHeader from "../../components/drivers/DriverHeader";
import DriverStats from "../../components/drivers/DriverStats";
import DriverFilters from "../../components/drivers/DriverFilters";
import DriverTable from "../../components/drivers/DriverTable";

import AddDriverModal from "../../components/drivers/AddDriverModal";
import DriverForm from "../../components/drivers/DriverForm";

import DriverDetailsDrawer from "../../components/drivers/DriverDetailsDrawer";

import DriverInfoCard from "../../components/drivers/DriverInfoCard";
import DriverLicenseCard from "../../components/drivers/DriverLicenseCard";
import DriverVehicleCard from "../../components/drivers/DriverVehicleCard";
import DriverTripHistoryCard from "../../components/drivers/DriverTripHistoryCard";
import DriverAttendanceCard from "../../components/drivers/DriverAttendanceCard";
import DriverPaymentCard from "../../components/drivers/DriverPaymentCard";
import DriverDocumentCard from "../../components/drivers/DriverDocumentCard";
import DriverPerformanceCard from "../../components/drivers/DriverPerformanceCard";

export default function DriversPage() {
  const [driverList, setDriverList] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");

  const [selectedDriver, setSelectedDriver] =
    useState<Driver | null>(null);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const fetchDrivers = useCallback(async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams();

      if (search.trim()) {
        params.set("search", search.trim());
      }

      if (status !== "All") {
        params.set("status", status);
      }

      const queryString = params.toString();

      const response = await fetch(
        queryString
          ? `/api/drivers?${queryString}`
          : "/api/drivers",
        {
          cache: "no-store",
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ??
            "Failed to load drivers."
        );
      }

      setDriverList(
        Array.isArray(result.data)
          ? result.data
          : []
      );
    } catch (error) {
      console.error(
        "Failed to load drivers:",
        error
      );

      setDriverList([]);
    } finally {
      setLoading(false);
    }
  }, [search, status]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchDrivers();
    }, 250);

    return () => clearTimeout(timer);
  }, [fetchDrivers]);

  const filteredDrivers = useMemo(
    () => driverList,
    [driverList]
  );

  const activeDrivers = driverList.filter(
    (driver) =>
      driver.status === "Active"
  ).length;

  const inactiveDrivers = driverList.filter(
    (driver) =>
      driver.status === "Inactive"
  ).length;

  function openDriver(driver: Driver) {
    setSelectedDriver(driver);
    setDrawerOpen(true);
  }

  function closeDrawer() {
    setDrawerOpen(false);
    setSelectedDriver(null);
  }

  return (
    <DashboardLayout>
      <DriverHeader
        totalDrivers={driverList.length}
        onAddDriver={() =>
          setModalOpen(true)
        }
      />

      <DriverStats
        totalDrivers={driverList.length}
      />

      <DriverFilters
        search={search}
        setSearch={setSearch}
        status={status}
        setStatus={setStatus}
      />

      {loading ? (
        <div className="rounded-xl bg-white p-10 text-center text-slate-500 shadow-sm">
          Loading drivers...
        </div>
      ) : (
        <DriverTable
          drivers={filteredDrivers}
          onView={openDriver}
        />
      )}

      <AddDriverModal
        isOpen={modalOpen}
        onClose={() =>
          setModalOpen(false)
        }
      >
        <DriverForm />
      </AddDriverModal>

      <DriverDetailsDrawer
        driver={selectedDriver}
        isOpen={drawerOpen}
        onClose={closeDrawer}
      >
        {selectedDriver && (
          <>
            <DriverInfoCard
              driver={selectedDriver}
            />

            <DriverLicenseCard
              driver={selectedDriver}
            />

            <DriverVehicleCard
              driver={selectedDriver}
            />

            <DriverTripHistoryCard
              driver={selectedDriver}
            />

            <DriverAttendanceCard
              driver={selectedDriver}
            />

            <DriverPaymentCard
              driver={selectedDriver}
            />

            <DriverDocumentCard
              driver={selectedDriver}
            />

            <DriverPerformanceCard
              driver={selectedDriver}
            />
          </>
        )}
      </DriverDetailsDrawer>
    </DashboardLayout>
  );
}