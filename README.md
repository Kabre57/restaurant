# Gourmet POS 🍽️

Un système de Point de Vente (POS) moderne, robuste et multi-établissements conçu spécifiquement pour le secteur de la restauration.

## 🚀 Fonctionnalités Clés

- **Interface Tactile Premium** : Optimisée pour une saisie rapide et fluide des commandes.
- **Gestion de Salle** : Plan de salle interactif avec suivi en temps réel des tables (Libre, Occupée, Réservée).
- **Kitchen Display System (KDS)** : Affichage en temps réel des commandes en cuisine via Redis.
- **Gestion des Stocks** : Décompte automatique des produits vendus et alertes de stock bas.
- **Fidélité & Promotions** : Gestion des clients et application de codes promotionnels.
- **Mode Hors-ligne (PWA)** : Continuité de service même en cas de coupure internet avec synchronisation automatique.
- **Rapports Financiers** : Suivi des ventes par session de caisse et rapports administrateur.

## 🛠️ Stack Technique

- **Framework** : [Next.js](https://nextjs.org/) (App Router)
- **Base de données** : PostgreSQL avec [Prisma ORM](https://www.prisma.io/)
- **Temps Réel** : Redis (Pub/Sub pour le KDS)
- **Authentification** : NextAuth.js
- **Styling** : Tailwind CSS & Lucide Icons
- **Stockage Local** : IndexedDB pour le mode offline

## 📦 Installation

1. Cloner le projet
2. Installer les dépendances :
   ```bash
   npm install
   ```
3. Configurer les variables d'environnement (`.env`) :
   ```env
   DATABASE_URL="votre_url_postgres"
   REDIS_URL="votre_url_redis"
   NEXTAUTH_SECRET="votre_secret"
   ```
4. Synchroniser la base de données :
   ```bash
   npx prisma db push
   ```
5. Lancer le serveur :
   ```bash
   npm run dev
   ```

## 📖 Documentation de l'API (Swagger & OpenAPI)

Le projet intègre une documentation interactive de ses APIs REST via Swagger.

### Accès à la console interactive
La documentation est disponible sur la route : `http://localhost:3000/api-docs`.
*Note : Cette route est sécurisée et requiert d'être authentifié avec le rôle `ADMIN` ou `SUPER_ADMIN`.*

### Exporter la spécification OpenAPI
Pour exporter la spécification OpenAPI 3.0 complète dans le fichier statique `openapi.json` à la racine du projet, lancez :
```bash
npm run generate:api
```

## 👥 Rôles Utilisateurs

- **SUPER_ADMIN / ADMIN** : Gestion globale, statistiques et configuration des établissements.
- **RESTAURATEUR** : Gestion des stocks, catégories et produits de son restaurant.
- **CASHIER (Caissier)** : Utilisation de l'interface POS pour les ventes.
- **KITCHEN (Cuisine)** : Utilisation de l'interface KDS pour la préparation.

## 📄 Licence

Ce projet est la propriété de Gourmet CI.
