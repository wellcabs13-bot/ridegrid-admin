'use client';

import { useMemo, useState } from 'react';

import DashboardLayout from '../../components/DashboardLayout';

import VendorHeader from '../../components/vendors/VendorHeader';
import VendorStats from '../../components/vendors/VendorStats';
import VendorFilters from '../../components/vendors/VendorFilters';
import VendorTable from '../../components/vendors/VendorTable';

import AddVendorModal from '../../components/vendors/AddVendorModal';
import VendorForm, {
  VendorFormData,
} from '../../components/vendors/VendorForm';

import VendorDetailsDrawer from '../../components/vendors/VendorDetailsDrawer';

import { vendors as vendorData, Vendor } from '../../data/vendors';

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>(vendorData);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [city, setCity] = useState('');

  const [openAddModal, setOpenAddModal] = useState(false);

  const [drawerOpen, setDrawerOpen] = useState(false);

  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);

  const filteredVendors = useMemo(() => {
    return vendors.filter((vendor) => {
      const matchSearch =
        vendor.companyName.toLowerCase().includes(search.toLowerCase()) ||
        vendor.ownerName.toLowerCase().includes(search.toLowerCase()) ||
        vendor.mobile.includes(search);

      const matchStatus = status === '' || vendor.status === status;

      const matchCity =
        city === '' || vendor.city.toLowerCase().includes(city.toLowerCase());

      return matchSearch && matchStatus && matchCity;
    });
  }, [vendors, search, status, city]);

  const totalVendors = filteredVendors.length;

  const activeVendors = filteredVendors.filter(
    (vendor) => vendor.status === 'Active'
  ).length;

  const inactiveVendors = filteredVendors.filter(
    (vendor) => vendor.status !== 'Active'
  ).length;

  const totalEarnings = filteredVendors.reduce((sum, vendor) => {
    return sum + Number(vendor.totalEarnings.replace(/[₹,]/g, ''));
  }, 0);

  function resetFilters() {
    setSearch('');
    setStatus('');
    setCity('');
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
      totalEarnings: '₹0',
      pendingPayment: '₹0',
      rating: 5,
      status: 'Pending',
      joinedDate: new Date().toLocaleDateString(),
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

      <VendorTable vendors={filteredVendors} onView={handleViewVendor} />

      <VendorDetailsDrawer
        open={drawerOpen}
        vendor={selectedVendor}
        onClose={() => setDrawerOpen(false)}
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
