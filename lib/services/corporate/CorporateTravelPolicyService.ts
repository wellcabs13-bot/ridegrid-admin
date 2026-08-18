import { prisma } from "@/lib/prisma";

export type TravelPolicyInput = {
  corporateId: string;
  amount?: number;
  category?: string;
  pickupDateTime?: Date | string;
};

export class CorporateTravelPolicyService {
  async getActivePolicy(corporateId: string) {
    return prisma.corporateTravelPolicy.findFirst({
      where: {
        corporateId,
        isActive: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
    });
  }

  async validate(input: TravelPolicyInput) {
    const policy = await this.getActivePolicy(input.corporateId);

    if (!policy) {
      return {
        allowed: true,
        approvalRequired: false,
        policy: null,
        violations: [],
      };
    }

    const violations: string[] = [];

    if (
      input.amount !== undefined &&
      policy.maxTripAmount !== null &&
      input.amount > Number(policy.maxTripAmount)
    ) {
      violations.push("Trip amount exceeds the corporate travel policy limit.");
    }

    if (
      input.category &&
      policy.allowedCategories
    ) {
      const categories = Array.isArray(policy.allowedCategories)
        ? policy.allowedCategories.map(String)
        : [];

      if (
        categories.length > 0 &&
        !categories.includes(input.category)
      ) {
        violations.push("Travel category is not allowed by corporate policy.");
      }
    }

    if (input.pickupDateTime && !policy.nightTravelAllowed) {
      const date =
        input.pickupDateTime instanceof Date
          ? input.pickupDateTime
          : new Date(input.pickupDateTime);

      if (!Number.isNaN(date.getTime())) {
        const hour = date.getHours();

        if (hour >= 22 || hour < 6) {
          violations.push("Night travel is not allowed by corporate policy.");
        }
      }
    }

    return {
      allowed: violations.length === 0,
      approvalRequired:
        policy.approvalRequired || violations.length > 0,
      policy,
      violations,
    };
  }
}

export const corporateTravelPolicyService =
  new CorporateTravelPolicyService();
