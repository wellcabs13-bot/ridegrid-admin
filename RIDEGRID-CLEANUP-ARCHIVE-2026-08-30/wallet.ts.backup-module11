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
    const wallet = await prisma.vendorWallet.findUnique({
      where: { vendorId },
      select: {
        id: true,
        vendorId: true,
        balance: true,
      },
    });

    return wallet;
  }
}

export const walletRepository =
  new WalletRepository();