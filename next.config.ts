import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Spotify only allows 127.0.0.1 (not localhost) as a local redirect host.
  allowedDevOrigins: ["127.0.0.1"],
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
