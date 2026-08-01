import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req:NextRequest){

const body=await req.json();

await prisma.emergencySOS.create({

data:body

});

return NextResponse.json({

success:true,

message:"Emergency Alert Sent"

});

}