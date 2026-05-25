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

## ☸️ 6. Déploiement Kubernetes sur VPS
Ce projet peut être déployé dans un cluster Kubernetes en utilisant les manifests fournis dans le dossier `k8s/`.

### Pré-requis
- `kubectl` configuré sur votre cluster
- Image Docker accessible depuis le cluster (`your-registry/pos-app:latest`)
- Accès aux secrets Kubernetes pour stocker les variables sensibles

### Étapes de base
1. Construisez l'image Docker :
```bash
docker build -t your-registry/pos-app:latest .
```
2. Poussez l'image vers votre registre :
```bash
docker push your-registry/pos-app:latest
```
3. Appliquez les manifests Kubernetes :
```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/secret.yaml
kubectl apply -f k8s/postgres-statefulset.yaml
kubectl apply -f k8s/redis-deployment.yaml
kubectl apply -f k8s/app-deployment.yaml
kubectl apply -f k8s/app-service.yaml
```

### Mise à jour du déploiement
Lorsque vous publiez une nouvelle image :
```bash
docker build -t your-registry/pos-app:latest .
docker push your-registry/pos-app:latest
kubectl set image deployment/pos-app pos-app=your-registry/pos-app:latest -n pos-app
kubectl rollout status deployment/pos-app -n pos-app
```

### Déploiement depuis le script
Le script `update-db.sh` supporte les variables d'environnement :
- `K8S_IMAGE_NAME` : nom de l'image Docker à construire et déployer
- `K8S_PUSH_IMAGE` : `true` pour pousser l'image dans le registre après build

Exemple :
```bash
K8S_IMAGE_NAME=your-registry/pos-app:latest K8S_PUSH_IMAGE=true ./update-db.sh
```

### Déploiement de la base de données
Le manifest `k8s/postgres-statefulset.yaml` crée une instance PostgreSQL avec un volume persistant.
Si vous préférez une base managée, remplacez ce manifest par votre service externe et mettez à jour `k8s/secret.yaml`.

### Déploiement Redis
Le manifest `k8s/redis-deployment.yaml` expose Redis dans le cluster.
En production, il est recommandé d’utiliser un service Redis managé ou un opérateur Redis pour plus de résilience.

### Guide rapide pour le script `update-db.sh`
Le script `update-db.sh` utilise désormais Kubernetes uniquement :
- il construit l’image Docker
- il applique les manifests
- il surveille le rollout de `pos-app`

> Ce script ne contient plus de fallback PM2.

---

*Développé avec excellence pour une fiabilité maximale en production.*
