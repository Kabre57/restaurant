import type { NextConfig } from "next";

const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
});

const nextConfig: NextConfig = {
  // Turbopack désactivé : Next.js 16 avec Turbopack déclenche un crash
  // "OS file watch limit reached" sur Linux (limite inotify). 
  // Pour l'activer, exécuter d'abord :
  //   echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf && sudo sysctl -p
  // turbopack: {},
};

export default withPWA(nextConfig);
