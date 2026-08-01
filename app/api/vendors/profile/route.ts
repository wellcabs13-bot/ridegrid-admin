import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest){

    const vendorId=req.nextUrl.searchParams.get("vendorId");

    const vendor=await prisma.vendor.findUnique({
        where:{id:vendorId!},
        include:{
            vehicles:true,
            drivers:true
        }
    });

    return NextResponse.json({
        success:true,
        data:vendor
    });

}