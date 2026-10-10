import { NextRequest, NextResponse } from "next/server";

import {
  notificationService,
} from "@/lib/services/notification/NotificationService";

import { authenticate } from "@/lib/auth/middleware";
import { requireAdmin } from "@/lib/admin-access";

export async function GET(request: NextRequest) {
  try {
    const header = request.headers.get("authorization");
    const user = await authenticate(header?.startsWith("Bearer ") ? header.slice(7) : request.cookies.get("ridegrid_access_token")?.value);
    if (!user) return NextResponse.json({ success: false, message: "Please sign in." }, { status: 401 });
    const { searchParams } = new URL(request.url);

    const userId = searchParams.get("userId") || user.id;
    if (userId !== user.id && user.role !== "SUPER_ADMIN") return NextResponse.json({ success: false, message: "Access denied." }, { status: 403 });
    const unread = searchParams.get("unread") === "true";

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          message: "userId is required.",
        },
        { status: 400 }
      );
    }

    const data = unread
      ? await notificationService.getUnread(userId)
      : await notificationService.getByUser(userId);

    return NextResponse.json({
      success: true,
      data,
      count: data.length,
    });
  } catch (error) {
    console.error("GET /api/notifications:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch notifications.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const denied = await requireAdmin(request);
    if (denied) return denied;
    const body = await request.json();

    const notification =
      await notificationService.create(body);

    return NextResponse.json(
      {
        success: true,
        message: "Notification created successfully.",
        data: notification,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/notifications:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to create notification.",
      },
      { status: 500 }
    );
  }
}
