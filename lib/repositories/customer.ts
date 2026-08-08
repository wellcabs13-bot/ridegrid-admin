import { Prisma, UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export class CustomerRepository {
  async findAll() {
    return prisma.customer.findMany({
      where: {
        deletedAt: null,
      },
      include: {
        user: true,
        bookings: {
          include: {
            vehicle: true,
            driver: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async findById(id: string) {
    return prisma.customer.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        user: true,
        bookings: {
          include: {
            vehicle: true,
            driver: true,
            transactions: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });
  }

  async findByUserId(userId: string) {
    return prisma.customer.findFirst({
      where: {
        userId,
        deletedAt: null,
      },
      include: {
        user: true,
        bookings: true,
      },
    });
  }

  async create(data: {
    firstName: string;
    lastName: string;
    email: string;
    mobile?: string | null;
    password: string;
  }) {
    return prisma.customer.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        user: {
          create: {
            name: `${data.firstName} ${data.lastName}`.trim(),
            email: data.email,
            mobile: data.mobile ?? null,
            password: data.password,
            role: UserRole.CUSTOMER,
          },
        },
      },
      include: {
        user: true,
      },
    });
  }

  async update(
    id: string,
    data: Prisma.CustomerUpdateInput
  ) {
    return prisma.customer.update({
      where: {
        id,
      },
      data,
      include: {
        user: true,
      },
    });
  }

  async delete(id: string) {
    return prisma.customer.update({
      where: {
        id,
      },
      data: {
        deletedAt: new Date(),
      },
    });
  }
}

export const customerRepository =
  new CustomerRepository();