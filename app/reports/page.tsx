'use client';

import { useState } from 'react';

import DashboardLayout from '@/components/DashboardLayout';

import ReportsHeader from '@/components/reports/ReportsHeader';
import ReportsStats from '@/components/reports/ReportsStats';
import ReportsFilters from '@/components/reports/ReportsFilters';
import ReportCategories from '@/components/reports/ReportCategories';

import RevenueReportCard from '@/components/reports/RevenueReportCard';
import BookingReportCard from '@/components/reports/BookingReportCard';
import CustomerReportCard from '@/components/reports/CustomerReportCard';
import VendorReportCard from '@/components/reports/VendorReportCard';
import DriverReportCard from '@/components/reports/DriverReportCard';
import VehicleReportCard from '@/components/reports/VehicleReportCard';
import FinanceReportCard from '@/components/reports/FinanceReportCard';
import CommissionReportCard from '@/components/reports/CommissionReportCard';
import GSTReportCard from '@/components/reports/GSTReportCard';
import TaxReportCard from '@/components/reports/TaxReportCard';
import InvoiceReportCard from '@/components/reports/InvoiceReportCard';
import RefundReportCard from '@/components/reports/RefundReportCard';
import ExpenseReportCard from '@/components/reports/ExpenseReportCard';
import PaymentReportCard from '@/components/reports/PaymentReportCard';

import PerformanceReport from '@/components/reports/PerformanceReport';
import ReportCharts from '@/components/reports/ReportCharts';
import ReportSummary from '@/components/reports/ReportSummary';
import ExportCard from '@/components/reports/ExportCard';
import ScheduleReportCard from '@/components/reports/ScheduleReportCard';
import RecentReports from '@/components/reports/RecentReports';
import ReportTable from '@/components/reports/ReportTable';

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState('Today');
  const [category, setCategory] = useState('All Categories');
  const [format, setFormat] = useState('All Formats');

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <ReportsHeader />

        <ReportsStats />

        <ReportsFilters
          dateRange={dateRange}
          setDateRange={setDateRange}
          category={category}
          setCategory={setCategory}
          format={format}
          setFormat={setFormat}
        />

        <ReportCategories />

        <div className="grid gap-6 xl:grid-cols-2">
          <RevenueReportCard />
          <BookingReportCard />

          <CustomerReportCard />
          <VendorReportCard />

          <DriverReportCard />
          <VehicleReportCard />

          <FinanceReportCard />
          <CommissionReportCard />

          <GSTReportCard />
          <TaxReportCard />

          <InvoiceReportCard />
          <RefundReportCard />

          <ExpenseReportCard />
          <PaymentReportCard />
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <PerformanceReport />
          <ReportCharts />
        </div>

        <ReportSummary />

        <div className="grid gap-6 xl:grid-cols-2">
          <ExportCard />
          <ScheduleReportCard />
        </div>

        <RecentReports />

        <ReportTable />
      </div>
    </DashboardLayout>
  );
}
