import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req:NextRequest){

const userId=req.nextUrl.searchParams.get("userId");

const notifications=await prisma.notification.findMany({

where:{userId},

orderBy:{

createdAt:"desc"

},

take:50

});

return NextResponse.json({

success:true,

data:notifications

});

}