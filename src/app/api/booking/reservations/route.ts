import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions, checkUserStoreAccess } from "@/lib/auth";
import { BookingService } from "@/services/booking.service";
import { createReservationSchema } from "@/lib/validation/booking";
import { checkRateLimit, rateLimitKey, rateLimitResponse } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Authentification requise" }, { status: 401 });
  }

  const storeId = req.nextUrl.searchParams.get("storeId") || session.user.storeId;
  const date = req.nextUrl.searchParams.get("date") || undefined;

  if (!storeId) {
    return NextResponse.json({ error: "storeId est requis" }, { status: 400 });
  }

  // Isolation multi-tenant
  const hasAccess = await checkUserStoreAccess(session.user.id, session.user.role, storeId);
  if (!hasAccess) {
    return NextResponse.json({ error: "Accès refusé à cet établissement" }, { status: 403 });
  }

  try {
    const reservations = await BookingService.getReservations(storeId, date);
    return NextResponse.json(reservations);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Erreur interne du serveur";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  // Limite de requêtes : 5 par minute
  const ipKey = rateLimitKey("booking-create", req);
  const rateLimitResult = await checkRateLimit(ipKey, 5, 60);
  if (!rateLimitResult.allowed) {
    return rateLimitResponse(rateLimitResult);
  }

  try {
    const body = await req.json();
    const result = createReservationSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
    }

    const reservation = await BookingService.createReservation(result.data);
    return NextResponse.json(reservation, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Erreur lors de la réservation";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

