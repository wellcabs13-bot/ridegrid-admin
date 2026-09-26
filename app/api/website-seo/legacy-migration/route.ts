import { NextRequest, NextResponse } from "next/server";

import { legacyMigrationRepository } from "@/lib/website-seo/legacy-migration";

export const dynamic = "force-dynamic";

function failure(error: unknown) {
  return NextResponse.json(
    {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Legacy migration request failed.",
    },
    { status: 400 },
  );
}

export async function GET() {
  try {
    const [state, counts] = await Promise.all([
      legacyMigrationRepository.getState(),
      legacyMigrationRepository.counts(),
    ]);

    return NextResponse.json({
      ok: true,
      data: {
        ...state,
        counts,
      },
    });
  } catch (error) {
    return failure(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (body?.action === "bootstrap") {
      const state =
        await legacyMigrationRepository.bootstrapVerified();

      return NextResponse.json({
        ok: true,
        data: state,
      });
    }

    const state = await legacyMigrationRepository.create({
      label: String(body.label || "").trim(),
      sourcePath: String(body.sourcePath || "").trim(),
      targetPath: body.targetPath
        ? String(body.targetPath).trim()
        : null,
      strategy: body.strategy,
      status: "PLANNED",
      priority: body.priority,
      category: body.category,
      notes: body.notes
        ? String(body.notes).trim()
        : null,
    });

    return NextResponse.json({
      ok: true,
      data: state,
    });
  } catch (error) {
    return failure(error);
  }
}