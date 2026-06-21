# Phase 1: Installation des dépendances
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat openssl ca-certificates
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY prisma ./prisma
RUN npx prisma generate --schema ./prisma/schema

# Phase 2: Build de l'application
FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat openssl ca-certificates
WORKDIR /app
COPY . .
COPY --from=deps /app/node_modules ./node_modules

# Variables d'environnement pour le build
ENV NEXT_TELEMETRY_DISABLED 1
ENV PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING 1
RUN npm run build

# Phase 3: Exécution en production
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nextjs:nodejs /app/next.config.ts ./next.config.ts
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts
COPY --chown=nextjs:nodejs docker-entrypoint.sh ./

USER root
RUN chmod +x docker-entrypoint.sh
USER nextjs

EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
