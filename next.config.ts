import type { NextConfig } from "next";
import createMDX from "@next/mdx";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

initOpenNextCloudflareForDev();

const withMDX = createMDX({});

const nextConfig: NextConfig = {
  pageExtensions: ["js", "jsx", "ts", "tsx", "md", "mdx"],
  reactStrictMode: true,
  allowedDevOrigins: ['127.0.0.1']
};

export default withMDX(nextConfig);
