import { NextRequest, NextResponse } from "next/server";
import { TrackingService } from "@/services/tracking.service";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ deliveryOrderId: string }> }
) {
  const { deliveryOrderId } = await params;

  try {
    const trackingHistory = await TrackingService.getTrackingHistory(deliveryOrderId);
    return NextResponse.json(trackingHistory);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Erreur interne du serveur";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
