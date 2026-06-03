import { prisma } from '@/lib/db'
import crypto from 'crypto';

export async function validateApiToken(token?: string): Promise<boolean> {
  if (!token) return false;
  
  // Vérifier le format GLP_
  if (!token.startsWith('GLP_')) return false;
  
  const hashed = crypto.createHash('sha256').update(token).digest('hex');
  
  const apiToken = await prisma.apiToken.findUnique({
    where: { token: hashed },
    select: { id: true }
  });
  
  return !!apiToken;
}
