import { ImageEngineError, type ImageQuality, type ImageSize } from "./types";
import { OpenAIImageProvider } from "./openai-provider";
export interface ImageProviderInput { prompt: string; model: string; size: ImageSize; quality: ImageQuality }
export interface ImageProviderOutput { content: Buffer; width: number; height: number; mimeType: "image/png" }
export interface ImageProvider { generate(input: ImageProviderInput): Promise<ImageProviderOutput> }
export function imageEnvironment(env: NodeJS.ProcessEnv = process.env) {
  const provider = env.AI_IMAGE_PROVIDER?.trim().toLowerCase() || "openai";
  const model = env.AI_IMAGE_MODEL?.trim() || "gpt-image-1";
  const size = env.AI_IMAGE_DEFAULT_SIZE?.trim() || "1536x1024";
  const quality = env.AI_IMAGE_DEFAULT_QUALITY?.trim() || "high";
  const error = provider !== "openai" ? "Set AI_IMAGE_PROVIDER=openai. This provider is not supported."
    : !env.OPENAI_API_KEY?.trim() || env.OPENAI_API_KEY === "your_key_here" ? "Set OPENAI_API_KEY on the server and image worker to enable generation."
    : !/^gpt-image-[a-z0-9.-]+$/.test(model) ? "AI_IMAGE_MODEL must be a supported GPT image model, such as gpt-image-1."
    : !["1536x1024", "1024x1024", "1024x1536"].includes(size) ? "AI_IMAGE_DEFAULT_SIZE must be 1536x1024, 1024x1024 or 1024x1536."
    : !["low", "medium", "high", "auto"].includes(quality) ? "AI_IMAGE_DEFAULT_QUALITY must be low, medium, high or auto." : null;
  return { provider, model, size: size as ImageSize, quality: quality as ImageQuality, error, configured: !error };
}
export function imageProvider(): ImageProvider {
  const config = imageEnvironment();
  if (config.error) throw new ImageEngineError(config.error);
  return new OpenAIImageProvider(process.env.OPENAI_API_KEY!.trim());
}
