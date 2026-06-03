'use server'

import { prisma } from '@/lib/db'
import crypto from 'crypto'
import { revalidatePath } from 'next/cache'

// ──────────────────────────────────────────────────────────────────────
// generateTokenAction — Génère un nouveau jeton d'API sécurisé (SHA256)
// ──────────────────────────────────────────────────────────────────────
export async function generateTokenAction(storeId: string, name: string) {
  try {
    if (!name.trim()) {
      return { success: false, error: 'Le nom du jeton est obligatoire.' }
    }

    // 1. Générer une chaîne aléatoire sécurisée de 32 octets (hex)
    const randomHex = crypto.randomBytes(32).toString('hex')
    
    // Format de livraison du jeton en texte brut
    const rawToken = `GLP_${randomHex}`
    
    // Masked prefix pour la visualisation
    const prefix = `GLP_${randomHex.substring(0, 8)}...`

    // 2. Hacher le jeton avec SHA256 pour le stockage sécurisé en BDD
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex')

    // 3. Enregistrer en base de données
    const apiToken = await prisma.apiToken.create({
      data: {
        storeId,
        name: name.trim(),
        token: hashedToken,
        prefix,
      },
    })

    try {
      revalidatePath('/restaurateur/integrations/api-tokens')
    } catch (e) {
      // Ignorer l'erreur d'invariant hors du contexte Next.js (ex: scripts de test ou tâches CLI)
    }

    return {
      success: true,
      apiToken: {
        id: apiToken.id,
        name: apiToken.name,
        prefix: apiToken.prefix,
        createdAt: apiToken.createdAt,
      },
      rawToken, // Renvoyé UNIQUEMENT cette fois-ci (Stripe/GitHub style)
    }
  } catch (error) {
    console.error('Failed to generate API token:', error)
    return { success: false, error: 'Impossible de générer le jeton.' }
  }
}

// ──────────────────────────────────────────────────────────────────────
// listTokensAction — Liste les jetons d'un restaurant
// ──────────────────────────────────────────────────────────────────────
export async function listTokensAction(storeId: string) {
  try {
    const tokens = await prisma.apiToken.findMany({
      where: { storeId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        prefix: true,
        createdAt: true,
      },
    })

    return { success: true, tokens }
  } catch (error) {
    console.error('Failed to list API tokens:', error)
    return { success: false, error: 'Impossible de récupérer la liste des jetons.' }
  }
}

// ──────────────────────────────────────────────────────────────────────
// revokeTokenAction — Révise / Supprime un jeton d'API active
// ──────────────────────────────────────────────────────────────────────
export async function revokeTokenAction(tokenId: string) {
  try {
    await prisma.apiToken.delete({
      where: { id: tokenId },
    })

    try {
      revalidatePath('/restaurateur/integrations/api-tokens')
    } catch (e) {
      // Ignorer l'erreur d'invariant hors du contexte Next.js (ex: scripts de test ou tâches CLI)
    }

    return { success: true }
  } catch (error) {
    console.error('Failed to revoke API token:', error)
    return { success: false, error: 'Erreur lors de la révocation du jeton.' }
  }
}
