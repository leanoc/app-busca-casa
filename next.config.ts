import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.zonaprop.com.ar" },
      { protocol: "https", hostname: "**.argenprop.com" },
      { protocol: "https", hostname: "**.remax.com.ar" },
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "cdn.remax.com.ar" },
      { protocol: "https", hostname: "imagenes.zonaprop.com.ar" },
      { protocol: "https", hostname: "**.mlstatic.com" },
    ],
  },
  experimental: {
    serverActions: {
      allowedOrigins: ["localhost:3000"],
    },
  },
};

export default nextConfig;
