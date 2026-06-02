// src/app/api/orders/[id]/ticket/route.ts — Génération ticket PDF (format 80mm)

import { NextRequest, NextResponse } from "next/server";
import { getOrderStore } from "@/lib/orderService";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const store  = getOrderStore();
  const order  = store.get(id);

  if (!order) {
    // Essai DB
    try {
      const { db } = await import("@/lib/db");
      if (db) {
        const dbOrder = await db.order.findUnique({
          where: { id },
          include: { items: { include: { product: true } }, table: true },
        });
        if (!dbOrder) return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });

        return generateTicketHTML({
          id:          dbOrder.id,
          orderNumber: dbOrder.orderNumber,
          tableNumber: dbOrder.table?.number ?? null,
          type:        dbOrder.type,
          totalAmount: dbOrder.totalAmount,
          createdAt:   dbOrder.createdAt.toISOString(),
          items:       dbOrder.items.map((i: any) => ({ name: i.product.name, quantity: i.quantity, unitPrice: i.unitPrice })),
        });
      }
    } catch { /* fallback */ }
    return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });
  }

  return generateTicketHTML({
    id:          order.id,
    orderNumber: order.orderNumber,
    tableNumber: order.tableNumber ?? null,
    type:        order.type,
    totalAmount: order.totalAmount,
    createdAt:   order.createdAt,
    items:       order.items.map((i) => ({ name: i.productName, quantity: i.quantity, unitPrice: i.unitPrice })),
  });
}

interface TicketData {
  id: string;
  orderNumber: string;
  tableNumber: string | null;
  type: string;
  totalAmount: number;
  createdAt: string;
  items: { name: string; quantity: number; unitPrice: number }[];
}

function generateTicketHTML(data: TicketData): NextResponse {
  const date = new Date(data.createdAt).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
  const typeLabel = { DINE_IN: "Sur place", TAKEAWAY: "À emporter", DELIVERY: "Livraison" }[data.type] ?? data.type;

  const itemsRows = data.items.map((item) =>
    `<tr>
      <td>${item.quantity}x ${item.name}</td>
      <td style="text-align:right">${(item.unitPrice * item.quantity).toFixed(2)} €</td>
    </tr>`
  ).join("");

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Ticket ${data.orderNumber}</title>
  <style>
    @page { size: 80mm auto; margin: 4mm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Courier New', monospace; font-size: 12px; color: #000; width: 72mm; }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    .big { font-size: 16px; font-weight: bold; }
    .divider { border-top: 1px dashed #000; margin: 6px 0; }
    table { width: 100%; border-collapse: collapse; }
    td { padding: 2px 0; }
    .total-row td { font-weight: bold; font-size: 14px; border-top: 1px solid #000; padding-top: 4px; }
    @media print {
      body { -webkit-print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="center">
    <div class="big">🍔 Le Burger Doré</div>
    <div>12 Rue de Rivoli, 75001 Paris</div>
    <div>Tel: +33 1 42 00 10 20</div>
  </div>
  <div class="divider"></div>
  <div><span class="bold">Ticket:</span> ${data.orderNumber}</div>
  <div><span class="bold">Date:</span> ${date}</div>
  <div><span class="bold">Type:</span> ${typeLabel}</div>
  ${data.tableNumber ? `<div><span class="bold">Table:</span> ${data.tableNumber}</div>` : ""}
  <div class="divider"></div>
  <table>
    <tbody>${itemsRows}</tbody>
    <tfoot>
      <tr class="total-row">
        <td>TOTAL</td>
        <td style="text-align:right">${data.totalAmount.toFixed(2)} €</td>
      </tr>
    </tfoot>
  </table>
  <div class="divider"></div>
  <div class="center">Merci de votre visite !</div>
  <div class="center" style="font-size:10px; margin-top:4px">ID: ${data.id.slice(0, 8)}</div>
  <script>window.onload = () => window.print();</script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type":        "text/html; charset=utf-8",
      "Content-Disposition": `inline; filename="ticket-${data.orderNumber}.html"`,
    },
  });
}
