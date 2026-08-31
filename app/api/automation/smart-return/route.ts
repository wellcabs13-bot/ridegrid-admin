import { NextResponse } from "next/server";
import { generateSmartReturnListings } from "@/lib/services/smart-return/SmartReturnAutomationService";

export async function POST() {
  try {
    const result = await generateSmartReturnListings();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Smart Return automation failed:", error);
    return NextResponse.json(
      { success: false, message: "Smart Return automation failed." },
      { status: 500 }
    );
  }
}