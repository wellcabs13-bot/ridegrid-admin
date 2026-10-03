import { ImageEngineError, IMAGE_SLOTS, type ImagePreset, type ImageSlot, type ImageTarget } from "./types";

const negativePrompt = "No text, logos, watermarks, invented landmarks, unsafe driving, distorted vehicles or identifiable people. Do not imply an actual owned fleet or depict a real customer.";
export const IMAGE_PRESETS: ImagePreset[] = [
  { id: "premium-corporate", name: "Premium Corporate", tone: "Trustworthy and understated", hints: "Professional ground transport, clean architecture, balanced light", useCase: "Business mobility and homepage", size: "1536x1024", negativePrompt },
  { id: "travel-modern", name: "Travel Modern", tone: "Confident and welcoming", hints: "Natural travel photography, spacious compositions, inviting roads", useCase: "Cities and leisure travel", size: "1536x1024", negativePrompt },
  { id: "airport-transfer", name: "Airport Transfer", tone: "Calm and dependable", hints: "Modern airport curbside, luggage, comfortable transfer vehicle", useCase: "Airport transfer pages", size: "1536x1024", negativePrompt },
  { id: "local-mobility", name: "Local Mobility", tone: "Approachable and contemporary", hints: "Everyday urban journeys and accessible commercial cab photography", useCase: "Local services and areas", size: "1024x1024", negativePrompt },
  { id: "route-landing", name: "Route Landing", tone: "Premium and exploratory", hints: "Road journey between the named places, regionally plausible scenery", useCase: "Intercity routes", size: "1536x1024", negativePrompt },
  { id: "seo-guide", name: "SEO Guide Banner", tone: "Clear and informative", hints: "Editorial travel composition, useful setting, generous negative space", useCase: "Supporting travel content and social previews", size: "1536x1024", negativePrompt },
];
export function resolvePreset(id?: string, overrides: ImagePreset[] = [], family?: string): ImagePreset {
  const key = id || ({ ROUTE: "route-landing", AIRPORT: "airport-transfer", CITY: "travel-modern", AREA: "local-mobility", SERVICE: "local-mobility" }[family || ""] ?? "premium-corporate");
  const preset = [...overrides, ...IMAGE_PRESETS].find(p => p.id === key);
  if (!preset) throw new ImageEngineError("Choose an existing image preset.");
  return { ...preset };
}
export function imageSlot(value: unknown): ImageSlot {
  const slot = IMAGE_SLOTS.find(s => s === value);
  if (!slot) throw new ImageEngineError("Choose a supported image slot.");
  return slot;
}
export function buildImagePrompt(target: ImageTarget, slot: ImageSlot, preset: ImagePreset) {
  const composition = slot === "ogImage" ? "Social preview composition with central subject and crop-safe margins; no baked-in text."
    : slot === "heroImage" ? "Wide hero banner, subject to the right, uncluttered space on the left for page headings."
    : slot === "cardImage" ? "Simple card thumbnail with one clear focal subject, legible at small sizes."
    : "Supporting commercial website photograph with a balanced, crop-safe composition.";
  return ["Create a premium RideGrid commercial website image. Modern, trustworthy transport photography; subtle red accents with black and white neutrals.",
    `Page family: ${target.family}. Subject: ${target.title}.`, target.context ? `Verified editorial context: ${target.context}.` : "",
    target.keywords.length ? `Relevant topics: ${target.keywords.join(", ")}.` : "", `Image slot: ${slot}.`, composition,
    `Art direction: ${preset.tone}. ${preset.hints}.`, preset.negativePrompt].filter(Boolean).join("\n");
}
