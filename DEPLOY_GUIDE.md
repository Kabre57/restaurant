# Déploiement VPS - Parabellum POS

Domaine cible : `parabellumpos.online`

Ce guide déploie l'application avec Docker Compose, PostgreSQL, Redis, Nginx et SSL Let's Encrypt.

## 1. DNS

Chez ton fournisseur de domaine, crée ces enregistrements :

```text
A     @      IP_DU_VPS
A     www    IP_DU_VPS
```

Attends ensuite la propagation DNS, puis vérifie :

```bash
dig +short parabellumpos.online
dig +short www.parabellumpos.online
```

Les deux doivent retourner l'IP de ton VPS.

## 2. Préparer Le VPS

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y ca-certificates curl git nginx certbot python3-certbot-nginx
```

Installer Docker :

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
```

Reconnecte-toi au VPS après cette commande pour activer le groupe Docker.

## 3. Copier Le Projet

```bash
cd /opt
sudo mkdir -p parabellumpos
sudo chown -R $USER:$USER /opt/parabellumpos
cd /opt/parabellumpos
```

Puis clone ton dépôt ou copie le dossier projet :

```bash
git clone <URL_DU_REPO> .
```

Si tu copies depuis ta machine :

```bash
rsync -av --exclude node_modules --exclude .next /home/hp/Documents/Projet/restaurant/ user@IP_DU_VPS:/opt/parabellumpos/
```

## 4. Variables De Production

Crée le fichier `.env` sur le VPS :

```bash
nano .env
```

Contenu recommandé :

```env
APP_PORT=3003

POSTGRES_USER=postgres
POSTGRES_PASSWORD=change-moi-avec-un-vrai-mot-de-passe
POSTGRES_DB=pos_restaurant
POSTGRES_PORT=5433

NEXTAUTH_URL=https://parabellumpos.online
NEXTAUTH_SECRET=change-moi-avec-une-longue-cle-secrete
```

Générer un secret NextAuth :

```bash
openssl rand -base64 32
```

Garde `APP_PORT=3003` si le port `3000` est déjà utilisé par un autre service. Nginx exposera le site publiquement sur `443`.

## 5. Build Et Démarrage Docker

```bash
docker compose up -d --build
docker compose ps
docker compose logs -f app
```

L'application doit être accessible localement sur le VPS via :

```bash
curl -I http://localhost:3003
```

Une réponse `307` vers `/login` est normale.

## 6. Nginx Pour parabellumpos.online

Créer la config :

```bash
sudo nano /etc/nginx/sites-available/parabellumpos
```

Coller :

```nginx
server {
    listen 80;
    server_name parabellumpos.online www.parabellumpos.online;

    location / {
        proxy_pass http://127.0.0.1:3003;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_cache_bypass $http_upgrade;
    }
}
```

Activer :

```bash
sudo ln -s /etc/nginx/sites-available/parabellumpos /etc/nginx/sites-enabled/parabellumpos
sudo nginx -t
sudo systemctl reload nginx
```

## 7. SSL HTTPS

```bash
sudo certbot --nginx -d parabellumpos.online -d www.parabellumpos.online
```

Vérifier le renouvellement automatique :

```bash
sudo certbot renew --dry-run
```

## 8. Pare-feu

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status
```

Ne publie pas PostgreSQL ni Redis sur Internet. Dans ce projet, Redis reste interne Docker et PostgreSQL est limité à `127.0.0.1:${POSTGRES_PORT:-5433}` par `docker-compose.yml`.

## 9. Comptes De Test

Si la base est seedée ou si tu as réinitialisé les comptes :

```text
admin@plateforme.ci       / Password123
resto@gourmet.ci          / Password123
theogeoffroy5@gmail.com   / Password123
caissire@gourmet.ci       / Password123
cuisine@gourmet.ci        / Password123
```

Pour lancer le seed :

```bash
docker compose exec app npx prisma db seed
```

Pour réinitialiser les mots de passe locaux à `Password123` :

```bash
docker compose exec app node -e 'const { PrismaClient } = require("@prisma/client"); const bcrypt = require("bcryptjs"); const prisma = new PrismaClient(); (async () => { const hash = await bcrypt.hash("Password123", 10); const result = await prisma.user.updateMany({ data: { password: hash } }); console.log(`updated=${result.count}`); await prisma.$disconnect(); })();'
```

## 10. Mise À Jour

```bash
cd /opt/parabellumpos
git pull
docker compose up -d --build
docker compose logs -f app
```

## 11. Commandes Utiles

```bash
docker compose ps
docker compose logs -f app
docker compose logs -f db
docker compose restart app
docker compose down
docker compose up -d --build
```

Tester l'accès public :

```bash
curl -I https://parabellumpos.online
```

Une redirection vers `/login` signifie que l'application répond correctement.
