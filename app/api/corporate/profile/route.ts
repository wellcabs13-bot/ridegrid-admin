import { requireAdmin } from "@/lib/admin-access";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

type ProfileRow = {
  id: string;
  corporateId: string;
  expectedMonthlyBookings: number | null;
  customerTier: string;
  serviceTypes: unknown;
  quotationFileUrl: string | null;
  quotationFileName: string | null;
  agreementFileUrl: string | null;
  agreementFileName: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function normalizeServiceTypes(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .filter((item) =>
      ["AIRPORT", "LOCAL", "OUTSTATION", "HOURLY"].includes(item)
    );
}

function tierFor(expected: number | null) {
  const value = expected ?? 0;

  if (value <= 0) return "PROSPECT";
  if (value <= 10) return "STARTER";
  if (value <= 30) return "GROWTH";
  if (value <= 75) return "ENTERPRISE";
  return "STRATEGIC";
}

export async function GET(request: NextRequest) {
  try {
    const denied = await requireAdmin(request);
    if (denied) return denied;
    const corporateId =
      request.nextUrl.searchParams.get("corporateId")?.trim();

    if (!corporateId) {
      return NextResponse.json(
        { success: false, message: "corporateId is required." },
        { status: 400 }
      );
    }

    const rows = await prisma.$queryRaw<ProfileRow[]>`
      SELECT
        "id",
        "corporateId",
        "expectedMonthlyBookings",
        "customerTier",
        "serviceTypes",
        "quotationFileUrl",
        "quotationFileName",
        "agreementFileUrl",
        "agreementFileName",
        "createdAt",
        "updatedAt"
      FROM "CorporateCommercialProfile"
      WHERE "corporateId" = ${corporateId}
      LIMIT 1
    `;

    const profile = rows[0] ?? null;

    return NextResponse.json({
      success: true,
      data: profile
        ? {
            ...profile,
            serviceTypes: normalizeServiceTypes(profile.serviceTypes),
          }
        : null,
    });
  } catch (error) {
    console.error("GET /api/corporate/profile:", error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to fetch corporate commercial profile.",
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const denied = await requireAdmin(request);
    if (denied) return denied;
    const body = await request.json();
    const corporateId = String(body?.corporateId ?? "").trim();

    if (!corporateId) {
      return NextResponse.json(
        { success: false, message: "corporateId is required." },
        { status: 400 }
      );
    }

    const corporate = await prisma.corporate.findUnique({
      where: { id: corporateId },
      select: { id: true },
    });

    if (!corporate) {
      return NextResponse.json(
        { success: false, message: "Corporate not found." },
        { status: 404 }
      );
    }

    const expected =
      body.expectedMonthlyBookings === null ||
      body.expectedMonthlyBookings === undefined ||
      body.expectedMonthlyBookings === ""
        ? null
        : Number(body.expectedMonthlyBookings);

    if (
      expected !== null &&
      (!Number.isInteger(expected) || expected < 0)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Expected monthly bookings must be a whole number of 0 or more.",
        },
        { status: 400 }
      );
    }

    const serviceTypes = normalizeServiceTypes(body.serviceTypes);
    const customerTier = tierFor(expected);

    const quotationFileUrl =
      typeof body.quotationFileUrl === "string"
        ? body.quotationFileUrl
        : null;
    const quotationFileName =
      typeof body.quotationFileName === "string"
        ? body.quotationFileName
        : null;
    const agreementFileUrl =
      typeof body.agreementFileUrl === "string"
        ? body.agreementFileUrl
        : null;
    const agreementFileName =
      typeof body.agreementFileName === "string"
        ? body.agreementFileName
        : null;

    const existing = await prisma.$queryRaw<
      { id: string }[]
    >`
      SELECT "id"
      FROM "CorporateCommercialProfile"
      WHERE "corporateId" = ${corporateId}
      LIMIT 1
    `;

    if (existing[0]) {
      await prisma.$executeRaw`
        UPDATE "CorporateCommercialProfile"
        SET
          "expectedMonthlyBookings" = ${expected},
          "customerTier" = ${customerTier},
          "serviceTypes" = ${JSON.stringify(serviceTypes)}::jsonb,
          "quotationFileUrl" =
            COALESCE(${quotationFileUrl}, "quotationFileUrl"),
          "quotationFileName" =
            COALESCE(${quotationFileName}, "quotationFileName"),
          "agreementFileUrl" =
            COALESCE(${agreementFileUrl}, "agreementFileUrl"),
          "agreementFileName" =
            COALESCE(${agreementFileName}, "agreementFileName"),
          "updatedAt" = CURRENT_TIMESTAMP
        WHERE "corporateId" = ${corporateId}
      `;
    } else {
      await prisma.$executeRaw`
        INSERT INTO "CorporateCommercialProfile" (
          "id",
          "corporateId",
          "expectedMonthlyBookings",
          "customerTier",
          "serviceTypes",
          "quotationFileUrl",
          "quotationFileName",
          "agreementFileUrl",
          "agreementFileName"
        )
        VALUES (
          ${crypto.randomUUID()},
          ${corporateId},
          ${expected},
          ${customerTier},
          ${JSON.stringify(serviceTypes)}::jsonb,
          ${quotationFileUrl},
          ${quotationFileName},
          ${agreementFileUrl},
          ${agreementFileName}
        )
      `;
    }

    return NextResponse.json({
      success: true,
      message: "Corporate commercial profile saved successfully.",
    });
  } catch (error) {
    console.error("PUT /api/corporate/profile:", error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to save corporate commercial profile.",
      },
      { status: 500 }
    );
  }
}
