import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  images: {
    // The app has no optimized images. Keep Sharp out of the request path until
    // Next.js 15 accepts a patched Sharp release without a breaking upgrade.
    unoptimized: true,
  },
  outputFileTracingRoot: __dirname,
};

export default nextConfig;
