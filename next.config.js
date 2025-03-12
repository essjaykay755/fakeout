/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      "platform.theverge.com",
      "i2.cdn.turner.com",
      "via.placeholder.com",
    ],
  },
  // Enable experimental features if needed
  experimental: {
    // Add experimental features here if needed
  },
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
