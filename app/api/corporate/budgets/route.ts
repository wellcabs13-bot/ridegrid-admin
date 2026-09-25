import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-access";
import { budgetService } from "@/lib/services/budget/BudgetService";

export async function GET(request: NextRequest) {
  try {
    // Company budgets are administrative data; employees see only their own limits.
    const denied = await requireAdmin(request);
    if (denied) return denied;

    const corporateId =
      request.nextUrl.searchParams.get("corporateId") ?? undefined;

    const data = await budgetService.list(corporateId);

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to fetch budgets.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Company budgets are administrative data; employees see only their own limits.
    const denied = await requireAdmin(request);
    if (denied) return denied;

    const body = await request.json();

    const data = await budgetService.create(body);

    return NextResponse.json(
      { success: true, data },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to create budget.",
      },
      { status: 400 }
    );
  }
}
