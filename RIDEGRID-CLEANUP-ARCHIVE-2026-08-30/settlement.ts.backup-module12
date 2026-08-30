import {
  Prisma,
  SettlementStatus,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

export class SettlementRepository {
  async findAll(
    where: Prisma.VendorSettlementWhereInput = {}
  ) {
    return prisma.vendorSettlement.findMany({
      where,
      include: {
        vendor: true,
        wallet: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async findById(id: string) {
    return prisma.vendorSettlement.findUnique({
      where: { id },
      include: {
        vendor: true,
        wallet: true,
      },
    });
  }

  async findByVendor(vendorId: string) {
    return prisma.vendorSettlement.findMany({
      where: { vendorId },
      include: {
        wallet: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async findByStatus(
    settlementStatus: SettlementStatus
  ) {
    return prisma.vendorSettlement.findMany({
      where: {
        settlementStatus,
      },
      include: {
        vendor: true,
        wallet: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async create(
    data: Prisma.VendorSettlementCreateInput
  ) {
    return prisma.vendorSettlement.create({
      data,
      include: {
        vendor: true,
        wallet: true,
      },
    });
  }

  async update(
    id: string,
    data: Prisma.VendorSettlementUpdateInput
  ) {
    return prisma.vendorSettlement.update({
      where: { id },
      data,
      include: {
        vendor: true,
        wallet: true,
      },
    });
  }

  async updateStatus(
    id: string,
    settlementStatus: SettlementStatus
  ) {
    return prisma.vendorSettlement.update({
      where: { id },
      data: {
        settlementStatus,
        settledAt:
          settlementStatus === SettlementStatus.COMPLETED
            ? new Date()
            : undefined,
      },
    });
  }
}

export const settlementRepository =
  new SettlementRepository();