/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: false,
  experimental: {
    runtime: 'edge',
    // Enable below when using React Server Components
    // serverComponents: true,
    // concurrentFeatures: true,
  },
  webpack(config) {
    config.module.rules.push({
      test: /\.svg$/i,
      issuer: /\.[jt]sx?$/,
      use: ['@svgr/webpack'],
    });

    return config;
  },
  images: {
    unoptimized: true,
    domains: ['raw.githubusercontent.com', 'app.osmosis.zone', 's3.amazonaws.com'],
  },
};

module.exports = nextConfig;
