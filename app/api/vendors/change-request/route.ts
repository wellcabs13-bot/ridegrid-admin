import { NextRequest, NextResponse } from "next/server";

export async function POST(){

return Response.json({

success:true,

message:"Vehicle/Driver change request submitted to RideGrid Admin."

});

}