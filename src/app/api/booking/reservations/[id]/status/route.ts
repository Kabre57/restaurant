import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions, checkUserStoreAccess } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { BookingService } from "@/services/booking.service";
import { updateReservationStatusSchema } from "@/lib/validation/booking";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Authentification requise" }, { status: 401 });
  }

  try {
    const { id } = await params;

    // Récupérer le storeId de la réservation pour vérifier le multi-tenant
    const reservation = await prisma.reservation.findUnique({
      where: { id },
      select: { storeId: true },
    });

    if (!reservation) {
      return NextResponse.json({ error: "Réservation introuvable" }, { status: 404 });
    }

    // Vérifier l'accès multi-tenant
    const hasAccess = await checkUserStoreAccess(session.user.id, session.user.role, reservation.storeId);
    if (!hasAccess) {
      return NextResponse.json({ error: "Accès refusé à cet établissement" }, { status: 403 });
    }

    const body = await req.json();
    const result = updateReservationStatusSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
    }

    const { status, utilisateur } = result.data;
    const updated = await BookingService.updateStatus(id, status, utilisateur);
    return NextResponse.json(updated);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Erreur de mise à jour du statut";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

