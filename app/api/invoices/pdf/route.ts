import { NextRequest, NextResponse } from "next/server";
import { authenticate } from "@/lib/auth/middleware";
import { generateInvoicePdf } from "@/lib/services/invoice/InvoicePdfService";

async function auth(request: NextRequest) {
  const authorization = request.headers.get("authorization");

  const headerToken =
    authorization?.startsWith("Bearer ")
      ? authorization.slice(7)
      : undefined;

  const cookieToken =
    request.cookies.get("ridegrid_access_token")?.value ??
    request.cookies.get("ridegrid-token")?.value;

  return authenticate(headerToken ?? cookieToken);
}

export async function GET(request: NextRequest) {
  try {
    const user = await auth(request);

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

    const result =
      await generateInvoicePdf(invoiceId);

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
