'use client';

import { CarFront, CheckCircle2, Navigation, Wrench } from 'lucide-react';
import { Kpi } from '@/components/admin/kit';

interface VehicleStatsProps {
  total: number;
  available: number;
  onTrip: number;
  maintenance: number;
}

// Counts of the vehicles currently loaded, by their real status. No revenue figure is
// shown: the vehicle list carries a base fare, not earned revenue.
export default function VehicleStats({
  total,
  available,
  onTrip,
  maintenance,
}: VehicleStatsProps) {
  return (
    <div className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
      <Kpi icon={CarFront} accent="blue" label="Total vehicles" value={total.toLocaleString('en-IN')} hint="In this view" />
      <Kpi icon={CheckCircle2} accent="green" label="Available" value={available.toLocaleString('en-IN')} />
      <Kpi icon={Navigation} accent="amber" label="On trip" value={onTrip.toLocaleString('en-IN')} />
      <Kpi icon={Wrench} accent="red" label="Maintenance" value={maintenance.toLocaleString('en-IN')} />
    </div>
  );
}
