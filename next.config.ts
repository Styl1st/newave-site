import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Les visuels des marques sont hebergees chez elles (Shopify, Cloudinary...).
    // On autorise le https en general : les URL viennent de la base, que tu controles.
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },

  /*
   * Les gabarits d'emails (emails/b/*.html) sont importés comme du
   * texte, pour qu'il n'en existe qu'un exemplaire : celui qu'on ouvre
   * dans le navigateur pour le relire est celui qui part. Voir
   * src/lib/emails.ts.
   *
   * Cette règle vaut pour webpack, c'est-à-dire `next dev` et
   * `next build` tels qu'ils sont lancés aujourd'hui. Le jour où l'on
   * passe à `next dev --turbopack`, il faudra son équivalent dans
   * `turbopack.rules`.
   */
  webpack(config) {
    config.module.rules.push({ test: /\.html$/, type: "asset/source" });
    return config;
  },
};

export default nextConfig;
