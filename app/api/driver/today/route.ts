import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req:NextRequest){

const driverId=req.nextUrl.searchParams.get("driverId");

const today=new Date();

today.setHours(0,0,0,0);

const bookings=await prisma.booking.findMany({

where:{
driverId,
pickupDate:{
gte:today
}
}

});

return NextResponse.json({

success:true,

data:bookings

});

}