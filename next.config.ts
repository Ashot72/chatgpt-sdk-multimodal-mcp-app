import type { NextConfig } from "next";
import { baseURL } from "./baseUrl";

const nextConfig: NextConfig = {
  assetPrefix: baseURL,
  devIndicators: false, // hides the dev badge/indicator
};

export default nextConfig;
