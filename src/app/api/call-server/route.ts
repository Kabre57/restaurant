import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { checkRateLimit, rateLimitKey, rateLimitResponse } from '@/lib/rate-limit';
import { callServerSchema, formatZodError } from '@/lib/validation/schemas';

/**
 * Endpoint pour gérer l'appel d'un serveur depuis une table
 * POST /api/call-server
 */
export async function POST(req: NextRequest) {
  try {
    const limit = await checkRateLimit(rateLimitKey('call-server', req), 10, 60);
    if (!limit.allowed) return rateLimitResponse(limit);

    const parsed = callServerSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 });
    }
    const { storeId, tableId, tableNumber } = parsed.data;

    // On publie l'événement sur Redis. 
    // Le POS et le KDS peuvent s'abonner à ce canal.
    const event = {
      type: 'CALL_SERVER',
      storeId,
      tableId,
      tableNumber,
      timestamp: new Date().toISOString()
    };

    // Publier pour la salle (POS)
    await redis.publish(`store:${storeId}:pos-alerts`, JSON.stringify(event));
    
    // Publier pour la cuisine (KDS) - optionnel selon les process, 
    // mais le client a demandé de l'afficher sur le KDS aussi
    await redis.publish(`store:${storeId}:kds-alerts`, JSON.stringify(event));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erreur API Call Server:', error);
    return NextResponse.json({ error: 'Erreur serveur interne' }, { status: 500 });
  }
}
