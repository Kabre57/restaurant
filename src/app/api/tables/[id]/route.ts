// src/app/api/tables/[id]/route.ts
// PATCH /api/tables/:id  — Mettre à jour le statut d'une table en base de données réelle
// DELETE /api/tables/:id — Supprimer une table de la base de données réelle

import { NextRequest, NextResponse } from "next/server";
import { redisPub, REDIS_CHANNELS } from "@/lib/redis";
import { prisma } from '@/lib/db'
import { TableData, TableStatus } from "../route";

function getZoneInfo(tableNumber: number) {
  if (tableNumber <= 2) {
    return { zone: "Terrasse", zoneId: "z1" };
  } else if (tableNumber <= 5) {
    return { zone: "Salle Principale", zoneId: "z2" };
  } else {
    return { zone: "Étage", zoneId: "z3" };
  }
}

function mapPrismaStatus(status: string): TableStatus {
  switch (status) {
    case "AVAILABLE": return "LIBRE";
    case "OCCUPIED": return "OCCUPEE";
    case "RESERVED": return "RESERVEE";
    default: return "LIBRE";
  }
}

function mapToPrismaStatus(status: TableStatus): "AVAILABLE" | "OCCUPIED" | "RESERVED" {
  switch (status) {
    case "LIBRE": return "AVAILABLE";
    case "OCCUPEE": return "OCCUPIED";
    case "RESERVEE": return "RESERVED";
    case "EN_NETTOYAGE": return "AVAILABLE"; // Fallback
    default: return "AVAILABLE";
  }
}

// ─── PATCH ─────────────────────────────────────────────────
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { status, restaurantId = "store-main" } = body as {
      status: TableStatus;
      restaurantId?: string;
    };

    const actualStoreId = restaurantId === "default" ? "store-main" : restaurantId;

    const VALID_STATUSES: TableStatus[] = ["LIBRE", "OCCUPEE", "RESERVEE", "EN_NETTOYAGE"];
    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: `Statut invalide. Valeurs: ${VALID_STATUSES.join(", ")}` }, { status: 400 });
    }

    const tableExists = await prisma.table.findUnique({
      where: { id }
    });

    if (!tableExists) {
      return NextResponse.json({ error: "Table introuvable" }, { status: 404 });
    }

    const updatedTable = await prisma.table.update({
      where: { id },
      data: {
        status: mapToPrismaStatus(status),
      }
    });

    const zoneInfo = getZoneInfo(updatedTable.number);
    const resultTable: TableData = {
      id:             updatedTable.id,
      number:         `T-${updatedTable.number.toString().padStart(2, '0')}`,
      seats:          updatedTable.capacity,
      status:         status, // On préserve le statut demandé (y compris EN_NETTOYAGE)
      zone:           zoneInfo.zone,
      zoneId:         zoneInfo.zoneId,
      occupiedSince:  status === "OCCUPEE" ? new Date().toISOString() : null,
      currentOrderId: null,
      updatedAt:      updatedTable.updatedAt.toISOString(),
    };

    // Pub/Sub — événement temps réel
    try {
      await redisPub.publish(
        REDIS_CHANNELS.tableUpdated(actualStoreId),
        JSON.stringify({ event: "TABLE_UPDATED", table: resultTable })
      );
    } catch { /* silent */ }

    return NextResponse.json({ table: resultTable }, { status: 200 });
  } catch (error) {
    console.error("[PATCH /api/tables/[id]] Erreur :", error);
    return NextResponse.json({ error: "Impossible de modifier la table" }, { status: 500 });
  }
}

// ─── DELETE ────────────────────────────────────────────────
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = req.nextUrl;
    let restaurantId = searchParams.get("restaurantId") ?? "store-main";
    if (restaurantId === "default") {
      restaurantId = "store-main";
    }

    const tableExists = await prisma.table.findUnique({
      where: { id }
    });

    if (!tableExists) {
      return NextResponse.json({ error: "Table introuvable" }, { status: 404 });
    }

    await prisma.table.delete({
      where: { id }
    });

    const zoneInfo = getZoneInfo(tableExists.number);
    const resultTable: TableData = {
      id:             tableExists.id,
      number:         `T-${tableExists.number.toString().padStart(2, '0')}`,
      seats:          tableExists.capacity,
      status:         mapPrismaStatus(tableExists.status),
      zone:           zoneInfo.zone,
      zoneId:         zoneInfo.zoneId,
      occupiedSince:  null,
      currentOrderId: null,
      updatedAt:      new Date().toISOString(),
    };

    try {
      await redisPub.publish(
        REDIS_CHANNELS.tableUpdated(restaurantId),
        JSON.stringify({ event: "TABLE_DELETED", tableId: id })
      );
    } catch { /* silent */ }

    return NextResponse.json({ deleted: resultTable }, { status: 200 });
  } catch (error) {
    console.error("[DELETE /api/tables/[id]] Erreur :", error);
    return NextResponse.json({ error: "Impossible de supprimer la table" }, { status: 500 });
  }
}
