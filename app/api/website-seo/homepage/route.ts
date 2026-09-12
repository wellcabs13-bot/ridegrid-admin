import {
  websiteHomepageRepository,
  validateWebsiteHomepageConfig,
} from "@/lib/website-seo/homepage";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data =
      await websiteHomepageRepository.get();

    return Response.json({
      ok: true,
      data,
    });
  } catch (error) {
    console.error(
      "[website-seo/homepage GET]",
      error
    );

    return Response.json(
      {
        ok: false,
        error:
          "Unable to load homepage configuration.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function PUT(
  request: Request
) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json(
      {
        ok: false,
        error: "Invalid JSON body.",
      },
      {
        status: 400,
      }
    );
  }

  try {
    const config =
      validateWebsiteHomepageConfig(
        body
      );

    const data =
      await websiteHomepageRepository.save(
        config
      );

    return Response.json({
      ok: true,
      data,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Invalid homepage configuration.";

    return Response.json(
      {
        ok: false,
        error: message,
      },
      {
        status: 400,
      }
    );
  }
}