import type {
  WebsiteSeoAiControlState,
  WebsiteSeoAiEnvironment,
  WebsiteSeoAiRecommendation,
} from "./types";

export function buildAiControlRecommendations(
  state: WebsiteSeoAiControlState,
  environment: WebsiteSeoAiEnvironment
): WebsiteSeoAiRecommendation[] {
  const rows: WebsiteSeoAiRecommendation[] = [];

  if (!environment.websiteSeoAiEnabled) {
    rows.push({
      id: "runtime-disabled",
      severity: "ACTION",
      title: "Website SEO AI runtime is disabled",
      description:
        "The control plane is ready, but the central Website SEO AI gate is OFF. Keep deterministic W5 generation active until provider configuration is intentionally enabled during deployment.",
    });
  }

  if (!environment.apiKeyConfigured) {
    rows.push({
      id: "provider-secret",
      severity: "ACTION",
      title: "AI provider secret is not configured",
      description:
        "Configure AI_API_KEY only in the server environment or deployment secret store. W13 never persists API keys in SystemSetting.",
    });
  }

  if (
    environment.globalProvider ===
      "AZURE_OPENAI" &&
    !environment.endpointConfigured
  ) {
    rows.push({
      id: "azure-endpoint",
      severity: "ACTION",
      title: "Azure OpenAI endpoint required",
      description:
        "The existing RideGrid provider adapter requires AI_API_ENDPOINT when Azure OpenAI is selected.",
    });
  }

  if (
    environment.globalProvider ===
      "LOCAL" &&
    !environment.endpointConfigured
  ) {
    rows.push({
      id: "local-endpoint",
      severity: "ACTION",
      title: "Local provider endpoint required",
      description:
        "The existing RideGrid LOCAL provider requires AI_API_ENDPOINT.",
    });
  }

  if (
    state.approvalMode ===
    "AUTOMATIC"
  ) {
    rows.push({
      id: "automatic-governance",
      severity: "INFO",
      title: "Automatic mode remains governed",
      description:
        "AUTOMATIC approval does not bypass W5 quality checks, W6 SEO guardrails, editorial protection, or W7 publishing readiness.",
    });
  }

  if (
    state.strategy.providerPolicy ===
      "AI_WHEN_AVAILABLE" &&
    !environment.apiKeyConfigured
  ) {
    rows.push({
      id: "provider-policy-waiting",
      severity: "INFO",
      title: "AI fallback policy is waiting for a provider",
      description:
        "AI_WHEN_AVAILABLE is configured, but deterministic generation remains the only available path until the provider is configured.",
    });
  }

  if (
    environment.websiteSeoAiEnabled &&
    environment.apiKeyConfigured
  ) {
    rows.push({
      id: "provider-ready",
      severity: "READY",
      title: "Provider configuration is ready for health verification",
      description:
        "A provider and server-side API key are available. Use the provider health check before enabling AI-assisted production workflows.",
    });
  }

  return rows;
}