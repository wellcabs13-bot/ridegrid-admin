import { NextRequest } from "next/server";
import { adminGet, adminPost } from "@/lib/corporate-admin/route";
type Context = { params: Promise<{ section: string }> };
export async function GET(req: NextRequest, ctx: Context) { return adminGet(req, (await ctx.params).section); }
export async function POST(req: NextRequest, ctx: Context) { return adminPost(req, (await ctx.params).section); }
