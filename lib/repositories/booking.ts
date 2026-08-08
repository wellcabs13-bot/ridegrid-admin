import { Booking, Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export class BookingRepository {
  async findAll(): Promise<Booking[]> {
    return prisma.booking.findMany({
      where: {
        deletedAt: null,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async findById(id: string): Promise<Booking | null> {
    return prisma.booking.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });
  }

  async create(
    data: Prisma.BookingCreateInput
  ): Promise<Booking> {
    return prisma.booking.create({
      data,
    });
  }

  async update(
    id: string,
    data: Prisma.BookingUpdateInput
  ): Promise<Booking> {
    return prisma.booking.update({
      where: {
        id,
      },
      data,
    });
  }

  async delete(id: string): Promise<Booking> {
    return prisma.booking.update({
      where: {
        id,
      },
      data: {
        deletedAt: new Date(),
      },
    });
  }
}

export const bookingRepository =
  new BookingRepository();