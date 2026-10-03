import { existsSync } from "node:fs";
import path from "node:path";

// Homepage imagery lives in public/images/homepage/<folder>/. Drop a real photo next to
// its placeholder using the expected name below (.webp, .jpg, .jpeg, .avif or .png) and
// it is used automatically; otherwise the bundled light placeholder is shown.
const ROOT = path.join(process.cwd(), "public", "images", "homepage");
const EXTENSIONS = ["webp", "jpg", "jpeg", "avif", "png"];

export const HOMEPAGE_IMAGE_SLOTS = {
  hero: { folder: "hero", name: "hero-main", placeholder: "hero-main.placeholder.svg", alt: "" },
  outstation: { folder: "services", name: "outstation", placeholder: "outstation.placeholder.svg", alt: "" },
  local: { folder: "services", name: "local", placeholder: "local.placeholder.svg", alt: "" },
  airport: { folder: "services", name: "airport", placeholder: "airport.placeholder.svg", alt: "" },
  corporateService: { folder: "services", name: "corporate", placeholder: "corporate.placeholder.svg", alt: "" },
  corporate: { folder: "corporate", name: "corporate-main", placeholder: "corporate-main.placeholder.svg", alt: "" },
  routeDefault: { folder: "routes", name: "route-default", placeholder: "route-default.placeholder.svg", alt: "" },
} as const;

export type HomepageImageSlot = keyof typeof HOMEPAGE_IMAGE_SLOTS;
export type HomepageImage = { src: string; isPlaceholder: boolean };

function resolve(folder: string, name: string, placeholder: string): HomepageImage {
  for (const ext of EXTENSIONS) {
    if (existsSync(path.join(ROOT, folder, `${name}.${ext}`))) return { src: `/images/homepage/${folder}/${name}.${ext}`, isPlaceholder: false };
  }
  return { src: `/images/homepage/${folder}/${placeholder}`, isPlaceholder: true };
}

export function homepageImage(slot: HomepageImageSlot): HomepageImage {
  const s = HOMEPAGE_IMAGE_SLOTS[slot];
  return resolve(s.folder, s.name, s.placeholder);
}

// Per-destination route photo: routes/<destination-slug>.<ext>, e.g. routes/mumbai.jpg.
// Returns null when there is none, so the caller can fall back to the generic card image.
export function homepageRouteImage(destination: string): HomepageImage | null {
  const slug = destination.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  if (!slug) return null;
  const found = resolve("routes", slug, "");
  return found.isPlaceholder ? null : found;
}
