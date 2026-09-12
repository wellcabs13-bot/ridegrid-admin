import type { WebsiteSeoApprovalMode } from "../config";

export const AI_STRATEGY_OBJECTIVES = [
  "QUALITY_FIRST",
  "BALANCED",
  "SCALE",
] as const;

export type AiStrategyObjective =
  (typeof AI_STRATEGY_OBJECTIVES)[number];

export const AI_BRAND_VOICES = [
  "PREMIUM_TRUSTED",
  "DIRECT_COMMERCIAL",
  "INFORMATIVE",
] as const;

export type AiBrandVoice =
  (typeof AI_BRAND_VOICES)[number];

export const AI_PROVIDER_POLICIES = [
  "LOCAL_FIRST",
  "AI_WHEN_AVAILABLE",
] as const;

export type AiProviderPolicy =
  (typeof AI_PROVIDER_POLICIES)[number];

export interface WebsiteSeoAiStrategy {
  objective: AiStrategyObjective;
  targetMarket: "INDIA";
  defaultLocale: "en-IN";
  brandVoice: AiBrandVoice;
  providerPolicy: AiProviderPolicy;
}

export interface WebsiteSeoAiGenerationRules {
  contentDrafts: boolean;
  metadataSuggestions: boolean;
  faqSuggestions: boolean;
  internalLinkSuggestions: boolean;
  keywordSuggestions: boolean;
  maxBatchSize: number;
  maxOutputCharacters: number;
}

export interface WebsiteSeoAiGuardrails {
  factualClaimsRequireSource: true;
  prohibitFabricatedClaims: true;
  prohibitKeywordStuffing: true;
  preserveManualEdits: true;
  requireUniqueCopy: true;
  requireQualityPass: true;
  requireEditorialApprovalBeforeIndexing: true;
  neverBypassPublishingGuardrails: true;
}

export interface WebsiteSeoAiControlState {
  version: 1;
  approvalMode: WebsiteSeoApprovalMode;
  strategy: WebsiteSeoAiStrategy;
  generationRules: WebsiteSeoAiGenerationRules;
  guardrails: WebsiteSeoAiGuardrails;
  updatedAt: string | null;
}

export interface WebsiteSeoAiEnvironment {
  websiteSeoAiEnabled: boolean;
  globalProvider: string;
  globalModel: string;
  apiKeyConfigured: boolean;
  endpointConfigured: boolean;
  supportedProviders: string[];
  runtimeState:
    | "DISABLED"
    | "PROVIDER_NOT_CONFIGURED"
    | "READY_FOR_HEALTH_CHECK";
}

export interface WebsiteSeoAiRecommendation {
  id: string;
  severity: "INFO" | "ACTION" | "READY";
  title: string;
  description: string;
}

export interface WebsiteSeoAiControlSnapshot {
  state: WebsiteSeoAiControlState;
  environment: WebsiteSeoAiEnvironment;
  recommendations: WebsiteSeoAiRecommendation[];
}