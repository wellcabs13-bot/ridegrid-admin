import { websiteAutomationEngine } from "@/lib/website-seo/automation";

export async function POST() {
  try {
    const data =
      await websiteAutomationEngine.runDueSchedules();

    return Response.json({
      ok: true,
      data,
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Scheduled automation failed.",
      },
      { status: 500 }
    );
  }
}