import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req:NextRequest){

const vendorId=req.nextUrl.searchParams.get("vendorId");

const bookings=await prisma.booking.findMany({

where:{vendorId},

include:{
customer:true,
vehicle:true,
driver:true
},

orderBy:{
pickupDate:"desc"
}

});

return NextResponse.json({
success:true,
data:bookings
});

}