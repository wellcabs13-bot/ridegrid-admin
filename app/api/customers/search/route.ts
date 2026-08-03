import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const search = request.nextUrl.searchParams.get("q") || "";

  const customers = await prisma.customer.findMany({
    where: {
      OR: [
        {
          firstName: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          lastName: {
            contains: search,
            mode: "insensitive",
          },
        },
      ],
    },
    include: {
      user: true,
    },
  });

  return NextResponse.json({
    success: true,
    data: customers,
  });
}