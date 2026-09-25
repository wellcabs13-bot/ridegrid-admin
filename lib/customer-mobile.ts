import { NextRequest, NextResponse } from "next/server";
import { requestUser } from "@/lib/request-access";

export async function mobileCustomer(request: NextRequest) {
  const user = await requestUser(request);
  if (!user) return { user: null, denied: NextResponse.json({ success: false, message: "Please sign in." }, { status: 401 }) };
  if (user.role !== "CUSTOMER") return { user: null, denied: NextResponse.json({ success: false, message: "A customer account is required." }, { status: 403 }) };
  const origin = request.headers.get("origin");
  if (request.method !== "GET" && ((origin && origin !== request.nextUrl.origin) || request.headers.get("sec-fetch-site") === "cross-site")) return { user: null, denied: NextResponse.json({ success: false }, { status: 403 }) };
  return { user, denied: null };
}
export const mobileFailure = () => NextResponse.json({ success: false, message: "Unable to complete this request. Please try again." }, { status: 500 });
