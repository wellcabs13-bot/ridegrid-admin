import { Prisma, UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export interface CustomerListParams {
  page?: number;
  limit?: number;
  search?: string;
}

export interface CreateCustomerData {
  firstName: string;
  lastName: string;
  email: string;
  mobile?: string | null;
  password: string;
}

export class CustomerRepository {
  async findAll(params: CustomerListParams = {}) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, Math.max(1, params.limit ?? 20));
    const search = params.search?.trim();

    const where: Prisma.CustomerWhereInput = {
      deletedAt: null,
      ...(search
        ? {
            OR: [
              {
                firstName: {
                  contains: search,
                  mode: "insensitive",
                },
              },
              {
                lastName: {
                  contains: search,
                  mode: "insensitive",
                },
              },
              {
                user: {
                  email: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
              },
              {
                user: {
                  mobile: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
              },
            ],
          }
        : {}),
    };

    const [customers, total] = await prisma.$transaction([
      prisma.customer.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              mobile: true,
              role: true,
              isActive: true,
              isVerified: true,
              createdAt: true,
              updatedAt: true,
            },
          },
          _count: {
            select: {
              bookings: {
                where: {
                  deletedAt: null,
                },
              },
            },
          },
          bookings: {
            where: {
              deletedAt: null,
            },
            select: {
              id: true,
              bookingNumber: true,
              status: true,
              pickupLocation: true,
              dropLocation: true,
              pickupDateTime: true,
              estimatedFare: true,
              finalFare: true,
              vehicle: {
                select: {
                  id: true,
                  registrationNumber: true,
                  category: true,
                },
              },
              driver: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
            orderBy: {
              createdAt: "desc",
            },
            take: 5,
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.customer.count({ where }),
    ]);

    const customerIds = customers.map((customer) => customer.id);

    const revenueRows =
      customerIds.length > 0
        ? await prisma.booking.groupBy({
            by: ["customerId"],
            where: {
              customerId: {
                in: customerIds,
              },
              deletedAt: null,
            },
            _sum: {
              finalFare: true,
              estimatedFare: true,
            },
          })
        : [];

    const revenueMap = new Map(
      revenueRows.map((row) => [
        row.customerId,
        Number(
          row._sum.finalFare ??
            row._sum.estimatedFare ??
            0
        ),
      ])
    );

    const enrichedCustomers = customers.map(
      (customer) => ({
        ...customer,
        totalRevenue:
          revenueMap.get(customer.id) ?? 0,
      })
    );

    return {
      customers: enrichedCustomers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string) {
    return prisma.customer.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            mobile: true,
            role: true,
            isActive: true,
            isVerified: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        bookings: {
          where: {
            deletedAt: null,
          },
          include: {
            vehicle: true,
            driver: true,
            transactions: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
        loyaltyAccount: {
          include: {
            transactions: {
              orderBy: {
                createdAt: "desc",
              },
              take: 20,
            },
          },
        },
        reviews: {
          orderBy: {
            createdAt: "desc",
          },
          take: 20,
        },
        supportTickets: {
          orderBy: {
            createdAt: "desc",
          },
          take: 20,
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
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            mobile: true,
            role: true,
            isActive: true,
            isVerified: true,
          },
        },
        bookings: {
          where: {
            deletedAt: null,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
        loyaltyAccount: true,
      },
    });
  }

  async findByEmail(email: string) {
    return prisma.customer.findFirst({
      where: {
        deletedAt: null,
        user: {
          email: {
            equals: email,
            mode: "insensitive",
          },
        },
      },
      include: {
        user: true,
      },
    });
  }

  async findByMobile(mobile: string) {
    return prisma.customer.findFirst({
      where: {
        deletedAt: null,
        user: {
          mobile,
        },
      },
      include: {
        user: true,
      },
    });
  }

  async create(data: CreateCustomerData) {
    return prisma.$transaction(async (tx) => {
      return tx.customer.create({
        data: {
          firstName: data.firstName.trim(),
          lastName: data.lastName.trim(),
          user: {
            create: {
              name: `${data.firstName} ${data.lastName}`.trim(),
              email: data.email.trim().toLowerCase(),
              mobile: data.mobile?.trim() || null,
              password: data.password,
              role: UserRole.CUSTOMER,
              isActive: true,
              isVerified: false,
            },
          },
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              mobile: true,
              role: true,
              isActive: true,
              isVerified: true,
              createdAt: true,
              updatedAt: true,
            },
          },
        },
      });
    });
  }

  async update(
    id: string,
    data: {
      firstName?: string;
      lastName?: string;
      email?: string;
      mobile?: string | null;
      isActive?: boolean;
    }
  ) {
    return prisma.$transaction(async (tx) => {
      const customer = await tx.customer.findFirst({
        where: {
          id,
          deletedAt: null,
        },
        select: {
          id: true,
          userId: true,
        },
      });

      if (!customer) {
        return null;
      }

      const customerData: Prisma.CustomerUpdateInput = {};

      if (data.firstName !== undefined) {
        customerData.firstName = data.firstName.trim();
      }

      if (data.lastName !== undefined) {
        customerData.lastName = data.lastName.trim();
      }

      const userData: Prisma.UserUpdateInput = {};

      if (data.email !== undefined) {
        userData.email = data.email.trim().toLowerCase();
      }

      if (data.mobile !== undefined) {
        userData.mobile = data.mobile?.trim() || null;
      }

      if (data.isActive !== undefined) {
        userData.isActive = data.isActive;
      }

      if (Object.keys(userData).length > 0) {
        customerData.user = {
          update: userData,
        };
      }

      return tx.customer.update({
        where: {
          id,
        },
        data: customerData,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              mobile: true,
              role: true,
              isActive: true,
              isVerified: true,
              createdAt: true,
              updatedAt: true,
            },
          },
        },
      });
    });
  }

  async softDelete(id: string) {
    return prisma.customer.updateMany({
      where: {
        id,
        deletedAt: null,
      },
      data: {
        deletedAt: new Date(),
      },
    });
  }
}

export const customerRepository =
  new CustomerRepository();
