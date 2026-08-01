import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req:NextRequest){

const vendorId=req.nextUrl.searchParams.get("vendorId");

const returns=await prisma.smartReturn.findMany({

where:{vendorId},

orderBy:{
availableAfter:"asc"
}

});

return NextResponse.json({

success:true,

data:returns

});

}