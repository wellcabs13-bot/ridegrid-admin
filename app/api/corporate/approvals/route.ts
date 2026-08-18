import { NextRequest, NextResponse } from "next/server";
import {
  corporateApprovalService,
} from "@/lib/services/corporate/CorporateApprovalService";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } =
      new URL(request.url);

    const corporateId =
      searchParams.get("corporateId");

    const employeeId =
      searchParams.get("employeeId");

    const amountParam =
      searchParams.get("amount");

    if (!corporateId && !employeeId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "corporateId or employeeId is required.",
        },
        { status: 400 }
      );
    }

    if (employeeId) {
      const data =
        await corporateApprovalService
          .getEmployeeContext(employeeId);

      return NextResponse.json({
        success: true,
        data,
      });
    }

    const amount =
      amountParam === null
        ? undefined
        : Number(amountParam);

    if (
      amount !== undefined &&
      (!Number.isFinite(amount) || amount < 0)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid approval amount.",
        },
        { status: 400 }
      );
    }

    const data =
      await corporateApprovalService.getWorkflow(
        corporateId!,
        amount
      );

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error(
      "GET /api/corporate/approvals:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to load corporate approval workflow.",
      },
      { status: 500 }
    );
  }
}
