import { NextRequest } from "next/server";
import { driverGet, driverPost } from "@/lib/driver-mobile/route";
type Context = { params: Promise<{ section: string }> };
export async function GET(req: NextRequest, ctx: Context) { return driverGet(req, (await ctx.params).section); }
export async function POST(req: NextRequest, ctx: Context) { return driverPost(req, (await ctx.params).section); }
