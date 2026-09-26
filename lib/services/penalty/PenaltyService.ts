import { PenaltyType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auditLog } from "@/lib/services/audit/AuditService";

export class PenaltyService {
  async createDriverPenalty(data: {
    driverId: string;
    penaltyType: PenaltyType;
    amount: number;
    reason?: string;
  }) {
    return prisma.driverPenalty.create({ data });
  }

  async listDriverPenalties(driverId?: string) {
    return prisma.driverPenalty.findMany({
      where: driverId ? { driverId } : undefined,
      orderBy: { createdAt: "desc" },
      include: { driver: true },
    });
  }

  async createVendorPenalty(data: {
    vendorId: string;
    penaltyType: PenaltyType;
    amount: number;
    reason?: string;
    performedBy?: string;
  }) {
    if (!data.vendorId || data.amount <= 0) {
      throw new Error("Valid vendor and positive penalty amount are required.");
    }

    return prisma.$transaction(async (tx) => {
      const wallet = await tx.vendorWallet.findUnique({
        where: { vendorId: data.vendorId },
      });

      if (!wallet) throw new Error("Vendor wallet not found.");

      const balanceBefore = wallet.balance;
      const amount = new Prisma.Decimal(data.amount);

      if (balanceBefore.lt(amount)) {
        throw new Error("Insufficient vendor wallet balance.");
      }

      const balanceAfter = balanceBefore.minus(amount);

      const updatedWallet = await tx.vendorWallet.update({
        where: { id: wallet.id },
        data: { balance: balanceAfter },
      });

      const ledger = await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          transactionType: "DEBIT",
          amount,
          balanceBefore,
          balanceAfter,
          referenceType: "VENDOR_PENALTY",
          performedBy: data.performedBy,
          description: data.reason ?? `Vendor penalty: ${data.penaltyType}`,
        },
      });

      await auditLog({
        action: "CREATE",
        userId: data.performedBy,
        description: "Vendor penalty applied",
        metadata: {
          vendorId: data.vendorId,
          penaltyType: data.penaltyType,
          amount: data.amount,
          walletTransactionId: ledger.id,
        },
      });

      return { wallet: updatedWallet, ledger };
    }, { isolationLevel: "Serializable" });
  }

  async getVendorPenaltyReport(vendorId?: string) {
    const transactions = await prisma.walletTransaction.findMany({
      where: {
        referenceType: "VENDOR_PENALTY",
        ...(vendorId ? { wallet: { vendorId } } : {}),
      },
      orderBy: { createdAt: "desc" },
      include: { wallet: true },
    });

    return {
      count: transactions.length,
      totalAmount: transactions.reduce(
        (sum, item) => sum + Number(item.amount),
        0
      ),
      transactions,
    };
  }
}

export const penaltyService = new PenaltyService();
