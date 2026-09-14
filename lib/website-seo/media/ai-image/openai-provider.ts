import { ImageEngineError } from "./types";
import type { ImageProvider, ImageProviderInput, ImageProviderOutput } from "./provider";

export class OpenAIImageProvider implements ImageProvider {
  constructor(private readonly apiKey: string, private readonly request: typeof fetch = fetch) {}
  async generate(input: ImageProviderInput): Promise<ImageProviderOutput> {
    if (!this.apiKey) throw new ImageEngineError("Set OPENAI_API_KEY on the image worker.");
    let response: Response;
    try {
      response = await this.request("https://api.openai.com/v1/images/generations", {
        method: "POST", headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ ...input, n: 1, output_format: "png" }), signal: AbortSignal.timeout(240_000),
      });
    } catch { throw new ImageEngineError("Image request timed out or could not connect. Check provider usage before manually retrying; it may have been billed."); }
    if (!response.ok) {
      // Never persist raw provider responses (which may include request data).
      const message = response.status === 401 || response.status === 403 ? "Check OPENAI_API_KEY and image-model access."
        : response.status === 429 ? "OpenAI quota or rate limit reached. Check billing and retry later."
        : response.status === 400 ? "OpenAI rejected the prompt or model settings. Review them before regenerating."
        : "OpenAI image generation failed. Check provider usage before retrying.";
      throw new ImageEngineError(message);
    }
    // Bound response memory even when content-length is absent.
    const reader = response.body?.getReader();
    if (!reader) throw new ImageEngineError("OpenAI returned an empty image response.");
    const chunks: Uint8Array[] = []; let length = 0;
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      length += value.length;
      if (length > 32 * 1024 * 1024) { await reader.cancel(); throw new ImageEngineError("Generated image response exceeds the storage limit."); }
      chunks.push(value);
    }
    let encoded: unknown;
    try { encoded = JSON.parse(Buffer.concat(chunks).toString("utf8"))?.data?.[0]?.b64_json; }
    catch { throw new ImageEngineError("OpenAI returned an invalid image response."); }
    if (typeof encoded !== "string" || !encoded.length || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) throw new ImageEngineError("OpenAI did not return a PNG image.");
    const content = Buffer.from(encoded, "base64");
    if (content.length < 33 || !content.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) || content.toString("ascii", 12, 16) !== "IHDR") throw new ImageEngineError("Generated image is not a valid PNG.");
    const width = content.readUInt32BE(16), height = content.readUInt32BE(20);
    if (`${width}x${height}` !== input.size) throw new ImageEngineError("Generated image dimensions do not match the requested size.");
    return { content, width, height, mimeType: "image/png" };
  }
}
