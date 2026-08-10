import type { NextConfig } from "next";

// Static export for GitHub Pages. If deploying to <user>.github.io/<repo>,
// set NEXT_PUBLIC_BASE_PATH="/<repo>" as a build-time env var (see .github/workflows/deploy.yml).
// Leave it unset if deploying to a custom domain or a <user>.github.io root repo.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true }, // GitHub Pages can't run Next's image optimizer
  basePath,
  assetPrefix: basePath,
  trailingSlash: true, // gives every route its own index.html, which is what static hosts expect
};

export default nextConfig;
