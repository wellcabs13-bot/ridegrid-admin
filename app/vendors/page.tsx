"use client";

import { useCallback, useEffect, useState } from "react";

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
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [city, setCity] = useState("");

  const [openAddModal, setOpenAddModal] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [selectedVendor, setSelectedVendor] =
    useState<Vendor | null>(null);

  const [editingVendor, setEditingVendor] =
    useState<Vendor | null>(null);

  const fetchVendors = useCallback(async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams();

      if (search.trim()) params.set("search", search.trim());
      if (status) params.set("status", status);
      if (city.trim()) params.set("city", city.trim());

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
  }, [search, status, city]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchVendors();
    }, 250);

    return () => clearTimeout(timer);
  }, [fetchVendors]);

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
        String(vendor.totalEarnings)
          .replace(/[^\d.-]/g, "")
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

  function handleEditVendor(vendor: Vendor) {
    setEditingVendor(vendor);
    setOpenAddModal(true);
  }

  async function handleSaveVendor(data: VendorFormData) {
    try {
      setSaving(true);

      const isEditing = Boolean(editingVendor);

      const response = await fetch("/api/vendors", {
        method: isEditing ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          isEditing
            ? {
                id: editingVendor?.id,
                companyName: data.companyName,
                ownerName: data.ownerName,
                mobile: data.mobile,
                email: data.email,
                city: data.city,
                status: data.status,
              }
            : {
                companyName: data.companyName,
                ownerName: data.ownerName,
                mobile: data.mobile,
                email: data.email,
                city: data.city,
              }
        ),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
            (isEditing
              ? "Failed to update vendor."
              : "Failed to create vendor.")
        );
      }

      setOpenAddModal(false);
      setEditingVendor(null);

      await fetchVendors();

      alert(
        isEditing
          ? "Vendor updated successfully."
          : "Vendor added successfully."
      );
    } catch (error) {
      console.error("Vendor save failed:", error);

      alert(
        error instanceof Error
          ? error.message
          : "Failed to save vendor."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteVendor(vendor: Vendor) {
    const confirmed = window.confirm(
      `Delete ${vendor.companyName}?\n\nThis will remove the vendor from the Super Admin vendor list.`
    );

    if (!confirmed) return;

    try {
      const response = await fetch(
        `/api/vendors?id=${encodeURIComponent(vendor.id)}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Failed to delete vendor."
        );
      }

      await fetchVendors();

      if (selectedVendor?.id === vendor.id) {
        setSelectedVendor(null);
        setDrawerOpen(false);
      }

      alert("Vendor deleted successfully.");
    } catch (error) {
      console.error("Vendor delete failed:", error);

      alert(
        error instanceof Error
          ? error.message
          : "Failed to delete vendor."
      );
    }
  }

  function closeModal() {
    if (saving) return;

    setOpenAddModal(false);
    setEditingVendor(null);
  }

  return (
    <DashboardLayout>
      <VendorHeader
        totalVendors={totalVendors}
        onAddVendor={() => {
          setEditingVendor(null);
          setOpenAddModal(true);
        }}
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
          onEdit={handleEditVendor}
          onDelete={handleDeleteVendor}
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
        title={editingVendor ? "Edit Vendor" : "Add New Vendor"}
        onClose={closeModal}
      >
        <VendorForm
          initialData={
            editingVendor
              ? {
                  companyName: editingVendor.companyName,
                  ownerName: editingVendor.ownerName,
                  mobile: editingVendor.mobile,
                  email: editingVendor.email,
                  city: editingVendor.city,
                  status: editingVendor.status,
                }
              : undefined
          }
          onSave={handleSaveVendor}
          onCancel={closeModal}
          saving={saving}
        />
      </AddVendorModal>
    </DashboardLayout>
  );
}