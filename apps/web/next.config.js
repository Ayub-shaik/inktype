/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@inktype/core", "@inktype/diagram"],
  experimental: {
    externalDir: true,
  },
  async rewrites() {
    const api = process.env.INKTYPE_API_ORIGIN || "http://127.0.0.1:3041";
    return [
      { source: "/v1/:path*", destination: `${api}/v1/:path*` },
      { source: "/auth/:path*", destination: `${api}/auth/:path*` },
      { source: "/health", destination: `${api}/health` },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'self'; img-src 'self' data: blob: https://*.dodopayments.com; style-src 'self' 'unsafe-inline' https://*.dodopayments.com; script-src 'self' 'unsafe-inline' https://*.dodopayments.com https://cdn.jsdelivr.net; connect-src 'self' https://*.dodopayments.com; frame-src 'self' https://*.dodopayments.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
