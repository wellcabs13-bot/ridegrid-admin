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
    const data=await prisma.cRMTask.findMany({where:leadId?{leadId}:undefined,include:{lead:true,owner:true},orderBy:{createdAt:"desc"}});
    return NextResponse.json({success:true,data});
  }catch(error){return NextResponse.json({success:false,message:error instanceof Error?error.message:"Failed to fetch tasks."},{status:500});}
}

export async function POST(request:NextRequest){
  try{
    if(!(await auth(request)))return NextResponse.json({success:false,message:"Unauthorized."},{status:401});
    const body=await request.json();
    if(!body.title||!body.status)return NextResponse.json({success:false,message:"title and status are required."},{status:400});
    const data=await prisma.cRMTask.create({data:{
      leadId:body.leadId||undefined,
      ownerId:body.ownerId||undefined,
      title:body.title,
      description:body.description||undefined,
      dueDate:body.dueDate?new Date(body.dueDate):undefined,
      status:body.status
    }});
    return NextResponse.json({success:true,data},{status:201});
  }catch(error){return NextResponse.json({success:false,message:error instanceof Error?error.message:"Failed to create task."},{status:500});}
}

export async function PATCH(request:NextRequest){
  try{
    if(!(await auth(request)))return NextResponse.json({success:false,message:"Unauthorized."},{status:401});
    const body=await request.json();
    if(!body.id)return NextResponse.json({success:false,message:"Task ID is required."},{status:400});
    const {id,...data}=body;
    if(data.dueDate)data.dueDate=new Date(data.dueDate);
    const result=await prisma.cRMTask.update({where:{id},data});
    return NextResponse.json({success:true,data:result});
  }catch(error){return NextResponse.json({success:false,message:error instanceof Error?error.message:"Failed to update task."},{status:500});}
}