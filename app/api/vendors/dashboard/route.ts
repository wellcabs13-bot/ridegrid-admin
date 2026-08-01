import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const vendorId = req.nextUrl.searchParams.get("vendorId");

    const [
      vehicles,
      drivers,
      bookings,
      wallet,
      settlements
    ] = await Promise.all([
      prisma.vehicle.count({ where: { vendorId } }),
      prisma.driver.count({ where: { vendorId } }),
      prisma.booking.count({ where: { vendorId } }),
      prisma.wallet.findFirst({ where: { vendorId } }),
      prisma.settlement.aggregate({
        where: { vendorId },
        _sum: { payableAmount: true }
      })
    ]);

    return NextResponse.json({
      success: true,
      data: {
        vehicles,
        drivers,
        bookings,
        wallet,
        settlements
      }
    });

  } catch (error) {
    return NextResponse.json(
      { success:false, message:"Unable to load dashboard."},
      {status:500}
    );
  }
}