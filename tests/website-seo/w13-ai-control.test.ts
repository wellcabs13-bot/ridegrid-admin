import {
  describe,
  expect,
  it,
} from "vitest";

import {
  DEFAULT_AI_CONTROL_STATE,
  buildAiControlRecommendations,
  validateApprovalMode,
  validateGenerationRules,
  validateStrategy,
} from "@/lib/website-seo/ai-control";

describe("W13 AI Control Center", () => {
  it("accepts supported approval modes", () => {
    expect(
      validateApprovalMode(
        "MANUAL"
      )
    ).toBe("MANUAL");

    expect(
      validateApprovalMode(
        "ASSISTED"
      )
    ).toBe("ASSISTED");

    expect(
      validateApprovalMode(
        "AUTOMATIC"
      )
    ).toBe("AUTOMATIC");
  });

  it("rejects invalid approval mode", () => {
    expect(() =>
      validateApprovalMode(
        "UNRESTRICTED"
      )
    ).toThrow();
  });

  it("validates strategy without accepting arbitrary target market", () => {
    const result =
      validateStrategy({
        objective:
          "QUALITY_FIRST",
        brandVoice:
          "PREMIUM_TRUSTED",
        providerPolicy:
          "LOCAL_FIRST",
        targetMarket: "ANYWHERE",
      });

    expect(
      result.targetMarket
    ).toBe("INDIA");

    expect(
      result.defaultLocale
    ).toBe("en-IN");
  });

  it("caps batch rules at the Page Factory limit", () => {
    expect(() =>
      validateGenerationRules({
        contentDrafts: true,
        metadataSuggestions: true,
        faqSuggestions: true,
        internalLinkSuggestions:
          true,
        keywordSuggestions: false,
        maxBatchSize: 26,
        maxOutputCharacters:
          100000,
      })
    ).toThrow();
  });

  it("preserves mandatory critical guardrails", () => {
    expect(
      DEFAULT_AI_CONTROL_STATE
        .guardrails
        .prohibitFabricatedClaims
    ).toBe(true);

    expect(
      DEFAULT_AI_CONTROL_STATE
        .guardrails
        .preserveManualEdits
    ).toBe(true);

    expect(
      DEFAULT_AI_CONTROL_STATE
        .guardrails
        .neverBypassPublishingGuardrails
    ).toBe(true);
  });

  it("does not report provider readiness when runtime is unavailable", () => {
    const rows =
      buildAiControlRecommendations(
        DEFAULT_AI_CONTROL_STATE,
        {
          websiteSeoAiEnabled:
            false,
          globalProvider:
            "OPENAI",
          globalModel:
            "gpt-4o-mini",
          apiKeyConfigured:
            false,
          endpointConfigured:
            false,
          supportedProviders: [
            "OPENAI",
          ],
          runtimeState:
            "DISABLED",
        }
      );

    expect(
      rows.some(
        (row) =>
          row.id ===
          "runtime-disabled"
      )
    ).toBe(true);

    expect(
      rows.some(
        (row) =>
          row.id ===
          "provider-ready"
      )
    ).toBe(false);
  });

  it("never requires API secrets in persisted control state", () => {
    expect(
      JSON.stringify(
        DEFAULT_AI_CONTROL_STATE
      )
    ).not.toMatch(
      /apiKey|secret|password/i
    );
  });
});