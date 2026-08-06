import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Les visuels des marques sont hebergees chez elles (Shopify, Cloudinary...).
    // On autorise le https en general : les URL viennent de la base, que tu controles.
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
};

export default nextConfig;
