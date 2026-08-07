import { Booking, Prisma } from "@prisma/client";

import {
  bookingRepository,
} from "@/lib/repositories/booking";

import {
  IBookingService,
} from "./IBookingService";

export class BookingService
  implements IBookingService
{
  async getAll(): Promise<Booking[]> {
    return bookingRepository.findAll();
  }

  async getById(
    id: string
  ): Promise<Booking | null> {
    return bookingRepository.findById(id);
  }

  async create(
    data: Prisma.BookingCreateInput
  ): Promise<Booking> {
    return bookingRepository.create(data);
  }

  async update(
    id: string,
    data: Prisma.BookingUpdateInput
  ): Promise<Booking> {
    return bookingRepository.update(id, data);
  }

  async delete(
    id: string
  ): Promise<Booking> {
    return bookingRepository.delete(id);
  }
}

export const bookingService =
  new BookingService();