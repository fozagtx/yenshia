// eslint-disable-next-line @typescript-eslint/no-var-requires
const withPWA = require("next-pwa")({
  dest: "public",
  disable: true,
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: config => {
    config.resolve.fallback = { fs: false, net: false, tls: false };
    return config;
  },
};

module.exports = withPWA(nextConfig);
