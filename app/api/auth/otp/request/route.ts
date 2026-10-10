import { NextResponse } from "next/server";
import { requestOTP } from "@/lib/auth/otp/otp-service";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const identifier = String(body?.identifier ?? "").trim();

    if (!identifier) {
      return NextResponse.json({ success: false, error: "Identifier is required." }, { status: 400 });
    }

    const result = requestOTP(identifier);

    if (process.env.NODE_ENV !== "production") {
      return NextResponse.json({
        success: true,
        message: "OTP generated.",
        developmentOtp: result.otp,
        expiresAt: result.expiresAt,
      });
    }

    return NextResponse.json({
      success: true,
      message: "OTP requested.",
      expiresAt: result.expiresAt,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "OTP request failed.";
    const status = message === "OTP_RESEND_COOLDOWN" ? 429 : 400;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}