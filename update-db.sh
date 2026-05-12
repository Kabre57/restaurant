#!/bin/bash

# Script de mise à jour automatisé pour le POS Restaurant
# À exécuter sur le VPS après chaque mise à jour du code (git pull)

echo "🚀 Démarrage de la mise à jour de la base de données..."

# 1. Chargement des variables d'environnement (si besoin)
if [ -f .env ]; then
  export $(cat .env | xargs)
fi

# 2. Génération du client Prisma (Types)
echo "📦 Génération du client Prisma..."
npx prisma generate

# 3. Synchronisation du schéma (Migration)
echo "💾 Synchronisation avec la base de données..."
npx prisma db push --accept-data-loss

# 4. Re-build de l'application Next.js
echo "🏗️ Re-build de l'application..."
npm run build

# 5. Redémarrage du processus (PM2)
echo "♻️ Redémarrage du serveur..."
pm2 restart pos-restaurant || pm2 start npm --name "pos-restaurant" -- run start

echo "✅ Mise à jour terminée avec succès !"
