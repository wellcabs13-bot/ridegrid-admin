import { NextRequest, NextResponse } from "next/server";
import { authenticate } from "@/lib/auth/middleware";
import { prisma } from "@/lib/prisma";

async function auth(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  const headerToken = authorization?.startsWith("Bearer ")
    ? authorization.slice(7)
    : undefined;
  const cookieToken =
    request.cookies.get("ridegrid_access_token")?.value ??
    request.cookies.get("ridegrid-token")?.value;
  return authenticate(headerToken ?? cookieToken);
}

export async function GET(request: NextRequest) {
  try {
    if (!(await auth(request))) return NextResponse.json({ success:false, message:"Unauthorized." }, { status:401 });
    const id = request.nextUrl.searchParams.get("id");
    const data = id
      ? await prisma.lead.findUnique({ where:{ id }, include:{ opportunities:true, crmactivities:true, crmtasks:true } })
      : await prisma.lead.findMany({ include:{ opportunities:true }, orderBy:{ createdAt:"desc" } });
    return NextResponse.json({ success:true, data });
  } catch (error) {
    return NextResponse.json({ success:false, message:error instanceof Error ? error.message : "Failed to fetch leads." }, { status:500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!(await auth(request))) return NextResponse.json({ success:false, message:"Unauthorized." }, { status:401 });
    const body = await request.json();
    const data = await prisma.lead.create({ data:{
      corporateId: body.corporateId || undefined,
      ownerId: body.ownerId || undefined,
      leadType: body.leadType,
      source: body.source,
      status: body.status,
      companyName: body.companyName || undefined,
      contactPerson: body.contactPerson,
      email: body.email || undefined,
      mobile: body.mobile,
      city: body.city || undefined,
      state: body.state || undefined,
      expectedRevenue: body.expectedRevenue ?? undefined,
      remarks: body.remarks || undefined
    }});
    return NextResponse.json({ success:true, data }, { status:201 });
  } catch (error) {
    return NextResponse.json({ success:false, message:error instanceof Error ? error.message : "Failed to create lead." }, { status:500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    if (!(await auth(request))) return NextResponse.json({ success:false, message:"Unauthorized." }, { status:401 });
    const body = await request.json();
    if (!body.id) return NextResponse.json({ success:false, message:"Lead ID is required." }, { status:400 });
    const { id, ...data } = body;
    const result = await prisma.lead.update({ where:{ id }, data });
    return NextResponse.json({ success:true, data:result });
  } catch (error) {
    return NextResponse.json({ success:false, message:error instanceof Error ? error.message : "Failed to update lead." }, { status:500 });
  }
}