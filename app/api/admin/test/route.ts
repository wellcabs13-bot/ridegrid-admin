import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { authorize } from "@/lib/authorize";

export async function GET(request: NextRequest) {
  const token = request.cookies.get("ridegrid-token")?.value;

  const user = authorize(token, [UserRole.SUPER_ADMIN]);

  if (!user) {
    return NextResponse.json(
      {
        success: false,
        message: "Access Denied",
      },
      { status: 403 }
    );
  }

  return NextResponse.json({
    success: true,
    message: "Welcome Super Admin",
    user,
  });
}