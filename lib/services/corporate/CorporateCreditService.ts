import { Prisma, WalletTransactionType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function getCorporateCreditAccount(corporateId: string) {
  if (!corporateId) {
    throw new Error("Corporate account is required.");
  }

  const corporate = await prisma.corporate.findFirst({
    where: {
      id: corporateId,
      deletedAt: null,
    },
    select: {
      id: true,
      companyName: true,
      status: true,
      creditLimit: true,
    },
  });

  if (!corporate) {
    throw new Error("Corporate account not found.");
  }

  const wallet = await prisma.corporateWallet.findUnique({
    where: {
      corporateId,
    },
    select: {
      id: true,
      balance: true,
      creditLimit: true,
      updatedAt: true,
    },
  });

  const creditLimit = Number(
    wallet?.creditLimit ?? corporate.creditLimit ?? 0
  );

  const outstanding = Number(wallet?.balance ?? 0);

  const availableCredit = Math.max(
    0,
    creditLimit - outstanding
  );

  return {
    corporateId: corporate.id,
    corporateName: corporate.companyName,
    status: corporate.status,
    enabled: corporate.status === "ACTIVE",
    creditLimit,
    outstanding,
    availableCredit,
    walletId: wallet?.id ?? null,
    updatedAt: wallet?.updatedAt ?? null,
  };
}

export async function chargeCorporateCredit(
  tx: Prisma.TransactionClient,
  corporateId: string,
  amount: number,
  bookingId: string
) {
  if (!corporateId) {
    throw new Error("Corporate account is required.");
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Invalid corporate credit amount.");
  }

  const corporate = await tx.corporate.findFirst({
    where: {
      id: corporateId,
      deletedAt: null,
      status: "ACTIVE",
    },
    select: {
      id: true,
      creditLimit: true,
    },
  });

  if (!corporate) {
    throw new Error("Corporate account is not active.");
  }

  let wallet = await tx.corporateWallet.findUnique({
    where: {
      corporateId,
    },
  });

  if (!wallet) {
    wallet = await tx.corporateWallet.create({
      data: {
        corporateId,
        balance: 0,
        creditLimit: corporate.creditLimit,
      },
    });
  }

  const limit = Number(
    wallet.creditLimit ?? corporate.creditLimit ?? 0
  );

  const outstanding = Number(wallet.balance);

  const available = limit - outstanding;

  if (limit <= 0) {
    throw new Error(
      "Corporate credit limit is not configured."
    );
  }

  if (available < amount) {
    throw new Error(
      `Insufficient corporate credit. Available credit is ${Math.max(
        0,
        available
      ).toLocaleString("en-IN")}.`
    );
  }

  const updated = await tx.corporateWallet.updateMany({
    where: {
      id: wallet.id,
      balance: {
        lte: limit - amount,
      },
    },
    data: {
      balance: {
        increment: amount,
      },
    },
  });

  if (updated.count !== 1) {
    throw new Error(
      "Corporate credit changed during booking. Please try again."
    );
  }

  await tx.corporateWalletTransaction.create({
    data: {
      walletId: wallet.id,
      transactionType: WalletTransactionType.DEBIT,
      amount,
      balanceBefore: outstanding,
      balanceAfter: outstanding + amount,
      referenceId: bookingId,
      referenceType: "BOOKING",
      description: "Corporate Credit Account booking charge",
    },
  });
}

