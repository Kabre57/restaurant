import { getCategories, getProductsByStore } from "@/app/actions/products";
import { getTablesByStore } from "@/app/actions/tables";
import { getReservationsByStore } from "@/app/actions/reservations";
import { getActiveOrders } from "@/app/actions/orders";
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
  if (!['CASHIER', 'DELIVERY', 'RESTAURATEUR', 'ADMIN', 'SUPER_ADMIN'].includes(role)) {
    redirect("/unauthorized");
  }

  const [categories, products, tables, reservations, activeOrders] = await Promise.all([
    getCategories(session.user.storeId),
    getProductsByStore(session.user.storeId),
    getTablesByStore(session.user.storeId),
    getReservationsByStore(session.user.storeId),
    getActiveOrders(session.user.storeId)
  ]);

  return (
    <POSClient 
      categories={categories} 
      products={products} 
      tables={tables}
      reservations={reservations as any}
      activeOrders={activeOrders as any}
      storeId={session.user.storeId} 
      cashierId={session.user.id} 
    />
  );
}
