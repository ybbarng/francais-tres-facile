import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Docker 이미지(runner 타깃)에 .next/standalone 만 담아 작게 만든다.
  output: "standalone",
};

export default nextConfig;
