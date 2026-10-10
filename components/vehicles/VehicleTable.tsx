"use client";

import { Vehicle } from "../../data/vehicles";
import VehicleRow from "./VehicleRow";

interface VehicleTableProps {
  vehicles: Vehicle[];
  onView?: (vehicle: Vehicle) => void;
  onEdit?: (vehicle: Vehicle) => void;
  onDelete?: (vehicle: Vehicle) => void;
  onVerify?: (vehicle: Vehicle) => void;
  verifiedMap?: Record<string, boolean>;
}

export default function VehicleTable({
  vehicles,
  onView,
  onEdit,
  onDelete,
  onVerify,
  verifiedMap = {},
}: VehicleTableProps) {
  return (
    <section className="rg-card">
      <div className="overflow-x-auto">
        <table className="rg-table min-w-[960px]">
          <thead>
            <tr>
              <th>Vehicle</th>
              <th>Category</th>
              <th>Vendor</th>
              <th>Driver</th>
              <th>City</th>
              <th className="text-right">Trips</th>
              <th>Status</th>
              <th>Verification</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>

          <tbody>
            {vehicles.length > 0 ? (
              vehicles.map((vehicle) => (
                <VehicleRow
                  key={vehicle.id}
                  vehicle={vehicle}
                  onView={onView}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onVerify={onVerify}
                  isVerified={verifiedMap[vehicle.id] === true}
                />
              ))
            ) : (
              <tr>
                <td colSpan={9} className="!py-12 text-center text-neutral-500">
                  No vehicles found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
