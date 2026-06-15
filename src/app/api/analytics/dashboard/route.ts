import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions, checkUserStoreAccess } from "@/lib/auth";
import { AnalyticsService } from "@/services/analytics.service";
import { startOfDay, endOfDay, parseISO, subDays } from "date-fns";

export const dynamic = "force-dynamic";

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

    const periodParam = searchParams.get("period") || "day";
    if (!["hour", "day", "month", "year"].includes(periodParam)) {
      return NextResponse.json({ error: "Période invalide" }, { status: 400 });
    }
    const period = periodParam as "hour" | "day" | "month" | "year";

    const storeId = searchParams.get("storeId") || session.user.storeId;
    if (!storeId) {
      return NextResponse.json({ error: "storeId est requis" }, { status: 400 });
    }

    // Isolation multi-tenant
    const hasAccess = await checkUserStoreAccess(session.user.id, session.user.role, storeId);
    if (!hasAccess) {
      return NextResponse.json({ error: "Accès refusé à cet établissement" }, { status: 403 });
    }

    let startDate = subDays(new Date(), 30); // Default to last 30 days
    let endDate = new Date();

    const startDateStr = searchParams.get("startDate");
    const endDateStr = searchParams.get("endDate");

    if (startDateStr) {
      startDate = parseISO(startDateStr);
    }
    if (endDateStr) {
      endDate = parseISO(endDateStr);
    }

    // Adjust boundaries to catch whole days
    const adjustedStartDate = startOfDay(startDate);
    const adjustedEndDate = endOfDay(endDate);

    const data = await AnalyticsService.getDashboard({
      startDate: adjustedStartDate,
      endDate: adjustedEndDate,
      storeId,
      period,
    });

    return NextResponse.json(data);
  } catch (error: unknown) {
    console.error("[Dashboard API Error]:", error);
    const msg = error instanceof Error ? error.message : "Erreur interne du serveur";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

