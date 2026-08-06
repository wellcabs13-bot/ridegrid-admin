/**
 * RideGrid Enterprise AI
 * AI Utility Functions
 * Version 1.0
 */

import {
  AIRecommendation,
  AIRecommendationPriority,
} from "@/types/ai";

export function generateAIId(prefix = "AI"): string {
  return `${prefix}-${Date.now()}-${Math.random()
    .toString(36)
    .substring(2, 8)
    .toUpperCase()}`;
}

export function calculateConfidence(
  score: number
): number {
  if (score < 0) return 0;
  if (score > 100) return 100;

  return Math.round(score);
}

export function priorityWeight(
  priority: AIRecommendationPriority
): number {
  switch (priority) {
    case AIRecommendationPriority.CRITICAL:
      return 4;

    case AIRecommendationPriority.HIGH:
      return 3;

    case AIRecommendationPriority.MEDIUM:
      return 2;

    default:
      return 1;
  }
}

export function sortRecommendations(
  recommendations: AIRecommendation[]
): AIRecommendation[] {
  return [...recommendations].sort(
    (a, b) =>
      priorityWeight(b.priority) -
      priorityWeight(a.priority)
  );
}

export function groupRecommendations(
  recommendations: AIRecommendation[]
): Record<string, AIRecommendation[]> {
  return recommendations.reduce(
    (groups, recommendation) => {
      if (!groups[recommendation.module]) {
        groups[recommendation.module] = [];
      }

      groups[recommendation.module].push(
        recommendation
      );

      return groups;
    },
    {} as Record<string, AIRecommendation[]>
  );
}

export function estimateTokenUsage(
  text: string
): number {
  return Math.ceil(text.length / 4);
}

export function estimateRequestCost(
  tokens: number,
  pricePer1KTokens = 0.002
): number {
  return Number(
    ((tokens / 1000) * pricePer1KTokens).toFixed(6)
  );
}

export function executionTime(
  startedAt: number
): number {
  return Date.now() - startedAt;
}

export function sanitizePrompt(
  prompt: string
): string {
  return prompt
    .replace(/\s+/g, " ")
    .trim();
}

export function isSuccessfulConfidence(
  confidence: number
): boolean {
  return confidence >= 75;
}

export function aiLogger(
  module: string,
  action: string,
  payload?: unknown
) {
  console.info(
    `[RideGrid AI] ${module} :: ${action}`,
    payload ?? ""
  );
}