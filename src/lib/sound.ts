'use client'

import { logger } from '@/lib/logger'

/**
 * Génère des sons de notification d'interface de manière synthétique avec l'AudioContext du navigateur.
 * Fonctionne parfaitement hors-ligne, sans requérir de fichiers MP3 physiques ou d'actifs distants.
 */
export function playNotificationSound(type: 'info' | 'success' | 'warning' = 'info') {
  if (typeof window === 'undefined') return

  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioContextClass) return

    const ctx = new AudioContextClass()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.connect(gain)
    gain.connect(ctx.destination)

    if (type === 'success') {
      // ✅ Double carillon montant et joyeux (ex: commande prête ou payée)
      osc.type = 'sine'
      osc.frequency.setValueAtTime(523.25, ctx.currentTime) // Do (C5)
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.08) // Mi (E5)
      
      gain.gain.setValueAtTime(0.12, ctx.currentTime)
      gain.gain.setValueAtTime(0.12, ctx.currentTime + 0.08)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35)

      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.35)
    } else if (type === 'warning') {
      // ⚠️ Son d'alerte doux mais distinct (ex: appel serveur)
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(440, ctx.currentTime) // La (A4)
      
      gain.gain.setValueAtTime(0.15, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25)

      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.25)
    } else {
      // ℹ️ Ping court et neutre (ex: nouvelle commande reçue ou commencement de préparation)
      osc.type = 'sine'
      osc.frequency.setValueAtTime(587.33, ctx.currentTime) // Ré (D5)
      
      gain.gain.setValueAtTime(0.1, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2)

      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.2)
    }
  } catch (error) {
    // Les navigateurs bloquent souvent l'audio tant que l'utilisateur n'a pas interagi avec la page.
    logger.warn('[AudioContext] Lecture audio bloquée ou non supportée :', error)
  }
}
