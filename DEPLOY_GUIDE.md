# Guide de Déploiement sur VPS - Système POS Restaurant

Ce guide explique comment déployer et maintenir votre application POS sur un serveur VPS (Ubuntu/Debian).

## 1. Prérequis Système
Installez les composants essentiels sur votre VPS :
```bash
# Mise à jour du système
sudo apt update && sudo apt upgrade -y

# Installation de Node.js (v18+)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Installation de PM2 (Gestionnaire de processus)
sudo npm install -g pm2
```

## 2. Préparation de la Base de Données
Votre application utilise **PostgreSQL** et **Redis**.
- Assurez-vous que votre base PostgreSQL est accessible via une URL (`DATABASE_URL`).
- Assurez-vous que votre serveur Redis est lancé (`REDIS_URL`).

## 3. Déploiement Initial
```bash
# Clonez votre dépôt (ou copiez les fichiers)
git clone <votre-repo>
cd Restaurant

# Installez les dépendances
npm install

# Configurez les variables d'environnement
cp .env.example .env
nano .env  # Remplissez DATABASE_URL, NEXTAUTH_SECRET, etc.
```

## 4. Automatisation des Mises à Jour
Pour mettre à jour la base de données et le code, utilisez le script fourni :
```bash
# Rendez le script exécutable
chmod +x update-db.sh

# Lancez la mise à jour
./update-db.sh
```

## 5. Configuration Nginx (Reverse Proxy)
Pour rendre l'application accessible via un nom de domaine sans conflit avec vos autres ERP :

1. Créez la config : `sudo nano /etc/nginx/sites-available/pos-restaurant`
2. Copiez ce bloc (en changeant le domaine) :
```nginx
server {
    listen 80;
    server_name pos.votre-domaine.com;
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```
3. Activez : `sudo ln -s /etc/nginx/sites-available/pos-restaurant /etc/nginx/sites-enabled/`
4. SSL : `sudo certbot --nginx -d pos.votre-domaine.com`

## 6. Lancement avec PM2 (Production)
```bash
# Lancement sur le port 3000
PORT=3000 pm2 start npm --name "pos-restaurant" -- run start
pm2 save
```

---

### Commandes Utiles
- `pm2 logs`: Voir les erreurs en direct.
- `pm2 status`: Vérifier si le serveur tourne.
- `./update-db.sh`: À chaque fois que vous changez quelque chose au code.
