  import { NextRequest, NextResponse } from "next/server";

import { authenticate } from "@/lib/auth/middleware";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const authorization =
      request.headers.get("authorization");

    const headerToken =
      authorization?.startsWith("Bearer ")
        ? authorization.slice(7)
        : undefined;

    const cookieToken =
      request.cookies.get(
        "ridegrid_access_token"
      )?.value;

    const token =
      headerToken ?? cookieToken;

    const user = await authenticate(token);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized",
        },
        { status: 401 }
      );
    }

    const profile = await prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, name: true, email: true, mobile: true, role: true, isActive: true, deletedAt: true },
    });
    if (!profile || !profile.isActive || profile.deletedAt) {
      return NextResponse.json({ success: false, message: "Session is no longer valid." }, { status: 401 });
    }
    const { isActive, deletedAt, ...safeUser } = profile;
    return NextResponse.json({
      success: true,
      data: safeUser,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error(
      "GET /api/auth/me",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Failed to validate session.",
      },
      { status: 401 }
    );
  }
}
