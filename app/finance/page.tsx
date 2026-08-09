"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import DashboardLayout from "@/components/DashboardLayout";

import FinanceHeader from "@/components/finance/FinanceHeader";
import FinanceStats from "@/components/finance/FinanceStats";
import FinanceFilters from "@/components/finance/FinanceFilters";
import RevenueChart from "@/components/finance/RevenueChart";
import ExpenseChart from "@/components/finance/ExpenseChart";
import IncomeExpenseChart from "@/components/finance/IncomeExpenseChart";
import ProfitLossCard from "@/components/finance/ProfitLossCard";
import ExpenseBreakdown from "@/components/finance/ExpenseBreakdown";
import GSTCard from "@/components/finance/GSTCard";
import VendorPaymentCard from "@/components/finance/VendorPaymentCard";
import DriverSalaryCard from "@/components/finance/DriverSalaryCard";
import WalletCard from "@/components/finance/WalletCard";
import RecentTransactions from "@/components/finance/RecentTransactions";
import TransactionTable from "@/components/finance/TransactionTable";
import AddExpenseModal from "@/components/finance/AddExpenseModal";
import InvoiceDrawer from "@/components/finance/InvoiceDrawer";

import type { Transaction } from "@/components/finance/TransactionRow";

interface ApiTransaction {
  id: string;
  createdAt: string;
  amount: number | string;
  transactionType: string;
  paymentStatus: string;
  paymentMethod?: string | null;
  booking?: {
    id?: string;
    referenceNumber?: string | null;
  } | null;
}

interface TransactionsResponse {
  success: boolean;
  data: ApiTransaction[];
  message?: string;
}

function mapTransaction(
  item: ApiTransaction
): Transaction {
  const typeMap: Record<
    string,
    Transaction["type"]
  > = {
    INCOME: "Income",
    EXPENSE: "Expense",
    VENDOR_PAYMENT: "Vendor Payment",
    DRIVER_SALARY: "Driver Salary",
    REFUND: "Refund",
    COMMISSION: "Commission",
  };

  const statusMap: Record<
    string,
    Transaction["status"]
  > = {
    PAID: "Completed",
    COMPLETED: "Completed",
    SUCCESS: "Completed",
    PENDING: "Pending",
    FAILED: "Failed",
    CANCELLED: "Failed",
  };

  const amount =
    typeof item.amount === "number"
      ? item.amount
      : Number(item.amount);

  return {
    id: item.id,
    date: new Date(item.createdAt).toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    ),
    details:
      item.booking?.referenceNumber ??
      item.booking?.id ??
      "Finance Transaction",
    type:
      typeMap[item.transactionType] ??
      "Income",
    paymentMethod:
      item.paymentMethod ?? "N/A",
    amount: Number.isFinite(amount) ? amount : 0,
    status:
      statusMap[item.paymentStatus] ??
      "Pending",
  };
}

export default function FinancePage() {
  const [search, setSearch] = useState("");
  const [type, setType] = useState("All");
  const [status, setStatus] = useState("All");

  const [transactions, setTransactions] =
    useState<Transaction[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [expenseModalOpen, setExpenseModalOpen] =
    useState(false);

  const [invoiceOpen, setInvoiceOpen] =
    useState(false);

  const fetchTransactions = useCallback(
    async () => {
      try {
        setLoading(true);
        setError("");

        const params = new URLSearchParams();

        if (status !== "All") {
          params.set(
            "status",
            status === "Completed"
              ? "PAID"
              : status.toUpperCase()
          );
        }

        if (type !== "All") {
          const typeMap: Record<string, string> = {
            Income: "INCOME",
            Expense: "EXPENSE",
            "Vendor Payment":
              "VENDOR_PAYMENT",
            "Driver Salary":
              "DRIVER_SALARY",
            Refund: "REFUND",
            Commission: "COMMISSION",
          };

          if (typeMap[type]) {
            params.set("type", typeMap[type]);
          }
        }

        const query = params.toString();

        const response = await fetch(
          `/api/finance/transactions${
            query ? `?${query}` : ""
          }`,
          {
            cache: "no-store",
          }
        );

        const result =
          (await response.json()) as TransactionsResponse;

        if (!response.ok || !result.success) {
          throw new Error(
            result.message ??
              "Failed to load transactions."
          );
        }

        setTransactions(
          Array.isArray(result.data)
            ? result.data.map(mapTransaction)
            : []
        );
      } catch (err) {
        console.error(
          "Failed to load finance transactions:",
          err
        );

        setTransactions([]);

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load transactions."
        );
      } finally {
        setLoading(false);
      }
    },
    [status, type]
  );

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const filteredTransactions = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return transactions;
    }

    return transactions.filter((item) => {
      return (
        item.details
          .toLowerCase()
          .includes(query) ||
        item.id
          .toLowerCase()
          .includes(query) ||
        item.paymentMethod
          .toLowerCase()
          .includes(query)
      );
    });
  }, [transactions, search]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <FinanceHeader
          onAddExpense={() =>
            setExpenseModalOpen(true)
          }
        />

        <FinanceStats />

        <div className="grid gap-6 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <RevenueChart />
          </div>

          <ProfitLossCard />
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <ExpenseChart />
          <IncomeExpenseChart />
        </div>

        <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-4">
          <ExpenseBreakdown />
          <GSTCard />
          <VendorPaymentCard />
          <DriverSalaryCard />
        </div>

        <div className="grid gap-6 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <WalletCard />
          </div>

          <RecentTransactions />
        </div>

        <FinanceFilters
          search={search}
          setSearch={setSearch}
          type={type}
          setType={setType}
          status={status}
          setStatus={setStatus}
        />

        {loading ? (
          <div className="rounded-xl bg-white p-10 text-center text-slate-500 shadow-sm">
            Loading transactions...
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-red-700">
            {error}
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="rounded-xl bg-white p-10 text-center text-slate-500 shadow-sm">
            No transactions found.
          </div>
        ) : (
          <TransactionTable
            transactions={filteredTransactions}
            onView={() =>
              setInvoiceOpen(true)
            }
          />
        )}
      </div>

      <AddExpenseModal
        open={expenseModalOpen}
        onClose={() =>
          setExpenseModalOpen(false)
        }
      />

      <InvoiceDrawer
        open={invoiceOpen}
        onClose={() =>
          setInvoiceOpen(false)
        }
      />
    </DashboardLayout>
  );
}