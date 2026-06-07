import { getCategories, getProductsByStore } from "@/app/actions/products";
import { getTablesByStore } from "@/app/actions/tables";
import { getReservationsByStore } from "@/app/actions/reservations";
import { getActiveOrders } from "@/app/actions/orders";
import POSClient from "@/components/pos/POSClient";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  // Role-based routing: redirect roles to their space
  const role = session.user.role;
  if (role === 'KITCHEN') redirect('/kds');
  if (role === 'SERVER') {
    const settings = await prisma.storeSettings.findUnique({
      where: { storeId: session.user.storeId }
    });
    if (settings?.workflowType === 'CASHIER_ONLY') {
      redirect('/cashier');
    }
    redirect('/serveur');
  }
  if (role === 'RESTAURATEUR') redirect('/restaurateur/produits');
  if (role === 'ADMIN' || role === 'SUPER_ADMIN') redirect('/admin/dashboard');

  // CASHIER and other operational roles redirect to cashier POS
  redirect('/cashier');
}
