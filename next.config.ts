import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "img.clerk.com",
      },
    ],    
  },
  allowedDevOrigins:[
    "yolande-sistroid-jenee.ngrok-free.dev",
    "lasting-internal-accidents-rush.trycloudflare.com"
  ]
};

export default nextConfig;
