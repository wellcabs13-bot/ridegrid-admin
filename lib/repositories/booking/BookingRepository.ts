import { Prisma, Booking } from "@prisma/client";

import { prisma } from "@/lib/prisma";

import { IBookingRepository } from "./IBookingRepository";

export class BookingRepository
  implements IBookingRepository
{
  async findAll(): Promise<Booking[]> {
    return prisma.booking.findMany({
      include: {
        customer: true,
        vendor: true,
        vehicle: true,
        driver: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    }) as Promise<Booking[]>;
  }

  async findById(id: string): Promise<Booking | null> {
    return prisma.booking.findUnique({
      where: {
        id,
      },
      include: {
        customer: true,
        vendor: true,
        vehicle: true,
        driver: true,
      },
    }) as Promise<Booking | null>;
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
    return prisma.booking.delete({
      where: {
        id,
      },
    });
  }
}

export const bookingRepository =
  new BookingRepository();