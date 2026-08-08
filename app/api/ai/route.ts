import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  aiService,
} from "@/lib/ai/AIService";

export async function GET(
  request: NextRequest
) {
  try {
    const { searchParams } =
      new URL(request.url);

    const action =
      searchParams.get("action") ||
      "health";

    if (action === "health") {
      const health =
        await aiService.healthCheck();

      return NextResponse.json({
        success: true,
        data: health,
      });
    }

    if (
      action === "customer-recommendations"
    ) {
      const customerId =
        searchParams.get(
          "customerId"
        );

      if (!customerId) {
        return NextResponse.json(
          {
            success: false,
            message:
              "customerId is required.",
          },
          { status: 400 }
        );
      }

      const data =
        await aiService.getCustomerRecommendations(
          customerId
        );

      return NextResponse.json({
        success: true,
        data,
      });
    }

    if (
      action === "demand-predictions"
    ) {
      const city =
        searchParams.get("city") ||
        undefined;

      const data =
        await aiService.getDemandPredictions(
          city
        );

      return NextResponse.json({
        success: true,
        data,
      });
    }

    if (
      action === "fraud-checks"
    ) {
      const bookingId =
        searchParams.get(
          "bookingId"
        );

      if (!bookingId) {
        return NextResponse.json(
          {
            success: false,
            message:
              "bookingId is required.",
          },
          { status: 400 }
        );
      }

      const data =
        await aiService.getBookingFraudChecks(
          bookingId
        );

      return NextResponse.json({
        success: true,
        data,
      });
    }

    return NextResponse.json(
      {
        success: false,
        message:
          "Unsupported AI action.",
      },
      { status: 400 }
    );
  } catch (error) {
    console.error(
      "GET /api/ai:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Failed to process AI request.",
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

    const action =
      body.action || "generate";

    if (action === "generate") {
      if (
        typeof body.prompt !==
        "string" ||
        !body.prompt.trim()
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "prompt is required.",
          },
          { status: 400 }
        );
      }

      if (!body.context?.module) {
        return NextResponse.json(
          {
            success: false,
            message:
              "context.module is required.",
          },
          { status: 400 }
        );
      }

      const data =
        await aiService.generate(
          body.prompt,
          body.context,
          body.model
        );

      return NextResponse.json({
        success: true,
        data,
      });
    }

    if (
      action === "recommendation"
    ) {
      const data =
        await aiService.saveRecommendation(
          body
        );

      return NextResponse.json({
        success: true,
        data,
      });
    }

    if (
      action === "demand-prediction"
    ) {
      const data =
        await aiService.saveDemandPrediction(
          {
            city: body.city,
            predictionType:
              body.predictionType,
            predictionDate:
              new Date(
                body.predictionDate
              ),
            predictedValue:
              Number(
                body.predictedValue
              ),
            confidence:
              Number(
                body.confidence
              ),
          }
        );

      return NextResponse.json({
        success: true,
        data,
      });
    }

    if (
      action === "fraud-detection"
    ) {
      const data =
        await aiService.saveFraudDetection(
          body
        );

      return NextResponse.json({
        success: true,
        data,
      });
    }

    return NextResponse.json(
      {
        success: false,
        message:
          "Unsupported AI action.",
      },
      { status: 400 }
    );
  } catch (error) {
    console.error(
      "POST /api/ai:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Failed to process AI request.",
      },
      { status: 500 }
    );
  }
}