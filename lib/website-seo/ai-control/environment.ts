import { websiteSeoConfig } from "../config";

import type {
  WebsiteSeoAiEnvironment,
} from "./types";

export const SUPPORTED_AI_PROVIDERS = [
  "OPENAI",
  "GEMINI",
  "CLAUDE",
  "AZURE_OPENAI",
  "LOCAL",
] as const;

export function getWebsiteSeoAiEnvironment():
  WebsiteSeoAiEnvironment {
  const provider =
    process.env.AI_PROVIDER?.trim() ||
    "OPENAI";

  const model =
    process.env.AI_MODEL?.trim() ||
    "gpt-4o-mini";

  const apiKeyConfigured =
    Boolean(
      process.env.AI_API_KEY?.trim()
    );

  const endpointConfigured =
    Boolean(
      process.env.AI_API_ENDPOINT?.trim()
    );

  let runtimeState:
    WebsiteSeoAiEnvironment["runtimeState"];

  if (!websiteSeoConfig.aiEnabled) {
    runtimeState = "DISABLED";
  } else if (!apiKeyConfigured) {
    runtimeState =
      "PROVIDER_NOT_CONFIGURED";
  } else {
    runtimeState =
      "READY_FOR_HEALTH_CHECK";
  }

  return {
    websiteSeoAiEnabled:
      websiteSeoConfig.aiEnabled,
    globalProvider: provider,
    globalModel: model,
    apiKeyConfigured,
    endpointConfigured,
    supportedProviders: [
      ...SUPPORTED_AI_PROVIDERS,
    ],
    runtimeState,
  };
}