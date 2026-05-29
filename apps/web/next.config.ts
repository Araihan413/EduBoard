import type { NextConfig } from "next";
import * as dotenv from "dotenv";
import * as path from "path";

// Load environment variables from the workspace root (.env)
dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });

const nextConfig: NextConfig = {
  devIndicators: {
    position: "bottom-right",
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'api.dicebear.com',
        port: '',
        pathname: '/7.x/**',
      },
    ],
  },
};

export default nextConfig;

