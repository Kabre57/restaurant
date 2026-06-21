import { HardwareAction } from './agent'

interface PrinterInfo {
  id: string
  name: string
  ipAddress: string
  type: string
}

interface HardwareResponse {
  success: boolean
  data?: Record<string, unknown>
  error?: string
}

/**
 * Récupère l'URL de l'agent matériel local configurée dans le localStorage.
 * Par défaut, retourne 'http://127.0.0.1:4555'.
 */
export function getLocalAgentUrl(): string {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('LOCAL_HARDWARE_AGENT_URL')
    if (saved) return saved
  }
  return 'http://127.0.0.1:4555'
}

/**
 * Enregistre l'URL de l'agent matériel local dans le localStorage.
 */
export function setLocalAgentUrl(url: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('LOCAL_HARDWARE_AGENT_URL', url)
  }
}

/**
 * Récupère le jeton d'authentification de l'agent local configuré dans le localStorage.
 */
export function getLocalAgentToken(): string {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('LOCAL_HARDWARE_AGENT_TOKEN') || ''
  }
  return ''
}

/**
 * Enregistre le jeton d'authentification de l'agent matériel local dans le localStorage.
 */
export function setLocalAgentToken(token: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('LOCAL_HARDWARE_AGENT_TOKEN', token)
  }
}

/**
 * Envoie une commande HTTP directement depuis le navigateur vers l'agent matériel local.
 */
export async function sendHardwareCommandClient(
  action: HardwareAction,
  payload: Record<string, unknown>
): Promise<HardwareResponse> {
  const baseUrl = getLocalAgentUrl()
  const token = getLocalAgentToken()

  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, '')}/${action}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      return { success: false, error: `Agent matériel indisponible (${response.status}).` }
    }

    const data = await response.json().catch(() => ({})) as Record<string, unknown>
    return { success: true, data }
  } catch (error) {
    console.error(`Erreur de connexion à l'agent matériel sur ${baseUrl}:`, error)
    return { success: false, error: "Erreur de connexion à l'agent matériel local." }
  }
}

/**
 * Gère le flux d'impression de reçu client en appelant l'API du serveur pour générer
 * le buffer d'impression, puis en envoyant ce buffer à chaque imprimante via l'agent local.
 */
export async function printReceiptClient(orderData: Record<string, unknown>): Promise<HardwareResponse> {
  try {
    const res = await fetch('/api/hardware/print', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ order: orderData }),
    })

    if (!res.ok) {
      return { success: false, error: `Erreur serveur lors de la préparation de l'impression (${res.status}).` }
    }

    const data = await res.json() as { success: boolean; payload?: string; printers?: PrinterInfo[]; error?: string }
    if (!data.success || !data.payload || !data.printers) {
      return { success: false, error: data.error || "Impossible de générer le ticket d'impression." }
    }

    let printedCount = 0
    for (const printer of data.printers) {
      const agentRes = await sendHardwareCommandClient('print-receipt', {
        printerIp: printer.ipAddress,
        payload: data.payload,
      })
      if (agentRes.success) {
        printedCount++
      }
    }

    return {
      success: printedCount > 0,
      error: printedCount === 0 ? "Aucune imprimante n'a pu imprimer le ticket." : undefined,
    }
  } catch (error) {
    console.error("Erreur d'impression du reçu client:", error)
    return { success: false, error: "Erreur de communication lors de l'impression." }
  }
}

/**
 * Gère l'ouverture du tiroir-caisse en interrogeant l'API serveur pour obtenir
 * les adresses IP des imprimantes puis en envoyant la commande d'ouverture à l'agent local.
 */
export async function openCashDrawerClient(orderId: string | number, total: number): Promise<HardwareResponse> {
  try {
    const res = await fetch('/api/hardware/cash-drawer', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ orderId, total }),
    })

    if (!res.ok) {
      return { success: false, error: `Erreur serveur tiroir-caisse (${res.status}).` }
    }

    const data = await res.json() as { success: boolean; action?: HardwareAction; payload?: Record<string, unknown>; error?: string }
    if (!data.success || !data.payload || !data.action) {
      return { success: false, error: data.error || "Impossible de configurer l'ouverture du tiroir." }
    }

    return await sendHardwareCommandClient(data.action, data.payload)
  } catch (error) {
    console.error("Erreur d'ouverture du tiroir-caisse:", error)
    return { success: false, error: "Erreur de communication lors de l'ouverture du tiroir-caisse." }
  }
}

/**
 * Déclenche une demande de transaction vers le terminal de paiement physique via l'agent local.
 */
export async function triggerPaymentTerminalClient(amount: number, transactionId: string): Promise<HardwareResponse> {
  try {
    const res = await fetch('/api/hardware/payment-terminal', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ amount, transactionId }),
    })

    if (!res.ok) {
      return { success: false, error: `Erreur serveur paiement (${res.status}).` }
    }

    const data = await res.json() as { success: boolean; action?: HardwareAction; payload?: Record<string, unknown>; error?: string }
    if (!data.success || !data.payload || !data.action) {
      return { success: false, error: data.error || "Impossible de configurer la transaction de paiement." }
    }

    return await sendHardwareCommandClient(data.action, data.payload)
  } catch (error) {
    console.error("Erreur du terminal de paiement:", error)
    return { success: false, error: "Erreur de communication avec le terminal de paiement." }
  }
}
