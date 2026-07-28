'use client';

import { Vehicle } from '../../data/vehicles';

interface VehicleInfoCardProps {
  vehicle: Vehicle;
}

export default function VehicleInfoCard({ vehicle }: VehicleInfoCardProps) {
  return (
    <div className="rounded-xl bg-white p-6 shadow">
      <h3 className="mb-6 text-lg font-bold">Vehicle Information</h3>

      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <p className="text-xs uppercase text-slate-500">
            Registration Number
          </p>
          <p className="mt-1 font-semibold">{vehicle.registrationNo}</p>
        </div>

        <div>
          <p className="text-xs uppercase text-slate-500">Vehicle</p>
          <p className="mt-1 font-semibold">{vehicle.vehicleName}</p>
        </div>

        <div>
          <p className="text-xs uppercase text-slate-500">Brand</p>
          <p>{vehicle.brand}</p>
        </div>

        <div>
          <p className="text-xs uppercase text-slate-500">Model</p>
          <p>{vehicle.model}</p>
        </div>

        <div>
          <p className="text-xs uppercase text-slate-500">Year</p>
          <p>{vehicle.year}</p>
        </div>

        <div>
          <p className="text-xs uppercase text-slate-500">Category</p>
          <p>{vehicle.category}</p>
        </div>

        <div>
          <p className="text-xs uppercase text-slate-500">Vehicle Type</p>
          <p>{vehicle.vehicleType}</p>
        </div>

        <div>
          <p className="text-xs uppercase text-slate-500">Seating</p>
          <p>{vehicle.seatingCapacity} Seats</p>
        </div>

        <div>
          <p className="text-xs uppercase text-slate-500">Fuel</p>
          <p>{vehicle.fuelType}</p>
        </div>

        <div>
          <p className="text-xs uppercase text-slate-500">Transmission</p>
          <p>{vehicle.transmission}</p>
        </div>

        <div>
          <p className="text-xs uppercase text-slate-500">City</p>
          <p>{vehicle.city}</p>
        </div>

        <div>
          <p className="text-xs uppercase text-slate-500">Status</p>

          <span className="mt-2 inline-flex rounded-full bg-green-100 px-3 py-1 text-sm text-green-700">
            {vehicle.status}
          </span>
        </div>
      </div>
    </div>
  );
}
