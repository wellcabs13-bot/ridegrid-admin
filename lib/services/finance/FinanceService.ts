import {
  PaymentStatus,
  Prisma,
  SettlementStatus,
  TransactionType,
  WalletTransactionType,
} from "@prisma/client";

import {
  transactionRepository,
} from "@/lib/repositories/transaction";

import {
  walletRepository,
} from "@/lib/repositories/wallet";

import {
  settlementRepository,
} from "@/lib/repositories/settlement";

export class FinanceService {
  async getTransactions(
    where: Prisma.TransactionWhereInput = {}
  ) {
    return transactionRepository.findAll(where);
  }

  async getTransaction(id: string) {
    return transactionRepository.findById(id);
  }

  async getBookingTransactions(
    bookingId: string
  ) {
    return transactionRepository.findByBooking(
      bookingId
    );
  }

  async getVendorTransactions(
    vendorId: string
  ) {
    return transactionRepository.findByVendor(
      vendorId
    );
  }

  async createTransaction(
    data: Prisma.TransactionCreateInput
  ) {
    return transactionRepository.create(data);
  }

  async updateTransaction(
    id: string,
    data: Prisma.TransactionUpdateInput
  ) {
    return transactionRepository.update(id, data);
  }

  async updateTransactionStatus(
    id: string,
    status: PaymentStatus
  ) {
    return transactionRepository.updateStatus(
      id,
      status
    );
  }

  async getVendorWallet(vendorId: string) {
    return walletRepository.findByVendor(vendorId);
  }

  async createVendorWallet(
    data: Prisma.VendorWalletCreateInput
  ) {
    return walletRepository.create(data);
  }

  async createWalletTransaction(
    data: Prisma.WalletTransactionCreateInput
  ) {
    return walletRepository.createTransaction(data);
  }

  async getWalletTransactions(
    walletId: string
  ) {
    return walletRepository.findTransactions(walletId);
  }

  async getVendorBalance(vendorId: string) {
    return walletRepository.getBalance(vendorId);
  }

  async getSettlements(
    where: Prisma.VendorSettlementWhereInput = {}
  ) {
    return settlementRepository.findAll(where);
  }

  async getVendorSettlements(
    vendorId: string
  ) {
    return settlementRepository.findByVendor(vendorId);
  }

  async getSettlement(id: string) {
    return settlementRepository.findById(id);
  }

  async createSettlement(
    data: Prisma.VendorSettlementCreateInput
  ) {
    return settlementRepository.create(data);
  }

  async updateSettlement(
    id: string,
    data: Prisma.VendorSettlementUpdateInput
  ) {
    return settlementRepository.update(id, data);
  }

  async updateSettlementStatus(
    id: string,
    status: SettlementStatus
  ) {
    return settlementRepository.updateStatus(
      id,
      status
    );
  }

  async getFinanceOverview() {
    const [
      totalTransactions,
      successfulTransactions,
      pendingTransactions,
      settlements,
    ] = await Promise.all([
      transactionRepository.count(),

      transactionRepository.count({
        paymentStatus: PaymentStatus.PAID,
      }),

      transactionRepository.count({
        paymentStatus: PaymentStatus.PENDING,
      }),

      settlementRepository.findAll(),
    ]);

    return {
      totalTransactions,
      successfulTransactions,
      pendingTransactions,
      settlements,
    };
  }

  async getTransactionTypes() {
    return Object.values(TransactionType);
  }

  async getWalletTransactionTypes() {
    return Object.values(WalletTransactionType);
  }
}

export const financeService =
  new FinanceService();