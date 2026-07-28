'use client';

import { useMemo, useState } from 'react';

import DashboardLayout from '../../components/DashboardLayout';

import CustomerHeader from '../../components/customers/CustomerHeader';
import CustomerStats from '../../components/customers/CustomerStats';
import CustomerFilters from '../../components/customers/CustomerFilters';
import CustomerTable from '../../components/customers/CustomerTable';

import AddCustomerModal from '../../components/customers/AddCustomerModal';
import CustomerForm, {
  CustomerFormData,
} from '../../components/customers/CustomerForm';

import CustomerDetailsDrawer from '../../components/customers/CustomerDetailsDrawer';

import { customers as customerData, Customer } from '../../data/customers';

export default function CustomersPage() {
  const [customerList, setCustomerList] = useState<Customer[]>(customerData);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [city, setCity] = useState('');

  const [openAddModal, setOpenAddModal] = useState(false);

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  );

  const [drawerOpen, setDrawerOpen] = useState(false);

  const filteredCustomers = useMemo(() => {
    return customerList.filter((customer) => {
      const matchSearch =
        customer.name.toLowerCase().includes(search.toLowerCase()) ||
        customer.mobile.includes(search);

      const matchStatus = status === '' || customer.status === status;

      const matchCity =
        city === '' || customer.city.toLowerCase().includes(city.toLowerCase());

      return matchSearch && matchStatus && matchCity;
    });
  }, [customerList, search, status, city]);

  const totalCustomers = filteredCustomers.length;

  const activeCustomers = filteredCustomers.filter(
    (customer) => customer.status === 'Active'
  ).length;

  const inactiveCustomers = filteredCustomers.filter(
    (customer) => customer.status === 'Inactive'
  ).length;

  const totalRevenue = filteredCustomers.reduce((sum, customer) => {
    const amount = Number(customer.totalSpent.replace(/[₹,]/g, ''));

    return sum + amount;
  }, 0);

  function resetFilters() {
    setSearch('');
    setStatus('');
    setCity('');
  }

  function handleSaveCustomer(customer: CustomerFormData) {
    const newCustomer: Customer = {
      id: `CUS${Date.now()}`,
      name: customer.name,
      mobile: customer.mobile,
      email: customer.email,
      city: customer.city,
      totalBookings: 0,
      totalSpent: '₹0',
      preferredVehicle: '-',
      preferredDriver: '-',
      status: 'Active',
      joinedDate: new Date().toLocaleDateString(),
    };

    setCustomerList((prev) => [newCustomer, ...prev]);

    setOpenAddModal(false);
  }

  function handleViewCustomer(customer: Customer) {
    setSelectedCustomer(customer);
    setDrawerOpen(true);
  }

  return (
    <DashboardLayout>
      <CustomerHeader
        totalCustomers={totalCustomers}
        onAddCustomer={() => setOpenAddModal(true)}
      />

      <CustomerStats
        total={totalCustomers}
        active={activeCustomers}
        inactive={inactiveCustomers}
        revenue={totalRevenue}
      />

      <CustomerFilters
        search={search}
        status={status}
        city={city}
        onSearchChange={setSearch}
        onStatusChange={setStatus}
        onCityChange={setCity}
        onReset={resetFilters}
      />

      <CustomerTable
        customers={filteredCustomers}
        onView={handleViewCustomer}
      />

      <CustomerDetailsDrawer
        open={drawerOpen}
        customer={selectedCustomer}
        onClose={() => setDrawerOpen(false)}
      />

      <AddCustomerModal
        isOpen={openAddModal}
        title="Add New Customer"
        onClose={() => setOpenAddModal(false)}
      >
        <CustomerForm
          onSave={handleSaveCustomer}
          onCancel={() => setOpenAddModal(false)}
        />
      </AddCustomerModal>
    </DashboardLayout>
  );
}
