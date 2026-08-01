import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {

    const driverId = req.nextUrl.searchParams.get("driverId");

    const [
      todayTrips,
      completedTrips,
      activeTrip
    ] = await Promise.all([

      prisma.booking.count({
        where:{
          driverId,
          status:"TRIP_STARTED"
        }
      }),

      prisma.booking.count({
        where:{
          driverId,
          status:"TRIP_COMPLETED"
        }
      }),

      prisma.trip.findFirst({
        where:{
          booking:{
            driverId,
            status:"TRIP_STARTED"
          }
        }
      })

    ]);

    return NextResponse.json({
      success:true,
      data:{
        todayTrips,
        completedTrips,
        activeTrip
      }
    });

  } catch {

    return NextResponse.json({
      success:false
    },{status:500});

  }
}