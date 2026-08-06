export enum AIProvider {
  OPENAI = "OPENAI",
  GEMINI = "GEMINI",
  CLAUDE = "CLAUDE",
  AZURE_OPENAI = "AZURE_OPENAI",
  LOCAL = "LOCAL",
}

export enum AIModelStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
}

export enum AIInsightType {
  BOOKING = "BOOKING",
  CUSTOMER = "CUSTOMER",
  DRIVER = "DRIVER",
  VEHICLE = "VEHICLE",
  VENDOR = "VENDOR",
  FINANCE = "FINANCE",
  OPERATIONS = "OPERATIONS",
  FRAUD = "FRAUD",
}

export enum AIRecommendationPriority {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  CRITICAL = "CRITICAL",
}

export interface AIModelConfig {
  id: string;
  name: string;
  provider: AIProvider;
  model: string;
  apiKey?: string;
  endpoint?: string;
  temperature: number;
  maxTokens: number;
  status: AIModelStatus;
}

export interface AIInsight {
  id: string;
  title: string;
  description: string;
  type: AIInsightType;
  priority: AIRecommendationPriority;
  confidence: number;
  createdAt: Date;
}

export interface AIRecommendation {
  id: string;
  module: string;
  title: string;
  description: string;
  action: string;
  priority: AIRecommendationPriority;
}

export interface AIChatMessage {
  id: string;
  role: "system" | "user" | "assistant";
  content: string;
  createdAt: Date;
}

export interface AIUsage {
  totalRequests: number;
  totalTokens: number;
  totalCost: number;
  averageResponseTime: number;
}