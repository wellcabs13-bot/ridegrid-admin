import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mobileCustomer, mobileFailure } from "@/lib/customer-mobile";
export async function GET(request: NextRequest) {
  try {
    const a = await mobileCustomer(request); if (a.denied) return a.denied;
    const id = request.nextUrl.searchParams.get("id");
    const raw = Number(request.nextUrl.searchParams.get("page") || 1);
    const page = Number.isSafeInteger(raw) && raw > 0 ? Math.min(raw, 10000) : 1;
    const where = { customer: { userId: a.user!.id, deletedAt: null }, deletedAt: null, ...(id ? { id } : {}) };
    const data = await prisma.booking.findMany({ where, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: id ? 1 : 20, skip: id ? 0 : (page - 1) * 20,
      select: { id: true, bookingNumber: true, status: true, tripType: true, tripDays: true, pickupLocation: true, dropLocation: true, pickupDateTime: true, reservedUntil: true, finalFare: true, estimatedFare: true, priceSnapshot: true,
        pricingPackage: { select: { packageType: true, city: true, fromCity: true, toCity: true, packageName: true } },
        vehicle: { select: { make: true, model: true, category: true, registrationNumber: true, seatingCapacity: true } },
        vendor: { select: { companyName: true } }, driver: { select: { firstName: true, lastName: true, user: { select: { mobile: true } } } },
        transactions: { select: { id: true, paymentMethod: true, paymentStatus: true, amount: true }, orderBy: { createdAt: "desc" } },
        statusHistory: { select: { currentStatus: true, createdAt: true }, orderBy: { createdAt: "desc" } },
      } });
    if (id && !data.length) return NextResponse.json({ success: false, message: "Booking not found." }, { status: 404 });
    return NextResponse.json({ success: true, data: { bookings: data.map(({ pricingPackage: p, ...b }) => ({ ...b, rebook: p ? { serviceType: p.packageType === "LOCAL" ? "LOCAL" : "OUTSTATION", tripType: b.tripType === "ROUNDTRIP" ? "ROUNDTRIP" : "ONEWAY", pickupCity: (p.packageType === "LOCAL" ? p.city : p.fromCity) || "", dropCity: p.toCity || "", category: b.vehicle.category, packageName: p.packageType === "LOCAL" ? p.packageName : "" } : null })), page, hasMore: !id && data.length === 20 } }, { headers: { "Cache-Control": "no-store" } });
  } catch { return mobileFailure(); }
}
