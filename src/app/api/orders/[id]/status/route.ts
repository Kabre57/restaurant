// src/app/api/orders/[id]/status/route.ts — PATCH statut commande

import { NextRequest, NextResponse } from "next/server";
import { updateOrderStatus, OrderStatus } from "@/lib/orderService";

const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING:   ["PREPARING", "CANCELLED"],
  PREPARING: ["READY",     "CANCELLED"],
  READY:     ["SERVED",    "CANCELLED"],
  SERVED:    ["PAID"],
  PAID:      [],
  CANCELLED: [],
};

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id }    = await params;
  const { status } = await req.json() as { status: OrderStatus };

  if (!status) {
    return NextResponse.json({ error: "status requis" }, { status: 400 });
  }

  const updated = await updateOrderStatus(id, status);
  if (!updated) {
    return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });
  }

  return NextResponse.json({ order: updated }, { status: 200 });
}
