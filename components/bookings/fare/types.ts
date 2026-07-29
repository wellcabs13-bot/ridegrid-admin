export type TripType =
  | 'Airport Transfer'
  | 'Outstation One Way'
  | 'Outstation Round Trip'
  | 'Hourly Rental'
  | 'Multi City'
  | 'Corporate'
  | 'Package Tour';

export interface ExtraCharges {
  toll: number;
  parking: number;
  permit: number;
  stateTax: number;
  driverAllowance: number;
  other: number;
}

export interface FareInput {
  tripType: TripType;

  baseFare: number;

  totalDistance: number;

  totalDays: number;

  packageHours?: number;

  packageKm?: number;

  extraKm?: number;

  extraHours?: number;

  vendorRatePerKm?: number;

  extraKmRate?: number;

  extraHourRate?: number;

  platformFeePercentage: number;

  discount: number;

  extras: ExtraCharges;
}

export interface FareOutput {
  chargeableKm: number;

  vendorFare: number;

  extraCharges: number;

  platformFee: number;

  subtotal: number;

  discount: number;

  finalFare: number;
}