import { prisma } from './client';
import { Prisma } from '@prisma/client';

export type TransactionClient = Prisma.TransactionClient;

/**
 * Exécute une opération à l'intérieur d'une transaction Prisma.
 * Supporte le nesting en réutilisant la transaction existante si passée en paramètre.
 * 
 * @param callback Le callback contenant les opérations DB à exécuter
 * @param tx L'instance de transaction existante (optionnelle)
 */
export async function runInTransaction<T>(
  callback: (tx: TransactionClient) => Promise<T>,
  tx?: TransactionClient
): Promise<T> {
  if (tx) {
    return callback(tx);
  }
  return prisma.$transaction(callback);
}
