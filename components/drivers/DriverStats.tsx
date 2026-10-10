'use client';

import { CheckCircle2, PauseCircle, ShieldAlert, UserRound } from 'lucide-react';
import { Kpi } from '@/components/admin/kit';
import { Driver } from '../../data/drivers';

interface DriverStatsProps {
  drivers: Driver[];
}

// Counts come straight from the driver list currently shown. Nothing is estimated:
// the driver list does not carry live availability, so no "on trip" figure is shown.
export default function DriverStats({ drivers }: DriverStatsProps) {
  const count = (status: string) =>
    drivers.filter((driver) => String(driver.status) === status).length;

  return (
    <div className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
      <Kpi icon={UserRound} accent="blue" label="Total drivers" value={drivers.length.toLocaleString('en-IN')} hint="In this view" />
      <Kpi icon={CheckCircle2} accent="green" label="Active" value={count('Active').toLocaleString('en-IN')} />
      <Kpi icon={PauseCircle} accent="amber" label="Inactive" value={count('Inactive').toLocaleString('en-IN')} />
      <Kpi icon={ShieldAlert} accent="red" label="Suspended" value={(count('Suspended') + count('Blocked')).toLocaleString('en-IN')} />
    </div>
  );
}
