import { NextRequest, NextResponse } from "next/server";

import { sessionManager } from "@/lib/security/session";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const sessionId = searchParams.get("sessionId");
    const userId = searchParams.get("userId");

    if (sessionId) {
      const session = sessionManager.getSession(sessionId);

      if (!session) {
        return NextResponse.json(
          {
            success: false,
            message: "Session not found.",
          },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: session,
      });
    }

    if (userId) {
      return NextResponse.json({
        success: true,
        data: sessionManager.getUserSessions(userId),
      });
    }

    return NextResponse.json({
      success: true,
      data: sessionManager.getSessions(),
    });
  } catch (error) {
    console.error("GET /api/security/sessions", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch sessions.",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const sessionId = searchParams.get("sessionId");
    const userId = searchParams.get("userId");

    if (!sessionId && !userId) {
      return NextResponse.json(
        {
          success: false,
          message: "sessionId or userId is required.",
        },
        { status: 400 }
      );
    }

    if (sessionId) {
      const terminated =
        await sessionManager.terminate(sessionId);

      if (!terminated) {
        return NextResponse.json(
          {
            success: false,
            message: "Session not found.",
          },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Session terminated successfully.",
      });
    }

    const count = sessionManager.terminateUserSessions(
      userId as string
    );

    return NextResponse.json({
      success: true,
      message: `${count} session(s) terminated successfully.`,
      count,
    });
  } catch (error) {
    console.error("DELETE /api/security/sessions", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to terminate session(s).",
      },
      { status: 500 }
    );
  }
}
