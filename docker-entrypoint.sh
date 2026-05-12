#!/bin/sh

# Attendre que la base de données soit prête
echo "⏳ Attente de la base de données..."
# On pourrait utiliser un outil comme 'wait-for-it' ou une boucle simple
# Ici on va simplement tenter la migration avec Prisma

echo "🚀 Synchronisation de la base de données..."
npx prisma db push --accept-data-loss --skip-generate

echo "✨ Lancement de l'application..."
exec npm start
