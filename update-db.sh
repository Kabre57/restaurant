#!/bin/bash

# Script de mise à jour automatisé pour le POS Restaurant (Environnement Docker)
# À exécuter sur le serveur après chaque mise à jour du code (git pull)

echo "🚀 Démarrage de la mise à jour..."

# 1. Chargement des variables d'environnement (si besoin)
if [ -f .env ]; then
  export $(cat .env | xargs)
fi

# 2. Re-build de l'image Docker et redémarrage des conteneurs
echo "🏗️ Re-build et redémarrage avec Docker Compose..."
docker compose up -d --build

# 3. Synchronisation du schéma Prisma dans le conteneur (Migration)
echo "💾 Application des migrations Prisma dans le conteneur..."
docker compose exec -T app npx prisma db push --schema ./prisma/schema --accept-data-loss

echo "✅ Mise à jour terminée avec succès !"
