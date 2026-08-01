import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req:NextRequest){

const vendorId=req.nextUrl.searchParams.get("vendorId");

const drivers=await prisma.driver.findMany({
where:{vendorId}
});

return NextResponse.json({
success:true,
data:drivers
});

}