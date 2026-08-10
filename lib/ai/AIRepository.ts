import {
  FraudRiskLevel,
  PredictionType,
  RecommendationType,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

export class AIRepository {
  async createRecommendation(data: {
    customerId: string;
    recommendationType: RecommendationType;
    title: string;
    description?: string;
    confidenceScore: number;
  }) {
    return prisma.aIRecommendation.create({
      data: {
        customerId: data.customerId,
        recommendationType: data.recommendationType,
        title: data.title.trim(),
        description: data.description?.trim() || undefined,
        confidenceScore: data.confidenceScore,
      },
    });
  }

  async getCustomerRecommendations(customerId: string) {
    return prisma.aIRecommendation.findMany({
      where: { customerId },
      orderBy: { createdAt: "desc" },
    });
  }

  async createDemandPrediction(data: {
    city: string;
    predictionType: PredictionType;
    predictionDate: Date;
    predictedValue: number;
    confidence: number;
  }) {
    return prisma.demandPrediction.create({
      data: {
        city: data.city.trim(),
        predictionType: data.predictionType,
        predictionDate: data.predictionDate,
        predictedValue: data.predictedValue,
        confidence: data.confidence,
      },
    });
  }

  async getDemandPredictions(city?: string) {
    return prisma.demandPrediction.findMany({
      where: city
        ? {
            city: city.trim(),
          }
        : undefined,
      orderBy: {
        predictionDate: "desc",
      },
    });
  }

  async createFraudDetection(data: {
    bookingId: string;
    riskLevel: FraudRiskLevel;
    score: number;
    reason?: string;
  }) {
    return prisma.fraudDetection.create({
      data: {
        bookingId: data.bookingId,
        riskLevel: data.riskLevel,
        score: data.score,
        reason: data.reason?.trim() || undefined,
      },
    });
  }

  async getBookingFraudChecks(bookingId: string) {
    return prisma.fraudDetection.findMany({
      where: { bookingId },
      orderBy: { createdAt: "desc" },
    });
  }
}

export const aiRepository = new AIRepository();

export default aiRepository;
