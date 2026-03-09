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
      // WooCommerce default product URLs
      {
        source: "/product/:slug",
        destination: "/products/:slug",
        permanent: true,
      },
      {
        source: "/product/:slug/",
        destination: "/products/:slug",
        permanent: true,
      },
      // WooCommerce shop page
      {
        source: "/shop",
        destination: "/products",
        permanent: true,
      },
      {
        source: "/shop/:path*",
        destination: "/products/:path*",
        permanent: true,
      },
      // WooCommerce category URLs
      {
        source: "/product-category/:slug",
        destination: "/products?category=:slug",
        permanent: true,
      },
      {
        source: "/product-category/:slug/",
        destination: "/products?category=:slug",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
