import { vendorFailure } from "@/lib/vendor-mobile/access";
import { legacyVendorId } from "@/lib/vendor-mobile/legacy";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const listingId = String(body?.listingId ?? "");
    const vendorId = await legacyVendorId(req, typeof body.vendorId === "string" ? body.vendorId : undefined);
    const approved = Boolean(body?.approved);

    if (!listingId || !vendorId) {
      return NextResponse.json({ success: false, message: "listingId and vendorId are required." }, { status: 400 });
    }

    const listing = await prisma.smartReturnListing.findFirst({
      where: { id: listingId, vendorId },
    });

    if (!listing) {
      return NextResponse.json({ success: false, message: "Smart Return listing not found." }, { status: 404 });
    }

    const updated = await prisma.smartReturnListing.update({
      where: { id: listing.id },
      data: {
        status: approved ? "PUBLISHED" : "CANCELLED",
        publishedAt: approved ? new Date() : null,
      },
    });

    return NextResponse.json({
      success: true,
      data: updated,
      status: updated.status,
    });
  } catch (error) { return vendorFailure(error); }
}
