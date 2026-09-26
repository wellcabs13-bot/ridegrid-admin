"use client";

import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";

import CustomerHeader from "@/components/customers/CustomerHeader";
import CustomerStats from "@/components/customers/CustomerStats";
import CustomerFilters from "@/components/customers/CustomerFilters";
import CustomerTable from "@/components/customers/CustomerTable";
import AddCustomerModal from "@/components/customers/AddCustomerModal";
import CustomerForm, {
  CustomerFormData,
} from "@/components/customers/CustomerForm";
import CustomerDetailsDrawer from "@/components/customers/CustomerDetailsDrawer";

import { Customer } from "@/types/customer-ui";

export default function CustomersPage() {
  const [customers, setCustomers] =
    useState<Customer[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [search, setSearch] =
    useState("");

  const [status, setStatus] =
    useState("");

  const [city, setCity] =
    useState("");

  const [addOpen, setAddOpen] =
    useState(false);

  const [selectedCustomer, setSelectedCustomer] =
    useState<Customer | null>(null);

  const [drawerOpen, setDrawerOpen] =
    useState(false);

  async function fetchCustomers() {
    try {
      setLoading(true);

      const response = await fetch(
        "/api/customers?page=1&limit=100",
        {
          cache: "no-store",
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
            "Failed to load customers."
        );
      }

      setCustomers(result.data ?? []);
    } catch (error) {
      console.error(
        "Customer loading error:",
        error
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchCustomers();
  }, []);

  const filteredCustomers =
    useMemo(() => {
      return customers.filter((customer) => {
        const searchValue =
          search.toLowerCase().trim();

        const matchesSearch =
          !searchValue ||
          customer.name
            .toLowerCase()
            .includes(searchValue) ||
          customer.email
            .toLowerCase()
            .includes(searchValue) ||
          customer.mobile
            .toLowerCase()
            .includes(searchValue);

        const matchesStatus =
          !status ||
          customer.status === status;

        const matchesCity =
          !city ||
          customer.city
            .toLowerCase()
            .includes(
              city.toLowerCase()
            );

        return (
          matchesSearch &&
          matchesStatus &&
          matchesCity
        );
      });
    }, [
      customers,
      search,
      status,
      city,
    ]);

  const active =
    filteredCustomers.filter(
      (customer) =>
        customer.status === "Active"
    ).length;

  const inactive =
    filteredCustomers.filter(
      (customer) =>
        customer.status === "Inactive"
    ).length;

  const revenue =
    filteredCustomers.reduce(
      (sum, customer) =>
        sum +
        Number(
          customer.totalSpent.replace(
            /[₹,]/g,
            ""
          )
        ),
      0
    );

  async function handleSaveCustomer(
    data: CustomerFormData
  ) {
    try {
      const response = await fetch(
        "/api/customers",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify(data),
        }
      );

      const result =
        await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
            "Failed to create customer."
        );
      }

      setAddOpen(false);

      await fetchCustomers();
    } catch (error) {
      console.error(error);

      alert(
        error instanceof Error
          ? error.message
          : "Failed to create customer."
      );
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <CustomerHeader
          totalCustomers={
            filteredCustomers.length
          }
          onAddCustomer={() =>
            setAddOpen(true)
          }
        />

        <CustomerStats
          total={filteredCustomers.length}
          active={active}
          inactive={inactive}
          revenue={revenue}
        />

        <CustomerFilters
          search={search}
          status={status}
          city={city}
          onSearchChange={setSearch}
          onStatusChange={setStatus}
          onCityChange={setCity}
          onReset={() => {
            setSearch("");
            setStatus("");
            setCity("");
          }}
        />

        {loading ? (
          <div className="rounded-xl border bg-white p-12 text-center text-slate-500">
            Loading customers...
          </div>
        ) : (
          <CustomerTable
            customers={filteredCustomers}
            onView={(customer) => {
              setSelectedCustomer(
                customer
              );
              setDrawerOpen(true);
            }}
          />
        )}

        <CustomerDetailsDrawer
          open={drawerOpen}
          customer={selectedCustomer}
          onClose={() => {
            setDrawerOpen(false);
            setSelectedCustomer(null);
          }}
        />

        <AddCustomerModal
          isOpen={addOpen}
          title="Add New Customer"
          onClose={() =>
            setAddOpen(false)
          }
        >
          <CustomerForm
            onSave={handleSaveCustomer}
            onCancel={() =>
              setAddOpen(false)
            }
          />
        </AddCustomerModal>
      </div>
    </DashboardLayout>
  );
}