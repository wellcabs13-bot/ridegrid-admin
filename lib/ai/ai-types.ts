/**
 * RideGrid Enterprise AI
 * Internal AI Runtime Types
 * Version 1.0
 */

import {
  AIInsight,
  AIModelConfig,
  AIRecommendation,
} from "@/types/ai";

export interface AIContext {
  tenantId?: string;

  userId?: string;

  role?: string;

  module:
    | "BOOKING"
    | "CUSTOMER"
    | "DRIVER"
    | "VEHICLE"
    | "VENDOR"
    | "FINANCE"
    | "ANALYTICS"
    | "REPORTS"
    | "SUPPORT";

  city?: string;

  metadata?: Record<string, unknown>;
}

export interface AIRequest {
  prompt: string;

  context: AIContext;

  model: AIModelConfig;

  temperature?: number;

  maxTokens?: number;

  stream?: boolean;
}

export interface AIResponse {
  success: boolean;

  content: string;

  tokensUsed: number;

  responseTime: number;

  model: string;

  provider: string;

  createdAt: Date;
}

export interface AIError {
  code: string;

  message: string;

  provider?: string;

  details?: unknown;
}

export interface AIHealthStatus {
  provider: string;

  model: string;

  available: boolean;

  latency: number;

  checkedAt: Date;
}

export interface AIInsightResponse {
  insights: AIInsight[];

  recommendations: AIRecommendation[];

  generatedAt: Date;
}

export interface AIProviderAdapter {
  generate(
    request: AIRequest
  ): Promise<AIResponse>;

  healthCheck(): Promise<AIHealthStatus>;
}

export interface AIUsageLog {
  id: string;

  module: string;

  provider: string;

  model: string;

  tokens: number;

  cost: number;

  executionTime: number;

  createdAt: Date;
}

export interface AIPromptTemplate {
  id: string;

  name: string;

  description: string;

  category: string;

  systemPrompt: string;

  userPrompt: string;

  enabled: boolean;
}

export interface AIRecommendationEngine {
  recommendBooking(data: unknown): Promise<AIRecommendation[]>;

  recommendVendor(data: unknown): Promise<AIRecommendation[]>;

  recommendDriver(data: unknown): Promise<AIRecommendation[]>;

  recommendVehicle(data: unknown): Promise<AIRecommendation[]>;
}