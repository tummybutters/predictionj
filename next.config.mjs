/** @type {import('next').NextConfig} */
const nextConfig = {
  // Use separate dist dirs for dev vs build to avoid "stale chunk" issues when
  // multiple Next commands run in parallel (or when `.next` is cleaned).
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
