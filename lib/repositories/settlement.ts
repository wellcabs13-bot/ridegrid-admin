import {
  Prisma,
  SettlementStatus,
  WalletTransactionType,
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
    if (
      settlementStatus !==
      SettlementStatus.COMPLETED
    ) {
      return prisma.vendorSettlement.update({
        where: { id },
        data: {
          settlementStatus,
        },
        include: {
          vendor: true,
          wallet: true,
        },
      });
    }

    return prisma.$transaction(
      async (tx) => {
        const settlement =
          await tx.vendorSettlement.findUnique({
            where: { id },
          });

        if (!settlement) {
          throw new Error(
            "Settlement not found."
          );
        }

        if (
          settlement.settlementStatus ===
          SettlementStatus.COMPLETED
        ) {
          return tx.vendorSettlement.findUnique({
            where: { id },
            include: {
              vendor: true,
              wallet: true,
            },
          });
        }

        if (
          settlement.settlementStatus ===
          SettlementStatus.CANCELLED
        ) {
          throw new Error(
            "Cancelled settlement cannot be completed."
          );
        }

        const wallet =
          await tx.vendorWallet.findUnique({
            where: {
              id: settlement.walletId,
            },
          });

        if (!wallet) {
          throw new Error(
            "Vendor wallet not found."
          );
        }

        const amount =
          new Prisma.Decimal(
            settlement.netAmount
          );

        if (amount.lte(0)) {
          throw new Error(
            "Settlement amount must be greater than zero."
          );
        }

        const balanceBefore =
          new Prisma.Decimal(
            wallet.balance
          );

        const balanceAfter =
          balanceBefore.sub(amount);

        if (balanceAfter.lt(0)) {
          throw new Error(
            "Insufficient vendor wallet balance."
          );
        }

        await tx.vendorWallet.update({
          where: {
            id: wallet.id,
          },
          data: {
            balance: balanceAfter,
          },
        });

        await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            transactionType:
              WalletTransactionType.DEBIT,
            amount,
            balanceBefore,
            balanceAfter,
            referenceId: settlement.id,
            referenceType: "VENDOR_SETTLEMENT",
            performedBy:
              settlement.processedBy ?? undefined,
            description:
              `Vendor settlement ${settlement.id}`,
          },
        });

        return tx.vendorSettlement.update({
          where: { id },
          data: {
            settlementStatus:
              SettlementStatus.COMPLETED,
            settledAt: new Date(),
          },
          include: {
            vendor: true,
            wallet: true,
          },
        });
      },
      {
        isolationLevel:
          Prisma.TransactionIsolationLevel.Serializable,
      }
    );
  }
}

export const settlementRepository =
  new SettlementRepository();
