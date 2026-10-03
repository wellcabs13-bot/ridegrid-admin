import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    success: true,
    service: "ridegrid-admin",
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
}
