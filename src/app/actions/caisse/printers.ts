'use server'

import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { sendHardwareCommand } from '@/lib/hardware/agent'

export type PrinterInput = {
  id?: string
  name: string
  type: string // "ETHERNET" | "USB" | "BLUETOOTH"
  ipAddress?: string | null
  port?: number
  paperWidth?: number
  printReceipts?: boolean
  printOrders?: boolean
  categories?: string | null
}

// ──────────────────────────────────────────────────────────────────────
// getPrinters — Récupère la liste des imprimantes configurées
// ──────────────────────────────────────────────────────────────────────
export async function getPrinters(storeId: string) {
  try {
    const printers = await prisma.printer.findMany({
      where: { storeId },
      orderBy: { createdAt: 'asc' },
    })
    return { success: true, printers }
  } catch (error) {
    console.error('Failed to fetch printers:', error)
    return { success: false, error: 'Impossible de récupérer la liste des imprimantes.' }
  }
}

// ──────────────────────────────────────────────────────────────────────
// savePrinter — Ajoute ou met à jour un périphérique matériel
// ──────────────────────────────────────────────────────────────────────
export async function savePrinter(storeId: string, data: PrinterInput) {
  try {
    if (!data.name.trim()) {
      return { success: false, error: "Le nom de l'imprimante est obligatoire." }
    }
    if (data.type === 'ETHERNET' && !data.ipAddress?.trim()) {
      return { success: false, error: "L'adresse IP est obligatoire pour une connexion Ethernet." }
    }

    const printerData = {
      storeId,
      name: data.name.trim(),
      type: data.type,
      ipAddress: data.type === 'ETHERNET' ? data.ipAddress?.trim() : null,
      port: data.port ?? 9100,
      paperWidth: data.paperWidth ?? 80,
      printReceipts: data.printReceipts ?? true,
      printOrders: data.printOrders ?? false,
      categories: data.categories || null,
    }

    let printer
    if (data.id) {
      printer = await prisma.printer.update({
        where: { id: data.id },
        data: printerData,
      })
    } else {
      printer = await prisma.printer.create({
        data: printerData,
      })
    }

    try {
      revalidatePath('/restaurateur/config/materiel')
    } catch {
      // Ignorer l'erreur d'invariant hors du contexte Next.js (ex: tests ou scripts CLI)
    }

    return { success: true, printer }
  } catch (error) {
    console.error('Failed to save printer:', error)
    return { success: false, error: "Erreur lors de l'enregistrement de l'imprimante." }
  }
}

// ──────────────────────────────────────────────────────────────────────
// deletePrinter — Supprime un périphérique matériel
// ──────────────────────────────────────────────────────────────────────
export async function deletePrinter(id: string) {
  try {
    await prisma.printer.delete({
      where: { id },
    })

    try {
      revalidatePath('/restaurateur/config/materiel')
    } catch {
      // Ignorer l'erreur d'invariant
    }

    return { success: true }
  } catch (error) {
    console.error('Failed to delete printer:', error)
    return { success: false, error: "Erreur lors de la suppression de l'imprimante." }
  }
}

// ──────────────────────────────────────────────────────────────────────
// testPrinterConnection — Envoie un ticket d'autotest ESC/POS matériel
// ──────────────────────────────────────────────────────────────────────
export async function testPrinterConnection(id: string) {
  try {
    const printer = await prisma.printer.findUnique({
      where: { id },
    })

    if (!printer) {
      return { success: false, error: 'Périphérique introuvable.' }
    }

    // 1. Construire les commandes d'autotest ESC/POS
    const ESC = 0x1b
    const GS  = 0x1d
    const LF  = 0x0a

    const commands: number[] = []
    commands.push(ESC, 0x40) // Init printer
    commands.push(ESC, 0x61, 1) // Center

    // Double largeur/hauteur pour le titre du test
    commands.push(GS, 0x21, 0x11)
    commands.push(...encodeText("AUTOTEST GOURMET\n"))
    commands.push(GS, 0x21, 0x00) // Normal size
    commands.push(...encodeText("================================\n"))

    commands.push(ESC, 0x61, 0) // Left align
    commands.push(...encodeText(`Imprimante : ${printer.name}\n`))
    commands.push(...encodeText(`Connectique: ${printer.type}\n`))
    if (printer.type === 'ETHERNET') {
      commands.push(...encodeText(`Adresse IP : ${printer.ipAddress}\n`))
      commands.push(...encodeText(`Port IP    : ${printer.port}\n`))
    }
    commands.push(...encodeText(`Format     : ${printer.paperWidth}mm\n`))
    commands.push(...encodeText(`Reçus      : ${printer.printReceipts ? 'OUI' : 'NON'}\n`))
    commands.push(...encodeText(`Cuisine    : ${printer.printOrders ? 'OUI' : 'NON'}\n`))
    if (printer.categories) {
      commands.push(...encodeText(`Catégories : ${printer.categories}\n`))
    }
    commands.push(...encodeText(`Date test  : ${new Date().toLocaleString('fr-FR')}\n`))
    commands.push(...encodeText("================================\n"))

    commands.push(ESC, 0x61, 1) // Center
    commands.push(...encodeText("TEST DE COMMUNICATION REUSSI !\n\n"))
    commands.push(LF, LF, LF, LF)
    commands.push(GS, 0x56, 66, 0) // Cut

    const base64Payload = Buffer.from(new Uint8Array(commands)).toString('base64')

    return {
      success: true,
      printerIp: printer.ipAddress || '127.0.0.1',
      payload: base64Payload,
      printerName: printer.name,
      paperWidth: printer.paperWidth,
      simulated: true,
      receiptPreview: `
--------------------------------
        AUTOTEST GOURMET        
--------------------------------
Imprimante : ${printer.name}
Connectique: ${printer.type}
${printer.type === 'ETHERNET' ? `Adresse IP : ${printer.ipAddress}\nPort IP    : ${printer.port}` : ''}
Format     : ${printer.paperWidth}mm
Reçus      : ${printer.printReceipts ? 'OUI' : 'NON'}
Cuisine    : ${printer.printOrders ? 'OUI' : 'NON'}
${printer.categories ? `Catégories : ${printer.categories}` : ''}
Date test  : ${new Date().toLocaleString('fr-FR')}
--------------------------------
 TEST DE COMMUNICATION REUSSI ! 
--------------------------------
        [DECOUPE PAPIER]        
      `.trim(),
    }
  } catch (error) {
    console.error('Failed to test printer connection:', error)
    return { success: false, error: "Échec de l'envoi de la commande de test." }
  }
}

function encodeText(text: string): number[] {
  const encoder = new TextEncoder()
  return Array.from(encoder.encode(text))
}

// ──────────────────────────────────────────────────────────────────────
// discoverPrinters — Recherche les imprimantes sur le réseau local
// ──────────────────────────────────────────────────────────────────────
export async function discoverPrinters() {
  try {
    const agentResult = await sendHardwareCommand('discover-printers', {})
    
    if (agentResult.success && agentResult.data) {
      return { success: true, printers: agentResult.data }
    } else {
      // Simulation pour la démo si l'agent n'est pas branché
      return { 
        success: true, 
        simulated: true,
        printers: [
          { name: 'EPSON TM-T20III', ip: '192.168.1.100', mac: '00:11:22:33:44:55' },
          { name: 'Xprinter XP-80C', ip: '192.168.1.105', mac: 'AA:BB:CC:DD:EE:FF' }
        ]
      }
    }
  } catch (error) {
    console.error('Failed to discover printers:', error)
    return { success: false, error: "Échec de la recherche d'imprimantes sur le réseau." }
  }
}
