import { useSession } from "next-auth/react";
import { Permission } from "@/domain/security/permissions";
import { DEFAULT_PERMISSIONS } from "@/app/utils/permissions-config";

/**
* Fonction permettant de vérifier les permissions côté client en fonction de la session active.
* Uniquement pour le style et le rendu de l'interface utilisateur côté client (désactivation des boutons, masquage des onglets).
* Les contrôles de sécurité stricts sont toujours validés côté serveur.
*/
export function usePermissions() {
  const { data: session } = useSession();
  const user = session?.user;

  const hasPermission = (permission: Permission | string): boolean => {
    if (!user) return false;
    if (user.role === "SUPER_ADMIN" || user.role === "ADMIN") return true;

    const roleDefaults = DEFAULT_PERMISSIONS[user.role as keyof typeof DEFAULT_PERMISSIONS];
    const permKey = typeof permission === "string" ? permission : (permission as string);
    return roleDefaults ? !!roleDefaults[permKey] : false;
  };

  return {
    hasPermission,
    canRefundOrder: hasPermission(Permission.REFUND_ORDER),
    canManageUsers: hasPermission(Permission.MANAGE_USERS),
    canViewPayroll: hasPermission(Permission.VIEW_PAYROLL),
    canEditPayroll: hasPermission(Permission.EDIT_PAYROLL),
    canCloseShift: hasPermission(Permission.CLOSE_SHIFT),
    canOpenShift: hasPermission(Permission.OPEN_SHIFT),
    canExportReports: hasPermission(Permission.EXPORT_REPORTS),
    canViewCostPrice: hasPermission(Permission.VIEW_COST_PRICE),
    canViewMargin: hasPermission(Permission.VIEW_MARGIN),
    canManageStore: (storeId: string) => user?.role === "SUPER_ADMIN" || user?.role === "ADMIN" || user?.storeId === storeId,
    canAccessStore: (storeId: string) => user?.role === "SUPER_ADMIN" || user?.role === "ADMIN" || user?.storeId === storeId,
  };
}
export default usePermissions;
