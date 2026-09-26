import {
  PaymentStatus,
  Prisma,
  TransactionType,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

export class TransactionRepository {
  async findAll(
    where: Prisma.TransactionWhereInput = {}
  ) {
    return prisma.transaction.findMany({
      where,
      include: {
        booking: true,
        vendor: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async findById(id: string) {
    return prisma.transaction.findUnique({
      where: { id },
      include: {
        booking: true,
        vendor: true,
      },
    });
  }

  async findByBooking(bookingId: string) {
    return prisma.transaction.findMany({
      where: { bookingId },
      include: {
        booking: true,
        vendor: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async findByVendor(vendorId: string) {
    return prisma.transaction.findMany({
      where: { vendorId },
      include: {
        booking: true,
        vendor: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async findByStatus(status: PaymentStatus) {
    return prisma.transaction.findMany({
      where: {
        paymentStatus: status,
      },
      include: {
        booking: true,
        vendor: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async findByType(type: TransactionType) {
    return prisma.transaction.findMany({
      where: {
        transactionType: type,
      },
      include: {
        booking: true,
        vendor: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async create(
    data: Prisma.TransactionCreateInput
  ) {
    return prisma.transaction.create({
      data,
      include: {
        booking: true,
        vendor: true,
      },
    });
  }

  async update(
    id: string,
    data: Prisma.TransactionUpdateInput
  ) {
    return prisma.transaction.update({
      where: { id },
      data,
      include: {
        booking: true,
        vendor: true,
      },
    });
  }

  async updateStatus(
    id: string,
    paymentStatus: PaymentStatus
  ) {
    return prisma.transaction.update({
      where: { id },
      data: {
        paymentStatus,
        processedAt:
          paymentStatus === PaymentStatus.PAID
            ? new Date()
            : undefined,
      },
      include: {
        booking: true,
        vendor: true,
      },
    });
  }

  async count(
    where: Prisma.TransactionWhereInput = {}
  ) {
    return prisma.transaction.count({
      where,
    });
  }

  async sum(
    where: Prisma.TransactionWhereInput = {}
  ) {
    const result =
      await prisma.transaction.aggregate({
        where,
        _sum: {
          amount: true,
        },
      });

    return Number(result._sum.amount ?? 0);
  }

  async totalsByType(
    paymentStatus: PaymentStatus = PaymentStatus.PAID
  ) {
    const transactions =
      await prisma.transaction.findMany({
        where: {
          paymentStatus,
        },
        select: {
          transactionType: true,
          amount: true,
        },
      });

    return transactions.reduce(
      (
        totals: Record<TransactionType, number>,
        transaction
      ) => {
        totals[transaction.transactionType] =
          (totals[transaction.transactionType] ?? 0) +
          Number(transaction.amount);

        return totals;
      },
      {} as Record<TransactionType, number>
    );
  }
}

export const transactionRepository =
  new TransactionRepository();