# Guide d'Administration & Déploiement — POS Restaurant

Bienvenue dans le manuel d'administration de la plateforme de caisse enregistreuse (POS) et de commande en ligne multi-tenant.

---

## 🏗️ 1. Architecture Générale

Le projet est construit sur une architecture modulaire à 3 couches hautement découplées :
*   **Front-End / Caisse (Client) :** Next.js 16 avec support PWA natif (via `@ducanh2912/next-pwa`). Fonctionne en mode **offline-first** grâce à la base de données IndexedDB locale (`src/lib/idb.ts`), assurant que la caisse continue d'enregistrer des ventes même en cas de coupure réseau complète.
*   **Back-End / Server Actions :** Services et logiques métier transactionnelles côté serveur avec validation forte Zod.
*   **Persistance & Cache :**
    *   **Base de données :** PostgreSQL orchestré via **Prisma ORM**.
    *   **Mise en cache & SSE :** **Redis** pour la synchronisation en temps réel des commandes de cuisine (KDS) et la gestion de verrous distribués.

---

## 🚀 2. Démarrage Rapide (Docker & Local)

### Prérequis
*   Node.js v20+
*   Docker & Docker Compose

### Étape 1 : Variables d'environnement (`.env`)
Copiez et configurez votre fichier `.env` à la racine :
```env
DATABASE_URL="postgresql://postgres:password@localhost:5433/pos_restaurant?schema=public"
DIRECT_DATABASE_URL="postgresql://postgres:password@localhost:5433/pos_restaurant?schema=public"
REDIS_URL="redis://localhost:6379"
NEXTAUTH_SECRET="un_secret_tres_long_et_securise"
NEXTAUTH_URL="http://localhost:3000"
```

### Étape 2 : Lancement des Services de Production
Déployez la base de données, Redis et l'application d'un seul coup :
```bash
docker compose up -d --build
```

### Étape 3 : Initialisation de la Base de Données
Pour appliquer le schéma et pré-remplir les données de démonstration (stores, catégories, comptes tests) :
```bash
npx prisma db push
npx prisma db seed
```

---

## 💳 3. Module Financier & Commissions

La plateforme intègre un puissant calculateur de commissions centralisé pour l'administrateur / superviseur :
*   **Règle de Commission :** Chaque boutique possède son propre taux de commission (ex: 15.0%).
*   **Solde dû net :** Calculé de manière transactionnelle via `actions/payouts.ts` :
    $$\text{Solde restant dû} = \text{Volume Encaissé (Paiements Réussis)} - \text{Commissions Plateforme} - \text{Versements déjà effectués}$$
*   **Rapports & Exports :** Un moteur d'exportation dynamique accessible sur `/admin/finances` permet de filtrer les transactions par plage de dates et de générer des fichiers **PDF, Excel, CSV ou JSON** en un clic.

---

## 🛵 4. Logistique & Flotte de Livraisons

Accessible sur `/restaurateur/livraisons` :
*   **Assignation en temps réel :** Permet d'associer un livreur disponible à une commande en livraison.
*   **Ravitaillement Sonore :** Alerte sonore native (`notification.mp3`) déclenchée pour chaque commande en attente pour avertir immédiatement les gérants.

---

## 💾 5. Maintenance & Backups

### Sauvegardes de la Base de Données
Un script de backup automatique est disponible dans `scripts/backup.sh`. Il réalise :
1. Un dump SQL compressé via `pg_dump`.
2. Une sauvegarde horodatée dans le répertoire `/backups`.
3. Un nettoyage automatique des sauvegardes datant de plus de 7 jours (politique de rétention).

Pour planifier une sauvegarde automatique toutes les nuits à minuit, ajoutez cette ligne à votre `crontab` :
```cron
0 0 * * * /home/hp/Documents/Iaprojet/restaurant/scripts/backup.sh >> /var/log/pos_backup.log 2>&1
```

---

*Développé avec excellence pour une fiabilité maximale en production.*
