// src/services/export.service.ts
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import { DashboardReport } from "./analytics.service";
import { prisma } from "@/lib/db";
import { format } from "date-fns";

export interface ExportFilters {
  startDate: Date;
  endDate: Date;
  storeId?: string;
}

export class ExportService {
  /**
   * Helper pour créer une feuille Excel avec des colonnes auto-ajustées.
   */
  private static createSheet(headers: string[], rows: (string | number | { v: number; t: string; z: string })[][]): XLSX.WorkSheet {
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    
    // Calcul automatique de la largeur des colonnes
    const range = XLSX.utils.decode_range(ws["!ref"] || "A1");
    const cols = [];
    for (let C = range.s.c; C <= range.e.c; ++C) {
      let maxLen = headers[C]?.length || 10;
      for (let R = range.s.r; R <= range.e.r; ++R) {
        const cell = ws[XLSX.utils.encode_cell({ r: R, c: C })];
        if (cell && cell.v !== undefined) {
          let valStr = String(cell.v);
          if (cell.z && cell.z.includes("FCFA")) {
            valStr += " FCFA";
          }
          if (valStr.length > maxLen) {
            maxLen = valStr.length;
          }
        }
      }
      cols.push({ wch: maxLen + 3 });
    }
    ws["!cols"] = cols;
    return ws;
  }

  /**
   * Génère un fichier Excel multi-onglets contenant les analyses financières.
   */
  static async generateExcel(data: DashboardReport, filters: ExportFilters): Promise<Buffer> {
    const wb = XLSX.utils.book_new();

    // 1. Onglet CA par jour
    const caHeaders = ["Date / Période", "Chiffre d'Affaires", "Nombre de Commandes"];
    const caRows = data.revenueChart.map((point) => [
      point.label,
      { v: point.revenue, t: "n", z: '#,##0" FCFA"' },
      point.ordersCount,
    ]);
    const wsCa = this.createSheet(caHeaders, caRows);
    XLSX.utils.book_append_sheet(wb, wsCa, "CA par jour");

    // 2. Onglet Top produits (quantité)
    const qtyHeaders = ["Produit", "Quantité Vendue", "Chiffre d'Affaires", "Coût de Revient Unitaire", "Marge Totale", "Taux de Marge"];
    const qtySorted = [...data.topProducts].sort((a, b) => b.quantitySold - a.quantitySold);
    const qtyRows = qtySorted.map((p) => [
      p.name,
      p.quantitySold,
      { v: p.revenue, t: "n", z: '#,##0" FCFA"' },
      { v: p.costPrice, t: "n", z: '#,##0" FCFA"' },
      { v: p.marginAmount, t: "n", z: '#,##0" FCFA"' },
      { v: p.marginPercent / 100, t: "n", z: "0.0%" },
    ]);
    const wsQty = this.createSheet(qtyHeaders, qtyRows);
    XLSX.utils.book_append_sheet(wb, wsQty, "Top produits (quantité)");

    // 3. Onglet Top produits (CA)
    const revHeaders = ["Produit", "Quantité Vendue", "Chiffre d'Affaires", "Coût de Revient Unitaire", "Marge Totale", "Taux de Marge"];
    const revSorted = [...data.topProducts].sort((a, b) => b.revenue - a.revenue);
    const revRows = revSorted.map((p) => [
      p.name,
      p.quantitySold,
      { v: p.revenue, t: "n", z: '#,##0" FCFA"' },
      { v: p.costPrice, t: "n", z: '#,##0" FCFA"' },
      { v: p.marginAmount, t: "n", z: '#,##0" FCFA"' },
      { v: p.marginPercent / 100, t: "n", z: "0.0%" },
    ]);
    const wsRev = this.createSheet(revHeaders, revRows);
    XLSX.utils.book_append_sheet(wb, wsRev, "Top produits (CA)");

    // 4. Onglet Marges par produit
    const marginHeaders = ["Produit", "Prix de Vente", "Coût de Revient", "Marge Unitaire", "Taux de Marge"];
    const marginRows = data.marginProducts.map((p) => [
      p.name,
      { v: p.sellingPrice, t: "n", z: '#,##0" FCFA"' },
      { v: p.costPrice, t: "n", z: '#,##0" FCFA"' },
      { v: p.marginAmount, t: "n", z: '#,##0" FCFA"' },
      { v: p.marginPercent / 100, t: "n", z: "0.0%" },
    ]);
    const wsMargin = this.createSheet(marginHeaders, marginRows);
    XLSX.utils.book_append_sheet(wb, wsMargin, "Marges par produit");

    // 5. Onglet Fréquentation (couverts)
    const storeFilter = filters.storeId ? { storeId: filters.storeId } : {};
    const reservations = await prisma.reservation.findMany({
      where: {
        ...storeFilter,
        date: {
          gte: filters.startDate,
          lte: filters.endDate,
        },
      },
      orderBy: { date: "asc" },
    });

    const freqHeaders = ["Date", "Heure", "Client", "Téléphone", "Couverts", "Statut"];
    const freqRows = reservations.map((r) => [
      format(r.date, "yyyy-MM-dd"),
      format(r.startTime, "HH:mm"),
      r.customerName,
      r.phone,
      r.guests,
      r.status,
    ]);
    const wsFreq = this.createSheet(freqHeaders, freqRows);
    XLSX.utils.book_append_sheet(wb, wsFreq, "Fréquentation (couverts)");

    const wopts: XLSX.WritingOptions = { type: "buffer", bookType: "xlsx" };
    const buffer = XLSX.write(wb, wopts);
    return Buffer.from(buffer);
  }

  /**
   * Génère un rapport PDF professionnel incluant page de garde et graphique vectoriel.
   */
  static async generatePdf(data: DashboardReport, filters: ExportFilters): Promise<Buffer> {
    const doc = new jsPDF();

    // --- PAGE 1: PAGE DE GARDE ---
    // En-tête coloré
    doc.setFillColor(24, 28, 36);
    doc.rect(0, 0, 210, 85, "F");

    // Logo textuel
    doc.setTextColor(255, 109, 0); // Orange POS
    doc.setFont("helvetica", "bold");
    doc.setFontSize(26);
    doc.text("PARABELLUM POS", 20, 40);

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont("helvetica", "normal");
    doc.text("Système de gestion et d'encaissement de restaurant", 20, 50);

    // Contenu central
    doc.setTextColor(30, 41, 59);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("RAPPORT ANALYTIQUE DE PERFORMANCE", 20, 120);

    doc.setDrawColor(255, 109, 0);
    doc.setLineWidth(1.5);
    doc.line(20, 128, 100, 128);

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 110, 120);
    doc.text(`Période du : ${format(filters.startDate, "dd/MM/yyyy")} au ${format(filters.endDate, "dd/MM/yyyy")}`, 20, 140);
    
    // Récupérer le nom de l'établissement
    let storeName = "Tous les établissements";
    if (filters.storeId) {
      const store = await prisma.store.findUnique({ where: { id: filters.storeId } });
      if (store) storeName = store.name;
    }
    doc.text(`Établissement : ${storeName}`, 20, 148);

    // Métadonnées de pied de garde
    doc.setFontSize(10);
    doc.text(`Généré le : ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 20, 260);
    doc.text("Document confidentiel - Usage interne uniquement", 20, 268);

    // --- PAGE 2: INDICATEURS CLÉS ET GRAPHIQUE ---
    doc.addPage();
    
    // Titre de page
    doc.setTextColor(24, 28, 36);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("INDICATEURS CLÉS DE PERFORMANCE", 14, 25);
    
    doc.setDrawColor(220, 224, 230);
    doc.setLineWidth(0.5);
    doc.line(14, 28, 196, 28);

    // Tableau des KPIs
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(50, 50, 50);

    const kpis = [
      { l: "Chiffre d'Affaires Total", v: `${data.kpis.totalRevenue.toLocaleString("fr-FR")} FCFA` },
      { l: "Nombre Total de Commandes", v: `${data.kpis.totalOrders} commandes` },
      { l: "Panier Moyen", v: `${Math.round(data.kpis.averageOrderValue).toLocaleString("fr-FR")} FCFA` },
      { l: "Nombre de Couverts (Seated)", v: `${data.kpis.totalGuests} personnes` },
      { l: "Taux de Conversion des Réservations", v: `${data.kpis.reservationConversionRate.toFixed(1)}%` },
    ];

    let y = 40;
    kpis.forEach((kpi) => {
      doc.setFont("helvetica", "bold");
      doc.text(kpi.l, 16, y);
      doc.setFont("helvetica", "normal");
      doc.text(kpi.v, 120, y);
      y += 8;
    });

    // Graphique vectoriel d'évolution du CA
    y += 10;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Évolution du Chiffre d'Affaires", 14, y);

    // Axes et grille
    const chartY = y + 10;
    doc.setDrawColor(200, 200, 200);
    doc.line(30, chartY + 60, 190, chartY + 60); // Axe X
    doc.line(30, chartY, 30, chartY + 60); // Axe Y

    const maxRev = Math.max(...data.revenueChart.map((p) => p.revenue), 1000);
    
    // Grille Y (4 niveaux)
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    for (let i = 0; i <= 4; i++) {
      const levelY = chartY + 60 - i * 15;
      doc.setDrawColor(240, 240, 240);
      if (i > 0) doc.line(30, levelY, 190, levelY);
      const valLabel = `${Math.round((maxRev * i) / 4).toLocaleString("fr-FR")} FCFA`;
      doc.text(valLabel, 8, levelY + 2);
    }

    // Tracé des barres (Max 12 points pour lisibilité)
    const points = data.revenueChart.slice(-12);
    const barWidth = Math.floor(140 / Math.max(points.length, 1)) - 4;
    
    points.forEach((p, idx) => {
      const x = 35 + idx * Math.floor(150 / Math.max(points.length, 1));
      const height = (p.revenue / maxRev) * 55;
      const barY = chartY + 60 - height;

      // Dessiner la barre
      doc.setFillColor(255, 109, 0);
      doc.rect(x, barY, barWidth, height, "F");

      // Label X (tronqué si trop long)
      doc.setFontSize(7);
      const shortLabel = p.label.length > 10 ? p.label.slice(5) : p.label;
      doc.text(shortLabel, x, chartY + 65);
    });

    // --- PAGE 3: TOP PRODUITS ET TOTAUX ---
    doc.addPage();
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(24, 28, 36);
    doc.text("TOP 10 PRODUITS (Ventes & Marges)", 14, 25);
    doc.line(14, 28, 196, 28);

    // En-têtes du tableau
    let tableY = 40;
    doc.setFillColor(240, 242, 245);
    doc.rect(14, tableY, 182, 7, "F");
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("Nom du produit", 16, tableY + 5);
    doc.text("Quantité", 85, tableY + 5);
    doc.text("CA (FCFA)", 110, tableY + 5);
    doc.text("Marge (FCFA)", 145, tableY + 5);
    doc.text("Taux Marge", 175, tableY + 5);

    doc.setFont("helvetica", "normal");
    let totalQty = 0;
    let totalRev = 0;
    let totalMargin = 0;

    data.topProducts.slice(0, 10).forEach((p) => {
      tableY += 7;
      doc.text(p.name, 16, tableY + 5);
      doc.text(String(p.quantitySold), 85, tableY + 5);
      doc.text(p.revenue.toLocaleString("fr-FR"), 110, tableY + 5);
      doc.text(p.marginAmount.toLocaleString("fr-FR"), 145, tableY + 5);
      doc.text(`${p.marginPercent.toFixed(1)}%`, 175, tableY + 5);

      totalQty += p.quantitySold;
      totalRev += p.revenue;
      totalMargin += p.marginAmount;
    });

    // Ligne de totaux
    tableY += 7;
    doc.setFillColor(255, 109, 0);
    doc.rect(14, tableY, 182, 7, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.text("Total Top Produits", 16, tableY + 5);
    doc.text(String(totalQty), 85, tableY + 5);
    doc.text(totalRev.toLocaleString("fr-FR"), 110, tableY + 5);
    doc.text(totalMargin.toLocaleString("fr-FR"), 145, tableY + 5);
    const avgMarginPercent = totalRev > 0 ? (totalMargin / totalRev) * 100 : 0;
    doc.text(`${avgMarginPercent.toFixed(1)}%`, 175, tableY + 5);

    // --- PAGE 4: ANALYSE DES MARGES & RÉSERVATIONS ---
    doc.addPage();
    doc.setTextColor(24, 28, 36);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("ANALYSE GÉNÉRALE DES MARGES", 14, 25);
    doc.line(14, 28, 196, 28);

    tableY = 40;
    doc.setFillColor(240, 242, 245);
    doc.rect(14, tableY, 182, 7, "F");
    doc.setFontSize(9);
    doc.text("Nom du produit", 16, tableY + 5);
    doc.text("Prix de Vente", 75, tableY + 5);
    doc.text("Coût de Revient", 110, tableY + 5);
    doc.text("Marge Unitaire", 145, tableY + 5);
    doc.text("Taux Marge", 175, tableY + 5);

    doc.setFont("helvetica", "normal");
    data.marginProducts.slice(0, 12).forEach((p) => {
      tableY += 7;
      doc.text(p.name, 16, tableY + 5);
      doc.text(p.sellingPrice.toLocaleString("fr-FR"), 75, tableY + 5);
      doc.text(p.costPrice.toLocaleString("fr-FR"), 110, tableY + 5);
      doc.text(p.marginAmount.toLocaleString("fr-FR"), 145, tableY + 5);
      doc.text(`${p.marginPercent.toFixed(1)}%`, 175, tableY + 5);
    });

    // Détail des fréquentations
    tableY += 15;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Rapport de Fréquentation (Réservations)", 14, tableY);

    const storeFilterReservations = filters.storeId ? { storeId: filters.storeId } : {};
    const reservationsList = await prisma.reservation.findMany({
      where: {
        ...storeFilterReservations,
        date: {
          gte: filters.startDate,
          lte: filters.endDate,
        },
      },
      orderBy: { date: "asc" },
      take: 10,
    });

    tableY += 6;
    doc.setFillColor(240, 242, 245);
    doc.rect(14, tableY, 182, 7, "F");
    doc.setFontSize(8);
    doc.text("Date", 16, tableY + 5);
    doc.text("Client", 50, tableY + 5);
    doc.text("Téléphone", 100, tableY + 5);
    doc.text("Couverts", 150, tableY + 5);
    doc.text("Statut", 175, tableY + 5);

    doc.setFont("helvetica", "normal");
    reservationsList.forEach((r) => {
      tableY += 7;
      doc.text(format(r.date, "yyyy-MM-dd"), 16, tableY + 5);
      doc.text(r.customerName, 50, tableY + 5);
      doc.text(r.phone, 100, tableY + 5);
      doc.text(String(r.guests), 150, tableY + 5);
      doc.text(r.status, 175, tableY + 5);
    });

    // Numérotation des pages
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`Page ${i} sur ${pageCount}`, 180, 290);
    }

    const arrayBuffer = doc.output("arraybuffer");
    return Buffer.from(arrayBuffer);
  }
}
