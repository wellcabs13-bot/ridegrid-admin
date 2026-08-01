import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req:NextRequest){

const body=await req.json();

const{

tripId,

latitude,

longitude,

speed,

heading

}=body;

await prisma.tripTracking.create({

data:{

tripId,

latitude,

longitude,

speed,

heading

}

});

await prisma.trip.update({

where:{id:tripId},

data:{

currentLatitude:latitude,

currentLongitude:longitude

}

});

return NextResponse.json({

success:true,

message:"Location Updated"

});

}