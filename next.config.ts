import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

/**
 * Configuration PWA — @ducanh2912/next-pwa
 *
 * Remplace next-pwa@5.6 (abandonné, incompatible Next.js 16).
 * Le Service Worker est désactivé en développement pour ne pas
 * interférer avec le Hot Module Replacement (HMR).
 */
const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  // skipWaiting : le nouveau SW prend la main immédiatement
  workboxOptions: {
    skipWaiting: true,
    clientsClaim: true,
    // Cache statique (JS/CSS/images) — StaleWhileRevalidate
    runtimeCaching: [
      {
        // Ressources statiques Next.js (_next/static)
        urlPattern: /^\/_next\/static\/.*/i,
        handler: "CacheFirst",
        options: {
          cacheName: "next-static",
          expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
        },
        method: "GET",
      },
      {
        // Images produits et assets
        urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i,
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "images",
          expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 7 },
        },
        method: "GET",
      },
      {
        // Routes Next.js (pages HTML) — NetworkFirst pour offline fallback
        urlPattern: /^https?:\/\/[^/]+\/(?!api\/).*/,
        handler: "NetworkFirst",
        options: {
          cacheName: "pages",
          expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 },
          networkTimeoutSeconds: 5,
        },
        method: "GET",
      },
    ],
  },
});

const nextConfig: NextConfig = {
  // Turbopack désactivé : Next.js 16 avec Turbopack déclenche un crash
  // "OS file watch limit reached" sur Linux (limite inotify).
  // Pour l'activer, exécuter d'abord :
  //   echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf && sudo sysctl -p
  // turbopack: {},
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "4mb",
    },
  },
};

export default withPWA(nextConfig);

