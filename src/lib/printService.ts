// src/lib/printService.ts — Service d'impression brut ESC/POS pour imprimantes thermiques 80mm
// Compatible avec les connexions réseau directes (TCP/IP) ou locales

import { logger } from "@/lib/logger";

export interface PrintJobData {
  title: string;
  items: { name: string; qty: number; price: number }[];
  total: number;
  orderNumber: string;
  table?: string;
  logoEscPos?: string | null; // Base64 du buffer ESC/POS du logo
  headerText?: string | null;
  footerText?: string | null;
}

/**
 * Génère le tampon binaire brut (ESC/POS) pour une imprimante thermique.
 * À envoyer directement au port 9100 d'une imprimante réseau.
 */
export function generateEscPosBuffer(data: PrintJobData): Uint8Array {
  const ESC = 0x1b;
  const GS  = 0x1d;
  const LF  = 0x0a;

  const commands: number[] = [];

  // 1. Initialisation
  commands.push(ESC, 0x40); // ESC @ (Init)
  commands.push(ESC, 0x61, 1); // Centré

  // 2. Impression du logo
  if (data.logoEscPos) {
    try {
      const logoBytes = Buffer.from(data.logoEscPos, 'base64');
      commands.push(...Array.from(logoBytes));
      commands.push(LF);
    } catch (e) {
      logger.error("Erreur de décodage du logo ESC/POS:", e);
    }
  }

  // 3. Texte d'en-tête personnalisé
  if (data.headerText) {
    commands.push(...encodeText(data.headerText + "\n"));
    commands.push(LF);
  }

  // 4. Titre (Double taille)
  commands.push(GS, 0x21, 0x11); // Double hauteur/largeur
  commands.push(...encodeText(data.title + "\n"));
  commands.push(GS, 0x21, 0x00); // Taille normale
  commands.push(...encodeText("--------------------------------\n"));

  // 5. Infos commande
  commands.push(ESC, 0x61, 0); // Alignement gauche
  commands.push(...encodeText(`Commande : ${data.orderNumber}\n`));
  if (data.table) {
    commands.push(...encodeText(`Table    : ${data.table}\n`));
  }
  commands.push(...encodeText(`Date     : ${new Date().toLocaleString("fr-FR")}\n`));
  commands.push(...encodeText("--------------------------------\n"));

  // 6. Articles
  for (const item of data.items) {
    const qtyStr = `${item.qty}x`.padEnd(5);
    const priceStr = `${(item.price * item.qty).toLocaleString('fr-FR')} FCFA`;
    const nameLimit = 32 - qtyStr.length - priceStr.length;
    const nameStr = item.name.slice(0, nameLimit).padEnd(nameLimit);
    commands.push(...encodeText(`${qtyStr}${nameStr}${priceStr}\n`));
  }

  // 7. Total
  commands.push(...encodeText("--------------------------------\n"));
  commands.push(GS, 0x21, 0x01); // Double largeur pour le total
  commands.push(...encodeText(`TOTAL : ${data.total.toLocaleString('fr-FR')} FCFA\n`));
  commands.push(GS, 0x21, 0x00); // Retour normal

  // 8. Texte de pied de page personnalisé
  if (data.footerText) {
    commands.push(LF);
    commands.push(ESC, 0x61, 1); // Centré
    commands.push(...encodeText(data.footerText + "\n"));
  }

  // 9. Fin de ticket & Découpe automatique
  commands.push(LF, LF, LF, LF);
  commands.push(GS, 0x56, 66, 0); // GS V 66 0 (Découpe complète)

  return new Uint8Array(commands);
}

function encodeText(text: string): number[] {
  const encoder = new TextEncoder();
  return Array.from(encoder.encode(text));
}
