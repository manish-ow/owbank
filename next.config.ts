import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_THEME: process.env.THEME || 'Fusion',
  },
};

export default nextConfig;
