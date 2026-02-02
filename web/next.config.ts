import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow loading 3D models and images from Supabase storage
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
    ],
  },
  // Transpile Three.js related packages
  transpilePackages: ["three"],
};

export default nextConfig;
