'use server'

import { prisma } from '@/lib/db'
import { RoundingType } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { applyRounding } from '@/lib/roundingUtils'

// ──────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────

export type StoreSettingsData = {
  rounding?: RoundingType
  roundingValue?: number
  receiptLogo?: string | null
  receiptHeader?: string | null
  receiptFooter?: string | null
}

// ──────────────────────────────────────────────────────────────────────
// getStoreSettings — Récupère ou crée les paramètres du restaurant
// ──────────────────────────────────────────────────────────────────────

export async function getStoreSettings(storeId: string) {
  try {
    const settings = await prisma.storeSettings.upsert({
      where: { storeId },
      create: {
        storeId,
        rounding: 'NO_ROUNDING',
        roundingValue: 5,
      },
      update: {},
    })

    return { success: true, settings }
  } catch (error) {
    console.error('Failed to fetch store settings:', error)
    return { success: false, error: 'Impossible de récupérer les paramètres.' }
  }
}

// ──────────────────────────────────────────────────────────────────────
// updateStoreSettings — Met à jour les paramètres de caisse
// ──────────────────────────────────────────────────────────────────────

export async function updateStoreSettings(storeId: string, data: StoreSettingsData) {
  try {
    // Validation de la valeur d'arrondi
    const allowedValues = [1, 5, 10, 25, 50, 100]
    if (data.roundingValue !== undefined && !allowedValues.includes(data.roundingValue)) {
      return {
        success: false,
        error: `Valeur d'arrondi invalide. Valeurs autorisées : ${allowedValues.join(', ')} FCFA.`,
      }
    }

    const settings = await prisma.storeSettings.upsert({
      where: { storeId },
      create: {
        storeId,
        rounding: data.rounding ?? 'NO_ROUNDING',
        roundingValue: data.roundingValue ?? 5,
        receiptLogo: data.receiptLogo,
        receiptHeader: data.receiptHeader,
        receiptFooter: data.receiptFooter,
      },
      update: {
        ...(data.rounding !== undefined && { rounding: data.rounding }),
        ...(data.roundingValue !== undefined && { roundingValue: data.roundingValue }),
        ...(data.receiptLogo !== undefined && { receiptLogo: data.receiptLogo }),
        ...(data.receiptHeader !== undefined && { receiptHeader: data.receiptHeader }),
        ...(data.receiptFooter !== undefined && { receiptFooter: data.receiptFooter }),
      },
    })

    try {
      revalidatePath('/restaurateur/config/arrondis')
      revalidatePath('/restaurateur/config/recus')
    } catch (e) {
      // Ignorer l'invariant lors de l'exécution hors de Next.js (ex: scripts de test ou tâches CLI)
    }

    return { success: true, settings }
  } catch (error) {
    console.error('Failed to update store settings:', error)
    return { success: false, error: 'Erreur lors de la mise à jour des paramètres.' }
  }
}

// ──────────────────────────────────────────────────────────────────────
// getRoundedTotal — Calcul déterministe de l'arrondi
//
// Logique : l'arrondi ne s'applique QU'AUX paiements en espèces.
// Les paiements CB / Mobile Money restent au montant exact.
//
// Exemples avec roundingValue = 5, rounding = ROUND_NEAREST :
//   1327 → 1325  (reste 2, < 2.5 → vers le bas)
//   1328 → 1330  (reste 3, >= 2.5 → vers le haut)
// ──────────────────────────────────────────────────────────────────────

export async function getRoundedTotal(total: number, storeId: string) {
  try {
    const settings = await prisma.storeSettings.findUnique({
      where: { storeId },
      select: { rounding: true, roundingValue: true },
    })

    // Pas de settings ou arrondi désactivé → total inchangé
    if (!settings || settings.rounding === 'NO_ROUNDING') {
      return { roundedTotal: total, roundingDiff: 0, rounding: 'NO_ROUNDING' as const }
    }

    const roundedTotal = applyRounding(total, settings.rounding, settings.roundingValue)
    const roundingDiff = roundedTotal - total

    return {
      roundedTotal,
      roundingDiff,
      rounding: settings.rounding,
    }
  } catch (error) {
    console.error('Failed to compute rounded total:', error)
    // En cas d'erreur, on ne bloque pas le paiement
    return { roundedTotal: total, roundingDiff: 0, rounding: 'NO_ROUNDING' as const }
  }
}
