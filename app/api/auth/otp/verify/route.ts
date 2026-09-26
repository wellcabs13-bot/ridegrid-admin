import { NextResponse } from "next/server";
import { verifyOTP } from "@/lib/auth/otp/otp-service";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const identifier = String(body?.identifier ?? "").trim();
    const otp = String(body?.otp ?? "").trim();

    if (!identifier || !/^\d{6}$/.test(otp)) {
      return NextResponse.json({ success: false, error: "Valid identifier and 6-digit OTP are required." }, { status: 400 });
    }

    verifyOTP(identifier, otp);

    return NextResponse.json({ success: true, verified: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "OTP verification failed.";
    return NextResponse.json({ success: false, verified: false, error: message }, { status: 400 });
  }
}