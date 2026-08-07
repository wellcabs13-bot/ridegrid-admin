import { Booking, Prisma } from "@prisma/client";

export interface IBookingRepository {
  findAll(): Promise<Booking[]>;

  findById(id: string): Promise<Booking | null>;

  create(
    data: Prisma.BookingCreateInput
  ): Promise<Booking>;

  update(
    id: string,
    data: Prisma.BookingUpdateInput
  ): Promise<Booking>;

  delete(id: string): Promise<Booking>;
}