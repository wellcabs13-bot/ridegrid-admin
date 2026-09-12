import { aiService } from "@/lib/ai/AIService";

import {
  getWebsiteSeoAiEnvironment,
} from "@/lib/website-seo/ai-control";

export async function POST() {
  const environment =
    getWebsiteSeoAiEnvironment();

  if (
    !environment.apiKeyConfigured
  ) {
    return Response.json({
      ok: true,
      data: {
        available: false,
        provider:
          environment.globalProvider,
        model:
          environment.globalModel,
        reason:
          "AI provider API key is not configured.",
      },
    });
  }

  try {
    const health =
      await aiService.healthCheck();

    return Response.json({
      ok: true,
      data: {
        ...health,
        reason: null,
      },
    });
  } catch (error) {
    return Response.json({
      ok: true,
      data: {
        available: false,
        provider:
          environment.globalProvider,
        model:
          environment.globalModel,
        reason:
          error instanceof Error
            ? error.message
            : "AI provider health check failed.",
      },
    });
  }
}