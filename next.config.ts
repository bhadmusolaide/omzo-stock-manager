import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable turbopack explicitly to avoid conflicts
  turbopack: {},
  // Additional configuration to improve asset loading
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
};

export default nextConfig;