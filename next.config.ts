import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  async redirects() {
    return [
      // WooCommerce shop page
      {
        source: "/shop",
        destination: "/product",
        permanent: true,
      },
      {
        source: "/shop/:path*",
        destination: "/product/:path*",
        permanent: true,
      },
      // WooCommerce category URLs
      {
        source: "/product-category/:slug",
        destination: "/product?category=:slug",
        permanent: true,
      },
      {
        source: "/product-category/:slug/",
        destination: "/product?category=:slug",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
