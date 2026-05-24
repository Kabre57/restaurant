/**
 * Classes d'erreur métier — POS Restaurant
 *
 * Permet de distinguer les erreurs intentionnelles (ex: commande introuvable)
 * des erreurs inattendues (ex: panne BDD) dans les blocs catch.
 *
 * Usage dans une action serveur :
 *   throw new NotFoundError('Commande introuvable')
 *   throw new ForbiddenError('Accès hors périmètre restaurant')
 *   throw new ValidationError('Quantité invalide')
 *
 * Dans le catch :
 *   if (error instanceof AppError) return { success: false, error: error.message }
 *   throw error // re-throw les erreurs inattendues
 */

export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly httpStatus: number = 500
  ) {
    super(message)
    this.name = 'AppError'
    // Nécessaire pour instanceof dans les builds transpilés (TypeScript → ES5)
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

/** Ressource introuvable en base → 404 */
export class NotFoundError extends AppError {
  constructor(message = 'Ressource introuvable') {
    super('NOT_FOUND', message, 404)
    this.name = 'NotFoundError'
  }
}

/** Accès refusé (rôle insuffisant, mauvais tenant) → 403 */
export class ForbiddenError extends AppError {
  constructor(message = 'Accès refusé') {
    super('FORBIDDEN', message, 403)
    this.name = 'ForbiddenError'
  }
}

/** Authentification manquante ou expirée → 401 */
export class UnauthorizedError extends AppError {
  constructor(message = 'Authentification requise') {
    super('UNAUTHORIZED', message, 401)
    this.name = 'UnauthorizedError'
  }
}

/** Données d'entrée invalides (après Zod) → 400 */
export class ValidationError extends AppError {
  constructor(message: string) {
    super('VALIDATION_ERROR', message, 400)
    this.name = 'ValidationError'
  }
}

/** Conflit de ressource (doublon, idempotence) → 409 */
export class ConflictError extends AppError {
  constructor(message: string) {
    super('CONFLICT', message, 409)
    this.name = 'ConflictError'
  }
}

/** Service tiers indisponible (Redis, CinetPay, Glovo) → 503 */
export class ServiceUnavailableError extends AppError {
  constructor(message: string) {
    super('SERVICE_UNAVAILABLE', message, 503)
    this.name = 'ServiceUnavailableError'
  }
}

/**
 * Utilitaire : convertit n'importe quelle erreur en message lisible.
 * Usage dans les catch finaux des server actions.
 */
export function toErrorMessage(error: unknown, fallback = 'Erreur inconnue'): string {
  if (error instanceof AppError) return error.message
  if (error instanceof Error) return error.message
  return fallback
}

/**
 * Utilitaire : retourne true si l'erreur est une AppError connue.
 * Permet de différencier les erreurs métier des erreurs système.
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError
}
