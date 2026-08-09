"use client";

import { useEffect, useState } from "react";

import DashboardLayout from "../../components/DashboardLayout";

import VendorHeader from "../../components/vendors/VendorHeader";
import VendorStats from "../../components/vendors/VendorStats";
import VendorFilters from "../../components/vendors/VendorFilters";
import VendorTable from "../../components/vendors/VendorTable";

import AddVendorModal from "../../components/vendors/AddVendorModal";
import VendorForm, {
  VendorFormData,
} from "../../components/vendors/VendorForm";

import VendorDetailsDrawer from "../../components/vendors/VendorDetailsDrawer";

import { Vendor } from "../../data/vendors";

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);

  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [city, setCity] = useState("");

  const [openAddModal, setOpenAddModal] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [selectedVendor, setSelectedVendor] =
    useState<Vendor | null>(null);

  async function fetchVendors() {
    try {
      setLoading(true);

      const params = new URLSearchParams();

      if (search.trim()) {
        params.set("search", search.trim());
      }

      if (status) {
        params.set("status", status);
      }

      if (city.trim()) {
        params.set("city", city.trim());
      }

      params.set("page", "1");
      params.set("limit", "100");

      const response = await fetch(
        `/api/vendors?${params.toString()}`,
        {
          cache: "no-store",
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Failed to load vendors."
        );
      }

      setVendors(result.data || []);
    } catch (error) {
      console.error("Failed to load vendors:", error);
      setVendors([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchVendors();
    }, 250);

    return () => clearTimeout(timer);
  }, [search, status, city]);

  const totalVendors = vendors.length;

  const activeVendors = vendors.filter(
    (vendor) => vendor.status === "Active"
  ).length;

  const inactiveVendors = vendors.filter(
    (vendor) => vendor.status !== "Active"
  ).length;

  const totalEarnings = vendors.reduce((sum, vendor) => {
    return (
      sum +
      Number(
        vendor.totalEarnings.replace(/[â‚¹,]/g, "")
      )
    );
  }, 0);

  function resetFilters() {
    setSearch("");
    setStatus("");
    setCity("");
  }

  function handleViewVendor(vendor: Vendor) {
    setSelectedVendor(vendor);
    setDrawerOpen(true);
  }

  function handleSaveVendor(vendor: VendorFormData) {
    const newVendor: Vendor = {
      id: `VEN${Date.now()}`,
      companyName: vendor.companyName,
      ownerName: vendor.ownerName,
      mobile: vendor.mobile,
      email: vendor.email,
      city: vendor.city,
      totalVehicles: 0,
      activeVehicles: 0,
      completedTrips: 0,
      totalEarnings: "â‚¹0",
      pendingPayment: "â‚¹0",
      rating: 0,
      status: "Pending",
      joinedDate: new Date().toLocaleDateString("en-IN"),
    };

    setVendors((prev) => [newVendor, ...prev]);
    setOpenAddModal(false);
  }

  return (
    <DashboardLayout>
      <VendorHeader
        totalVendors={totalVendors}
        onAddVendor={() => setOpenAddModal(true)}
      />

      <VendorStats
        total={totalVendors}
        active={activeVendors}
        inactive={inactiveVendors}
        earnings={totalEarnings}
      />

      <VendorFilters
        search={search}
        status={status}
        city={city}
        onSearchChange={setSearch}
        onStatusChange={setStatus}
        onCityChange={setCity}
        onReset={resetFilters}
      />

      {loading ? (
        <div className="rounded-xl bg-white p-10 text-center text-slate-500 shadow-sm">
          Loading vendors...
        </div>
      ) : (
        <VendorTable
          vendors={vendors}
          onView={handleViewVendor}
        />
      )}

      <VendorDetailsDrawer
        open={drawerOpen}
        vendor={selectedVendor}
        onClose={() => {
          setDrawerOpen(false);
          setSelectedVendor(null);
        }}
      />

      <AddVendorModal
        isOpen={openAddModal}
        title="Add New Vendor"
        onClose={() => setOpenAddModal(false)}
      >
        <VendorForm
          onSave={handleSaveVendor}
          onCancel={() => setOpenAddModal(false)}
        />
      </AddVendorModal>
    </DashboardLayout>
  );
}
