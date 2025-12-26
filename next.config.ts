import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Empty turbopack config to silence warnings
  turbopack: {},

  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      },
    ],
  },
};

export default nextConfig;
