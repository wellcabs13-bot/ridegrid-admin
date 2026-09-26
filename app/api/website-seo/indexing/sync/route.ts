import { NextRequest } from "next/server";
import { publicationHttp } from "@/lib/website-seo/publishing/http";
export async function POST(request: NextRequest) { return publicationHttp(request, "sync"); }
