import { telemetry } from '@/shared/telemetry'
import { requirePermission } from '@/shared/security'
import { Permission } from '@/domain/security/permissions'
import { Role } from '@prisma/client'

/**
 * Valide si l'utilisateur possède l'autorisation nécessaire pour appliquer une remise,
 * et journalise la transaction à des fins d'audit en cas de succès.
 */
export async function validateAndAuditDiscount(
  user: { id: string; role: Role; storeId: string },
  storeId: string,
  discount?: number
): Promise<void> {
  if (discount && discount > 0) {
    await requirePermission(user, Permission.OVERRIDE_DISCOUNT)
    telemetry.logAudit({
      storeId,
      userId: user.id,
      action: 'DISCOUNT_OVERRIDE',
      description: `Application d'une remise de ${discount}% sur la commande.`,
      details: { discount }
    })
  }
}
