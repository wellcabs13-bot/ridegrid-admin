import { NextRequest, NextResponse } from "next/server";

import { notificationService } from "@/lib/services/notification/NotificationService";

export async function GET(
  request: NextRequest
) {
  try {
    const { searchParams } = new URL(request.url);

    const userId =
      searchParams.get("userId");

    const unread =
      searchParams.get("unread") === "true";

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
      ? await notificationService.getUnread(
          userId
        )
      : await notificationService.getByUser(
          userId
        );

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error(
      "GET /api/notifications:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch notifications.",
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest
) {
  try {
    const body = await request.json();

    const notification =
      await notificationService.create(
        body
      );

    return NextResponse.json(
      {
        success: true,
        message:
          "Notification created successfully.",
        data: notification,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "POST /api/notifications:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Failed to create notification.",
      },
      { status: 500 }
    );
  }
}