import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req:NextRequest){

const vendorId=req.nextUrl.searchParams.get("vendorId");

const vehicles=await prisma.vehicle.findMany({
where:{vendorId},
include:{
driver:true
}
});

return NextResponse.json({
success:true,
data:vehicles
});

}