// src/app/api/debug/session/route.ts — Diagnostic session & storeId
// ⚠️ À SUPPRIMER après diagnostic

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    // 1. Session NextAuth courante
    const session = await getServerSession(authOptions)

    // 2. Tous les utilisateurs avec leur storeId
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        storeId: true,
        status: true,
      },
      orderBy: { role: 'asc' },
    })

    // 3. Tous les stores
    const allStores = await prisma.store.findMany({
      select: {
        id: true,
        name: true,
        address: true,
        _count: { select: { users: true, products: true, categories: true } },
      },
    })

    // 4. Utilisateurs SANS storeId (le problème)
    const usersWithoutStore = allUsers.filter((u) => !u.storeId)

    // 5. Utilisateurs RESTAURATEUR
    const restaurateurs = allUsers.filter((u) => u.role === 'RESTAURATEUR')

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      session: session
        ? {
            userId: session.user?.id,
            email: session.user?.email,
            role: session.user?.role,
            storeId: session.user?.storeId,
            storeIdIsNull: !session.user?.storeId,
          }
        : 'PAS DE SESSION (non connecté)',
      diagnostic: {
        totalUsers: allUsers.length,
        totalStores: allStores.length,
        usersWithoutStoreId: usersWithoutStore.length,
        restaurateurCount: restaurateurs.length,
      },
      stores: allStores,
      restaurateurs,
      usersWithoutStore,
      allUsers,
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Erreur diagnostic', details: (error as Error).message },
      { status: 500 }
    )
  }
}
