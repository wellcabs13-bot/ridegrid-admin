import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req:NextRequest){

const driverId=req.nextUrl.searchParams.get("driverId");

const driver=await prisma.driver.findUnique({

where:{id:driverId!},

include:{
vendor:true,
vehicle:true
}

});

return NextResponse.json({

success:true,

data:driver

});

}