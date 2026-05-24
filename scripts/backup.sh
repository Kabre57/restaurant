#!/bin/bash
# ==============================================================================
# Script de sauvegarde automatique PostgreSQL - POS Restaurant
# ==============================================================================

# Dossier de sauvegarde dans le workspace
BACKUP_DIR="$(dirname "$0")/../backups"
RETENTION_DAYS=7
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/pos_restaurant_${TIMESTAMP}.sql"

# Créer le dossier s'il n'existe pas
mkdir -p "${BACKUP_DIR}"

echo "=== Début de la sauvegarde automatique [$(date)] ==="

# Récupérer l'URL de connexion depuis .env si présent
if [ -f "$(dirname "$0")/../.env" ]; then
    export $(grep -v '^#' "$(dirname "$0")/../.env" | xargs)
fi

# Utiliser pg_dump via docker-compose si la DB tourne en docker, sinon en local
if docker compose ps | grep -q "pos-db"; then
    echo "Sauvegarde via le container Docker (pos-db)..."
    docker compose exec -T db pg_dump -U postgres pos_restaurant > "${BACKUP_FILE}"
else
    echo "Sauvegarde via pg_dump local..."
    pg_dump "${DATABASE_URL}" > "${BACKUP_FILE}"
fi

# Vérifier si le fichier a été créé et n'est pas vide
if [ -s "${BACKUP_FILE}" ]; then
    echo "Compression du fichier de sauvegarde..."
    gzip -f "${BACKUP_FILE}"
    echo "Sauvegarde réussie : ${BACKUP_FILE}.gz"
else
    echo "ERREUR : Le fichier de sauvegarde est vide ou n'a pas été créé !"
    exit 1
fi

# Nettoyage des anciennes sauvegardes (rétention de 7 jours)
echo "Recherche et suppression des anciennes sauvegardes (rétention de ${RETENTION_DAYS} jours)..."
find "${BACKUP_DIR}" -name "pos_restaurant_*.sql.gz" -mtime +${RETENTION_DAYS} -exec rm -f {} \; -print

echo "=== Fin de la sauvegarde automatique [$(date)] ==="
