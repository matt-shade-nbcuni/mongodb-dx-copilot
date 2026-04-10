/** @type {import('next').NextConfig} */
const nextConfig = {
  // Bundling mongodb with webpack can break TLS/OpenSSL at runtime (Atlas
  // "tlsv1 alert internal error"). Keep the driver external on the server.
  experimental: {
    serverComponentsExternalPackages: ["mongodb", "bson", "@netlify/blobs"],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push("mongodb", "bson", "@netlify/blobs");
    }
    return config;
  },
};

export default nextConfig;
