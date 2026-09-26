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
    const opportunities=await prisma.opportunity.findMany({include:{lead:true},orderBy:{createdAt:"desc"}});
    const pipeline=opportunities.reduce<Record<string,{count:number,totalAmount:number,opportunities:typeof opportunities}>>((acc,item)=>{
      const stage=item.stage;
      if(!acc[stage])acc[stage]={count:0,totalAmount:0,opportunities:[]};
      acc[stage].count++;
      acc[stage].totalAmount+=Number(item.expectedAmount??0);
      acc[stage].opportunities.push(item);
      return acc;
    },{});
    return NextResponse.json({success:true,data:{stages:pipeline,total:opportunities.length}});
  }catch(error){return NextResponse.json({success:false,message:error instanceof Error?error.message:"Failed to fetch pipeline."},{status:500});}
}