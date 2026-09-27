import { NextRequest, NextResponse } from "next/server";

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);
}

// Server-renders a self-submitting form to PayU's hosted checkout. Used by both the
// web payment page (full navigation) and the mobile app (opened inside a secure
// in-app browser session) so the PayU form-POST mechanics only need to exist once.
export async function GET(request: NextRequest) {
  try {
    const encoded = request.nextUrl.searchParams.get("data");
    if (!encoded) return new NextResponse("Missing checkout data.", { status: 400 });

    const decoded = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
    const { action, fields } = decoded as { action: string; fields: Record<string, string> };

    if (!action || !fields || typeof fields !== "object") {
      return new NextResponse("Invalid checkout data.", { status: 400 });
    }

    const inputs = Object.entries(fields)
      .map(([name, value]) => `<input type="hidden" name="${escapeHtml(name)}" value="${escapeHtml(String(value ?? ""))}" />`)
      .join("\n");

    const html = `<!doctype html>
<html>
<head><meta charset="utf-8" /><title>Redirecting to PayU...</title></head>
<body>
  <p>Redirecting to PayU secure checkout...</p>
  <form id="payu-form" method="post" action="${escapeHtml(action)}">
    ${inputs}
  </form>
  <script>document.getElementById("payu-form").submit();</script>
</body>
</html>`;

    return new NextResponse(html, { headers: { "Content-Type": "text/html" } });
  } catch (error) {
    console.error("PAYU CHECKOUT PAGE ERROR:", error);
    return new NextResponse("Unable to open PayU checkout.", { status: 500 });
  }
}
