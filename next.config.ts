import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    // Storage adapter serves signed URLs; allow S3/R2/MinIO hosts via env in real deploys.
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  experimental: {
    // Server Actions are enabled by default in Next 15; keep body size modest for photos.
    serverActions: { bodySizeLimit: "8mb" },
  },
};

export default withNextIntl(nextConfig);
