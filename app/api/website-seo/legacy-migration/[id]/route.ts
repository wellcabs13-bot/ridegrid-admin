import {
  NextRequest,
  NextResponse,
} from "next/server";

import { legacyMigrationRepository } from "@/lib/website-seo/legacy-migration";

export const dynamic = "force-dynamic";

type Context = {
  params: Promise<{ id: string }>;
};

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

export async function PATCH(
  request: NextRequest,
  context: Context,
) {
  try {
    const { id } = await context.params;
    const body = await request.json();

    const state = await legacyMigrationRepository.update(
      id,
      body,
    );

    return NextResponse.json({
      ok: true,
      data: state,
    });
  } catch (error) {
    return failure(error);
  }
}

export async function DELETE(
  _request: NextRequest,
  context: Context,
) {
  try {
    const { id } = await context.params;

    const state =
      await legacyMigrationRepository.remove(id);

    return NextResponse.json({
      ok: true,
      data: state,
    });
  } catch (error) {
    return failure(error);
  }
}