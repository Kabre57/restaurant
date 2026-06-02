// src/app/api/tables/route.ts
// API REST réelle pour la gestion des tables connectée à la base de données PostgreSQL via Prisma
// GET  /api/tables?restaurantId=xxx&zone=xxx&status=xxx
// POST /api/tables (créer une table)

import { NextRequest, NextResponse } from "next/server";
import { redis, redisPub, REDIS_CHANNELS, REDIS_KEYS, getCached } from "@/lib/redis";
import prisma from "@/lib/prisma";

export type TableStatus = "LIBRE" | "OCCUPEE" | "RESERVEE" | "EN_NETTOYAGE";

export interface TableData {
  id: string;
  number: string;
  seats: number;
  status: TableStatus;
  zone: string;
  zoneId: string;
  occupiedSince?: string | null;
  currentOrderId?: string | null;
  updatedAt: string;
}

const ZONES = [
  { id: "z1", name: "Terrasse" },
  { id: "z2", name: "Salle Principale" },
  { id: "z3", name: "Étage" },
];

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

// ─── GET ───────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  let restaurantId = searchParams.get("restaurantId") ?? "store-main";
  if (restaurantId === "default") {
    restaurantId = "store-main";
  }
  const zoneFilter   = searchParams.get("zone");
  const statusFilter = searchParams.get("status");

  try {
    const dbTables = await getCached(REDIS_KEYS.tables(restaurantId), 300, async () => {
      return await prisma.table.findMany({
        where: { storeId: restaurantId },
        orderBy: { number: 'asc' },
      });
    });

    let mappedTables: TableData[] = dbTables.map((t) => {
      const zoneInfo = getZoneInfo(t.number);
      return {
        id:             t.id,
        number:         `T-${t.number.toString().padStart(2, '0')}`,
        seats:          t.capacity,
        status:         mapPrismaStatus(t.status),
        zone:           zoneInfo.zone,
        zoneId:         zoneInfo.zoneId,
        occupiedSince:  t.status === "OCCUPIED" ? t.updatedAt.toISOString() : null,
        currentOrderId: null,
        updatedAt:      t.updatedAt.toISOString(),
      };
    });

    // Filtre optionnel par zone
    if (zoneFilter) {
      mappedTables = mappedTables.filter((t) => t.zoneId === zoneFilter);
    }
    // Filtre optionnel par status
    if (statusFilter) {
      mappedTables = mappedTables.filter((t) => t.status === statusFilter);
    }

    // Stats globales sur toutes les tables du restaurant
    const totalTables = dbTables.map((t) => ({
      ...t,
      mappedStatus: mapPrismaStatus(t.status)
    }));

    const stats = {
      total:       totalTables.length,
      libre:       totalTables.filter((t) => t.mappedStatus === "LIBRE").length,
      occupee:     totalTables.filter((t) => t.mappedStatus === "OCCUPEE").length,
      reservee:    totalTables.filter((t) => t.mappedStatus === "RESERVEE").length,
      nettoyage:   totalTables.filter((t) => t.mappedStatus === "EN_NETTOYAGE").length,
    };

    return NextResponse.json({ tables: mappedTables, zones: ZONES, stats }, { status: 200 });
  } catch (error) {
    console.error("[GET /api/tables] Erreur :", error);
    return NextResponse.json({ error: "Impossible de récupérer les tables" }, { status: 500 });
  }
}

// ─── POST ──────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { number, seats, zoneId, restaurantId = "store-main" } = body;

    const actualStoreId = restaurantId === "default" ? "store-main" : restaurantId;

    if (!number || !seats) {
      return NextResponse.json({ error: "Champs manquants : number, seats" }, { status: 400 });
    }

    // Parse le numéro de table (ex: "T-09" ou "9" ou 9)
    const numericNumber = typeof number === "number" 
      ? number 
      : parseInt(String(number).replace(/[^0-9]/g, ""), 10);

    if (isNaN(numericNumber)) {
      return NextResponse.json({ error: "Le numéro de table doit être un entier valide" }, { status: 400 });
    }

    // Vérifie si la table existe déjà pour ce magasin
    const existingTable = await prisma.table.findFirst({
      where: {
        storeId: actualStoreId,
        number: numericNumber,
      }
    });

    if (existingTable) {
      return NextResponse.json({ error: `La table ${numericNumber} existe déjà` }, { status: 400 });
    }

    const table = await prisma.table.create({
      data: {
        storeId:  actualStoreId,
        number:   numericNumber,
        capacity: Number(seats),
        status:   "AVAILABLE",
      }
    });

    const zoneInfo = getZoneInfo(table.number);
    const newTable: TableData = {
      id:             table.id,
      number:         `T-${table.number.toString().padStart(2, '0')}`,
      seats:          table.capacity,
      status:         "LIBRE",
      zone:           zoneInfo.zone,
      zoneId:         zoneInfo.zoneId,
      occupiedSince:  null,
      currentOrderId: null,
      updatedAt:      table.updatedAt.toISOString(),
    };

    // Pub/Sub Redis — notifie les clients SSE
    try {
      await redis.del(REDIS_KEYS.tables(actualStoreId));
      await redisPub.publish(
        REDIS_CHANNELS.tableUpdated(actualStoreId),
        JSON.stringify({ event: "TABLE_CREATED", table: newTable })
      );
    } catch { /* Redis absent en dev */ }

    return NextResponse.json({ table: newTable }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/tables] Erreur :", error);
    return NextResponse.json({ error: "Impossible de créer la table" }, { status: 500 });
  }
}
