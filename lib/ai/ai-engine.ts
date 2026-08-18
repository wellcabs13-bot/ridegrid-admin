import { AIChatMessage, AIInsight, AIModelConfig, AIRecommendation } from "@/types/ai";
import { aiService } from "@/lib/ai/AIService";

export class AIEngine {
  private config: AIModelConfig;

  constructor(config: AIModelConfig) {
    this.config = config;
  }

  getConfig(): AIModelConfig {
    return this.config;
  }

  updateConfig(config: Partial<AIModelConfig>) {
    this.config = { ...this.config, ...config };
  }

  private async ask(prompt: string, module: "BOOKING" | "VENDOR" | "DRIVER" | "FINANCE" | "ANALYTICS" | "SUPPORT" | "REPORTS"): Promise<string> {
    const response = await aiService.generate(
      prompt,
      { module },
      this.config
    );
    return response.content;
  }

  async generateResponse(messages: AIChatMessage[]): Promise<string> {
    if (!messages.length) throw new Error("AI messages are required.");
    const prompt = messages.map((message) => `${message.role}: ${message.content}`).join("\n");
    return this.ask(prompt, "SUPPORT");
  }

  async generateBookingSuggestions(bookingData: unknown): Promise<AIRecommendation[]> {
    const content = await this.ask(
      `Recommend the best booking decisions from this data. Return JSON array only with objects containing title, description and confidenceScore (0-1).\n${JSON.stringify(bookingData)}`,
      "BOOKING"
    );
    return this.parseRecommendations(content);
  }

  async generateVendorSuggestions(vendorData: unknown): Promise<AIRecommendation[]> {
    const content = await this.ask(
      `Recommend the best vendor decisions from this data. Return JSON array only with objects containing title, description and confidenceScore (0-1).\n${JSON.stringify(vendorData)}`,
      "VENDOR"
    );
    return this.parseRecommendations(content);
  }

  async generateDriverSuggestions(driverData: unknown): Promise<AIRecommendation[]> {
    const content = await this.ask(
      `Recommend the best driver decisions from this data. Return JSON array only with objects containing title, description and confidenceScore (0-1).\n${JSON.stringify(driverData)}`,
      "DRIVER"
    );
    return this.parseRecommendations(content);
  }

  async generatePricePrediction(data: unknown): Promise<number> {
    const content = await this.ask(
      `Predict the recommended booking fare from this data. Return JSON only: {"predictedValue": number}.\n${JSON.stringify(data)}`,
      "BOOKING"
    );
    const parsed = this.parseJson(content);
    const value = Number(parsed?.predictedValue);
    if (!Number.isFinite(value) || value < 0) throw new Error("AI returned an invalid price prediction.");
    return value;
  }

  async detectFraud(booking: unknown): Promise<boolean> {
    const content = await this.ask(
      `Assess this booking for fraud. Return JSON only: {"fraud": true|false, "risk": "LOW"|"MEDIUM"|"HIGH"|"CRITICAL"}.\n${JSON.stringify(booking)}`,
      "BOOKING"
    );
    const parsed = this.parseJson(content);
    return parsed?.fraud === true ||
      parsed?.risk === "HIGH" ||
      parsed?.risk === "CRITICAL";
  }

  async generateInsights(): Promise<AIInsight[]> {
    const content = await this.ask(
      `Generate actionable RideGrid business insights. Return JSON array only with objects containing title, description and confidenceScore (0-1).`,
      "ANALYTICS"
    );
    return this.parseInsights(content);
  }

  async summarizeReport(report: unknown): Promise<string> {
    return this.ask(
      `Summarize this RideGrid report accurately and concisely. Do not invent facts.\n${JSON.stringify(report)}`,
      "REPORTS"
    );
  }

  async optimize(data: unknown): Promise<string> {
    return this.ask(
      `Optimize the supplied RideGrid operational data. Return actionable recommendations only. Do not invent unavailable facts.\n${JSON.stringify(data)}`,
      "ANALYTICS"
    );
  }

  private parseJson(content: string): any {
    const cleaned = content.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "");
    try {
      return JSON.parse(cleaned);
    } catch {
      const start = cleaned.indexOf("{");
      const end = cleaned.lastIndexOf("}");
      if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end + 1));
      throw new Error("AI returned invalid JSON.");
    }
  }

  private parseRecommendations(content: string): AIRecommendation[] {
    const cleaned = content.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "");
    let parsed: unknown;

    try {
      parsed = JSON.parse(cleaned);
    } catch {
      const start = cleaned.indexOf("[");
      const end = cleaned.lastIndexOf("]");
      if (start < 0 || end <= start) throw new Error("AI returned invalid recommendations.");
      parsed = JSON.parse(cleaned.slice(start, end + 1));
    }

    if (!Array.isArray(parsed)) throw new Error("AI recommendations must be an array.");

    return parsed.map((item: any, index: number) => ({
      id: String(item?.id ?? `ai-recommendation-${Date.now()}-${index}`),
      module: String(item?.module ?? "AI"),
      title: String(item?.title ?? "Recommendation"),
      description: String(item?.description ?? ""),
      action: String(item?.action ?? item?.title ?? "Review recommendation"),
      priority: (item?.priority === "LOW" || item?.priority === "HIGH" || item?.priority === "CRITICAL"
        ? item.priority
        : "MEDIUM") as AIRecommendation["priority"],
    }));
  }

  private parseInsights(content: string): AIInsight[] {
    const recommendations = this.parseRecommendations(content);
    return recommendations as unknown as AIInsight[];
  }
}
