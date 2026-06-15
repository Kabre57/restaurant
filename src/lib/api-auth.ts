import { prisma } from '@/lib/db'
import crypto from 'crypto';

export type ApiTokenContext = {
  storeId: string
  tokenId: string
}

export function readApiTokenFromRequest(request: Request): string {
  const authHeader = request.headers.get("authorization") ?? "";
  const apiKeyHeader = request.headers.get("x-api-key") ?? "";
  const bearerToken = authHeader.toLowerCase().startsWith("bearer ")
    ? authHeader.slice("Bearer ".length).trim()
    : authHeader.trim();

  return bearerToken || apiKeyHeader.trim();
}

export async function validateApiToken(token?: string): Promise<ApiTokenContext | null> {
  if (!token) return null;
  
  // Vérifier le format GLP_
  if (!token.startsWith('GLP_')) return null;
  
  const hashed = crypto.createHash('sha256').update(token).digest('hex');
  
  const apiToken = await prisma.apiToken.findUnique({
    where: { token: hashed },
    select: { id: true, storeId: true }
  });
  
  if (!apiToken) return null;

  return {
    storeId: apiToken.storeId,
    tokenId: apiToken.id,
  };
}
