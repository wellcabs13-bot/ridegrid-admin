import { normalizeSeoPath } from "../seo/canonical";
import type {
  LegacyMigrationEntry,
  LegacyRuntimeAction,
} from "./types";

const RESERVED = [
  "/api",
  "/admin",
  "/website-seo",
  "/_next",
  "/login",
  "/marketplace",
  "/robots.txt",
  "/sitemap.xml",
];

export function normalizeLegacyPath(value: string) {
  const raw = String(value || "").trim();

  if (
    !raw.startsWith("/") ||
    raw.startsWith("//") ||
    /[?#]/.test(raw)
  ) {
    return null;
  }

  return normalizeSeoPath(raw);
}

export function isReservedLegacySource(path: string) {
  return RESERVED.some(
    (reserved) =>
      path === reserved ||
      path.startsWith(`${reserved}/`),
  );
}

export function validateLegacyEntries(
  entries: LegacyMigrationEntry[],
) {
  const errors: string[] = [];
  const seen = new Set<string>();
  const activeRedirects = new Map<string, string>();

  for (const entry of entries) {
    const source = normalizeLegacyPath(entry.sourcePath);

    if (!source) {
      errors.push(`${entry.label}: invalid source path.`);
      continue;
    }

    if (isReservedLegacySource(source)) {
      errors.push(`${entry.label}: reserved source path.`);
    }

    if (seen.has(source)) {
      errors.push(`${entry.label}: duplicate source path.`);
    }

    seen.add(source);

    if (entry.strategy === "REDIRECT") {
      const target = entry.targetPath
        ? normalizeLegacyPath(entry.targetPath)
        : null;

      if (!target) {
        errors.push(`${entry.label}: redirect target required.`);
        continue;
      }

      if (target === source) {
        errors.push(`${entry.label}: redirect to self.`);
      }

      if (entry.status === "ACTIVE") {
        activeRedirects.set(source, target);
      }
    }

    if (
      entry.strategy === "GUIDE" &&
      entry.status === "ACTIVE"
    ) {
      errors.push(
        `${entry.label}: guide cannot activate before its public guide page exists.`,
      );
    }
  }

  for (const [source, target] of activeRedirects) {
    if (activeRedirects.has(target)) {
      errors.push(
        `${source}: redirect chain is not allowed.`,
      );
    }

    let cursor = target;
    const visited = new Set([source]);

    while (activeRedirects.has(cursor)) {
      if (visited.has(cursor)) {
        errors.push(`${source}: redirect loop detected.`);
        break;
      }

      visited.add(cursor);
      cursor = activeRedirects.get(cursor)!;
    }
  }

  return errors;
}

export function resolveLegacyActionFromEntries(
  entries: LegacyMigrationEntry[],
  pathname: string,
): LegacyRuntimeAction | null {
  const source = normalizeLegacyPath(pathname);

  if (!source) return null;

  const entry = entries.find(
    (item) =>
      item.status === "ACTIVE" &&
      normalizeLegacyPath(item.sourcePath) === source,
  );

  if (!entry) return null;

  if (
    entry.strategy === "REDIRECT" &&
    entry.targetPath
  ) {
    const target = normalizeLegacyPath(entry.targetPath);

    if (!target || target === source) return null;

    return {
      kind: "REDIRECT",
      from: source,
      to: target,
      status: 308,
    };
  }

  if (entry.strategy === "RETIRE") {
    return {
      kind: "RETIRE",
      path: source,
      status: 410,
    };
  }

  return null;
}