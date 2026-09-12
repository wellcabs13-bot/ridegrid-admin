import { NextRequest } from "next/server";
import { publicationHttp } from "@/lib/website-seo/publishing/http";
export async function POST(request: NextRequest, context: { params: Promise<{ action: string }> }) {
  const { action } = await context.params;
  if (!["publish", "unpublish", "preview"].includes(action)) return Response.json({ ok: false, error: "Unknown action." }, { status: 404 });
  return publicationHttp(request, action);
}
