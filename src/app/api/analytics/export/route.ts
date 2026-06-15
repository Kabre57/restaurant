import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions, checkUserStoreAccess } from "@/lib/auth";
import { AnalyticsService } from "@/services/analytics.service";
import { ExportService } from "@/services/export.service";
import { startOfDay, endOfDay, parseISO } from "date-fns";
import { z } from "zod";

export const dynamic = "force-dynamic";

// Schéma de validation Zod pour les paramètres de requête
const exportQuerySchema = z.object({
  format: z.enum(["excel", "pdf"]),
  startDate: z.string().transform((val) => startOfDay(parseISO(val))),
  endDate: z.string().transform((val) => endOfDay(parseISO(val))),
  storeId: z.string().nullish().transform((val) => val || undefined),
  period: z.enum(["hour", "day", "month", "year"]).default("day"),
});

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Authentification requise" }, { status: 401 });
  }

  const allowedRoles = ["SUPER_ADMIN", "ADMIN", "MANAGER", "RESTAURATEUR"];
  if (!allowedRoles.includes(session.user.role)) {
    return NextResponse.json({ error: "Accès interdit : privilèges insuffisants" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);

    // Extraction et validation des query params
    const rawParams = {
      format: searchParams.get("format"),
      startDate: searchParams.get("startDate"),
      endDate: searchParams.get("endDate"),
      storeId: searchParams.get("storeId"),
      period: searchParams.get("period") || "day",
    };

    const parsed = exportQuerySchema.safeParse(rawParams);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Paramètres de requête invalides", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { format: exportFormat, startDate, endDate, period } = parsed.data;
    const storeId = parsed.data.storeId || session.user.storeId;

    if (!storeId) {
      return NextResponse.json({ error: "storeId est requis" }, { status: 400 });
    }

    // Isolation multi-tenant
    const hasAccess = await checkUserStoreAccess(session.user.id, session.user.role, storeId);
    if (!hasAccess) {
      return NextResponse.json({ error: "Accès refusé à cet établissement" }, { status: 403 });
    }

    // Récupération des données du dashboard analytique
    const data = await AnalyticsService.getDashboard({
      startDate,
      endDate,
      storeId,
      period,
    });

    const timestamp = new Date().toISOString().slice(0, 10);
    const filters = { startDate, endDate, storeId };

    if (exportFormat === "pdf") {
      const buffer = await ExportService.generatePdf(data, filters);
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="rapport-analytique-${timestamp}.pdf"`,
        },
      });
    } else {
      const buffer = await ExportService.generateExcel(data, filters);
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="rapport-analytique-${timestamp}.xlsx"`,
        },
      });
    }
  } catch (error: unknown) {
    console.error("[Export API Error]:", error);
    const msg = error instanceof Error ? error.message : "Erreur interne du serveur lors de l'export";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

