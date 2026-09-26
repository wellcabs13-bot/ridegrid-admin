import { NextRequest, NextResponse } from "next/server";
import { authenticate } from "@/lib/auth/middleware";
import { prisma } from "@/lib/prisma";

async function auth(request:NextRequest){
  const authorization=request.headers.get("authorization");
  const headerToken=authorization?.startsWith("Bearer ")?authorization.slice(7):undefined;
  const cookieToken=request.cookies.get("ridegrid_access_token")?.value??request.cookies.get("ridegrid-token")?.value;
  return authenticate(headerToken??cookieToken);
}

export async function GET(request:NextRequest){
  try{
    if(!(await auth(request)))return NextResponse.json({success:false,message:"Unauthorized."},{status:401});
    const leadId=request.nextUrl.searchParams.get("leadId");
    const data=await prisma.cRMActivity.findMany({where:leadId?{leadId}:undefined,include:{lead:true,owner:true},orderBy:{activityDate:"desc"}});
    return NextResponse.json({success:true,data});
  }catch(error){return NextResponse.json({success:false,message:error instanceof Error?error.message:"Failed to fetch activities."},{status:500});}
}

export async function POST(request:NextRequest){
  try{
    if(!(await auth(request)))return NextResponse.json({success:false,message:"Unauthorized."},{status:401});
    const body=await request.json();
    if(!body.leadId||!body.activityType||!body.subject||!body.activityDate)return NextResponse.json({success:false,message:"leadId, activityType, subject and activityDate are required."},{status:400});
    const data=await prisma.cRMActivity.create({data:{
      leadId:body.leadId,
      ownerId:body.ownerId||undefined,
      activityType:body.activityType,
      subject:body.subject,
      notes:body.notes||undefined,
      activityDate:new Date(body.activityDate)
    }});
    return NextResponse.json({success:true,data},{status:201});
  }catch(error){return NextResponse.json({success:false,message:error instanceof Error?error.message:"Failed to create activity."},{status:500});}
}