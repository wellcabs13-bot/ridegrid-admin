/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep production QA separate from an independently running development server.
  distDir: process.env.RIDEGRID_BUILD_DIR || ".next",
  async redirects() {
    const aliases = require("./data/seo/phase1-aliases.json");
    // Short legal URLs commonly typed or used in store listings.
    const legal = { "/privacy": "/privacy-policy", "/terms": "/terms-and-conditions" };
    return Object.entries({ ...aliases, ...legal }).map(([source, destination]) => ({ source, destination, permanent: true }));
  },
  poweredByHeader: false,
  // Public pages serve static images through the optimiser in modern formats.
  images: { formats: ["image/avif", "image/webp"] },
  // The homepage picks real photos over placeholders with fs checks at request time.
  outputFileTracingIncludes: { "/": ["./public/images/homepage/**/*"] },
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
