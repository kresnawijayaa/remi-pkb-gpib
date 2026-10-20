import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["pdfkit", "pg"],
  outputFileTracingIncludes: {
    "/share/[token]/pdf": ["./node_modules/pdfkit/js/**/*"],
    "/aturan/pdf": ["./node_modules/pdfkit/js/**/*"],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "4mb",
    },
  },
};

export default nextConfig;
