#!/bin/sh

set -eu

MAX_ATTEMPTS="${DB_WAIT_MAX_ATTEMPTS:-30}"
SLEEP_SECONDS="${DB_WAIT_SLEEP_SECONDS:-2}"
ATTEMPT=1
FALLBACK_ENABLED="${PRISMA_ENABLE_DB_PUSH_FALLBACK:-true}"
PRISMA_SCHEMA_DIR="./prisma/schema"

baseline_existing_schema() {
  echo "🧭 Baseline des migrations Prisma sur une base deja synchronisee..."

  find prisma/migrations -mindepth 1 -maxdepth 1 -type d | sort | while read -r migration_dir; do
    migration_name="$(basename "$migration_dir")"
    npx prisma migrate resolve --schema "$PRISMA_SCHEMA_DIR" --rolled-back "$migration_name" >/dev/null 2>&1 || true
    npx prisma migrate resolve --schema "$PRISMA_SCHEMA_DIR" --applied "$migration_name" >/dev/null 2>&1 || true
  done
}

echo "⏳ Attente de la base de données et application des migrations Prisma..."

# On évite db push ici pour ne pas court-circuiter les vraies migrations du projet.
# La boucle permet au conteneur d'attendre PostgreSQL avant de lancer l'application.
until npx prisma migrate deploy --schema "$PRISMA_SCHEMA_DIR"; do
  if [ "$FALLBACK_ENABLED" = "true" ]; then
    echo "⚠️ Migration deploy impossible, tentative de compatibilite avec db push..."
    if npx prisma db push --schema "$PRISMA_SCHEMA_DIR" --accept-data-loss --skip-generate; then
      baseline_existing_schema
      break
    fi
  fi

  if [ "$ATTEMPT" -ge "$MAX_ATTEMPTS" ]; then
    echo "❌ Impossible d'appliquer les migrations après ${MAX_ATTEMPTS} tentatives."
    exit 1
  fi

  echo "Base indisponible, nouvelle tentative ${ATTEMPT}/${MAX_ATTEMPTS} dans ${SLEEP_SECONDS}s..."
  ATTEMPT=$((ATTEMPT + 1))
  sleep "$SLEEP_SECONDS"
done

if [ "${PRISMA_SEED_ON_START:-false}" = "true" ]; then
  echo "🌱 Exécution du seed Prisma..."
  npx prisma db seed
fi

echo "✨ Lancement de l'application..."
exec npm start
