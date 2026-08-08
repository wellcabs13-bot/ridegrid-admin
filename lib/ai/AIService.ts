import {
  AIContext,
  AIRequest,
  AIResponse,
} from "@/lib/ai/ai-types";

import {
  AIModelConfig,
  AIModelStatus,
} from "@/types/ai";

import {
  aiProviderAdapter,
} from "@/lib/ai/providers/AIProviderAdapter";

import {
  aiRepository,
} from "@/lib/ai/AIRepository";

import {
  SYSTEM_PROMPTS,
} from "@/lib/ai/ai-prompts";

import {
  sanitizePrompt,
} from "@/lib/ai/ai-utils";

export class AIService {
  private getDefaultModel(): AIModelConfig {
    const provider =
      process.env.AI_PROVIDER || "OPENAI";

    const model =
      process.env.AI_MODEL ||
      "gpt-4o-mini";

    const apiKey =
      process.env.AI_API_KEY;

    const endpoint =
      process.env.AI_API_ENDPOINT;

    return {
      id: "ridegrid-default-ai",
      name: "RideGrid Enterprise AI",
      provider: provider as AIModelConfig["provider"],
      model,
      apiKey,
      endpoint,
      temperature: Number(
        process.env.AI_TEMPERATURE ?? 0.2
      ),
      maxTokens: Number(
        process.env.AI_MAX_TOKENS ?? 1200
      ),
      status: apiKey
        ? AIModelStatus.ACTIVE
        : AIModelStatus.INACTIVE,
    };
  }

  async generate(
    prompt: string,
    context: AIContext,
    model?: AIModelConfig
  ): Promise<AIResponse> {
    const cleanPrompt =
      sanitizePrompt(prompt);

    if (!cleanPrompt) {
      throw new Error(
        "AI prompt is required."
      );
    }

    const activeModel =
      model ?? this.getDefaultModel();

    const contextualPrompt = [
      SYSTEM_PROMPTS.ASSISTANT,
      `Module: ${context.module}`,
      context.city
        ? `City: ${context.city}`
        : "",
      context.role
        ? `Role: ${context.role}`
        : "",
      context.metadata
        ? `Context: ${JSON.stringify(
            context.metadata
          )}`
        : "",
      `Request: ${cleanPrompt}`,
    ]
      .filter(Boolean)
      .join("\n\n");

    const request: AIRequest = {
      prompt: contextualPrompt,
      context,
      model: activeModel,
      temperature:
        activeModel.temperature,
      maxTokens:
        activeModel.maxTokens,
      stream: false,
    };

    return aiProviderAdapter.generate(
      request
    );
  }

  async healthCheck(
    model?: AIModelConfig
  ) {
    const activeModel =
      model ?? this.getDefaultModel();

    return aiProviderAdapter.healthCheck({
      prompt: "health check",
      context: {
        module: "SUPPORT",
      },
      model: activeModel,
    });
  }

  async saveRecommendation(data: {
    customerId: string;
    recommendationType:
      | "CUSTOMER"
      | "DRIVER"
      | "VENDOR"
      | "VEHICLE";
    title: string;
    description?: string;
    confidenceScore: number;
  }) {
    return aiRepository.createRecommendation(
      data
    );
  }

  async getCustomerRecommendations(
    customerId: string
  ) {
    return aiRepository.getCustomerRecommendations(
      customerId
    );
  }

  async saveDemandPrediction(data: {
    city: string;
    predictionType:
      | "DEMAND"
      | "REVENUE"
      | "SURGE"
      | "CANCELLATION";
    predictionDate: Date;
    predictedValue: number;
    confidence: number;
  }) {
    return aiRepository.createDemandPrediction(
      data
    );
  }

  async getDemandPredictions(
    city?: string
  ) {
    return aiRepository.getDemandPredictions(
      city
    );
  }

  async saveFraudDetection(data: {
    bookingId: string;
    riskLevel:
      | "LOW"
      | "MEDIUM"
      | "HIGH"
      | "CRITICAL";
    score: number;
    reason?: string;
  }) {
    return aiRepository.createFraudDetection(
      data
    );
  }

  async getBookingFraudChecks(
    bookingId: string
  ) {
    return aiRepository.getBookingFraudChecks(
      bookingId
    );
  }
}

export const aiService =
  new AIService();