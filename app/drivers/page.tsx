'use client';

import { useMemo, useState } from 'react';

import DashboardLayout from '../../components/DashboardLayout';

import { Driver, drivers } from '../../data/drivers';

import DriverHeader from '../../components/drivers/DriverHeader';
import DriverStats from '../../components/drivers/DriverStats';
import DriverFilters from '../../components/drivers/DriverFilters';
import DriverTable from '../../components/drivers/DriverTable';

import AddDriverModal from '../../components/drivers/AddDriverModal';
import DriverForm from '../../components/drivers/DriverForm';

import DriverDetailsDrawer from '../../components/drivers/DriverDetailsDrawer';

import DriverInfoCard from '../../components/drivers/DriverInfoCard';
import DriverLicenseCard from '../../components/drivers/DriverLicenseCard';
import DriverVehicleCard from '../../components/drivers/DriverVehicleCard';
import DriverTripHistoryCard from '../../components/drivers/DriverTripHistoryCard';
import DriverAttendanceCard from '../../components/drivers/DriverAttendanceCard';
import DriverPaymentCard from '../../components/drivers/DriverPaymentCard';
import DriverDocumentCard from '../../components/drivers/DriverDocumentCard';
import DriverPerformanceCard from '../../components/drivers/DriverPerformanceCard';

export default function DriversPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('All');

  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);

  const [drawerOpen, setDrawerOpen] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);

  const filteredDrivers = useMemo(() => {
    return drivers.filter((driver) => {
      const matchesSearch =
        driver.name.toLowerCase().includes(search.toLowerCase()) ||
        driver.mobile.includes(search) ||
        driver.vehicle.toLowerCase().includes(search.toLowerCase());

      const matchesStatus = status === 'All' || driver.status === status;

      return matchesSearch && matchesStatus;
    });
  }, [search, status]);

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
      <div className="space-y-6">
        <DriverHeader
          totalDrivers={drivers.length}
          onAddDriver={() => setModalOpen(true)}
        />

        <DriverStats totalDrivers={drivers.length} />

        <DriverFilters
          search={search}
          setSearch={setSearch}
          status={status}
          setStatus={setStatus}
        />

        <DriverTable drivers={filteredDrivers} onView={openDriver} />

        <AddDriverModal isOpen={modalOpen} onClose={() => setModalOpen(false)}>
          <DriverForm />
        </AddDriverModal>

        <DriverDetailsDrawer
          driver={selectedDriver}
          isOpen={drawerOpen}
          onClose={closeDrawer}
        >
          {selectedDriver && (
            <>
              <DriverInfoCard driver={selectedDriver} />

              <DriverLicenseCard driver={selectedDriver} />

              <DriverVehicleCard driver={selectedDriver} />

              <DriverTripHistoryCard driver={selectedDriver} />

              <DriverAttendanceCard driver={selectedDriver} />

              <DriverPaymentCard driver={selectedDriver} />

              <DriverDocumentCard driver={selectedDriver} />

              <DriverPerformanceCard driver={selectedDriver} />
            </>
          )}
        </DriverDetailsDrawer>
      </div>
    </DashboardLayout>
  );
}
