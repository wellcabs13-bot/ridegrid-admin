import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const raw = request.nextUrl.searchParams.get("vehicleIds") || "";
    const vehicleIds = raw.split(",").map((v) => v.trim()).filter(Boolean).slice(0, 100);

    if (!vehicleIds.length) {
      return NextResponse.json({ success: true, data: {} });
    }

    const vehicles = await prisma.vehicle.findMany({
      where: { id: { in: vehicleIds }, deletedAt: null },
      select: {
        id: true,
        driverId: true,
        rating: true,
      },
    });

    const driverIds = vehicles.map((v) => v.driverId).filter((v): v is string => Boolean(v));
    const vendorIds = await prisma.vehicle.findMany({
      where: { id: { in: vehicleIds }, deletedAt: null },
      select: { id: true, vendorId: true },
    });

    const vendorIdList = vendorIds.map((v) => v.vendorId).filter(Boolean);

    const [vehiclePhotos, driverPhotos, reviews] = await Promise.all([
      prisma.fileAsset.findMany({
        where: {
          entityType: "VEHICLE_PHOTO",
          entityId: { in: vehicleIds },
          mimeType: { startsWith: "image/" },
        },
        select: { entityId: true, fileUrl: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      }),
      prisma.fileAsset.findMany({
        where: {
          entityId: { in: driverIds },
          mimeType: { startsWith: "image/" },
        },
        select: { entityId: true, fileUrl: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      }),
      prisma.review.findMany({
        where: {
          status: "PUBLISHED",
          OR: [
            { vehicleId: { in: vehicleIds } },
            ...(driverIds.length ? [{ driverId: { in: driverIds } }] : []),
            ...(vendorIdList.length ? [{ vendorId: { in: vendorIdList } }] : []),
          ],
        },
        select: {
          rating: true,
          vehicleId: true,
          driverId: true,
          vendorId: true,
        },
      }),
    ]);

    const result: Record<string, {
      vehiclePhotos: string[];
      driverPhoto: string | null;
      ratings: {
        vehicle: { average: number | null; count: number };
        vendor: { average: number | null; count: number };
        driver: { average: number | null; count: number };
      };
    }> = {};

    const average = (values: number[]) =>
      values.length ? Number((values.reduce((a, b) => a + b, 0) / values.length).toFixed(1)) : null;

    for (const vehicle of vehicles) {
      const vendorId = vendorIds.find((v) => v.id === vehicle.id)?.vendorId || null;
      const driverId = vehicle.driverId || null;

      const vehicleRatings = reviews.filter((r) => r.vehicleId === vehicle.id).map((r) => r.rating);
      const driverRatings = reviews.filter((r) => r.driverId === driverId).map((r) => r.rating);
      const vendorRatings = reviews.filter((r) => r.vendorId === vendorId).map((r) => r.rating);

      result[vehicle.id] = {
        vehiclePhotos: vehiclePhotos.filter((f) => f.entityId === vehicle.id).map((f) => f.fileUrl),
        driverPhoto: driverPhotos.find((f) => f.entityId === driverId)?.fileUrl || null,
        ratings: {
          vehicle: { average: average(vehicleRatings), count: vehicleRatings.length },
          vendor: { average: average(vendorRatings), count: vendorRatings.length },
          driver: { average: average(driverRatings), count: driverRatings.length },
        },
      };
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("GET /api/marketplace/listing-assets:", error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Unable to load listing details." },
      { status: 500 }
    );
  }
}
