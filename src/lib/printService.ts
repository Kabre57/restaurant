// src/lib/printService.ts — Service d'impression brut ESC/POS pour imprimantes thermiques 80mm
// Compatible avec les connexions réseau directes (TCP/IP) ou locales

import { logger } from "@/lib/logger";

export interface PrintJobData {
  title: string;
  items: { 
    name: string; 
    qty: number; 
    price: number; 
    priceHT?: number | null; 
    taxRate?: number | null; 
    priceTTC?: number | null; 
    barcode?: string | null;
  }[];
  total: number;
  discount?: number;
  paymentMode?: string;
  amountReceived?: number;
  changeAmount?: number;
  orderNumber: string;
  clientRequestId?: string | null;
  table?: string;
  logoEscPos?: string | null; // Base64 du buffer ESC/POS du logo
  headerText?: string | null;
  footerText?: string | null;
  qrData?: string | null;
  cashierName?: string | null;
  storeName?: string | null;
  storeAddress?: string | null;
  storePhone?: string | null;
  storeEmail?: string | null;
  storeCode?: string | null;
}

function formatInvoiceNumber(displayId?: string | number | null, orderId?: string | number | null, date?: Date | string | null) {
  const idStr = String(displayId || orderId || '');
  if (/^FAC-\d{4}-\d+$/.test(idStr)) return idStr;

  const d = date ? new Date(date) : new Date();
  const MM = String(d.getMonth() + 1).padStart(2, '0');
  const YY = String(d.getFullYear()).substring(2);

  const numericPart = parseInt(String(displayId || ''), 10);
  const counter = isNaN(numericPart) ? '00001' : String(numericPart).padStart(5, '0');

  return `FAC-${MM}${YY}-${counter}`;
}

function getPaymentLabel(paymentMode?: string): string {
  if (!paymentMode) return 'Payé'
  const modeUpper = paymentMode.toUpperCase()
  if (modeUpper.includes('ESPECE') || modeUpper.includes('CASH')) {
    return 'Espèces payées'
  }
  if (modeUpper.includes('CARTE') || modeUpper.includes('CARD') || modeUpper.includes('VISA') || modeUpper.includes('MASTER')) {
    return 'Carte payée'
  }
  if (modeUpper.includes('REGLER') || modeUpper.includes('CAISSE')) {
    return 'À régler en caisse'
  }
  return `${paymentMode} payé`
}

function formatRow(left: string, right: string, width = 48): string {
  const spaces = width - left.length - right.length;
  return left + ' '.repeat(spaces > 0 ? spaces : 1) + right;
}

function formatItemRow(qty: number, price: number, taxRate: number, total: number): string {
  const qtyStr = String(qty);
  const priceStr = `${price.toFixed(2)} ({taxRate.toFixed(1)})%`;
  const totalStr = total < 0 ? `(${Math.abs(total).toFixed(2)})` : total.toFixed(2);

  const part1 = qtyStr.padEnd(6, ' ');      // Columns 0-5
  const part2 = priceStr.padEnd(27, ' ');    // Columns 6-32 (expanded)
  const part3 = totalStr.padStart(15, ' ');  // Columns 33-47
  
  return part1 + part2 + part3;
}

function formatTaxRow(taxCode: string, taxRate: string, taxableAmt: string, taxAmt: string): string {
  return taxCode.padEnd(8, ' ') +
         taxRate.padEnd(12, ' ') +
         taxableAmt.padStart(16, ' ') +
         taxAmt.padStart(12, ' ');
}

function formatReceiptDate(date: Date): string {
  const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
  const day = String(date.getDate()).padStart(2, '0');
  const month = months[date.getMonth()];
  const year = String(date.getFullYear()).substring(2);
  
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
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

  // 3. Titre et coordonnées du magasin
  commands.push(GS, 0x21, 0x08); // Texte en gras
  commands.push(...encodeText("FACTURE SIMPLIFIEE\n"));
  commands.push(GS, 0x21, 0x00); // Taille normale / non gras

  if (data.storeName) {
    commands.push(...encodeText(data.storeName + "\n"));
  }
  if (data.storeAddress) {
    commands.push(...encodeText(data.storeAddress + "\n"));
  }
  commands.push(...encodeText(`Tel : ${data.storePhone || ''}\n`));
  commands.push(...encodeText(`Email : ${data.storeEmail || ''}\n`));
  commands.push(LF);

  // Texte d'en-tête personnalisé
  if (data.headerText) {
    commands.push(...encodeText(data.headerText + "\n"));
  }

  commands.push(...encodeText("------------------------------------------------\n"));

  // 4. Métadonnées du reçu
  commands.push(ESC, 0x61, 0); // Alignement gauche
  const formattedInvoiceNo = formatInvoiceNumber(data.orderNumber, data.clientRequestId, new Date());
  commands.push(...encodeText(formatRow(`Date`, `: ${formatReceiptDate(new Date())}`) + "\n"));
  commands.push(...encodeText(formatRow(`Facture N°`, `: ${formattedInvoiceNo}`) + "\n"));

  commands.push(...encodeText("------------------------------------------------\n"));

  // 5. Articles
  let itemsCount = 0;
  const defaultTaxRatePercent = 18.00;
  const taxBreakdownMap: Record<number, { taxableAmt: number; taxAmt: number }> = {};

  for (const item of data.items) {
    itemsCount += item.qty;

    const unitTtc = item.priceTTC ?? item.price;
    const ratePercent = item.taxRate !== undefined && item.taxRate !== null ? item.taxRate : defaultTaxRatePercent;
    const rateDecimal = ratePercent / 100;
    const unitHt = item.priceHT !== undefined && item.priceHT !== null
      ? item.priceHT
      : unitTtc / (1 + rateDecimal);

    const itemHt = unitHt * item.qty;
    const itemTtc = unitTtc * item.qty;
    const itemTax = itemTtc - itemHt;

    // Ajout au breakdown taxe
    if (!taxBreakdownMap[ratePercent]) {
      taxBreakdownMap[ratePercent] = { taxableAmt: 0, taxAmt: 0 };
    }
    taxBreakdownMap[ratePercent].taxableAmt += itemHt;
    taxBreakdownMap[ratePercent].taxAmt += itemTax;

    // Ligne 1 : Barcode + Nom
    const barcodeStr = item.barcode ? `${item.barcode}   ` : '';
    const nameLimit = 48 - barcodeStr.length;
    const nameStr = item.name.slice(0, nameLimit);
    commands.push(...encodeText(`${barcodeStr}${nameStr}\n`));

    // Ligne 2 : Qty, Unit Price, Tax %, Total Price
    const itemRow = formatItemRow(item.qty, unitTtc, ratePercent, itemTtc);
    commands.push(...encodeText(itemRow + "\n"));
  }

  commands.push(...encodeText("------------------------------------------------\n"));

  // 6. Totaux
  const discount = data.discount || 0;
  const totalSales = data.total;
  const subtotalTtc = totalSales + discount;

  commands.push(...encodeText(formatRow("Nombre d'articles", String(itemsCount)) + "\n"));
  commands.push(...encodeText(formatRow("Montant total", subtotalTtc.toFixed(2)) + "\n"));
  commands.push(...encodeText(formatRow("Remise promotionnelle totale", discount.toFixed(2)) + "\n"));
  commands.push(...encodeText(formatRow("Remise du vendeur", "0.00") + "\n"));
  
  commands.push(...encodeText("------------------------------------------------\n"));
  commands.push(GS, 0x21, 0x08); // En gras
  commands.push(...encodeText(formatRow("Total des ventes", totalSales.toFixed(2)) + "\n"));
  commands.push(GS, 0x21, 0x00); // Taille normale
  commands.push(...encodeText("------------------------------------------------\n"));

  const paymentLabel = getPaymentLabel(data.paymentMode);
  commands.push(...encodeText(formatRow(paymentLabel, totalSales.toFixed(2)) + "\n"));

  commands.push(...encodeText("------------------------------------------------\n"));

  // 7. Ventilation fiscale
  commands.push(...encodeText(formatTaxRow("TVA", "Taux", "Base HT", "Montant") + "\n"));
  commands.push(...encodeText("------------------------------------------------\n"));
  
  Object.entries(taxBreakdownMap).forEach(([rate, val]) => {
    commands.push(...encodeText(formatTaxRow(
      "TVA",
      `${Number(rate).toFixed(1)}%`,
      val.taxableAmt.toFixed(2),
      val.taxAmt.toFixed(2)
    ) + "\n"));
  });

  commands.push(...encodeText("------------------------------------------------\n"));
  commands.push(LF);

  // 8. Agent de service / Serviced by
  commands.push(ESC, 0x61, 1); // Centré
  if (data.cashierName) {
    commands.push(...encodeText(`Vous avez été servi par ${data.cashierName}\n`));
  } else {
    commands.push(...encodeText("Vous avez été servi par Cody Weiss\n"));
  }

  // Texte de pied de page personnalisé
  if (data.footerText) {
    commands.push(LF);
    commands.push(...encodeText(data.footerText + "\n"));
  }

  // 8.5 Impression du Code QR si présent
  if (data.qrData) {
    commands.push(LF);
    
    const qrBytes = encodeText(data.qrData);
    const storeLen = qrBytes.length + 3;
    const pl = storeLen & 0xFF;
    const ph = (storeLen >> 8) & 0xFF;

    commands.push(
      // 1. Définir le modèle de QR Code (Modèle 2)
      0x1D, 0x28, 0x6B, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00,
      // 2. Définir la taille du module QR (taille 6)
      0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x43, 0x06,
      // 3. Définir le niveau de correction d'erreur (M = 15%)
      0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x44, 0x31,
      // 4. Stocker les données dans la mémoire symbole
      0x1D, 0x28, 0x6B, pl, ph, 0x31, 0x50, 0x30, ...qrBytes,
      // 5. Imprimer le symbole QR Code stocké
      0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x51, 0x30
    );
    commands.push(LF);
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
