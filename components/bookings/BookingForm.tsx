'use client';

import { useState } from 'react';

import CustomerSection from './sections/CustomerSection';
import VehicleSection from './sections/VehicleSection';
import TripSection from './sections/TripSection';
import PaymentSection from './sections/PaymentSection';
import NotesSection from './sections/NotesSection';

import LocationSection from './location/LocationSection';

import FareInputSection from './fare/FareInputSection';
import ExtraChargesCard from './fare/ExtraChargesCard';
import PackageCard from './fare/PackageCard';
import FareCalculator from './fare/FareCalculator';
import FareSummaryCard from './fare/FareSummaryCard';

import { ExtraCharges, FareOutput } from './fare/types';

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

  const [tripType, setTripType] = useState(
    'Outstation One Way'
  );

  const [paymentMethod, setPaymentMethod] =
    useState('Cash');

  const [notes, setNotes] = useState('');

  const [baseFare, setBaseFare] = useState(0);

  const [totalDistance, setTotalDistance] =
    useState(0);

  const [totalDays, setTotalDays] =
    useState(1);

  const [vendorRatePerKm, setVendorRatePerKm] =
    useState(18);

  const [packageHours, setPackageHours] =
    useState(8);

  const [packageKm, setPackageKm] =
    useState(80);

  const [extraKm, setExtraKm] =
    useState(0);

  const [extraKmRate, setExtraKmRate] =
    useState(18);

  const [extraHours, setExtraHours] =
    useState(0);

  const [extraHourRate, setExtraHourRate] =
    useState(200);

  const [extras, setExtras] =
    useState<ExtraCharges>({
      toll: 0,
      parking: 0,
      permit: 0,
      stateTax: 0,
      driverAllowance: 0,
      other: 0,
    });

  const [fare, setFare] =
    useState<FareOutput | null>(null);

  function handleSubmit(
    e: React.FormEvent
  ) {
    e.preventDefault();

    if (!fare) {
      alert('Fare not calculated.');
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
      fare: String(fare.finalFare),
      paymentMethod,
      notes,
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6"
    >
      <CustomerSection
        customer={customer}
        setCustomer={setCustomer}
      />

      <VehicleSection
        vendor={vendor}
        vehicle={vehicle}
        driver={driver}
        setVendor={setVendor}
        setVehicle={setVehicle}
        setDriver={setDriver}
      />

      <TripSection
        tripType={tripType}
        setTripType={setTripType}
        journeyDate={journeyDate}
        setJourneyDate={setJourneyDate}
        journeyTime={journeyTime}
        setJourneyTime={setJourneyTime}
      />

      <LocationSection
        tripType={tripType}
        pickup={pickup}
        setPickup={setPickup}
        drop={drop}
        setDrop={setDrop}
      />

      <FareInputSection
        tripType={tripType}
        baseFare={baseFare}
        setBaseFare={setBaseFare}
        totalDistance={totalDistance}
        setTotalDistance={setTotalDistance}
        totalDays={totalDays}
        setTotalDays={setTotalDays}
        vendorRatePerKm={vendorRatePerKm}
        setVendorRatePerKm={
          setVendorRatePerKm
        }
      />

      <ExtraChargesCard
        extras={extras}
        setExtras={setExtras}
      />

      {tripType ===
        'Hourly Rental' && (
        <PackageCard
          packageHours={packageHours}
          setPackageHours={
            setPackageHours
          }
          packageKm={packageKm}
          setPackageKm={setPackageKm}
          extraKm={extraKm}
          setExtraKm={setExtraKm}
          extraKmRate={extraKmRate}
          setExtraKmRate={
            setExtraKmRate
          }
          extraHours={extraHours}
          setExtraHours={
            setExtraHours
          }
          extraHourRate={
            extraHourRate
          }
          setExtraHourRate={
            setExtraHourRate
          }
        />
      )}

      <FareCalculator
        data={{
          tripType:
            tripType as any,
          baseFare,
          totalDistance,
          totalDays,
          packageHours,
          packageKm,
          extraKm,
          extraHours,
          vendorRatePerKm,
          extraKmRate,
          extraHourRate,
          platformFeePercentage:
            12,
          discount: 0,
          extras,
        }}
        onChange={setFare}
      />

      {fare && (
        <FareSummaryCard
          fare={fare}
        />
      )}

      <PaymentSection
        paymentMethod={
          paymentMethod
        }
        setPaymentMethod={
          setPaymentMethod
        }
        fare={
          fare
            ? String(
                fare.finalFare
              )
            : ''
        }
        setFare={() => {}}
      />

      <NotesSection
        notes={notes}
        setNotes={setNotes}
      />

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