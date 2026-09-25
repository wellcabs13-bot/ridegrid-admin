import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-access";
import { prisma } from "@/lib/prisma";

function toNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function monthStart(offset: number) {
  const date = new Date();
  return new Date(date.getFullYear(), date.getMonth() + offset, 1);
}

function monthEnd(offset: number) {
  const date = new Date();
  return new Date(date.getFullYear(), date.getMonth() + offset + 1, 1);
}

export async function GET(request: NextRequest) {
  try {
    const denied = await requireAdmin(request);
    if (denied) return denied;
    const currentStart = monthStart(0);
    const currentEnd = monthEnd(0);
    const previousStart = monthStart(-1);
    const previousEnd = monthEnd(-1);

    const corporates = await prisma.corporate.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        companyName: true,
        legalName: true,
        gstNumber: true,
        panNumber: true,
        email: true,
        mobile: true,
        website: true,
        address: true,
        city: true,
        state: true,
        country: true,
        pincode: true,
        status: true,
        billingCycle: true,
        approvalFlow: true,
        creditLimit: true,
        paymentTermsDays: true,
        accountManagerName: true,
        accountManagerEmail: true,
        accountManagerMobile: true,
        createdAt: true,
        branches: { select: { id: true } },
        employees: { select: { id: true } },
        corporateDepartments: { select: { id: true } },
        costCenters: { select: { id: true } },
        travelPolicies: { select: { id: true } },
        approvalRules: { select: { id: true } },
        contracts: { select: { id: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const corporateIds = corporates.map((corporate) => corporate.id);

    if (corporateIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          corporates: [],
          totals: {
            totalCorporates: 0,
            activeCorporates: 0,
            inactiveSuspendedCorporates: 0,
            totalBookings: 0,
            totalBookingValue: 0,
            outstandingAmount: 0,
            averageMonthlyBookings: 0,
            averageCorporateRating: null,
            monthlyBookings: 0,
            previousMonthBookings: 0,
            monthlyBookingValue: 0,
            previousMonthBookingValue: 0,
          },
        },
      });
    }

    // Include direct corporate bookings and the existing legacy approval linkage.
    const requests = await prisma.corporateApprovalRequest.findMany({
      where: {
        corporateId: { in: corporateIds },
        bookingId: { not: null },
      },
      select: {
        id: true,
        corporateId: true,
        bookingId: true,
        amount: true,
        submittedAt: true,
      },
      orderBy: { submittedAt: "desc" },
    });

    const latestRequestByBooking = new Map<
      string,
      (typeof requests)[number]
    >();

    for (const request of requests) {
      if (!request.bookingId) continue;
      if (!latestRequestByBooking.has(request.bookingId)) {
        latestRequestByBooking.set(request.bookingId, request);
      }
    }

    const actualBookings = await prisma.booking.findMany({
      where: { deletedAt: null, OR: [
        { corporateId: { in: corporateIds } },
        { id: { in: Array.from(latestRequestByBooking.keys()) } },
      ] },
      select: { id: true, corporateId: true, finalFare: true, estimatedFare: true, createdAt: true },
    });
    const uniqueRequests = actualBookings.flatMap(booking => {
      const corporateId = booking.corporateId ?? latestRequestByBooking.get(booking.id)?.corporateId;
      return corporateId && corporateIds.includes(corporateId) ? [{
        corporateId, bookingId: booking.id,
        amount: booking.finalFare ?? booking.estimatedFare,
        submittedAt: booking.createdAt,
      }] : [];
    });
    const bookingIds = uniqueRequests
      .map((request) => request.bookingId)
      .filter((value): value is string => Boolean(value));

    const invoices = bookingIds.length
      ? await prisma.invoice.findMany({
          where: { bookingId: { in: bookingIds } },
          select: {
            bookingId: true,
            totalAmount: true,
            paymentStatus: true,
            invoiceDate: true,
          },
        })
      : [];

    const invoiceByBooking = new Map(
      invoices.map((invoice) => [invoice.bookingId, invoice])
    );

    const reviews = bookingIds.length
      ? await prisma.review.findMany({
          where: {
            bookingId: { in: bookingIds },
            status: "PUBLISHED",
          },
          select: {
            bookingId: true,
            rating: true,
          },
        })
      : [];

    const corporateRatings = new Map<string, number[]>();

    const requestCorporateByBooking = new Map(
      uniqueRequests
        .filter((request) => request.bookingId)
        .map((request) => [request.bookingId as string, request.corporateId])
    );

    for (const review of reviews) {
      const corporateId = requestCorporateByBooking.get(review.bookingId);
      if (!corporateId) continue;

      const current = corporateRatings.get(corporateId) ?? [];
      current.push(review.rating);
      corporateRatings.set(corporateId, current);
    }

    const bookingRows = uniqueRequests.map((request) => {
      const invoice = request.bookingId
        ? invoiceByBooking.get(request.bookingId)
        : undefined;

      const value =
        invoice?.totalAmount != null
          ? toNumber(invoice.totalAmount)
          : toNumber(request.amount);

      return {
        corporateId: request.corporateId,
        bookingId: request.bookingId as string,
        submittedAt: request.submittedAt,
        value,
        invoice,
      };
    });

    const allTimeBookingCounts = new Map<string, number>();
    const allTimeBookingValues = new Map<string, number>();
    const currentCounts = new Map<string, number>();
    const previousCounts = new Map<string, number>();
    const currentValues = new Map<string, number>();
    const previousValues = new Map<string, number>();
    const outstanding = new Map<string, number>();

    for (const row of bookingRows) {
      allTimeBookingCounts.set(
        row.corporateId,
        (allTimeBookingCounts.get(row.corporateId) ?? 0) + 1
      );

      allTimeBookingValues.set(
        row.corporateId,
        (allTimeBookingValues.get(row.corporateId) ?? 0) + row.value
      );

      if (row.submittedAt >= currentStart && row.submittedAt < currentEnd) {
        currentCounts.set(
          row.corporateId,
          (currentCounts.get(row.corporateId) ?? 0) + 1
        );
        currentValues.set(
          row.corporateId,
          (currentValues.get(row.corporateId) ?? 0) + row.value
        );
      }

      if (row.submittedAt >= previousStart && row.submittedAt < previousEnd) {
        previousCounts.set(
          row.corporateId,
          (previousCounts.get(row.corporateId) ?? 0) + 1
        );
        previousValues.set(
          row.corporateId,
          (previousValues.get(row.corporateId) ?? 0) + row.value
        );
      }

      if (
        row.invoice &&
        row.invoice.paymentStatus !== "PAID"
      ) {
        outstanding.set(
          row.corporateId,
          (outstanding.get(row.corporateId) ?? 0) +
            toNumber(row.invoice.totalAmount)
        );
      }
    }

    const firstBookingDate =
      bookingRows.length > 0
        ? bookingRows.reduce(
            (earliest, row) =>
              row.submittedAt < earliest ? row.submittedAt : earliest,
            bookingRows[0].submittedAt
          )
        : null;

    const monthsWithHistory = firstBookingDate
      ? Math.max(
          1,
          (new Date().getFullYear() - firstBookingDate.getFullYear()) * 12 +
            new Date().getMonth() -
            firstBookingDate.getMonth() +
            1
        )
      : 0;

    const totalBookings = bookingRows.length;
    const totalBookingValue = Array.from(allTimeBookingValues.values()).reduce(
      (sum, value) => sum + value,
      0
    );
    const monthlyBookings = Array.from(currentCounts.values()).reduce(
      (sum, value) => sum + value,
      0
    );
    const previousMonthBookings = Array.from(previousCounts.values()).reduce(
      (sum, value) => sum + value,
      0
    );
    const monthlyBookingValue = Array.from(currentValues.values()).reduce(
      (sum, value) => sum + value,
      0
    );
    const previousMonthBookingValue = Array.from(previousValues.values()).reduce(
      (sum, value) => sum + value,
      0
    );
    const outstandingAmount = Array.from(outstanding.values()).reduce(
      (sum, value) => sum + value,
      0
    );

    const ratings = reviews.map((review) => review.rating).filter(Number.isFinite);
    const averageCorporateRating =
      ratings.length > 0
        ? Math.round(
            (ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length) *
              10
          ) / 10
        : null;

    const profiles = await prisma.$queryRaw<{
      corporateId: string; expectedMonthlyBookings: number | null; customerTier: string;
      serviceTypes: string[]; quotationFileUrl: string | null; quotationFileName: string | null;
      agreementFileUrl: string | null; agreementFileName: string | null;
    }[]>`
      SELECT "corporateId", "expectedMonthlyBookings", "customerTier", "serviceTypes",
             "quotationFileUrl", "quotationFileName", "agreementFileUrl", "agreementFileName"
      FROM "CorporateCommercialProfile" WHERE "corporateId" = ANY(${corporateIds}::text[])
    `;
    const profilesByCorporate = new Map(profiles.map(profile => [profile.corporateId, profile]));
    const result = corporates.map((corporate) => {
      const corporateRatingsForRow = corporateRatings.get(corporate.id) ?? [];
      const averageRating =
        corporateRatingsForRow.length > 0
          ? Math.round(
              (corporateRatingsForRow.reduce((sum, rating) => sum + rating, 0) /
                corporateRatingsForRow.length) *
                10
            ) / 10
          : null;

      return {
        ...profilesByCorporate.get(corporate.id),
        id: corporate.id,
        companyName: corporate.companyName,
        legalName: corporate.legalName,
        gstNumber: corporate.gstNumber,
        panNumber: corporate.panNumber,
        email: corporate.email,
        mobile: corporate.mobile,
        website: corporate.website,
        address: corporate.address,
        city: corporate.city,
        state: corporate.state,
        country: corporate.country,
        pincode: corporate.pincode,
        status: corporate.status,
        billingCycle: corporate.billingCycle,
        approvalFlow: corporate.approvalFlow,
        creditLimit:
          corporate.creditLimit == null
            ? null
            : toNumber(corporate.creditLimit),
        paymentTermsDays: corporate.paymentTermsDays,
        accountManagerName: corporate.accountManagerName,
        accountManagerEmail: corporate.accountManagerEmail,
        accountManagerMobile: corporate.accountManagerMobile,
        createdAt: corporate.createdAt,
        branchCount: corporate.branches.length,
        employeeCount: corporate.employees.length,
        departmentCount: corporate.corporateDepartments.length,
        costCenterCount: corporate.costCenters.length,
        travelPolicyCount: corporate.travelPolicies.length,
        approvalRuleCount: corporate.approvalRules.length,
        contractCount: corporate.contracts.length,
        bookingCount: allTimeBookingCounts.get(corporate.id) ?? 0,
        monthlyBookingCount: currentCounts.get(corporate.id) ?? 0,
        previousMonthBookingCount: previousCounts.get(corporate.id) ?? 0,
        bookingValue: allTimeBookingValues.get(corporate.id) ?? 0,
        monthlyBookingValue: currentValues.get(corporate.id) ?? 0,
        previousMonthBookingValue: previousValues.get(corporate.id) ?? 0,
        outstandingAmount: outstanding.get(corporate.id) ?? 0,
        averageRating,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        corporates: result,
        totals: {
          totalCorporates: corporates.length,
          activeCorporates: corporates.filter((item) => item.status === "ACTIVE").length,
          inactiveSuspendedCorporates: corporates.filter(
            (item) => item.status !== "ACTIVE"
          ).length,
          totalBookings,
          totalBookingValue,
          outstandingAmount,
          averageMonthlyBookings:
            monthsWithHistory > 0
              ? Math.round((totalBookings / monthsWithHistory) * 10) / 10
              : 0,
          averageCorporateRating,
          monthlyBookings,
          previousMonthBookings,
          monthlyBookingValue,
          previousMonthBookingValue,
        },
      },
    });
  } catch (error) {
    console.error("GET /api/corporate/dashboard:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to build corporate dashboard.",
      },
      { status: 500 }
    );
  }
}
