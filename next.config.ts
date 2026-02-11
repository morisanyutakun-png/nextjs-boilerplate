import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /** 外部画像ホストを許可（テナント写真用） */
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },
};

export default nextConfig;
