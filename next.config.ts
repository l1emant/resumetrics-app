import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    '@google/genai',
    'groq-sdk',
    'better-sqlite3',
  ],
};

export default nextConfig;
