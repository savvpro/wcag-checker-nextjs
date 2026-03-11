import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  serverExternalPackages: ["@sparticuz/chromium", "playwright-core"],
  outputFileTracingIncludes: {
    "/api/scan": [
      "./node_modules/@sparticuz/chromium/bin/**",
      "./node_modules/@sparticuz/chromium/build/**",
      "./node_modules/playwright-core/**",
    ],
  },
};

export default nextConfig;
