import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req:NextRequest){

const vendorId=req.nextUrl.searchParams.get("vendorId");

const settlements=await prisma.settlement.findMany({
where:{vendorId},
orderBy:{
createdAt:"desc"
}
});

return NextResponse.json({
success:true,
data:settlements
});

}