import { PaymentMethod, PaymentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { invoiceRepository } from "@/lib/repositories/invoice";

export class InvoiceService {
  async getAll() {
    return invoiceRepository.findAll();
  }

  async getById(id: string) {
    return invoiceRepository.findById(id);
  }

  async getByBooking(bookingId: string) {
    return invoiceRepository.findByBooking(bookingId);
  }

  async createForBooking(bookingId: string) {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.invoice.findUnique({
        where: { bookingId },
      });

      if (existing) return existing;

      const booking = await tx.booking.findUnique({
        where: { id: bookingId },
        include: { customer: true, vendor: true },
      });

      if (!booking) {
        throw new Error("Booking not found.");
      }

      const subtotal = Number(
        booking.baseFare ?? booking.finalFare ?? booking.estimatedFare
      );

      const taxAmount = Number(booking.taxAmount ?? 0);
      const discountAmount =
        Number(booking.discountAmount ?? 0) +
        Number(booking.couponAmount ?? 0);

      const totalAmount = Number(
        booking.finalFare ??
        booking.estimatedFare
      );

      const year = new Date().getFullYear();
      const count = await tx.invoice.count();
      const invoiceNumber =
        `RG-${year}-${String(count + 1).padStart(6, "0")}`;

      return tx.invoice.create({
        data: {
          invoiceNumber,
          bookingId: booking.id,
          customerId: booking.customerId,
          vendorId: booking.vendorId,
          subtotal,
          taxAmount,
          discountAmount,
          totalAmount,
          paymentStatus: PaymentStatus.PENDING,
        },
        include: {
          booking: true,
          customer: true,
          vendor: true,
        },
      });
    });
  }

  async markPaid(
    id: string,
    paymentMethod?: PaymentMethod
  ) {
    return invoiceRepository.update(id, {
      paymentStatus: PaymentStatus.PAID,
      paymentMethod,
    });
  }
}

export const invoiceService = new InvoiceService();
