import {
  PricingType,
  TripType,
  VehicleCategory,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

export interface PricingRequest {
  vendorId: string;
  vehicleId: string;
  vehicleCategory: VehicleCategory;
  pricingType: PricingType;
  tripType: TripType;
  distanceKm?: number;
  durationHours?: number;
  pickupDateTime?: Date;
  couponId?: string;
  customerId?: string;
}

export interface PricingResult {
  baseFare: number;
  distanceCharge: number;
  timeCharge: number;
  nightCharge: number;
  discountAmount: number;
  extraCharges: number;
  taxableAmount: number;
  taxAmount: number;
  finalFare: number;
  vendorEarning: number;
  platformCommission: number;
  driverPayout: number;
}

const round = (value: number) =>
  Math.round((value + Number.EPSILON) * 100) / 100;

export class PricingService {
  async calculate(
    request: PricingRequest
  ): Promise<PricingResult> {
    const distanceKm = Math.max(
      request.distanceKm ?? 0,
      0
    );

    const durationHours = Math.max(
      request.durationHours ?? 0,
      0
    );

    const rule =
      await prisma.pricingRule.findFirst({
        where: {
          vendorId: request.vendorId,
          vehicleCategory:
            request.vehicleCategory,
          pricingType:
            request.pricingType,
          tripType:
            request.tripType,
          isActive: true,
        },
        include: {
          dynamicPricingRules: {
            where: {
              status: "ACTIVE",
            },
            orderBy: {
              createdAt: "desc",
            },
          },
        },
      });

    const vehicle =
      await prisma.vehicle.findFirst({
        where: {
          id: request.vehicleId,
          vendorId: request.vendorId,
          deletedAt: null,
        },
        select: {
          baseFare: true,
          pricePerKm: true,
          waitingCharge: true,
          nightCharge: true,
        },
      });

    if (!vehicle) {
      throw new Error(
        "Vehicle not found for pricing."
      );
    }

    let baseFare = Number(
      rule?.baseFare ??
        vehicle.baseFare ??
        0
    );

    const includedKm = Number(
      rule?.includedKm ?? 0
    );

    const billableKm = Math.max(
      distanceKm - includedKm,
      0
    );

    const pricePerKm = Number(
      rule?.pricePerKm ??
        vehicle.pricePerKm ??
        0
    );

    const pricePerHour = Number(
      rule?.pricePerHour ?? 0
    );

    const distanceCharge =
      request.pricingType ===
      PricingType.HOURLY
        ? 0
        : billableKm * pricePerKm;

    const timeCharge =
      request.pricingType ===
      PricingType.HOURLY
        ? durationHours * pricePerHour
        : 0;

    const isNight =
      request.pickupDateTime
        ? request.pickupDateTime.getHours() >= 22 ||
          request.pickupDateTime.getHours() < 6
        : false;

    const nightCharge = isNight
      ? Number(
          rule?.nightCharge ??
            vehicle.nightCharge ??
            0
        )
      : 0;

    let subtotal =
      baseFare +
      distanceCharge +
      timeCharge +
      nightCharge;

    let discountAmount = 0;

    /*
     * Existing dynamic pricing rules.
     * Only ACTIVE rules already configured
     * in the database are applied.
     */
    for (
      const dynamicRule of
        rule?.dynamicPricingRules ?? []
    ) {
      if (
        dynamicRule.ruleType ===
        "SURGE"
      ) {
        const multiplier =
          Number(
            dynamicRule.surgeMultiplier ??
              1
          );

        if (
          Number.isFinite(multiplier) &&
          multiplier > 0
        ) {
          subtotal *= multiplier;
        }
      }

      if (
        dynamicRule.ruleType ===
        "DISCOUNT"
      ) {
        const percent =
          Number(
            dynamicRule.discountPercent ??
              0
          );

        if (
          Number.isFinite(percent) &&
          percent > 0
        ) {
          discountAmount +=
            subtotal *
            (percent / 100);
        }
      }

      if (
        dynamicRule.minimumFare !==
          null &&
        dynamicRule.minimumFare !==
          undefined
      ) {
        subtotal = Math.max(
          subtotal,
          Number(
            dynamicRule.minimumFare
          )
        );
      }

      if (
        dynamicRule.maximumFare !==
          null &&
        dynamicRule.maximumFare !==
          undefined
      ) {
        subtotal = Math.min(
          subtotal,
          Number(
            dynamicRule.maximumFare
          )
        );
      }
    }

    /*
     * Existing coupon infrastructure.
     */
    if (request.couponId) {
      const coupon =
        await prisma.coupon.findFirst({
          where: {
            id: request.couponId,
            status: "ACTIVE",
            validFrom: {
              lte:
                request.pickupDateTime ??
                new Date(),
            },
            validTo: {
              gte:
                request.pickupDateTime ??
                new Date(),
            },
          },
        });

      if (coupon) {
        if (
          coupon.couponType ===
          "PERCENTAGE"
        ) {
          discountAmount +=
            subtotal *
            (Number(
              coupon.discountValue
            ) / 100);
        } else {
          discountAmount +=
            Number(
              coupon.discountValue
            );
        }

        if (
          coupon.maximumDiscount !==
          null
        ) {
          discountAmount = Math.min(
            discountAmount,
            Number(
              coupon.maximumDiscount
            )
          );
        }
      }
    }

    discountAmount = Math.min(
      Math.max(discountAmount, 0),
      subtotal
    );

    const extraCharges = 0;

    const taxableAmount = Math.max(
      subtotal -
        discountAmount +
        extraCharges,
      0
    );

    /*
     * Tax, platform commission and driver
     * payout percentages remain policy inputs.
     * No unsupported business percentage is
     * invented here.
     */
    const taxRate = 0;
    const commissionRate = 0;
    const driverPayoutRate = 0;

    const taxAmount =
      taxableAmount * taxRate;

    const finalFare =
      taxableAmount + taxAmount;

    const platformCommission =
      finalFare * commissionRate;

    const vendorEarning =
      finalFare -
      platformCommission;

    const driverPayout =
      vendorEarning *
      driverPayoutRate;

    return {
      baseFare: round(baseFare),
      distanceCharge: round(
        distanceCharge
      ),
      timeCharge: round(timeCharge),
      nightCharge: round(
        nightCharge
      ),
      discountAmount: round(
        discountAmount
      ),
      extraCharges: round(
        extraCharges
      ),
      taxableAmount: round(
        taxableAmount
      ),
      taxAmount: round(
        taxAmount
      ),
      finalFare: round(
        finalFare
      ),
      vendorEarning: round(
        vendorEarning
      ),
      platformCommission: round(
        platformCommission
      ),
      driverPayout: round(
        driverPayout
      ),
    };
  }
}

export const pricingService =
  new PricingService();
