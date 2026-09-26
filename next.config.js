/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep production QA separate from an independently running development server.
  distDir: process.env.RIDEGRID_BUILD_DIR || ".next",
  async redirects() {
    const aliases = require("./data/seo/phase1-aliases.json");
    return Object.entries(aliases).map(([source, destination]) => ({ source, destination, permanent: true }));
  },
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
