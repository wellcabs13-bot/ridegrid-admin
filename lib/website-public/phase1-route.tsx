import { notFound } from "next/navigation";
import EntityPage from "@/components/website-public/EntityPage";
import { phase1PublicPage } from "./phase1";
import { resolvePhase1Chrome } from "./repository";
import { publicMetadata } from "./seo";
type Props = { params: Promise<{ slug: string; city?: string }> };
async function resolve(family: string, props: Props) {
  const { slug, city } = await props.params;
  const page = phase1PublicPage(`/${family}/${slug}${city ? `/${city}` : ""}`);
  if (!page) notFound();
  return page;
}
export async function phase1Metadata(family: string, props: Props) { return publicMetadata((await resolve(family, props)).seo); }
export async function Phase1Route({ family, ...props }: Props & { family: string }) {
  return <EntityPage page={await resolve(family, props)} chrome={await resolvePhase1Chrome()} />;
}
