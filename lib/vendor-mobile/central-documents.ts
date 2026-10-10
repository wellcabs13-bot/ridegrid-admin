import { NextRequest, NextResponse } from "next/server";
import { requestUser } from "@/lib/request-access";
export async function centralDocumentAccess(request: NextRequest) {
  const user = await requestUser(request);
  if (!user)
    return NextResponse.json(
      { success: false, message: "Please sign in." },
      { status: 401 },
    );
  const origin = request.headers.get("origin");
  if (
    request.method !== "GET" &&
    ((origin && origin !== request.nextUrl.origin) ||
      request.headers.get("sec-fetch-site") === "cross-site")
  )
    return NextResponse.json({ success: false }, { status: 403 });
  if (user.role === "SUPER_ADMIN" || user.role === "OPERATIONS") return null;
  return NextResponse.json(
    {
      success: false,
      message: "Use the document workflow for your own account.",
    },
    { status: 403 },
  );
}
