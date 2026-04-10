/** @type {import('next').NextConfig} */
const nextConfig = {
  // Bundling mongodb with webpack can break TLS/OpenSSL at runtime (Atlas
  // "tlsv1 alert internal error"). Keep the driver external on the server.
  experimental: {
    serverComponentsExternalPackages: ["mongodb", "bson"],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push("mongodb", "bson");
    }
    return config;
  },
};

export default nextConfig;
