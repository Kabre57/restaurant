import { getCategories, getProductsByStore } from "@/app/actions/products";
import { getTablesByStore } from "@/app/actions/tables";
import { getReservationsByStore } from "@/app/actions/reservations";
import POSClient from "@/components/pos/POSClient";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  // Role-based routing: redirect non-cashier roles to their space
  const role = session.user.role;
  if (role === 'KITCHEN') redirect('/kds');
  if (role === 'RESTAURATEUR') redirect('/restaurateur/produits');
  if (role === 'ADMIN') redirect('/admin/dashboard');

  // Only CASHIER and DELIVERY reach this point
  const [categories, products, tables, reservations] = await Promise.all([
    getCategories(),
    getProductsByStore(session.user.storeId),
    getTablesByStore(session.user.storeId),
    getReservationsByStore(session.user.storeId)
  ]);

  return (
    <POSClient 
      categories={categories} 
      products={products} 
      tables={tables}
      reservations={reservations as any}
      storeId={session.user.storeId} 
      cashierId={session.user.id} 
    />
  );
}
