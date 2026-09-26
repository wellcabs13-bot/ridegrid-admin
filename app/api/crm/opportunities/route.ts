import { NextRequest, NextResponse } from "next/server";
import { authenticate } from "@/lib/auth/middleware";
import { prisma } from "@/lib/prisma";

async function auth(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  const headerToken = authorization?.startsWith("Bearer ") ? authorization.slice(7) : undefined;
  const cookieToken = request.cookies.get("ridegrid_access_token")?.value ?? request.cookies.get("ridegrid-token")?.value;
  return authenticate(headerToken ?? cookieToken);
}

export async function GET(request: NextRequest) {
  try {
    if (!(await auth(request))) return NextResponse.json({success:false,message:"Unauthorized."},{status:401});
    const leadId=request.nextUrl.searchParams.get("leadId");
    const data=await prisma.opportunity.findMany({
      where: leadId ? {leadId} : undefined,
      include:{lead:true},
      orderBy:{createdAt:"desc"}
    });
    return NextResponse.json({success:true,data});
  } catch(error) {
    return NextResponse.json({success:false,message:error instanceof Error?error.message:"Failed to fetch opportunities."},{status:500});
  }
}

export async function POST(request:NextRequest) {
  try {
    if (!(await auth(request))) return NextResponse.json({success:false,message:"Unauthorized."},{status:401});
    const body=await request.json();
    if(!body.leadId || !body.stage) return NextResponse.json({success:false,message:"leadId and stage are required."},{status:400});
    const data=await prisma.opportunity.create({data:{
      leadId:body.leadId,
      stage:body.stage,
      expectedAmount:body.expectedAmount ?? undefined,
      probability:body.probability ?? undefined,
      expectedCloseDate:body.expectedCloseDate ? new Date(body.expectedCloseDate) : undefined,
      remarks:body.remarks || undefined
    }});
    return NextResponse.json({success:true,data},{status:201});
  } catch(error) {
    return NextResponse.json({success:false,message:error instanceof Error?error.message:"Failed to create opportunity."},{status:500});
  }
}

export async function PATCH(request:NextRequest) {
  try {
    if (!(await auth(request))) return NextResponse.json({success:false,message:"Unauthorized."},{status:401});
    const body=await request.json();
    if(!body.id) return NextResponse.json({success:false,message:"Opportunity ID is required."},{status:400});
    const {id,...data}=body;
    if(data.expectedCloseDate) data.expectedCloseDate=new Date(data.expectedCloseDate);
    const result=await prisma.opportunity.update({where:{id},data});
    return NextResponse.json({success:true,data:result});
  } catch(error) {
    return NextResponse.json({success:false,message:error instanceof Error?error.message:"Failed to update opportunity."},{status:500});
  }
}