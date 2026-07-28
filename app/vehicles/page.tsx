'use client';

import { useMemo, useState } from 'react';

import DashboardLayout from '../../components/DashboardLayout';

import VehicleHeader from '../../components/vehicles/VehicleHeader';
import VehicleStats from '../../components/vehicles/VehicleStats';
import VehicleFilters from '../../components/vehicles/VehicleFilters';
import VehicleTable from '../../components/vehicles/VehicleTable';

import AddVehicleModal from '../../components/vehicles/AddVehicleModal';
import VehicleForm, {
  VehicleFormData,
} from '../../components/vehicles/VehicleForm';

import VehicleDetailsDrawer from '../../components/vehicles/VehicleDetailsDrawer';

import { vehicles as initialVehicles, Vehicle } from '../../data/vehicles';

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>(initialVehicles);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [city, setCity] = useState('');

  const [openAddModal, setOpenAddModal] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  const filteredVehicles = useMemo(() => {
    return vehicles.filter((vehicle) => {
      const matchSearch =
        vehicle.vehicleName.toLowerCase().includes(search.toLowerCase()) ||
        vehicle.registrationNo.toLowerCase().includes(search.toLowerCase()) ||
        vehicle.vendorName.toLowerCase().includes(search.toLowerCase()) ||
        vehicle.driverName.toLowerCase().includes(search.toLowerCase());

      const matchStatus = !status || vehicle.status === status;

      const matchCity =
        !city || vehicle.city.toLowerCase().includes(city.toLowerCase());

      return matchSearch && matchStatus && matchCity;
    });
  }, [vehicles, search, status, city]);

  const totalRevenue = vehicles.reduce((sum, vehicle) => {
    const value = Number(vehicle.earnings.replace(/[₹,]/g, ''));
    return sum + value;
  }, 0);

  const totalVehicles = vehicles.length;

  const availableVehicles = vehicles.filter(
    (v) => v.status === 'Available'
  ).length;

  const onTripVehicles = vehicles.filter((v) => v.status === 'On Trip').length;

  const maintenanceVehicles = vehicles.filter(
    (v) => v.status === 'Maintenance'
  ).length;

  function resetFilters() {
    setSearch('');
    setStatus('');
    setCity('');
  }

  function handleViewVehicle(vehicle: Vehicle) {
    setSelectedVehicle(vehicle);
    setDrawerOpen(true);
  }

  function handleSaveVehicle(data: VehicleFormData) {
    const vehicle: Vehicle = {
      id: `VH${Date.now()}`,
      registrationNo: data.registrationNo,
      vehicleName: data.vehicleName,
      brand: data.brand,
      model: data.model,
      year: Number(data.year),
      vehicleType: data.vehicleType,
      category: data.category,
      fuelType: data.fuelType,
      transmission: data.transmission,
      seatingCapacity: Number(data.seatingCapacity),
      vendorName: data.vendorName,
      driverName: data.driverName,
      rcExpiry: '-',
      insuranceExpiry: '-',
      permitExpiry: '-',
      fitnessExpiry: '-',
      pollutionExpiry: '-',
      status: 'Available',
      availability: 'Available',
      totalTrips: 0,
      earnings: '₹0',
      city: data.city,
      createdAt: new Date().toLocaleDateString(),
    };

    setVehicles((prev) => [vehicle, ...prev]);

    setOpenAddModal(false);
  }

  return (
    <DashboardLayout>
      <VehicleHeader
        totalVehicles={totalVehicles}
        onAddVehicle={() => setOpenAddModal(true)}
      />

      <VehicleStats
        total={totalVehicles}
        available={availableVehicles}
        onTrip={onTripVehicles}
        maintenance={maintenanceVehicles}
        revenue={`₹${totalRevenue.toLocaleString()}`}
      />

      <VehicleFilters
        search={search}
        status={status}
        city={city}
        onSearchChange={setSearch}
        onStatusChange={setStatus}
        onCityChange={setCity}
        onReset={resetFilters}
      />

      <VehicleTable vehicles={filteredVehicles} onView={handleViewVehicle} />

      <VehicleDetailsDrawer
        open={drawerOpen}
        vehicle={selectedVehicle}
        onClose={() => {
          setDrawerOpen(false);
          setSelectedVehicle(null);
        }}
      />

      <AddVehicleModal
        isOpen={openAddModal}
        onClose={() => setOpenAddModal(false)}
      >
        <VehicleForm
          onSave={handleSaveVehicle}
          onCancel={() => setOpenAddModal(false)}
        />
      </AddVehicleModal>
    </DashboardLayout>
  );
}
