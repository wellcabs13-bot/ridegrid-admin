import {
  Prisma,
  WalletTransactionType,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

export class WalletRepository {
  async findByVendor(vendorId: string) {
    return prisma.vendorWallet.findUnique({
      where: { vendorId },
      include: {
        vendor: true,
        transactions: {
          orderBy: {
            createdAt: "desc",
          },
        },
        settlements: {
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });
  }

  async findById(id: string) {
    return prisma.vendorWallet.findUnique({
      where: { id },
      include: {
        vendor: true,
        transactions: {
          orderBy: {
            createdAt: "desc",
          },
        },
        settlements: {
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });
  }

  async create(
    data: Prisma.VendorWalletCreateInput
  ) {
    return prisma.vendorWallet.create({
      data,
      include: {
        vendor: true,
      },
    });
  }

  async update(
    id: string,
    data: Prisma.VendorWalletUpdateInput
  ) {
    return prisma.vendorWallet.update({
      where: { id },
      data,
    });
  }

  async createTransaction(
    data: Prisma.WalletTransactionCreateInput
  ) {
    return prisma.walletTransaction.create({
      data,
    });
  }

  async findTransactions(walletId: string) {
    return prisma.walletTransaction.findMany({
      where: { walletId },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async findTransactionsByType(
    walletId: string,
    transactionType: WalletTransactionType
  ) {
    return prisma.walletTransaction.findMany({
      where: {
        walletId,
        transactionType,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async getBalance(vendorId: string) {
    return prisma.vendorWallet.findUnique({
      where: { vendorId },
      select: {
        id: true,
        vendorId: true,
        balance: true,
      },
    });
  }

  async adjustBalance(
    vendorId: string,
    transactionType: WalletTransactionType,
    amount: Prisma.Decimal | number | string,
    options?: {
      referenceId?: string;
      referenceType?: string;
      performedBy?: string;
      description?: string;
    }
  ) {
    const value = new Prisma.Decimal(amount);

    if (value.lte(0)) {
      throw new Error(
        "Wallet transaction amount must be greater than zero."
      );
    }

    return prisma.$transaction(
      async (tx) => {
        const wallet =
          await tx.vendorWallet.findUnique({
            where: {
              vendorId,
            },
          });

        if (!wallet) {
          throw new Error(
            "Vendor wallet not found."
          );
        }

        const balanceBefore =
          new Prisma.Decimal(wallet.balance);

        const balanceAfter =
          transactionType ===
          WalletTransactionType.CREDIT
            ? balanceBefore.add(value)
            : balanceBefore.sub(value);

        if (balanceAfter.lt(0)) {
          throw new Error(
            "Insufficient wallet balance."
          );
        }

        const updatedWallet =
          await tx.vendorWallet.update({
            where: {
              id: wallet.id,
            },
            data: {
              balance: balanceAfter,
            },
          });

        const transaction =
          await tx.walletTransaction.create({
            data: {
              walletId: wallet.id,
              transactionType,
              amount: value,
              balanceBefore,
              balanceAfter,
              referenceId:
                options?.referenceId,
              referenceType:
                options?.referenceType,
              performedBy:
                options?.performedBy,
              description:
                options?.description,
            },
          });

        return {
          wallet: updatedWallet,
          transaction,
        };
      },
      {
        isolationLevel:
          Prisma.TransactionIsolationLevel.Serializable,
      }
    );
  }

  async credit(
    vendorId: string,
    amount: Prisma.Decimal | number | string,
    options?: {
      referenceId?: string;
      referenceType?: string;
      performedBy?: string;
      description?: string;
    }
  ) {
    return this.adjustBalance(
      vendorId,
      WalletTransactionType.CREDIT,
      amount,
      options
    );
  }

  async debit(
    vendorId: string,
    amount: Prisma.Decimal | number | string,
    options?: {
      referenceId?: string;
      referenceType?: string;
      performedBy?: string;
      description?: string;
    }
  ) {
    return this.adjustBalance(
      vendorId,
      WalletTransactionType.DEBIT,
      amount,
      options
    );
  }
}

export const walletRepository =
  new WalletRepository();
