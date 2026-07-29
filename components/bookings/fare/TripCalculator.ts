import { FareInput } from './types';
import { PricingRules } from './PricingRules';

export default class TripCalculator {
  static getChargeableKm(data: FareInput): number {
    switch (data.tripType) {
      case 'Airport Transfer':
      case 'Outstation One Way':
        return data.totalDistance;

      case 'Outstation Round Trip':
      case 'Multi City': {
        const minimumKm =
          PricingRules.minimumKmPerDay * data.totalDays;

        return Math.max(data.totalDistance, minimumKm);
      }

      case 'Hourly Rental':
        return data.packageKm ?? 0;

      case 'Corporate':
      case 'Package Tour':
        return data.totalDistance;

      default:
        return data.totalDistance;
    }
  }

  static getVendorFare(data: FareInput): number {
    switch (data.tripType) {
      case 'Airport Transfer':
      case 'Outstation One Way':
        return data.baseFare;

      case 'Outstation Round Trip':
      case 'Multi City':
        return (
          this.getChargeableKm(data) *
          (data.vendorRatePerKm ?? 0)
        );

      case 'Hourly Rental': {
        const packageFare = data.baseFare;

        const extraKm =
          (data.extraKm ?? 0) *
          (data.extraKmRate ?? 0);

        const extraHour =
          (data.extraHours ?? 0) *
          (data.extraHourRate ?? 0);

        return packageFare + extraKm + extraHour;
      }

      case 'Corporate':
      case 'Package Tour':
        return data.baseFare;

      default:
        return data.baseFare;
    }
  }

  static getExtraCharges(data: FareInput): number {
    return (
      data.extras.toll +
      data.extras.parking +
      data.extras.permit +
      data.extras.stateTax +
      data.extras.driverAllowance +
      data.extras.other
    );
  }
}