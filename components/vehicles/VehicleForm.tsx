'use client';

import { useState } from 'react';

export interface VehicleFormData {
  registrationNo: string;
  vehicleName: string;
  brand: string;
  model: string;
  year: string;
  vehicleType: string;
  category: string;
  fuelType: string;
  transmission: string;
  seatingCapacity: string;
  vendorName: string;
  driverName: string;
  city: string;
}

interface VehicleFormProps {
  onSave: (vehicle: VehicleFormData) => void;
  onCancel: () => void;
}

export default function VehicleForm({ onSave, onCancel }: VehicleFormProps) {
  const [form, setForm] = useState<VehicleFormData>({
    registrationNo: '',
    vehicleName: '',
    brand: '',
    model: '',
    year: '',
    vehicleType: '',
    category: '',
    fuelType: '',
    transmission: '',
    seatingCapacity: '',
    vendorName: '',
    driverName: '',
    city: '',
  });

  function update(field: keyof VehicleFormData, value: string) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    onSave(form);

    setForm({
      registrationNo: '',
      vehicleName: '',
      brand: '',
      model: '',
      year: '',
      vehicleType: '',
      category: '',
      fuelType: '',
      transmission: '',
      seatingCapacity: '',
      vendorName: '',
      driverName: '',
      city: '',
    });
  }

  const fields: {
    key: keyof VehicleFormData;
    label: string;
  }[] = [
    {
      key: 'registrationNo',
      label: 'Registration Number',
    },
    {
      key: 'vehicleName',
      label: 'Vehicle Name',
    },
    {
      key: 'brand',
      label: 'Brand',
    },
    {
      key: 'model',
      label: 'Model',
    },
    {
      key: 'year',
      label: 'Year',
    },
    {
      key: 'vehicleType',
      label: 'Vehicle Type',
    },
    {
      key: 'category',
      label: 'Category',
    },
    {
      key: 'fuelType',
      label: 'Fuel Type',
    },
    {
      key: 'transmission',
      label: 'Transmission',
    },
    {
      key: 'seatingCapacity',
      label: 'Seating Capacity',
    },
    {
      key: 'vendorName',
      label: 'Vendor',
    },
    {
      key: 'driverName',
      label: 'Driver',
    },
    {
      key: 'city',
      label: 'City',
    },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {fields.map((field) => (
          <div key={field.key}>
            <label className="mb-2 block text-sm font-semibold">
              {field.label}
            </label>

            <input
              value={form[field.key]}
              onChange={(e) => update(field.key, e.target.value)}
              className="w-full rounded-lg border px-4 py-3 outline-none focus:border-blue-500"
              placeholder={field.label}
            />
          </div>
        ))}
      </div>

      <div className="flex justify-end gap-3 border-t pt-6">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border px-6 py-3 hover:bg-slate-100"
        >
          Cancel
        </button>

        <button
          type="submit"
          className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700"
        >
          Save Vehicle
        </button>
      </div>
    </form>
  );
}
