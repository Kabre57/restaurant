import { getCategories, getProductsByStore } from "@/app/actions/catalog/products";
import { getTablesByStore } from "@/app/actions/store/tables";
import { getReservationsByStore } from "@/app/actions/clients/reservations";
import { getActiveOrders } from "@/app/actions/orders/orders";
import { getActiveShift } from "@/app/actions/caisse/cashDrawer";
import { getStoreSettings } from "@/app/actions/store/storeSettings";
import POSClient from "@/components/pos/POSClient";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function CashierPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  const role = session.user.role;
  if (!['CASHIER', 'SERVER', 'DELIVERY', 'RESTAURATEUR', 'ADMIN', 'SUPER_ADMIN'].includes(role)) {
    redirect("/unauthorized");
  }

  const [categories, products, tables, reservations, activeOrders, activeShiftRes, settingsRes] = await Promise.all([
    getCategories(session.user.storeId),
    getProductsByStore(session.user.storeId),
    getTablesByStore(session.user.storeId),
    getReservationsByStore(session.user.storeId),
    getActiveOrders(session.user.storeId),
    getActiveShift(session.user.storeId),
    getStoreSettings(session.user.storeId),
  ]);

  const flowModeLocked = settingsRes.success && settingsRes.settings?.workflowType === 'CASHIER_ONLY';

  return (
    <POSClient 
      categories={categories} 
      products={products} 
      tables={tables}
      reservations={reservations as any}
      activeOrders={activeOrders as any}
      storeId={session.user.storeId} 
      cashierId={session.user.id}
      initialActiveShift={(activeShiftRes.success && activeShiftRes.shift) ? activeShiftRes.shift as any : null}
      flowModeLocked={flowModeLocked}
      initialFlowMode={flowModeLocked ? 'DIRECT' : undefined}
      operatorRole={role === 'SERVER' ? 'SERVER' : 'CASHIER'}
    />
  );
}
