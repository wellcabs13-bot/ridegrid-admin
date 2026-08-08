import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  AutomationTrigger,
} from "@/types/automation";

import {
  automationEngine,
} from "@/lib/automation/automation-engine";

import {
  createAutomationEvent,
} from "@/lib/automation/automation-events";

export async function GET(
  request: NextRequest
) {
  try {
    const trigger =
      new URL(request.url)
        .searchParams.get(
          "trigger"
        );

    if (!trigger) {
      return NextResponse.json(
        {
          success: false,
          message:
            "trigger is required.",
        },
        { status: 400 }
      );
    }

    if (
      !Object.values(
        AutomationTrigger
      ).includes(
        trigger as AutomationTrigger
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid automation trigger.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      trigger,
      message:
        "Automation trigger is valid.",
    });
  } catch (error) {
    console.error(
      "GET /api/automation",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Failed to validate automation.",
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest
) {
  try {
    const body =
      await request.json();

    if (!body.trigger) {
      return NextResponse.json(
        {
          success: false,
          message:
            "trigger is required.",
        },
        { status: 400 }
      );
    }

    if (
      !Object.values(
        AutomationTrigger
      ).includes(
        body.trigger as AutomationTrigger
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid automation trigger.",
        },
        { status: 400 }
      );
    }

    if (
      !body.context ||
      typeof body.context.module !==
        "string"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "context.module is required.",
        },
        { status: 400 }
      );
    }

    const event =
      createAutomationEvent({
        trigger:
          body.trigger as AutomationTrigger,
        module:
          body.context.module,
        userId:
          body.context.userId,
        bookingId:
          body.context.bookingId,
        vendorId:
          body.context.vendorId,
        driverId:
          body.context.driverId,
        customerId:
          body.context.customerId,
        metadata:
          body.context.metadata,
      });

    const result =
      await automationEngine.execute({
        trigger: event.trigger,
        context: {
          module: event.module,
          userId: event.userId,
          bookingId:
            event.bookingId,
          vendorId:
            event.vendorId,
          driverId:
            event.driverId,
          customerId:
            event.customerId,
          metadata:
            event.metadata,
        },
      });

    return NextResponse.json(
      {
        success: result.success,
        data: result,
      },
      {
        status: result.success
          ? 200
          : 500,
      }
    );
  } catch (error) {
    console.error(
      "POST /api/automation",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Failed to execute automation.",
      },
      { status: 500 }
    );
  }
}