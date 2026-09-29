import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Public corporate enquiry from /corporate-travel. It becomes a NEW CORPORATE lead
// from the WEBSITE source in the central CRM that RideGrid sales works in; nothing
// else is created or sent. Same-origin only, rate limited, with a honeypot field.
const WINDOW_MS = 10 * 60 * 1000, LIMIT = 5;
const hits = new Map<string, number[]>();
const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,120}\.[^\s@]{2,}$/;
const MOBILE = /^[0-9+\-\s]{7,20}$/;

function limited(key: string, now = Date.now()) {
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= LIMIT) { hits.set(key, recent); return true; }
  recent.push(now); hits.set(key, recent);
  if (hits.size > 5000) hits.delete(hits.keys().next().value!);
  return false;
}

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const bad = (message: string, status = 400) => NextResponse.json({ success: false, message }, { status });

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if ((origin && origin !== request.nextUrl.origin) || request.headers.get("sec-fetch-site") === "cross-site") return bad("Cross-site requests are not allowed.", 403);
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
  if (limited(ip)) return bad("Too many enquiries. Please try again later or call us.", 429);
  let b: Record<string, unknown>;
  try { b = await request.json(); } catch { return bad("Invalid request."); }
  if (!b || typeof b !== "object") return bad("Invalid request.");
  // Bots fill every field; people never see this one.
  if (str(b.website, 200)) return NextResponse.json({ success: true, data: { received: true } });
  const companyName = str(b.companyName, 160), contactPerson = str(b.contactPerson, 120), email = str(b.email, 160).toLowerCase(), mobile = str(b.mobile, 20);
  const city = str(b.city, 80), employees = str(b.employees, 40), message = str(b.message, 1000);
  if (!companyName || !contactPerson) return bad("Enter your company and your name.");
  if (!EMAIL.test(email)) return bad("Enter a valid work email.");
  if (!MOBILE.test(mobile)) return bad("Enter a valid mobile number.");
  try {
    const lead = await prisma.lead.create({
      data: {
        leadType: "CORPORATE", source: "WEBSITE", status: "NEW", companyName, contactPerson, email, mobile, city: city || undefined,
        remarks: [employees && `Travellers: ${employees}`, message].filter(Boolean).join("\n") || undefined,
      },
      select: { id: true },
    });
    return NextResponse.json({ success: true, data: { received: true, reference: lead.id.slice(-8).toUpperCase() } }, { status: 201 });
  } catch (error) {
    console.error("POST /api/public/corporate-enquiry failed", error);
    return bad("We could not record your enquiry. Please call or email us.", 500);
  }
}
