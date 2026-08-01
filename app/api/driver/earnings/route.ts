import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req:NextRequest){

const driverId=req.nextUrl.searchParams.get("driverId");

const completed=await prisma.booking.count({

where:{

driverId,

status:"TRIP_COMPLETED"

}

});

return NextResponse.json({

success:true,

data:{

completedTrips:completed

}

});

}