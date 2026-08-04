'use client';

import { useEffect, useMemo, useState } from 'react';

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

import { Customer } from '../../data/customers';

export default function CustomersPage() {
  const [customerList, setCustomerList] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [city, setCity] = useState('');

  const [openAddModal, setOpenAddModal] = useState(false);

  const [selectedCustomer, setSelectedCustomer] =
    useState<Customer | null>(null);

  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    fetchCustomers();
  }, []);

  async function fetchCustomers() {
    try {
      setLoading(true);

      const response = await fetch('/api/customers');
      const result = await response.json();

      if (result.success) {
        setCustomerList(result.data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  const filteredCustomers = useMemo(() => {
    return customerList.filter((customer) => {
      const matchSearch =
        customer.name.toLowerCase().includes(search.toLowerCase()) ||
        customer.mobile.includes(search);

      const matchStatus =
        status === '' || customer.status === status;

      const matchCity =
        city === '' ||
        customer.city
          .toLowerCase()
          .includes(city.toLowerCase());

      return (
        matchSearch &&
        matchStatus &&
        matchCity
      );
    });
  }, [customerList, search, status, city]);

  const totalCustomers =
    filteredCustomers.length;

  const activeCustomers =
    filteredCustomers.filter(
      (customer) =>
        customer.status === 'Active'
    ).length;

  const inactiveCustomers =
    filteredCustomers.filter(
      (customer) =>
        customer.status === 'Inactive'
    ).length;

  const totalRevenue =
    filteredCustomers.reduce(
      (sum, customer) => {
        const amount = Number(
          customer.totalSpent.replace(
            /[₹,]/g,
            ''
          )
        );

        return sum + amount;
      },
      0
    );

  function resetFilters() {
    setSearch('');
    setStatus('');
    setCity('');
  }

  async function handleSaveCustomer(
    customer: CustomerFormData
  ) {
    try {
      const response = await fetch(
        '/api/customers',
        {
          method: 'POST',
          headers: {
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify(customer),
        }
      );

      const result =
        await response.json();

      if (result.success) {
        await fetchCustomers();
        setOpenAddModal(false);
      } else {
        alert(result.message);
      }
    } catch (error) {
      console.error(error);
      alert(
        'Failed to create customer.'
      );
    }
  }

  function handleViewCustomer(
    customer: Customer
  ) {
    setSelectedCustomer(customer);
    setDrawerOpen(true);
  }

  return (
    <DashboardLayout>
      <CustomerHeader
        totalCustomers={
          totalCustomers
        }
        onAddCustomer={() =>
          setOpenAddModal(true)
        }
      />

      <CustomerStats
        total={totalCustomers}
        active={activeCustomers}
        inactive={
          inactiveCustomers
        }
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

      {loading ? (
        <div className="rounded-xl bg-white p-10 text-center">
          Loading customers...
        </div>
      ) : (
        <CustomerTable
          customers={
            filteredCustomers
          }
          onView={
            handleViewCustomer
          }
        />
      )}

      <CustomerDetailsDrawer
        open={drawerOpen}
        customer={
          selectedCustomer
        }
        onClose={() =>
          setDrawerOpen(false)
        }
      />

      <AddCustomerModal
        isOpen={openAddModal}
        title="Add New Customer"
        onClose={() =>
          setOpenAddModal(false)
        }
      >
        <CustomerForm
          onSave={
            handleSaveCustomer
          }
          onCancel={() =>
            setOpenAddModal(false)
          }
        />
      </AddCustomerModal>
    </DashboardLayout>
  );
}