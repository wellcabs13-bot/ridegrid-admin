import type { WebsiteSeoApprovalMode } from "../config";

import {
  AI_BRAND_VOICES,
  AI_PROVIDER_POLICIES,
  AI_STRATEGY_OBJECTIVES,
  type AiBrandVoice,
  type AiProviderPolicy,
  type AiStrategyObjective,
  type WebsiteSeoAiControlState,
  type WebsiteSeoAiGenerationRules,
  type WebsiteSeoAiStrategy,
} from "./types";

export const DEFAULT_AI_CONTROL_STATE: WebsiteSeoAiControlState = {
  version: 1,
  approvalMode: "ASSISTED",
  strategy: {
    objective: "QUALITY_FIRST",
    targetMarket: "INDIA",
    defaultLocale: "en-IN",
    brandVoice: "PREMIUM_TRUSTED",
    providerPolicy: "LOCAL_FIRST",
  },
  generationRules: {
    contentDrafts: true,
    metadataSuggestions: true,
    faqSuggestions: true,
    internalLinkSuggestions: true,
    keywordSuggestions: false,
    maxBatchSize: 25,
    maxOutputCharacters: 100000,
  },
  guardrails: {
    factualClaimsRequireSource: true,
    prohibitFabricatedClaims: true,
    prohibitKeywordStuffing: true,
    preserveManualEdits: true,
    requireUniqueCopy: true,
    requireQualityPass: true,
    requireEditorialApprovalBeforeIndexing: true,
    neverBypassPublishingGuardrails: true,
  },
  updatedAt: null,
};

function object(
  value: unknown
): Record<string, unknown> {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    throw new Error("Expected object.");
  }

  return value as Record<string, unknown>;
}

function choice<T extends string>(
  value: unknown,
  values: readonly T[],
  label: string
): T {
  if (
    typeof value !== "string" ||
    !values.includes(value as T)
  ) {
    throw new Error(`Invalid ${label}.`);
  }

  return value as T;
}

function bool(
  value: unknown,
  label: string
): boolean {
  if (typeof value !== "boolean") {
    throw new Error(`${label} must be boolean.`);
  }

  return value;
}

function integer(
  value: unknown,
  min: number,
  max: number,
  label: string
): number {
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < min ||
    value > max
  ) {
    throw new Error(
      `${label} must be an integer between ${min} and ${max}.`
    );
  }

  return value;
}

export function validateApprovalMode(
  value: unknown
): WebsiteSeoApprovalMode {
  return choice(
    value,
    [
      "MANUAL",
      "ASSISTED",
      "AUTOMATIC",
    ] as const,
    "approval mode"
  );
}

export function validateStrategy(
  value: unknown
): WebsiteSeoAiStrategy {
  const input = object(value);

  return {
    objective: choice<AiStrategyObjective>(
      input.objective,
      AI_STRATEGY_OBJECTIVES,
      "strategy objective"
    ),
    targetMarket: "INDIA",
    defaultLocale: "en-IN",
    brandVoice: choice<AiBrandVoice>(
      input.brandVoice,
      AI_BRAND_VOICES,
      "brand voice"
    ),
    providerPolicy: choice<AiProviderPolicy>(
      input.providerPolicy,
      AI_PROVIDER_POLICIES,
      "provider policy"
    ),
  };
}

export function validateGenerationRules(
  value: unknown
): WebsiteSeoAiGenerationRules {
  const input = object(value);

  return {
    contentDrafts: bool(
      input.contentDrafts,
      "contentDrafts"
    ),
    metadataSuggestions: bool(
      input.metadataSuggestions,
      "metadataSuggestions"
    ),
    faqSuggestions: bool(
      input.faqSuggestions,
      "faqSuggestions"
    ),
    internalLinkSuggestions: bool(
      input.internalLinkSuggestions,
      "internalLinkSuggestions"
    ),
    keywordSuggestions: bool(
      input.keywordSuggestions,
      "keywordSuggestions"
    ),
    maxBatchSize: integer(
      input.maxBatchSize,
      1,
      25,
      "maxBatchSize"
    ),
    maxOutputCharacters: integer(
      input.maxOutputCharacters,
      1000,
      100000,
      "maxOutputCharacters"
    ),
  };
}