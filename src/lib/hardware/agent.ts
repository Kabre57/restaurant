type HardwarePayload = Record<string, unknown>

export type HardwareAction = 'print-receipt' | 'open-cash-drawer' | 'payment-terminal'

export async function sendHardwareCommand(action: HardwareAction, payload: HardwarePayload) {
  const baseUrl = process.env.LOCAL_HARDWARE_AGENT_URL
  if (!baseUrl) {
    return { success: false, error: 'Agent matériel non configuré.' }
  }

  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/${action}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(process.env.LOCAL_HARDWARE_AGENT_TOKEN
        ? { Authorization: `Bearer ${process.env.LOCAL_HARDWARE_AGENT_TOKEN}` }
        : {}),
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    return { success: false, error: `Agent matériel indisponible (${response.status}).` }
  }

  return { success: true }
}
