import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { requestUser } from "@/lib/request-access";
import { pricingAccess, pricingResponse } from "@/lib/services/pricing/access";
import { quoteService } from "@/lib/services/pricing/QuoteService";
import { date, object, text } from "@/lib/services/pricing/config";
import { PricingError, SERVICES, nonnegative } from "@/lib/services/pricing/engine";

export async function POST(request: NextRequest) {
  try {
    const b = object(await request.json());
    const origin = request.headers.get("origin");
    if ((origin && origin !== request.nextUrl.origin) || request.headers.get("sec-fetch-site") === "cross-site") throw new PricingError("FORBIDDEN", "Cross-site changes are not allowed", 403);
    const at = date(b.at, "trip date");
    const days = b.days === undefined ? undefined : nonnegative(b.days, "Trip days");
    if (days !== undefined && (!Number.isInteger(Number(days)) || Number(days) < 1 || Number(days) > 365)) throw new PricingError("INVALID_INPUT", "Trip days must be a whole number from 1 to 365", 400);
    if (b.simulate === true) {
      const a = await pricingAccess(request, text(b.vendorId,"vendor"));
      const service = text(b.service,"service");
      if (!(SERVICES as readonly string[]).includes(service)) throw new PricingError("INVALID_INPUT","Invalid service",400);
      const data = await quoteService.quote({ days, vendorId:a.vendorId || text(b.vendorId,"vendor"), vehicleId:text(b.vehicleId,"vehicle"), vehicleCategory:text(b.vehicleCategory,"category"), service, city:String(b.city || ""), origin:String(b.origin || ""), destination:String(b.destination || ""), area:String(b.area || ""), pricingPackageId:typeof b.pricingPackageId === "string" ? b.pricingPackageId : undefined, at, ownerId:a.user.id, ...(b.distanceKm !== undefined ? { distanceKm:nonnegative(b.distanceKm,"distance") } : {}), ...(b.durationHours !== undefined ? { durationHours:nonnegative(b.durationHours,"duration") } : {}), smartReturnListingId:typeof b.smartReturnListingId === "string" ? b.smartReturnListingId : undefined }, false, typeof b.draftRateId === "string" ? b.draftRateId : undefined, b.proposedFare === undefined ? undefined : nonnegative(b.proposedFare,"proposed fare"));
      return NextResponse.json({ success:true, data });
    }
    const user = await requestUser(request);
    const guest = request.cookies.get("ridegrid_quote_session")?.value || randomUUID();
    const ownerId = user?.id || `guest:${guest}`;
    const data = await quoteService.forPackage(text(b.pricingPackageId,"pricing package"),at,ownerId,true,text(b.idempotencyKey,"idempotency key"),days);
    const response = NextResponse.json({ success:true,data });
    if (!user) response.cookies.set("ridegrid_quote_session",guest,{ httpOnly:true,sameSite:"lax",secure:process.env.NODE_ENV==="production",path:"/",maxAge:3600 });
    return response;
  } catch (error) { return pricingResponse(error); }
}
