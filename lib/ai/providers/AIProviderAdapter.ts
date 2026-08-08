import {
  AIRequest,
  AIResponse,
  AIHealthStatus,
} from "@/lib/ai/ai-types";
import { AIProvider } from "@/types/ai";

function getProviderEndpoint(
  request: AIRequest
): string {
  if (request.model.endpoint) {
    return request.model.endpoint;
  }

  switch (request.model.provider) {
    case AIProvider.OPENAI:
      return "https://api.openai.com/v1/chat/completions";

    case AIProvider.AZURE_OPENAI:
      throw new Error(
        "Azure OpenAI requires an explicit endpoint."
      );

    case AIProvider.GEMINI:
      return `https://generativelanguage.googleapis.com/v1beta/models/${request.model.model}:generateContent`;

    case AIProvider.CLAUDE:
      return "https://api.anthropic.com/v1/messages";

    case AIProvider.LOCAL:
      throw new Error(
        "Local AI provider requires an explicit endpoint."
      );

    default:
      throw new Error(
        `Unsupported AI provider: ${request.model.provider}`
      );
  }
}

export class AIProviderAdapterService {
  async generate(
    request: AIRequest
  ): Promise<AIResponse> {
    const startedAt = Date.now();

    if (
      request.model.status !== "ACTIVE"
    ) {
      throw new Error(
        "AI model is inactive."
      );
    }

    if (!request.model.apiKey) {
      throw new Error(
        `API key is not configured for provider ${request.model.provider}.`
      );
    }

    const endpoint =
      getProviderEndpoint(request);

    let response: Response;

    switch (request.model.provider) {
      case AIProvider.OPENAI:
      case AIProvider.AZURE_OPENAI:
        response = await this.generateOpenAICompatible(
          request,
          endpoint
        );
        break;

      case AIProvider.GEMINI:
        response = await this.generateGemini(
          request,
          endpoint
        );
        break;

      case AIProvider.CLAUDE:
        response = await this.generateClaude(
          request,
          endpoint
        );
        break;

      case AIProvider.LOCAL:
        response = await this.generateLocal(
          request,
          endpoint
        );
        break;

      default:
        throw new Error(
          `Unsupported AI provider: ${request.model.provider}`
        );
    }

    if (!response.ok) {
      const errorText =
        await response.text();

      throw new Error(
        `AI provider request failed (${response.status}): ${errorText}`
      );
    }

    const payload =
      await response.json();

    const content =
      this.extractContent(
        request.model.provider,
        payload
      );

    const tokensUsed =
      this.extractTokenUsage(
        request.model.provider,
        payload,
        request.prompt
      );

    return {
      success: true,
      content,
      tokensUsed,
      responseTime:
        Date.now() - startedAt,
      model: request.model.model,
      provider: request.model.provider,
      createdAt: new Date(),
    };
  }

  async healthCheck(
    request: AIRequest
  ): Promise<AIHealthStatus> {
    const startedAt = Date.now();

    try {
      if (
        request.model.status !== "ACTIVE" ||
        !request.model.apiKey
      ) {
        return {
          provider: request.model.provider,
          model: request.model.model,
          available: false,
          latency: Date.now() - startedAt,
          checkedAt: new Date(),
        };
      }

      const endpoint =
        getProviderEndpoint(request);

      let response: Response;

      switch (request.model.provider) {
        case AIProvider.OPENAI:
        case AIProvider.AZURE_OPENAI:
          response = await fetch(
            endpoint.replace(
              "/chat/completions",
              "/models"
            ),
            {
              method: "GET",
              headers: {
                Authorization: `Bearer ${request.model.apiKey}`,
              },
              cache: "no-store",
            }
          );
          break;

        case AIProvider.GEMINI:
          response = await fetch(
            `${endpoint}?key=${encodeURIComponent(
              request.model.apiKey
            )}`,
            {
              method: "GET",
              cache: "no-store",
            }
          );
          break;

        case AIProvider.CLAUDE:
          response = await fetch(
            "https://api.anthropic.com/v1/models",
            {
              method: "GET",
              headers: {
                "x-api-key":
                  request.model.apiKey,
                "anthropic-version":
                  "2023-06-01",
              },
              cache: "no-store",
            }
          );
          break;

        case AIProvider.LOCAL:
          response = await fetch(
            endpoint,
            {
              method: "GET",
              cache: "no-store",
            }
          );
          break;

        default:
          throw new Error(
            "Unsupported AI provider."
          );
      }

      return {
        provider: request.model.provider,
        model: request.model.model,
        available: response.ok,
        latency: Date.now() - startedAt,
        checkedAt: new Date(),
      };
    } catch {
      return {
        provider: request.model.provider,
        model: request.model.model,
        available: false,
        latency: Date.now() - startedAt,
        checkedAt: new Date(),
      };
    }
  }

  private async generateOpenAICompatible(
    request: AIRequest,
    endpoint: string
  ): Promise<Response> {
    return fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type":
          "application/json",
        Authorization: `Bearer ${request.model.apiKey}`,
      },
      body: JSON.stringify({
        model: request.model.model,
        messages: [
          {
            role: "system",
            content:
              "You are RideGrid Enterprise AI. Follow RideGrid business rules and security policies.",
          },
          {
            role: "user",
            content: request.prompt,
          },
        ],
        temperature:
          request.temperature ??
          request.model.temperature,
        max_tokens:
          request.maxTokens ??
          request.model.maxTokens,
      }),
      cache: "no-store",
    });
  }

  private async generateGemini(
    request: AIRequest,
    endpoint: string
  ): Promise<Response> {
    return fetch(
      `${endpoint}?key=${encodeURIComponent(
        request.model.apiKey ?? ""
      )}`,
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: request.prompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature:
              request.temperature ??
              request.model.temperature,
            maxOutputTokens:
              request.maxTokens ??
              request.model.maxTokens,
          },
        }),
        cache: "no-store",
      }
    );
  }

  private async generateClaude(
    request: AIRequest,
    endpoint: string
  ): Promise<Response> {
    return fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type":
          "application/json",
        "x-api-key":
          request.model.apiKey ?? "",
        "anthropic-version":
          "2023-06-01",
      },
      body: JSON.stringify({
        model: request.model.model,
        max_tokens:
          request.maxTokens ??
          request.model.maxTokens,
        temperature:
          request.temperature ??
          request.model.temperature,
        messages: [
          {
            role: "user",
            content: request.prompt,
          },
        ],
      }),
      cache: "no-store",
    });
  }

  private async generateLocal(
    request: AIRequest,
    endpoint: string
  ): Promise<Response> {
    return fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type":
          "application/json",
      },
      body: JSON.stringify({
        model: request.model.model,
        prompt: request.prompt,
        temperature:
          request.temperature ??
          request.model.temperature,
        max_tokens:
          request.maxTokens ??
          request.model.maxTokens,
      }),
      cache: "no-store",
    });
  }

  private extractContent(
    provider: AIProvider,
    payload: any
  ): string {
    switch (provider) {
      case AIProvider.OPENAI:
      case AIProvider.AZURE_OPENAI:
        return (
          payload?.choices?.[0]?.message
            ?.content ?? ""
        );

      case AIProvider.GEMINI:
        return (
          payload?.candidates?.[0]
            ?.content?.parts?.[0]?.text ?? ""
        );

      case AIProvider.CLAUDE:
        return (
          payload?.content?.[0]?.text ?? ""
        );

      case AIProvider.LOCAL:
        return (
          payload?.response ??
          payload?.content ??
          payload?.message ??
          ""
        );

      default:
        return "";
    }
  }

  private extractTokenUsage(
    provider: AIProvider,
    payload: any,
    prompt: string
  ): number {
    if (
      provider === AIProvider.OPENAI ||
      provider === AIProvider.AZURE_OPENAI
    ) {
      return Number(
        payload?.usage?.total_tokens ??
          0
      );
    }

    if (provider === AIProvider.GEMINI) {
      return Number(
        payload?.usageMetadata
          ?.totalTokenCount ?? 0
      );
    }

    if (provider === AIProvider.CLAUDE) {
      return (
        Number(
          payload?.usage?.input_tokens ?? 0
        ) +
        Number(
          payload?.usage?.output_tokens ?? 0
        )
      );
    }

    return Math.ceil(prompt.length / 4);
  }
}

export const aiProviderAdapter =
  new AIProviderAdapterService();