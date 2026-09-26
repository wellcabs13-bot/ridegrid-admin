import { NextRequest,NextResponse } from "next/server"; import {getCorporateCreditAccount} from "@/lib/services/corporate/CorporateCreditService";
import { prisma } from "@/lib/prisma";
import { requestUser } from "@/lib/request-access";
// Credit position is visible to RideGrid staff and active members of that company only.
export async function GET(req:NextRequest){try{const id=new URL(req.url).searchParams.get("corporateId")?.trim();if(!id)return NextResponse.json({success:false,message:"corporateId is required."},{status:400});
const user=await requestUser(req);if(!user)return NextResponse.json({success:false,message:"Please sign in."},{status:401});
if(!["SUPER_ADMIN","OPERATIONS","FINANCE"].includes(user.role)){const member=["CORPORATE_ADMIN","CORPORATE_EMPLOYEE"].includes(user.role)&&await prisma.corporateEmployee.findFirst({where:{userId:user.id,corporateId:id,isActive:true},select:{id:true}});if(!member)return NextResponse.json({success:false,message:"This corporate account is not available to you."},{status:403});}
return NextResponse.json({success:true,data:await getCorporateCreditAccount(id)});}catch(e){return NextResponse.json({success:false,message:e instanceof Error?e.message:"Unable to load corporate credit."},{status:500});}}
