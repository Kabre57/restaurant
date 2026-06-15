'use client'

import type { CashDrawerShift } from '../types'

export function printShiftReport(
  shift: CashDrawerShift,
  activeShiftId: string | undefined,
  totalCashSales: number,
  triggerError: (msg: string) => void
) {
  const printWindow = window.open('', '_blank', 'width=650,height=850')
  if (!printWindow) {
    triggerError("Le bloqueur de fenêtres contextuelles a empêché l'impression.")
    return
  }

  // Calculer les ventes en espèces
  const totalPayIn = shift.operations
    .filter(o => o.type === 'PAY_IN')
    .reduce((acc, curr) => acc + curr.amount, 0)
  const totalPayOut = shift.operations
    .filter(o => o.type === 'PAY_OUT')
    .reduce((acc, curr) => acc + curr.amount, 0)

  const cashSales = shift.status === 'CLOSED' && shift.expectedAmount !== null
    ? (shift.expectedAmount - shift.startAmount - totalPayIn + totalPayOut)
    : (shift.id === activeShiftId ? totalCashSales : 0)

  const expected = shift.expectedAmount !== null 
    ? shift.expectedAmount 
    : (shift.startAmount + cashSales + totalPayIn - totalPayOut)

  const reel = shift.endAmount !== null ? shift.endAmount : null
  const ecart = reel !== null ? (reel - expected) : null

  const operationsHtml = shift.operations.length > 0 
    ? `
      <h3 style="font-size: 11px; font-weight: 800; border-bottom: 1px solid #333; padding-bottom: 5px; margin-top: 25px; text-transform: uppercase;">
        Journal des Ajustements
      </h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 20px;">
        <thead>
          <tr style="border-bottom: 1px solid #333; text-align: left; font-weight: bold;">
            <th style="padding: 5px 0;">Heure</th>
            <th style="padding: 5px 0;">Type</th>
            <th style="padding: 5px 0;">Motif / Note</th>
            <th style="padding: 5px 0; text-align: right;">Montant</th>
          </tr>
        </thead>
        <tbody>
          ${shift.operations.map(op => `
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 5px 0;">${new Date(op.createdAt).toLocaleTimeString('fr-FR')}</td>
              <td style="padding: 5px 0; font-weight: bold; color: ${op.type === 'PAY_IN' ? '#059669' : '#dc2626'}">
                ${op.type === 'PAY_IN' ? 'Entrée (Ajoute des espèces)' : 'Sortie (retrait)'}
              </td>
              <td style="padding: 5px 0; color: #555;">${op.note || '—'}</td>
              <td style="padding: 5px 0; text-align: right; font-weight: bold;">
                ${op.amount.toLocaleString()} FCFA
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `
    : '<p style="font-size: 11px; color: #666; font-style: italic; margin-top: 20px;">Aucun ajustement d\'espèces enregistré durant ce shift.</p>'

  printWindow.document.write(`
    <html>
      <head>
        <title>Rapport de Clôture - Caisse</title>
        <style>
          body {
            font-family: 'Courier New', Courier, monospace, sans-serif;
            margin: 30px;
            color: #000;
            background-color: #fff;
            line-height: 1.4;
          }
          .header {
            text-align: center;
            border-bottom: 2px dashed #000;
            padding-bottom: 10px;
            margin-bottom: 15px;
          }
          .header h1 {
            margin: 0;
            font-size: 16px;
            text-transform: uppercase;
          }
          .info-grid {
            font-size: 11px;
            margin-bottom: 15px;
          }
          .info-grid div {
            margin-bottom: 3px;
          }
          .summary-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
          }
          .summary-table td {
            padding: 6px 0;
            font-size: 11px;
            border-bottom: 1px dashed #ccc;
          }
          .summary-table tr.total-row td {
            font-weight: bold;
            font-size: 12px;
            border-top: 1px dashed #000;
            border-bottom: 1px dashed #000;
            padding: 8px 0;
          }
          .footer {
            margin-top: 40px;
            text-align: center;
            font-size: 10px;
            border-top: 1px dashed #000;
            padding-top: 10px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>RAPPORT DE ROTATION</h1>
          <p style="margin: 3px 0 0 0; font-size: 11px; font-weight: bold;">Gourmet POS System</p>
        </div>

        <div class="info-grid">
          <div><strong>Shift ID:</strong> ${shift.id}</div>
          <div><strong>Caissier:</strong> ${shift.openedByName}</div>
          <div><strong>Date Ouverture:</strong> ${new Date(shift.openedAt).toLocaleString('fr-FR')}</div>
          ${shift.closedAt ? `<div><strong>Date Clôture:</strong> ${new Date(shift.closedAt).toLocaleString('fr-FR')}</div>` : '<div><strong>Date Clôture:</strong> En cours</div>'}
          <div><strong>Statut:</strong> ${shift.status === 'CLOSED' ? 'CLÔTURÉ' : 'OUVERT'}</div>
        </div>

        <table class="summary-table">
          <tr>
            <td>Fond de caisse initial</td>
            <td style="text-align: right; font-weight: bold;">${shift.startAmount.toLocaleString()} FCFA</td>
          </tr>
          <tr>
            <td>Ventes en espèces</td>
            <td style="text-align: right; font-weight: bold;">+${cashSales.toLocaleString()} FCFA</td>
          </tr>
          <tr>
            <td>Entrées (Ajoute des espèces)</td>
            <td style="text-align: right; font-weight: bold; color: #059669;">+${totalPayIn.toLocaleString()} FCFA</td>
          </tr>
          <tr>
            <td>Sorties (retrait)</td>
            <td style="text-align: right; font-weight: bold; color: #dc2626;">-${totalPayOut.toLocaleString()} FCFA</td>
          </tr>
          <tr class="total-row">
            <td>Montant Attendu</td>
            <td style="text-align: right;">${expected.toLocaleString()} FCFA</td>
          </tr>
          <tr>
            <td>Montant Réel Clôture</td>
            <td style="text-align: right; font-weight: bold;">${reel !== null ? `${reel.toLocaleString()} FCFA` : 'Non renseigné'}</td>
          </tr>
          ${ecart !== null ? `
          <tr style="font-weight: bold; background-color: #f3f4f6;">
            <td style="padding: 8px 5px;">Écart de caisse</td>
            <td style="text-align: right; padding: 8px 5px;">
              ${ecart === 0 ? 'Parfait (0)' : ecart > 0 ? `Excédent (+${ecart.toLocaleString()})` : `Déficit (${ecart.toLocaleString()})`} FCFA
            </td>
          </tr>
          ` : ''}
        </table>

        ${operationsHtml}

        <div class="footer">
          <p>Généré le ${new Date().toLocaleString('fr-FR')} - Gourmet POS</p>
          <p>Signature Caissier: ____________________</p>
        </div>

        <script>
          window.onload = function() {
            window.print();
          }
        </script>
      </body>
    </html>
  `)
  printWindow.document.close()
}
