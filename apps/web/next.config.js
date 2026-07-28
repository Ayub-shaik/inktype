/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@inktype/core"],
  experimental: {
    externalDir: true,
  },
};

module.exports = nextConfig;
