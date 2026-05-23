import { redis } from '@/lib/redis'
import type Redis from 'ioredis'

type MessageCallback = (channel: string, message: string) => void

/**
 * RedisSubscriptionManager — Singleton
 *
 * Problème résolu : avant ce module, chaque client SSE (écran KDS, POS)
 * appelait `redis.duplicate()`, créant une connexion Redis dédiée par client.
 * Avec 10 écrans KDS : 10 connexions Redis permanentes.
 *
 * Solution : une seule connexion Redis abonnée (`redisSub`) est partagée
 * par TOUS les clients via une Map de callbacks en mémoire.
 * Le résultat : N clients = 1 seule connexion Redis (au lieu de N).
 */
class RedisSubscriptionManager {
  private static instance: RedisSubscriptionManager
  private sub: Redis
  private listeners = new Map<string, Set<MessageCallback>>()
  private subscribedChannels = new Set<string>()

  private constructor() {
    // Connexion dédiée au mode Subscribe — ne jamais utiliser `redis` global pour ça
    this.sub = redis.duplicate()

    this.sub.on('message', (channel: string, message: string) => {
      const callbacks = this.listeners.get(channel)
      if (!callbacks) return
      for (const cb of callbacks) {
        try {
          cb(channel, message)
        } catch (err) {
          console.error(`[RedisSub] Erreur dans un callback sur ${channel}:`, err)
        }
      }
    })

    this.sub.on('error', (err: Error) => {
      console.error('[RedisSub] Erreur de connexion Redis:', err.message)
    })
  }

  static getInstance(): RedisSubscriptionManager {
    if (!RedisSubscriptionManager.instance) {
      RedisSubscriptionManager.instance = new RedisSubscriptionManager()
    }
    return RedisSubscriptionManager.instance
  }

  /**
   * Abonne un callback à un ou plusieurs channels Redis.
   * Retourne une fonction de désabonnement à appeler au cleanup (abort signal).
   */
  subscribe(channels: string[], cb: MessageCallback): () => void {
    const newChannels: string[] = []

    for (const channel of channels) {
      if (!this.listeners.has(channel)) {
        this.listeners.set(channel, new Set())
      }
      this.listeners.get(channel)!.add(cb)

      if (!this.subscribedChannels.has(channel)) {
        newChannels.push(channel)
        this.subscribedChannels.add(channel)
      }
    }

    if (newChannels.length > 0) {
      // Abonnement Redis seulement pour les nouveaux channels
      this.sub.subscribe(...newChannels).catch((err: Error) => {
        console.error('[RedisSub] Impossible de souscrire aux channels:', err.message)
      })
    }

    // Retourne la fonction de cleanup — appelée quand le client SSE se déconnecte
    return () => {
      for (const channel of channels) {
        const callbacks = this.listeners.get(channel)
        if (!callbacks) continue

        callbacks.delete(cb)

        // Si plus aucun listener sur ce channel, se désabonner de Redis
        if (callbacks.size === 0) {
          this.listeners.delete(channel)
          this.subscribedChannels.delete(channel)
          this.sub.unsubscribe(channel).catch(() => {})
        }
      }
    }
  }
}

// Export du singleton — partagé par toutes les routes SSE du serveur
export const redisSub = RedisSubscriptionManager.getInstance()
