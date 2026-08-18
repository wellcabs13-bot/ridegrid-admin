import { NextRequest, NextResponse } from "next/server";
import { corporateTravelPolicyService } from "@/lib/services/corporate/CorporateTravelPolicyService";

export async function GET(request: NextRequest) {
  try {
    const corporateId =
      request.nextUrl.searchParams.get("corporateId");

    if (!corporateId) {
      return NextResponse.json(
        {
          success: false,
          message: "corporateId is required.",
        },
        { status: 400 }
      );
    }

    const policy =
      await corporateTravelPolicyService.getActivePolicy(corporateId);

    return NextResponse.json({
      success: true,
      data: policy,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to fetch travel policy.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (
      typeof body?.corporateId !== "string" ||
      !body.corporateId.trim()
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "corporateId is required.",
        },
        { status: 400 }
      );
    }

    const result =
      await corporateTravelPolicyService.validate({
        corporateId: body.corporateId.trim(),
        amount:
          typeof body.amount === "number"
            ? body.amount
            : undefined,
        category:
          typeof body.category === "string"
            ? body.category
            : undefined,
        pickupDateTime:
          body.pickupDateTime
            ? body.pickupDateTime
            : undefined,
      });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to validate travel policy.",
      },
      { status: 500 }
    );
  }
}
