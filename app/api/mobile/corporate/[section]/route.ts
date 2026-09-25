import { NextRequest } from "next/server";
import { employeeGet, employeePost } from "@/lib/corporate-employee-mobile/route";
type Context = { params: Promise<{ section: string }> };
export async function GET(req: NextRequest, ctx: Context) { return employeeGet(req, (await ctx.params).section); }
export async function POST(req: NextRequest, ctx: Context) { return employeePost(req, (await ctx.params).section); }
