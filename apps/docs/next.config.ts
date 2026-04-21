import type { NextConfig } from "next";
import { createMDX } from "fumadocs-mdx/next";

const nextConfig: NextConfig = {

  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: "/docs",
        destination: "/docs/introduction",
        permanent: false,
      },
    ];
  },
};

const withMDX = createMDX();

export default withMDX(nextConfig);
