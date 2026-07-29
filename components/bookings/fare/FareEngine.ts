import TripCalculator from './TripCalculator';

import { FareInput, FareOutput } from './types';

export default class FareEngine {
  static calculate(
    input: FareInput
  ): FareOutput {
    const chargeableKm =
      TripCalculator.getChargeableKm(input);

    const vendorFare =
      TripCalculator.getVendorFare(input);

    const extraCharges =
      TripCalculator.getExtraCharges(input);

    const platformFee =
      ((vendorFare + extraCharges) *
        input.platformFeePercentage) /
      100;

    const subtotal =
      vendorFare +
      extraCharges +
      platformFee;

    const finalFare =
      subtotal - input.discount;

    return {
      chargeableKm,

      vendorFare,

      extraCharges,

      platformFee,

      subtotal,

      discount: input.discount,

      finalFare,
    };
  }
}