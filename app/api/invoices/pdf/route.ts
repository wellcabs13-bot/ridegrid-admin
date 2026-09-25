import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requestUser } from "@/lib/request-access";
import { generateInvoicePdf } from "@/lib/services/invoice/InvoicePdfService";

// Invoices are released only to RideGrid finance/operations staff and the booking's own parties.
function invoiceScope(user: { id: string; role: string }): Prisma.BookingWhereInput | null {
  if (["SUPER_ADMIN", "OPERATIONS", "FINANCE"].includes(user.role)) return {};
  if (user.role === "CUSTOMER" || user.role === "CORPORATE_EMPLOYEE") return { customer: { userId: user.id } };
  if (user.role === "VENDOR") return { vendor: { userId: user.id } };
  if (user.role === "CORPORATE_ADMIN") return { corporateId: { not: null }, corporate: { employees: { some: { userId: user.id, isActive: true } } } };
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const user = await requestUser(request);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized.",
        },
        { status: 401 }
      );
    }

    const invoiceId =
      request.nextUrl.searchParams.get("id")?.trim();

    if (!invoiceId) {
      return NextResponse.json(
        {
          success: false,
          message: "Invoice ID is required.",
        },
        { status: 400 }
      );
    }

    const scope = invoiceScope(user);
    const invoice = scope && /^[A-Za-z0-9_-]{1,64}$/.test(invoiceId)
      ? await prisma.invoice.findFirst({ where: { id: invoiceId, booking: scope }, select: { id: true } })
      : null;

    if (!invoice) {
      return NextResponse.json(
        { success: false, message: "Invoice not found." },
        { status: 404 }
      );
    }

    const result =
      await generateInvoicePdf(invoice.id);

    return new NextResponse(result.buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition":
          `attachment; filename="${result.filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error(
      "GET /api/invoices/pdf:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to generate invoice PDF.",
      },
      { status: 500 }
    );
  }
}
