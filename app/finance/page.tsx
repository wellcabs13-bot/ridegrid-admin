'use client';

import { useMemo, useState } from 'react';

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

export default function FinancePage() {
  const [search, setSearch] = useState('');
  const [type, setType] = useState('All');
  const [status, setStatus] = useState('All');

  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [invoiceOpen, setInvoiceOpen] = useState(false);

  const transactions = useMemo<Transaction[]>(
    () => [
      {
        id: 'TXN-1001',
        date: '26 Jul 2026',
        details: 'Mumbai Airport Transfer',
        type: 'Income',
        paymentMethod: 'UPI',
        amount: 3500,
        status: 'Completed',
      },
      {
        id: 'TXN-1002',
        date: '26 Jul 2026',
        details: 'Vendor Settlement',
        type: 'Expense',
        paymentMethod: 'Bank',
        amount: 5200,
        status: 'Completed',
      },
      {
        id: 'TXN-1003',
        date: '25 Jul 2026',
        details: 'Driver Salary',
        type: 'Expense',
        paymentMethod: 'Bank',
        amount: 18000,
        status: 'Pending',
      },
      {
        id: 'TXN-1004',
        date: '25 Jul 2026',
        details: 'Corporate Booking',
        type: 'Income',
        paymentMethod: 'Card',
        amount: 15600,
        status: 'Completed',
      },
      {
        id: 'TXN-1005',
        date: '24 Jul 2026',
        details: 'Fuel Expense',
        type: 'Expense',
        paymentMethod: 'Cash',
        amount: 2400,
        status: 'Completed',
      },
      {
        id: 'TXN-1006',
        date: '24 Jul 2026',
        details: 'Outstation Booking',
        type: 'Income',
        paymentMethod: 'UPI',
        amount: 9800,
        status: 'Completed',
      },
    ],
    []
  );

  const filteredTransactions = useMemo(() => {
    return transactions.filter((item) => {
      const searchMatch =
        item.details.toLowerCase().includes(search.toLowerCase()) ||
        item.id.toLowerCase().includes(search.toLowerCase());

      const typeMatch = type === 'All' || item.type === type;
      const statusMatch = status === 'All' || item.status === status;

      return searchMatch && typeMatch && statusMatch;
    });
  }, [transactions, search, type, status]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <FinanceHeader onAddExpense={() => setExpenseModalOpen(true)} />

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

        <TransactionTable
          transactions={filteredTransactions}
          onView={() => setInvoiceOpen(true)}
        />
      </div>

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