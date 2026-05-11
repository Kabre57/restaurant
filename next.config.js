const createPWA = require('next-pwa');

const pwaOptions = {
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
};

const nextConfig = {
  // Turbopack désactivé : Next.js 16 avec Turbopack déclenche un crash
  // "OS file watch limit reached" sur Linux (limite inotify).
  // Pour l'activer, exécuter d'abord :
  //   echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf && sudo sysctl -p
  // turbopack: {},
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
};

const withPWA = createPWA(pwaOptions);

module.exports = typeof withPWA === 'function'
  ? withPWA(nextConfig)
  : createPWA({ ...nextConfig, pwa: pwaOptions });
