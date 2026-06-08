'use server'

import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'

function safeRevalidatePath(path: string) {
  try {
    revalidatePath(path)
  } catch {
    // Ignorer l'erreur hors du contexte Next.js (ex: scripts de test ou tâches CLI)
  }
}

// ──────────────────────────────────────────────────────────────────────
// getActiveShift — Trouve une rotation de poste en cours
// ──────────────────────────────────────────────────────────────────────
export async function getActiveShift(storeId: string) {
  try {
    const activeShift = await prisma.cashDrawerShift.findFirst({
      where: {
        storeId,
        status: 'OPEN',
      },
      include: {
        operations: true,
      },
    })

    if (!activeShift) {
      return { success: true, shift: null, totalCashSales: 0, expectedAmount: 0 }
    }

    // 1. Calculer les ventes en espèces depuis l'ouverture du shift
    const cashPayments = await prisma.payment.aggregate({
      _sum: {
        amount: true,
      },
      where: {
        paymentMethod: { type: 'CASH' },
        status: 'REUSSIE',
        createdAt: {
          gte: activeShift.openedAt,
        },
        order: {
          storeId,
        },
      },
    })

    const totalCashSales = cashPayments._sum.amount || 0

    // 2. Calculer le total des entrées (PAY_IN) et sorties (PAY_OUT)
    let totalPayIn = 0
    let totalPayOut = 0

    activeShift.operations.forEach((op) => {
      if (op.type === 'PAY_IN') {
        totalPayIn += op.amount
      } else if (op.type === 'PAY_OUT') {
        totalPayOut += op.amount
      }
    })

    // 3. Montant attendu = Fond initial + Ventes Espèces + PayIn - PayOut
    const expectedAmount = activeShift.startAmount + totalCashSales + totalPayIn - totalPayOut

    return {
      success: true,
      shift: activeShift,
      totalCashSales: Math.round(totalCashSales),
      expectedAmount: Math.round(expectedAmount),
    }
  } catch (error) {
    console.error('Failed to get active shift:', error)
    return { success: false, error: 'Erreur de récupération de la caisse active.' }
  }
}

// ──────────────────────────────────────────────────────────────────────
// openShift — Ouvre une nouvelle rotation de poste
// ──────────────────────────────────────────────────────────────────────
export async function openShift(
  storeId: string,
  userId: string,
  userName: string,
  startAmount: number
) {
  try {
    // Vérifier si un shift est déjà ouvert
    const active = await prisma.cashDrawerShift.findFirst({
      where: {
        storeId,
        status: 'OPEN',
      },
    })

    if (active) {
      return { success: false, error: 'Une rotation est déjà active pour cette caisse.' }
    }

    const newShift = await prisma.cashDrawerShift.create({
      data: {
        storeId,
        openedById: userId,
        openedByName: userName,
        startAmount: Math.round(startAmount),
        status: 'OPEN',
      },
    })

    safeRevalidatePath('/restaurateur/caisse/rotation')

    return { success: true, shift: newShift }
  } catch (error) {
    console.error('Failed to open shift:', error)
    return { success: false, error: 'Erreur lors de l&apos;ouverture du poste.' }
  }
}

// ──────────────────────────────────────────────────────────────────────
// closeShift — Ferme la caisse et calcule l'écart
// ──────────────────────────────────────────────────────────────────────
export async function closeShift(
  shiftId: string,
  userId: string,
  userName: string,
  endAmount: number
) {
  try {
    const shift = await prisma.cashDrawerShift.findUnique({
      where: { id: shiftId },
      include: { operations: true },
    })

    if (!shift) {
      return { success: false, error: 'Shift introuvable.' }
    }

    if (shift.status === 'CLOSED') {
      return { success: false, error: 'Ce poste est déjà clôturé.' }
    }

    // 1. Calculer les ventes en espèces réalisées durant cette rotation de caisse
    // On somme les paiements en ESPECES réussis associés aux commandes validées depuis openedAt
    const cashPayments = await prisma.payment.aggregate({
      _sum: {
        amount: true,
      },
      where: {
        paymentMethod: { type: 'CASH' },
        status: 'REUSSIE',
        createdAt: {
          gte: shift.openedAt,
        },
        order: {
          storeId: shift.storeId,
        },
      },
    })

    const totalCashSales = cashPayments._sum.amount || 0

    // 2. Calculer le total des entrées (PAY_IN) et sorties (PAY_OUT)
    let totalPayIn = 0
    let totalPayOut = 0

    shift.operations.forEach((op) => {
      if (op.type === 'PAY_IN') {
        totalPayIn += op.amount
      } else if (op.type === 'PAY_OUT') {
        totalPayOut += op.amount
      }
    })

    // 3. Montant calculé attendu = Fond initial + Ventes Espèces + PayIn - PayOut
    const expectedAmount = shift.startAmount + totalCashSales + totalPayIn - totalPayOut

    // 4. Mettre à jour le shift
    const closedShift = await prisma.cashDrawerShift.update({
      where: { id: shiftId },
      data: {
        status: 'CLOSED',
        closedById: userId,
        closedByName: userName,
        closedAt: new Date(),
        endAmount: Math.round(endAmount),
        expectedAmount: Math.round(expectedAmount),
      },
    })

    safeRevalidatePath('/restaurateur/caisse/rotation')

    return { success: true, shift: closedShift, totalCashSales, expectedAmount }
  } catch (error) {
    console.error('Failed to close shift:', error)
    return { success: false, error: 'Erreur de clôture de caisse.' }
  }
}

// ──────────────────────────────────────────────────────────────────────
// payIn — Enregistre une entrée de caisse
// ──────────────────────────────────────────────────────────────────────
export async function payIn(shiftId: string, amount: number, note: string) {
  try {
    const shift = await prisma.cashDrawerShift.findUnique({
      where: { id: shiftId },
    })

    if (!shift || shift.status === 'CLOSED') {
      return { success: false, error: 'Aucun shift actif trouvé.' }
    }

    const op = await prisma.cashDrawerOperation.create({
      data: {
        shiftId,
        amount: Math.round(amount),
        type: 'PAY_IN',
        note,
      },
    })

    safeRevalidatePath('/restaurateur/caisse/rotation')

    return { success: true, operation: op }
  } catch (error) {
    console.error('Failed to add payIn operation:', error)
    return { success: false, error: 'Erreur d&apos;enregistrement de l&apos;entrée de caisse.' }
  }
}

// ──────────────────────────────────────────────────────────────────────
// payOut — Enregistre une sortie de caisse
// ──────────────────────────────────────────────────────────────────────
export async function payOut(shiftId: string, amount: number, note: string) {
  try {
    const shift = await prisma.cashDrawerShift.findUnique({
      where: { id: shiftId },
    })

    if (!shift || shift.status === 'CLOSED') {
      return { success: false, error: 'Aucun shift actif trouvé.' }
    }

    const op = await prisma.cashDrawerOperation.create({
      data: {
        shiftId,
        amount: Math.round(amount),
        type: 'PAY_OUT',
        note,
      },
    })

    safeRevalidatePath('/restaurateur/caisse/rotation')

    return { success: true, operation: op }
  } catch (error) {
    console.error('Failed to add payOut operation:', error)
    return { success: false, error: 'Erreur d&apos;enregistrement de la sortie de caisse.' }
  }
}

// ──────────────────────────────────────────────────────────────────────
// getShiftHistory — Historique des rotations
// ──────────────────────────────────────────────────────────────────────
export async function getShiftHistory(storeId: string, limit = 20) {
  try {
    const history = await prisma.cashDrawerShift.findMany({
      where: {
        storeId,
      },
      orderBy: {
        openedAt: 'desc',
      },
      take: limit,
      include: {
        operations: true,
      },
    })

    return { success: true, history }
  } catch (error) {
    console.error('Failed to get shift history:', error)
    return { success: false, error: 'Erreur lors de la récupération de l&apos;historique.' }
  }
}
