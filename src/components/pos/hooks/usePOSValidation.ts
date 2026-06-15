'use client'

import type { AlertPayload } from './usePOSCheckout.helpers'

export function usePOSValidation() {
  const validateCheckout = (
    effectiveTotal: number,
    activeMethodType: string,
    selectedBillsLength: number,
    amountReceived: string,
    onAlert: (alert: AlertPayload) => void
  ): boolean => {
    // 1. Empêcher la validation d'une commande de 0 FCFA ou moins
    if (effectiveTotal <= 0) {
      onAlert({
        title: 'Montant Invalide',
        message: 'Le montant total de la commande ne peut pas être inférieur ou égal à 0 FCFA.',
        type: 'error'
      })
      return false
    }

    // 2. Empêcher la validation si le montant reçu est insuffisant ou égal à 0 en espèces ou billets
    const isCashOrFallback = activeMethodType === 'CASH' || selectedBillsLength > 0 || parseFloat(amountReceived) > 0
    if (isCashOrFallback) {
      const received = parseFloat(amountReceived) || 0
      if (received <= 0) {
        onAlert({
          title: 'Montant Reçu Requis',
          message: 'Veuillez saisir un montant reçu supérieur à 0 FCFA.',
          type: 'error'
        })
        return false
      }
      if (received < effectiveTotal) {
        onAlert({
          title: 'Paiement Insuffisant',
          message: `Le montant reçu (${received.toLocaleString()} FCFA) est inférieur au total de la commande (${effectiveTotal.toLocaleString()} FCFA).`,
          type: 'error'
        })
        return false
      }
    }

    return true
  }

  return {
    validateCheckout
  }
}
