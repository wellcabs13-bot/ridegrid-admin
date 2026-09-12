import { notFound } from "next/navigation";
import EntityPage from "@/components/website-public/EntityPage";
import { entityPath } from "./page-model";
import { resolvePublicChrome, resolvePublicPage } from "./repository";
import { publicMetadata } from "./seo";
export type EntityRouteProps = { params: Promise<{ slug: string }> };
export async function entityRouteMetadata(type: string, props: EntityRouteProps) {
  const path = entityPath(type, (await props.params).slug);
  const page = path ? await resolvePublicPage(path) : null;
  if (!page || page.entityType !== type) notFound();
  return publicMetadata(page.seo);
}
export async function EntityRoute({ type, params }: EntityRouteProps & { type: string }) {
  const path = entityPath(type, (await params).slug);
  const page = path ? await resolvePublicPage(path) : null;
  if (!page || page.entityType !== type) notFound();
  return <EntityPage page={page} chrome={await resolvePublicChrome("GENERATED_PAGES")} />;
}
