import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export class InvoiceRepository {
  async findById(id: string) {
    return prisma.invoice.findUnique({
      where: { id },
      include: { booking: true, customer: true, vendor: true },
    });
  }

  async findByBooking(bookingId: string) {
    return prisma.invoice.findUnique({
      where: { bookingId },
      include: { booking: true, customer: true, vendor: true },
    });
  }

  async findAll() {
    return prisma.invoice.findMany({
      include: { booking: true, customer: true, vendor: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async create(data: Prisma.InvoiceCreateInput) {
    return prisma.invoice.create({
      data,
      include: { booking: true, customer: true, vendor: true },
    });
  }

  async update(id: string, data: Prisma.InvoiceUpdateInput) {
    return prisma.invoice.update({
      where: { id },
      data,
      include: { booking: true, customer: true, vendor: true },
    });
  }
}

export const invoiceRepository = new InvoiceRepository();
