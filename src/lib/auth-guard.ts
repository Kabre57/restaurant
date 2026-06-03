// src/lib/auth-guard.ts — Garde d'authentification réutilisable pour les Server Actions
// CRIT-01 FIX : Vérifie session, rôle et isolation multi-tenant (storeId)

import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"

export type AuthContext = {
  userId: string
  storeId: string
  role: string
  email: string
}

/**
 * Vérifie l'authentification et l'autorisation d'un utilisateur.
 * @param allowedRoles — Liste des rôles autorisés (ex: ["ADMIN", "RESTAURATEUR"]).
 *                        Si omis, tous les rôles authentifiés sont acceptés.
 * @returns Contexte utilisateur (userId, storeId, role, email)
 * @throws Error si non authentifié, rôle insuffisant ou storeId manquant
 */
export async function requireAuth(allowedRoles?: string[]): Promise<AuthContext> {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    throw new Error("Non authentifié")
  }

  const { id, role, storeId, email } = session.user

  if (allowedRoles && !allowedRoles.includes(role)) {
    throw new Error("Accès non autorisé — rôle insuffisant")
  }

  if (!storeId) {
    throw new Error("Restaurant non associé à cet utilisateur")
  }

  return { userId: id, storeId, role, email: email ?? "" }
}

/**
 * Vérifie qu'une entité (User, Contract, etc.) appartient bien au store de l'appelant.
 * Empêche les accès croisés entre tenants.
 * @param entityStoreId — Le storeId de l'entité cible
 * @param callerStoreId — Le storeId de l'appelant (issu de requireAuth)
 * @param entityName — Nom de l'entité pour le message d'erreur
 */
export function assertSameStore(entityStoreId: string, callerStoreId: string, entityName = "Ressource") {
  if (entityStoreId !== callerStoreId) {
    throw new Error(`${entityName} n'appartient pas à votre restaurant`)
  }
}
