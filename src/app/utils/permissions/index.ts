import { Role } from '@prisma/client'
import { PermissionItem, ModuleInfo } from './types'
import { MODULES_LIST } from './modules'

import { dashboardPermissions, dashboardDefaultPermissions } from './dashboard'
import { cashierPermissions, cashierDefaultPermissions } from './cashier'
import { kitchenPermissions, kitchenDefaultPermissions } from './kitchen'
import { stockPermissions, stockDefaultPermissions } from './stock'
import { hrPermissions, hrDefaultPermissions } from './hr'
import { accountingPermissions, accountingDefaultPermissions } from './accounting'
import { deliveryPermissions, deliveryDefaultPermissions } from './delivery'
import { loyaltyPermissions, loyaltyDefaultPermissions } from './loyalty'
import { bookingPermissions, bookingDefaultPermissions } from './booking'
import { ecommercePermissions, ecommerceDefaultPermissions } from './ecommerce'
import { settingsPermissions, settingsDefaultPermissions } from './settings'

export { MODULES_LIST }
export type { PermissionItem, ModuleInfo }

export const PERMISSIONS_LIST: PermissionItem[] = [
  ...dashboardPermissions,
  ...cashierPermissions,
  ...kitchenPermissions,
  ...stockPermissions,
  ...hrPermissions,
  ...accountingPermissions,
  ...deliveryPermissions,
  ...loyaltyPermissions,
  ...bookingPermissions,
  ...ecommercePermissions,
  ...settingsPermissions
]

// Détection de clés de permissions en double lors du chargement
const seenKeys = new Set<string>()
for (const item of PERMISSIONS_LIST) {
  if (seenKeys.has(item.key)) {
    throw new Error(`Clé de permission en double détectée : ${item.key}`)
  }
  seenKeys.add(item.key)
}

const ALL_ROLES: Role[] = [
  'RESTAURATEUR',
  'MANAGER',
  'CASHIER',
  'SERVER',
  'KITCHEN',
  'DELIVERY',
  'LIVREUR',
  'ADMIN',
  'SUPER_ADMIN',
  'STORE_MANAGER',
  'STORE_EMPLOYEE'
]

export const DEFAULT_PERMISSIONS: Record<Role, Record<string, boolean>> = {} as Record<Role, Record<string, boolean>>

for (const role of ALL_ROLES) {
  DEFAULT_PERMISSIONS[role] = {
    // Liaison explicite des permissions globales héritées
    POS_ACCESS: cashierDefaultPermissions[role]['POS_ACCESS'] ?? false,
    CASH_DRAWER_ACCESS: cashierDefaultPermissions[role]['CASH_DRAWER_ACCESS'] ?? false,
    KDS_ACCESS: kitchenDefaultPermissions[role]['KDS_ACCESS'] ?? false,
    STOCK_ACCESS: stockDefaultPermissions[role]['STOCK_ACCESS'] ?? false,
    STOCK_ADJUSTMENT: stockDefaultPermissions[role]['STOCK_ADJUSTMENT'] ?? false,
    HR_ACCESS: hrDefaultPermissions[role]['HR_ACCESS'] ?? false,
    ANALYTICS_ACCESS: dashboardDefaultPermissions[role]['ANALYTICS_ACCESS'] ?? false,
    CONFIG_ACCESS: settingsDefaultPermissions[role]['CONFIG_ACCESS'] ?? false,

    ...dashboardDefaultPermissions[role],
    ...cashierDefaultPermissions[role],
    ...kitchenDefaultPermissions[role],
    ...stockDefaultPermissions[role],
    ...hrDefaultPermissions[role],
    ...accountingDefaultPermissions[role],
    ...deliveryDefaultPermissions[role],
    ...loyaltyDefaultPermissions[role],
    ...bookingDefaultPermissions[role],
    ...ecommerceDefaultPermissions[role],
    ...settingsDefaultPermissions[role]
  }
}
