'use client';

import { useEffect, useMemo, useState } from 'react';

import DashboardLayout from '@/components/DashboardLayout';

import FinanceHeader from '@/components/finance/FinanceHeader';
import FinanceStats from '@/components/finance/FinanceStats';
import FinanceFilters from '@/components/finance/FinanceFilters';
import RevenueChart from '@/components/finance/RevenueChart';
import ExpenseChart from '@/components/finance/ExpenseChart';
import IncomeExpenseChart from '@/components/finance/IncomeExpenseChart';
import ProfitLossCard from '@/components/finance/ProfitLossCard';
import ExpenseBreakdown from '@/components/finance/ExpenseBreakdown';
import GSTCard from '@/components/finance/GSTCard';
import VendorPaymentCard from '@/components/finance/VendorPaymentCard';
import DriverSalaryCard from '@/components/finance/DriverSalaryCard';
import WalletCard from '@/components/finance/WalletCard';
import RecentTransactions from '@/components/finance/RecentTransactions';
import TransactionTable from '@/components/finance/TransactionTable';
import AddExpenseModal from '@/components/finance/AddExpenseModal';
import InvoiceDrawer from '@/components/finance/InvoiceDrawer';

import type { Transaction } from '@/components/finance/TransactionRow';

interface FinanceOverview {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  totalRefunds: number;
  totalCommission: number;
  pendingPayments: number;
  pendingTransactions: number;
  completedTransactions: number;
  settlementCount: number;
}

interface ApiTransaction {
  id: string;
  transactionType: string;
  paymentMethod: string;
  paymentStatus: string;
  amount: string | number;
  createdAt: string;
  booking?: {
    id?: string;
  } | null;
}

const emptyOverview: FinanceOverview = {
  totalRevenue: 0,
  totalExpenses: 0,
  netProfit: 0,
  totalRefunds: 0,
  totalCommission: 0,
  pendingPayments: 0,
  pendingTransactions: 0,
  completedTransactions: 0,
  settlementCount: 0,
};

const monthName = (date: Date) =>
  date.toLocaleString('en-IN', { month: 'short' });

export default function FinancePage() {
  const [search, setSearch] = useState('');
  const [type, setType] = useState('All');
  const [status, setStatus] = useState('All');

  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [invoiceOpen, setInvoiceOpen] = useState(false);

  const [overview, setOverview] =
    useState<FinanceOverview>(emptyOverview);

  const [apiTransactions, setApiTransactions] = useState<
    ApiTransaction[]
  >([]);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadFinance = async () => {
      try {
        setLoading(true);

        const [overviewResponse, transactionsResponse] =
          await Promise.all([
            fetch('/api/finance/overview', { cache: 'no-store' }),
            fetch('/api/finance/transactions', { cache: 'no-store' }),
          ]);

        const overviewJson = await overviewResponse.json();
        const transactionsJson = await transactionsResponse.json();

        if (overviewJson.success) {
          setOverview(overviewJson.data);
        }

        if (transactionsJson.success) {
          setApiTransactions(transactionsJson.data ?? []);
        }
      } catch (error) {
        console.error('Finance dashboard load failed:', error);
      } finally {
        setLoading(false);
      }
    };

    loadFinance();
  }, []);

  const transactions = useMemo<Transaction[]>(
    () =>
      apiTransactions.map((item) => ({
        id: item.id,
        date: new Date(item.createdAt).toLocaleDateString('en-IN'),
        details: item.booking?.id
          ? `Booking ${item.booking.id}`
          : item.transactionType.replaceAll('_', ' '),
        type:
          item.transactionType === 'REFUND'
            ? 'Refund'
            : item.transactionType === 'PLATFORM_COMMISSION'
              ? 'Commission'
              : item.transactionType === 'VENDOR_PAYOUT'
                ? 'Vendor Payment'
                : item.transactionType === 'DRIVER_PAYOUT'
                  ? 'Driver Salary'
                  : 'Income',
        paymentMethod: item.paymentMethod,
        amount: Number(item.amount),
        status:
          item.paymentStatus === 'PAID'
            ? 'Completed'
            : item.paymentStatus === 'PENDING'
              ? 'Pending'
              : 'Failed',
      })),
    [apiTransactions]
  );

  const filteredTransactions = useMemo(() => {
    return transactions.filter((item) => {
      const query = search.toLowerCase();

      const searchMatch =
        item.details.toLowerCase().includes(query) ||
        item.id.toLowerCase().includes(query);

      const typeMatch = type === 'All' || item.type === type;
      const statusMatch = status === 'All' || item.status === status;

      return searchMatch && typeMatch && statusMatch;
    });
  }, [transactions, search, type, status]);

  const chartData = useMemo(() => {
    const grouped = new Map<
      string,
      { month: string; income: number; expense: number }
    >();

    apiTransactions.forEach((item) => {
      const date = new Date(item.createdAt);
      const key = `${date.getFullYear()}-${date.getMonth()}`;

      if (!grouped.has(key)) {
        grouped.set(key, {
          month: monthName(date),
          income: 0,
          expense: 0,
        });
      }

      const current = grouped.get(key)!;
      const amount = Number(item.amount);

      if (
        item.transactionType === 'BOOKING_PAYMENT' ||
        item.transactionType === 'PLATFORM_COMMISSION'
      ) {
        current.income += amount;
      }

      if (
        item.transactionType === 'VENDOR_PAYOUT' ||
        item.transactionType === 'DRIVER_PAYOUT'
      ) {
        current.expense += amount;
      }
    });

    return Array.from(grouped.values()).slice(-7);
  }, [apiTransactions]);

  const recentTransactions = useMemo(
    () =>
      apiTransactions.slice(0, 6).map((item) => ({
        id: item.id,
        title: item.booking?.id
          ? `Booking ${item.booking.id}`
          : item.transactionType.replaceAll('_', ' '),
        type: item.transactionType.replaceAll('_', ' '),
        amount: Number(item.amount),
        time: new Date(item.createdAt).toLocaleString('en-IN'),
      })),
    [apiTransactions]
  );

  return (
    <DashboardLayout>
      <FinanceHeader
        onAddExpense={() => setExpenseModalOpen(true)}
      />

      <FinanceStats
        totalRevenue={overview.totalRevenue}
        totalExpenses={overview.totalExpenses}
        netProfit={overview.netProfit}
        pendingPayments={overview.pendingPayments}
        completedTransactions={overview.completedTransactions}
        refunds={overview.totalRefunds}
      />

      {loading && (
        <div className="mb-6 rounded-xl border border-indigo-100 bg-indigo-50 px-5 py-3 text-sm font-medium text-indigo-700">
          Loading finance data...
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <RevenueChart
            data={chartData.map((item) => ({
              month: item.month,
              revenue: item.income,
            }))}
          />
        </div>

        <ProfitLossCard
          revenue={overview.totalRevenue}
          expenses={overview.totalExpenses}
          profit={overview.netProfit}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <ExpenseChart
          data={chartData.map((item) => ({
            month: item.month,
            expense: item.expense,
          }))}
        />

        <IncomeExpenseChart data={chartData} />
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

        <RecentTransactions transactions={recentTransactions} />
      </div>

      <FinanceFilters
        search={search}
        setSearch={setSearch}
        type={type}
        setType={setType}
        status={status}
        setStatus={setStatus}
      />

      <TransactionTable
        transactions={filteredTransactions}
        onView={() => setInvoiceOpen(true)}
      />

      <AddExpenseModal
        open={expenseModalOpen}
        onClose={() => setExpenseModalOpen(false)}
      />

      <InvoiceDrawer
        open={invoiceOpen}
        onClose={() => setInvoiceOpen(false)}
      />
    </DashboardLayout>
  );
}