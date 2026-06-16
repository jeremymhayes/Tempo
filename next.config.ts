import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.68.64"],
  serverExternalPackages: ["stockfish"],
};

export default nextConfig;
