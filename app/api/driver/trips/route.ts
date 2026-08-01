import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req:NextRequest){

const driverId=req.nextUrl.searchParams.get("driverId");

const trips=await prisma.booking.findMany({

where:{driverId},

include:{
customer:true,
vehicle:true
},

orderBy:{
pickupDate:"desc"
}

});

return NextResponse.json({

success:true,

data:trips

});

}