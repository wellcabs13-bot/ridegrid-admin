import type {
  ResolvedWebsitePagePath,
  WebsitePageTemplate,
} from "./types";

function normalizePath(path: string): string {
  const normalized = `/${path}`
    .replace(/\/+/g, "/")
    .replace(/\/$/, "");

  return normalized || "/";
}

export function resolveWebsitePagePath(
  template: Pick<
    WebsitePageTemplate,
    "key" | "entityType" | "pathPattern"
  >,
  entitySlug: string
): ResolvedWebsitePagePath {
  const slug = entitySlug.trim();

  if (!slug) {
    throw new Error("Entity slug is required.");
  }

  if (!template.pathPattern.includes("{slug}")) {
    throw new Error(
      'Template path pattern must contain "{slug}".'
    );
  }

  const pathname = normalizePath(
    template.pathPattern.replace(
      "{slug}",
      encodeURIComponent(slug)
    )
  );

  return {
    pathname,
    templateKey: template.key,
    entityType: template.entityType,
    entitySlug: slug,
  };
}
