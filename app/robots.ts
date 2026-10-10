import type { MetadataRoute } from "next";

function siteUrl() {
  return "https://www.wellcabs.com";
}

export default function robots(): MetadataRoute.Robots {
  const site = siteUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/website-seo",
          "/api/",
          "/login",
          "/settings",
          "/security",
          "/automation",
          "/analytics",
          "/finance",
          "/reports",
          "/corporate",
          "/vendors",
          "/drivers",
          "/notifications",
        ],
      },
    ],
    sitemap: `${site}/sitemap.xml`,
    host: site,
  };
}