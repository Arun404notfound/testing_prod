import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  experimental: {
    serverActions: {
      bodySizeLimit: "3mb",
      allowedOrigins: ["*.ngrok-free.app", "*.ngrok-free.dev", "*.ngrok.io"],
    },
  },
  allowedDevOrigins: ["excretory-drank-powwow.ngrok-free.dev"],
};

export default nextConfig;
