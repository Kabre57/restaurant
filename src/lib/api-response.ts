import { NextResponse } from 'next/server'

/**
 * Helpers de réponse API — Format unifié
 *
 * Avant ce module, chaque route API avait son propre format de réponse.
 * Ce module normalise tous les retours JSON de l'application.
 *
 * Usage :
 *   return ok({ order })
 *   return err('Produit introuvable', 404)
 *   return created({ id: newRecord.id })
 */

type ApiSuccess<T> = { success: true; data: T }
type ApiError = { success: false; error: string }

/** 200 OK */
export function ok<T>(data: T, status = 200): NextResponse<ApiSuccess<T>> {
  return NextResponse.json({ success: true, data }, { status })
}

/** 201 Created */
export function created<T>(data: T): NextResponse<ApiSuccess<T>> {
  return NextResponse.json({ success: true, data }, { status: 201 })
}

/** Erreur avec message explicite */
export function err(message: string, status: number): NextResponse<ApiError> {
  return NextResponse.json({ success: false, error: message }, { status })
}

/** 400 Bad Request */
export function badRequest(message = 'Requête invalide'): NextResponse<ApiError> {
  return err(message, 400)
}

/** 401 Unauthorized */
export function unauthorized(message = 'Authentification requise'): NextResponse<ApiError> {
  return err(message, 401)
}

/** 403 Forbidden */
export function forbidden(message = 'Accès refusé'): NextResponse<ApiError> {
  return err(message, 403)
}

/** 404 Not Found */
export function notFound(message = 'Ressource introuvable'): NextResponse<ApiError> {
  return err(message, 404)
}

/** 500 Internal Server Error */
export function serverError(message = 'Erreur serveur interne'): NextResponse<ApiError> {
  return err(message, 500)
}

/** 503 Service Unavailable */
export function unavailable(message = 'Service temporairement indisponible'): NextResponse<ApiError> {
  return err(message, 503)
}
