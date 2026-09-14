import Image from "next/image";
import type { PublicMedia } from "@/lib/website-public/types";
export default function ManagedImage({ media, className, cover = false }: { media?: PublicMedia; className?: string; cover?: boolean }) {
  if (!media) return null;
  return <Image src={media.src} alt={media.alt} width={1536} height={1024} unoptimized sizes="(max-width: 768px) 100vw, 50vw" className={className} style={{ width: "100%", height: cover ? "100%" : "auto", maxHeight: cover ? "100%" : 360, objectFit: "cover", borderRadius: cover ? 0 : 16 }} />;
}
