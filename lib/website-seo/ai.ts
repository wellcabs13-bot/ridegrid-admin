export interface WebsiteSeoAIRequest {
  task: string;
  context?: Record<string, unknown>;
}

export interface WebsiteSeoAIResponse {
  success: boolean;
  content?: string;
  error?: string;
}

export interface WebsiteSeoAIProvider {
  generate(
    request: WebsiteSeoAIRequest
  ): Promise<WebsiteSeoAIResponse>;
}

/**
 * Shared AI boundary for Website & SEO.
 *
 * Provider implementation will be connected during W5.
 * Keeping this interface centralized prevents AI logic
 * from being duplicated throughout Website & SEO.
 */
export const websiteSeoAI = {
  async generate(
    _request: WebsiteSeoAIRequest
  ): Promise<WebsiteSeoAIResponse> {
    return {
      success: false,
      error: "Website & SEO AI provider is not configured yet.",
    };
  },
};
