import { NextRequest, NextResponse } from "next/server";
import { authorize } from "@/lib/authorize";

export async function GET(request: NextRequest) {
  const token =
    request.cookies.get("ridegrid_access_token")?.value ||
    request.headers
      .get("authorization")
      ?.replace(/^Bearer\s+/i, "");

  const user = authorize(token, ["SUPER_ADMIN"]);

  if (!user) {
    return NextResponse.json(
      {
        success: false,
        message: "Unauthorized",
      },
      { status: 401 }
    );
  }

  return NextResponse.json({
    success: true,
    message: "Admin authorization successful.",
    data: {
      userId: user.id,
      role: user.role,
    },
  });
}

