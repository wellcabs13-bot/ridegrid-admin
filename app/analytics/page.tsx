'use client';

import { useState } from 'react';

import DashboardLayout from '@/components/DashboardLayout';

import AnalyticsHeader from '@/components/analytics/AnalyticsHeader';
import AnalyticsStats from '@/components/analytics/AnalyticsStats';
import RevenueAnalytics from '@/components/analytics/RevenueAnalytics';
import BookingAnalytics from '@/components/analytics/BookingAnalytics';
import CustomerAnalytics from '@/components/analytics/CustomerAnalytics';
import VendorAnalytics from '@/components/analytics/VendorAnalytics';
import DriverAnalytics from '@/components/analytics/DriverAnalytics';
import CityAnalytics from '@/components/analytics/CityAnalytics';
import VehicleAnalytics from '@/components/analytics/VehicleAnalytics';
import CommissionAnalytics from '@/components/analytics/CommissionAnalytics';
import HeatMapCard from '@/components/analytics/HeatMapCard';
import TopPerformers from '@/components/analytics/TopPerformers';
import GrowthChart from '@/components/analytics/GrowthChart';
import AnalyticsFilters from '@/components/analytics/AnalyticsFilters';
import AnalyticsTable from '@/components/analytics/AnalyticsTable';

export default function AnalyticsPage() {
  const [period, setPeriod] = useState('Last 30 Days');
  const [city, setCity] = useState('All Cities');
  const [category, setCategory] = useState('All Categories');

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <AnalyticsHeader />

        <AnalyticsStats />

        <AnalyticsFilters
          period={period}
          setPeriod={setPeriod}
          city={city}
          setCity={setCity}
          category={category}
          setCategory={setCategory}
        />

        <div className="grid gap-6 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <RevenueAnalytics />
          </div>

          <GrowthChart />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <BookingAnalytics />
          <CustomerAnalytics />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <VendorAnalytics />
          <DriverAnalytics />
          <CityAnalytics />
        </div>

        <div className="grid gap-6 xl:grid-cols-3">
          <VehicleAnalytics />
          <CommissionAnalytics />
          <HeatMapCard />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <TopPerformers />
          </div>

          <div className="lg:col-span-2">
            <AnalyticsTable />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
