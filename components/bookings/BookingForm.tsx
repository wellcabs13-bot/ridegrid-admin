'use client';

import { useState } from 'react';

import CustomerSelect from './CustomerSelect';
import VehicleAssignmentCard from './VehicleAssignmentCard';
import FareSummary from './FareSummary';

export interface BookingFormData {
  customer: string;
  vendor: string;
  vehicle: string;
  driver: string;
  pickup: string;
  drop: string;
  journeyDate: string;
  journeyTime: string;
  tripType: string;
  fare: string;
  paymentMethod: string;
  notes: string;
}

interface BookingFormProps {
  onSave: (booking: BookingFormData) => void;
  onCancel: () => void;
}

export default function BookingForm({
  onSave,
  onCancel,
}: BookingFormProps) {
  const [customer, setCustomer] = useState('');

  const [vendor, setVendor] = useState('');
  const [vehicle, setVehicle] = useState('');
  const [driver, setDriver] = useState('');

  const [pickup, setPickup] = useState('');
  const [drop, setDrop] = useState('');

  const [journeyDate, setJourneyDate] = useState('');
  const [journeyTime, setJourneyTime] = useState('');

  const [tripType, setTripType] = useState('One Way');

  const [fare, setFare] = useState('');

  const [paymentMethod, setPaymentMethod] = useState('Cash');

  const [notes, setNotes] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (
      !customer ||
      !vendor ||
      !vehicle ||
      !driver ||
      !pickup ||
      !drop ||
      !journeyDate ||
      !journeyTime ||
      !fare
    ) {
      alert('Please fill all required fields.');
      return;
    }

    onSave({
      customer,
      vendor,
      vehicle,
      driver,
      pickup,
      drop,
      journeyDate,
      journeyTime,
      tripType,
      fare,
      paymentMethod,
      notes,
    });

    setCustomer('');

    setVendor('');
    setVehicle('');
    setDriver('');

    setPickup('');
    setDrop('');

    setJourneyDate('');
    setJourneyTime('');

    setTripType('One Way');

    setFare('');

    setPaymentMethod('Cash');

    setNotes('');
  }  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <CustomerSelect
        value={customer}
        onChange={setCustomer}
      />

      <VehicleAssignmentCard
        vendor={vendor}
        vehicle={vehicle}
        driver={driver}
        onVendorChange={setVendor}
        onVehicleChange={setVehicle}
        onDriverChange={setDriver}
      />

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-semibold">
            Trip Type
          </label>

          <select
            value={tripType}
            onChange={(e) => setTripType(e.target.value)}
            className="w-full rounded-xl border px-4 py-3"
          >
            <option>One Way</option>
            <option>Round Trip</option>
            <option>Rental</option>
            <option>Airport Transfer</option>
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold">
            Payment Method
          </label>

          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="w-full rounded-xl border px-4 py-3"
          >
            <option>Cash</option>
            <option>UPI</option>
            <option>Card</option>
            <option>Bank Transfer</option>
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold">
            Pickup Location
          </label>

          <input
            value={pickup}
            onChange={(e) => setPickup(e.target.value)}
            placeholder="Enter Pickup Location"
            className="w-full rounded-xl border px-4 py-3"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold">
            Drop Location
          </label>

          <input
            value={drop}
            onChange={(e) => setDrop(e.target.value)}
            placeholder="Enter Drop Location"
            className="w-full rounded-xl border px-4 py-3"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold">
            Journey Date
          </label>

          <input
            type="date"
            value={journeyDate}
            onChange={(e) => setJourneyDate(e.target.value)}
            className="w-full rounded-xl border px-4 py-3"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold">
            Journey Time
          </label>

          <input
            type="time"
            value={journeyTime}
            onChange={(e) => setJourneyTime(e.target.value)}
            className="w-full rounded-xl border px-4 py-3"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold">
            Fare (₹)
          </label>

          <input
            type="number"
            value={fare}
            onChange={(e) => setFare(e.target.value)}
            placeholder="Enter Fare"
            className="w-full rounded-xl border px-4 py-3"
          />
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold">
          Notes
        </label>

        <textarea
          rows={4}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Additional Notes"
          className="w-full rounded-xl border px-4 py-3"
        />
      </div>

      <FareSummary fare={fare} />

      <div className="flex justify-end gap-4 border-t pt-6">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-slate-300 px-6 py-3 hover:bg-slate-100"
        >
          Cancel
        </button>

        <button
          type="submit"
          className="rounded-xl bg-blue-600 px-6 py-3 text-white hover:bg-blue-700"
        >
          Save Booking
        </button>
      </div>
    </form>
  );
}